---
estado: abierto
severidad: media
area: web
encontrado: 2026-09-13 04:40
github: 34
---

# 8 de cada 10 portadas con widgets vivos pagan dos peticiones: la primera cita una tarjeta que no pintó

**Dónde:** `apps/web/src/lib/widgets/armar.ts:281` (`armarConclusion` rechaza la portada entera si
un dato de apoyo nombra una tarjeta que no está) y `apps/web/src/lib/inicio/generar.ts:699` (el
encargo le ofrece `salud` como tarjeta de contexto).

**Qué esperaba:** que la portada salga en una sola petición al modelo, como dice el encargo
("Llama `pintar_widgets` exactamente una vez").

**Qué pasa:** el modelo arma bien las 2 tarjetas, pero en `conclusion.datos` cita una cifra de
una tarjeta que **no eligió** (casi siempre `salud`, porque el encargo la menciona y
`panorama_inicial` trae el puntaje). `armarConclusion` convierte eso en error, `pintar_widgets`
devuelve `ok: false` y el modelo repite la llamada completa, con los ~8–17k tokens de entrada
otra vez, solo para quitar ese dato.

**Cómo lo sé (base de producción, `banorte.corrida_tools`, 02:12–04:35 del 13):**

- 183 de 222 portadas tuvieron al menos un `pintar_widgets` rechazado.
- 154 rechazos con el mismo texto:
  `conclusion.datos[0]: no hay una tarjeta "salud"; las que hay: portafolio, rebalanceo`.
- Los demás: `la tarjeta "tarjeta" no tiene una cifra en "usoDelLimite"` (4),
  `... en "saldoDiferidoCentavos"` (1), `la tarjeta "gasto" no tiene una cifra en "gastoCentavos"`
  (1, y esa portada terminó en `error`), `variantes no es JSON valido` (2).
- El segundo paso de esas portadas costó ≈ $0.75 USD: el 26 % de todo lo registrado.

**Impacto en la demo:** medio. No se ve un error (el reintento sale bien), pero cada portada
tarda 1–3 s más y cuesta el doble.

**Arreglos posibles:**

1. En `armarConclusion`, **descartar** el dato de apoyo que no se puede resolver (y anotarlo en la
   razón o en el log) en vez de rechazar la portada: son cifras opcionales, la tarjeta y el
   titular ya están bien. Quita el paso extra de raíz.
2. En el encargo, decir que `datos` solo puede citar las 2 tarjetas elegidas y listar sus campos
   citables; y no ofrecer `salud` como contexto si no se va a pintar.

## Actualización (2026-09-13 06:15): arreglado a medias en `36a1c09`

`forzarFuentes` (`apps/web/src/lib/widgets/pintar.ts`) descarta las cifras de la conclusión que
citan una tarjeta que no está. Eso quitó la causa principal, pero **no** la otra mitad del mismo
síntoma: una cifra que cita una tarjeta que sí está, con un campo que esa tarjeta no tiene, se sigue
rechazando en `armar.ts:287`.

Portadas en `banorte.corridas`, antes y después de que `36a1c09` llegara a producción (05:13):

| Tramo | Portadas | Con reintento | «no hay una tarjeta» | «no tiene una cifra en» | Pasos promedio |
|---|---|---|---|---|---|
| 02:12–05:12 | 271 | 207 (76 %) | 160 | 20 | 1.81 |
| 05:13–06:02 | 46 | 18 (39 %) | 1 | 7 | 1.43 |

Los reintentos que quedan: `la tarjeta "credito"/"meta" no tiene una cifra en "puntajeSalud"` (la
misma causa: el modelo quiere citar la salud), `"faltanteCentavos"`/`"montoObjetivoCentavos"` en
`meta`, tools que fallan en la portada de Beto (`simular_reestructura` con plan activo,
`proyectar_ahorro` sin capacidad), una cifra de texto que no sale del MCP (`"96%"`) y un typo de
llave (`nombre:`). Ojo: la base mezcla producción y servidores locales, así que parte de eso puede
venir de código viejo.

**Falta:** tratar «no tiene una cifra en» igual que la tarjeta ausente (descartar el dato de apoyo
en vez de rechazar la portada).
