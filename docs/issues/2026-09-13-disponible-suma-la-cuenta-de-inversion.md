---
estado: abierto
severidad: media
area: web
encontrado: 2026-09-13 04:35
github: 32
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
