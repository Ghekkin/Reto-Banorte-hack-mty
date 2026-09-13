---
estado: resuelto
severidad: media
area: web
encontrado: 2026-09-13 04:35
github: 32
resuelto-en:
---

# «Disponible» suma la cuenta de inversión: a Carmen le marca $3,543,842 cuando lo líquido es $669,342

**Dónde:** `apps/web/src/lib/datos/consultas.ts:238-240` (`resumenDe`): filtra
`c.tipo !== "credito"`, así que las cuentas `inversion` entran al disponible. Lo leen el héroe de
Inicio (`app/(app)/page.tsx:92` → `tarjetas-inicio.tsx:53`), `GET /api/perfil` y `GET /api/panorama`.

**Qué esperaba:** lo que dice el propio comentario de la función: «`disponible` es solo lo
líquido». Una cuenta de inversión no es dinero disponible hoy.

**Qué pasa:** con los datos de la base:

| Persona | Disponible hoy | Cuenta de inversión incluida | Lo líquido |
|---|---|---|---|
| Beto | $2,819.40 | — | $2,819.40 |
| Ana | $91,873.50 | Inversión Ana, $25,300.00 | $66,573.50 |
| Carmen | $3,543,842.00 | Portafolio Carmen, $2,874,500.00 | $669,342.00 |

La cuenta «Portafolio Carmen» es el mismo dinero que `portafolioDe` reporta como valor del
portafolio ($2,810,737.46), así que cualquier pantalla que ponga «Disponible» e «Invertido» juntos
lo cuenta dos veces. Se vio al rehacer Más: el héroe decía $3.5 M disponibles y $2.8 M invertidos.

**Cómo lo reproduje / por qué estoy seguro:** `select tipo, alias, saldo_centavos from banorte.cuentas
where usuario_id = 'usr_carmen'` → reserva $482,000 + corriente $187,342 + portafolio $2,874,500 =
$3,543,842, el número del héroe de Inicio de Carmen.

**Impacto en la demo:** Beto no cambia (no tiene cuenta de inversión). Ana y Carmen enseñan un
disponible inflado en Inicio. Más quitó «Invertido» del héroe para no enseñar el doble conteo y
queda igual que Inicio mientras esto se decide.

**Arreglo propuesto:** en `resumenDe`, excluir también `tipo === "inversion"` (y revisar si
«Total en tus cuentas» de Productos debe seguir sumándola; ahí la etiqueta sí es honesta). Cambia el
número de Inicio de Ana y Carmen: avisar a quien esté ensayando antes de subirlo.

## Resolución (2026-09-13)

`resumenDe` (`apps/web/src/lib/datos/consultas.ts`) suma solo las cuentas de `CUENTAS_LIQUIDAS`
(`nomina` y `ahorro`): ni `credito` ni `inversion`. Lo leen el héroe de Inicio, el de Más,
`GET /api/perfil` y `GET /api/panorama`, así que los cuatro cambian igual.

Cifras de la base (SELECT sobre `banorte.cuentas`, 2026-09-13):

| Persona | Antes | Después |
|---|---|---|
| Beto | $2,819.40 | $2,819.40 |
| Ana | $91,873.50 | $66,573.50 |
| Carmen | $3,543,842.00 | $669,342.00 |

- **Productos no cambia a propósito:** la tarjeta `Cuentas` dice «Total en tus cuentas» y sí suma
  la inversión (se corrigió su comentario, que decía «mismo criterio que `resumenDe`»).
- **El MCP no tiene una noción equivalente:** `panorama_inicial` no reporta un disponible (perfil,
  tarjeta, deuda, capacidad de pago, salud), así que no hay nada que deba coincidir.
- **Más:** el héroe sigue sin «Invertido». Ahora se podría volver a poner sin doble conteo; es
  decisión de diseño, no de este arreglo.
- **Prueba:** `apps/web/src/lib/datos/__tests__/resumen.spec.ts`, con las cuentas reales de Carmen.
  Falla con el filtro anterior (354384200 en vez de 66934200) y pasa con el nuevo.
- **Docs:** `api-rest-lectura.md` (los dos niveles), `pantalla-mas.md` y `shell-web.md`.
