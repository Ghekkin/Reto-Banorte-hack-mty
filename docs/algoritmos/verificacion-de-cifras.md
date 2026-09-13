---
verificado: 2026-09-13 02:30
implementado-en: apps/web/src/lib/widgets/cifras.ts
lenguaje: typescript
---

# Verificación de cifras en prosa

## Para cualquiera

Las tarjetas ya no llevan números escritos por Maya, pero sus frases sí: «tus suscripciones
suman $3,546 al mes». Antes de mostrar una frase, el sistema busca cada número en lo que el banco
contestó en ese momento. Si un número no aparece —inventado, mal redondeado, confundido de
centavos a pesos—, Maya tiene que corregirlo; si insiste, esa oración no se muestra.

## La idea

Todos los montos del sistema viajan en **centavos** y todos los porcentajes como **fracción**.
Eso permite comparar sin entender la frase: «$3,546» está respaldado si alguna hoja numérica de
los datos, dividida entre 100, da 3 546 con el redondeo que muestra el texto; «6.7 %» si alguna
fracción por 100 da 6.7.

## Paso a paso

1. **Extraer** (`extraerCifras`): números con separador de miles opcional y sus decoraciones.
   - `$`, `MXN` antes o `pesos` después → **monto**; `mil` y `millones` multiplican y bajan los
     decimales efectivos (3.5 mil → 3 500 con tolerancia de 50).
   - `%` o `por ciento` → **porcentaje**; `/100` → **puntaje**; lo demás → **número**.
   - Un número seguido de «de <mes>» es un día de una fecha y se ignora.
2. **Juntar hojas** (`hojasNumericas`): todos los números, a cualquier profundidad, de las
   salidas del MCP del turno, de las props adaptadas y de las tarjetas que ya están en pantalla
   (que también salieron del MCP).
3. **Respaldar** (`cifraRespaldada`), con tolerancia de media unidad del último decimal mostrado:
   - monto: `|hoja| / 100 ≈ valor`;
   - porcentaje: `|hoja| ≤ 10` y `|hoja| × 100 ≈ valor`;
   - puntaje: `hoja ≈ valor`;
   - número: conteos enteros ≤ 12 y años 1990–2100 pasan; si no, `|hoja| ≈ valor`.
4. Las cifras que aparecen en la **pregunta de la persona** cuentan como respaldadas.
5. Si hay cifras sin respaldo:
   - antes del último intento: error de tool con las cifras citadas (`"$2,954,065"`);
   - en el último intento: `quitarOracionesSinRespaldo` borra las oraciones que las traen (parte
     en el espacio después del punto, así `$3,193.35` no corta la oración). Un titular que queda
     vacío se sustituye por una frase neutra; se registra `cifras-quitadas` en el log.

## Entradas y salidas

| Entrada | Tipo | Ejemplo |
|---|---|---|
| Textos | `string[]` | `["Tu salud es 85/100 y tus suscripciones suman $3,546."]` |
| Datos | `unknown[]` | salidas de `detectar_fugas`, `diagnostico_salud_financiera` |
| Extras | `string[]` | `["¿y si ahorro 5,000 al mes?"]` |

| Salida | Tipo | Ejemplo |
|---|---|---|
| Verificación | `{ ok: true } \| { ok: false, noRespaldadas: Cifra[] }` | `noRespaldadas: [{ crudo: "$1,250", valor: 1250, tipo: "monto" }]` |

## Parámetros y umbrales

- **Conteos ≤ 12 sin buscar**: «3 meses», «2 tarjetas», «12 días». Buscarlos rechazaría frases
  correctas por un número que no es un dato (el objetivo de tres meses de gasto es una regla,
  no una salida). Por encima de 12 («18 meses», «48 meses») se buscan.
- **Fracciones ≤ 10**: un porcentaje solo se compara contra hojas que pueden ser fracción (hasta
  1 000 %). Sin este corte, «85 %» pasaría con cualquier `85` de los datos (un puntaje).
- **Media unidad del último decimal**: «$3,546» acepta 3 545.50–3 546.50; «$3,546.00» exige el
  centavo.

## Límites y supuestos

- **No entiende el sentido.** «Debes $3,546» pasa si 354 600 aparece en los datos aunque fuera el
  total de suscripciones. Garantiza que el número existe, no que se use para lo correcto.
- Una cifra **derivada** correcta («te ahorras la diferencia de $1,000») se rechaza si ningún
  dato la trae tal cual. Es a propósito: el prompt pide citar, no calcular.
- Números escritos con letra («tres mil») no se extraen.
- Un número entero pequeño inventado (≤ 12) no se detecta.

## Cómo se probó

`apps/web/src/lib/widgets/__tests__/cifras.spec.ts`: extracción de cada formato; montos,
porcentajes y puntajes contra hojas; el caso real del modo anterior (`$2,954,065` rechazado,
`$29,540.65` aceptado para `2954065` centavos); la conclusión correcta de Carmen pasa completa;
una cifra inventada se reporta; la pregunta de la persona cuenta como fuente; quitar oraciones
sin cortar en el punto decimal. En `pintar.spec.ts` y `turno.spec.ts`, el titular y la nota con
cifras inventadas se rechazan, y en el último intento se quitan.
