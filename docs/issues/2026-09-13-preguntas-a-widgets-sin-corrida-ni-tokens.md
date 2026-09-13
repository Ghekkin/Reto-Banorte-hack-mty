---
estado: abierto
severidad: media
area: web
encontrado: 2026-09-13 04:40
github: 35
---

# Las preguntas a una tarjeta de Inicio (widgets vivos) no dejan corrida ni tokens en la base

**Dónde:** `apps/web/src/app/api/inicio/widget/route.ts:182` (`registrar` solo hace
`console.log`) y `apps/web/src/lib/widgets/turno.ts` (no lee `totalUsage` ni usa
`crearGrabadora`).

**Qué esperaba:** lo que dice `docs/como-funciona/corridas-en-db.md`: *"cada vez que un modelo
trabaja se guarda una corrida"*, con tokens, pasos y tools, igual que el turno del chat y la
portada.

**Qué pasa:** `POST /api/inicio/widget` llama al modelo (`MODELO_WIDGETS`, un Flash-Lite) y no
graba nada en `banorte.corridas`, `corrida_pasos` ni `registros`. El único rastro es una línea en
la consola del contenedor, sin tokens. El `CHECK` de `corridas.tipo` solo admite `turno` y
`portada`, así que tampoco hay dónde ponerla hoy.

**Cómo lo sé:** `grep` de `crearGrabadora|registrarEnLaBase` en `apps/web/src/lib/widgets/` y en la
ruta: cero resultados. En `registros` no hay ningún evento con fuente de widgets.

**Impacto en la demo:** no se ve, pero con `FEATURE_WIDGETS_VIVOS=1` en producción es el único
consumo del modelo que no se puede medir: ni cuánto cuesta una pregunta, ni cuántas fallan, ni
cuántas se reintentan. Cualquier revisión de costos desde la base lo deja fuera.

**Arreglo:** una migración que agregue `widget` al `CHECK` de `corridas.tipo`, y en `turnoDeWidget`
la misma grabadora que usa la portada (`configurar`, `paso`, `toolPedida`/`toolTermino`,
`resumir` con `totalUsage`). La ruta pasa a `registrarEnLaBase` con fuente `inicio`.
