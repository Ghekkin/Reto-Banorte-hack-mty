---
verificado: 2026-09-13 04:00
implementado-en: apps/web/src/lib/inicio/servicio.ts   # vistaDe, regenerarSiCambio, regenerarDeDispositivo
lenguaje: typescript
---

# Qué portada de Inicio ve cada dispositivo, y cuál se rearma

## Para cualquiera

Hay una portada de Inicio "de la casa" por persona demo: la que ve todo el que llega. En
cuanto un visitante hace algo suyo —aplica un plan, pregunta algo en la barra, le pide un
cambio a una tarjeta— su Inicio deja de ser el de la casa y se guarda aparte, solo para él.

La regla para no gastar de más: si tus datos siguen siendo los de la casa (no has aplicado
nada), te toca la de la casa, y si hay que rearmarla se rearma **esa**, que les sirve a todos.
Solo cuando tus datos ya son distintos se arma una portada tuya.

## La idea

La **huella** (`docs/algoritmos/portada-de-maya.md`) dice con qué datos se armó una portada:
cuántas acciones hay y la última, y la fecha del último movimiento. Desde el ADR 0012 las
acciones que cuentan son las **del dispositivo**. Como `acciones_aplicadas.id` es un serial de
toda la tabla, dos ámbitos distintos solo pueden tener la misma huella si **los dos tienen cero
acciones**. Así, "misma huella que la común" significa exactamente "este dispositivo no ha
aplicado nada", y en ese caso la portada común le sirve tal cual.

## Paso a paso

`vistaDe(persona, dispositivo)`:

1. Si el dispositivo es `comun` (el reloj, un script): la portada común, vencida si su huella
   no es la de hoy (o, con widgets vivos, si no tiene procedencias válidas).
2. Lee en paralelo: la huella del dispositivo, la huella común, su portada propia y la común.
3. **Propia al día** → esa. Destino: el dispositivo.
4. **Huella del dispositivo = huella común** (no ha aplicado nada) → la común; vencida si la
   común lo está. Destino: **común**. Una propia vieja (de antes de un reinicio) queda tapada.
5. Si no → su propia (o la común mientras tanto), **vencida**. Destino: el dispositivo.

`regenerarSiCambio(persona, motivo, { dispositivoId })`:

- Común: igual que siempre, con la generación en vuelo compartida por `comun|persona`.
- Dispositivo: calcula `vistaDe`; si no está vencida, `sin-cambios`. Si lo está, rearma el
  **destino** con la generación en vuelo compartida por `destino|persona`: dos visitantes
  nuevos que abren a Beto a la vez esperan la misma portada común.
- Al generar, el MCP se abre con el dispositivo del destino: la portada de un dispositivo se
  arma con **sus** acciones.

Escrituras que siempre van a la portada propia, sin pasar por el destino:

- `preguntarEnInicio` (la barra de Inicio): guarda la respuesta como portada del dispositivo con
  su huella; queda al día y gana en el paso 3.
- `POST /api/inicio/widget`: si el visitante veía la común, `almacen.ajustar` copia la común con
  la tarjeta cambiada a su portada propia, **con la misma `generada_en`** (la página la usa de
  `key` y así no se remonta lo que ya ve). Si ya tenía una propia vencida, la reemplaza; si
  tenía una al día (otra petición se adelantó), no la pisa.

## Entradas y salidas

| Entrada | Tipo | Ejemplo |
|---|---|---|
| `usuarioId` | `string` | `usr_beto` |
| `dispositivoId` | `string` | `dis_3f9a0c...` o `comun` |
| huellas | `string` | `v1|c18|a:0:0|m:812:2026-09-10` |

| Salida (`vistaDe`) | Tipo | Ejemplo |
|---|---|---|
| `pantalla` | `PantallaDeInicio?` | la común, con `dispositivoId: "comun"` |
| `vencida` | `boolean` | `false` |
| `destino` | `string` | `comun` |

## Parámetros y umbrales

No hay números mágicos. El literal `comun` es el mismo en la web (`lib/dispositivo.ts`), el MCP
(`datos/dispositivo.ts`) y el default de la columna (migración 0007).

## Límites y supuestos

- **Movimientos nuevos** cambian la huella de todos a la vez (son de la persona, no del
  dispositivo): la común y las propias quedan vencidas y se rearman al volver cada visitante.
- **Estado común con acciones** (un script aplicó algo sin dispositivo): ningún dispositivo
  nuevo coincide con él, así que cada uno arma su propia portada. Correcto, pero paga modelo
  por visitante; `pnpm reiniciar-estado` antes de abrir la liga lo evita.
- **Una pregunta en Inicio sin acciones** queda al día indefinidamente con huella `a:0:0`, como
  antes: "donde se quedó". `reiniciar-estado` borra las portadas propias.
- Leer cuatro cosas en vez de dos por visita a Inicio: son dos subconsultas con índice y dos
  lecturas por llave primaria.

## Cómo se probó

`apps/web/src/lib/inicio/__tests__/servicio.spec.ts`, bloque "por dispositivo":

- un dispositivo sin acciones ve la común y `regenerarSiCambio` no llama al modelo;
- con acciones, su portada se arma aparte (el generador recibe su `dispositivoId`), la común
  queda intacta y otro dispositivo sigue viendo la común al día;
- con la común vencida, dos dispositivos a la vez producen **una** generación, en `comun`;
- una propia al día gana solo en ese dispositivo;
- tras un reinicio, la propia vieja queda tapada y no se paga otra.

Del lado del MCP, `apps/mcp/src/__tests__/dispositivos.spec.ts`; y en vivo contra el MCP y la
base reales (2026-09-13 03:57): plan aplicado en un dispositivo → su tarjeta en $0, el otro la
sigue viendo en $47,386; reintento `yaEstaba`; la misma llave en el otro, `aplicado`.
