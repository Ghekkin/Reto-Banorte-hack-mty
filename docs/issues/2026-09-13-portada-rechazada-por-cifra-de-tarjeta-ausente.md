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
