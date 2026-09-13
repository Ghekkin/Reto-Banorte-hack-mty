---
estado: resuelto
severidad: media
area: web
encontrado: 2026-09-13 04:40
github: 35
resuelto-en:
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

## Resolución (2026-09-13)

- **Migración `db/migraciones/0008-corridas-de-widgets.sql`**: `corridas_tipo_check` admite
  `turno`, `portada` y `widget` (drop + add, idempotente). Hay que aplicarla con
  `pnpm datos:migrar`; mientras no esté, la grabadora avisa una vez en consola y la respuesta
  sale igual.
- **`turnoDeWidget`** (`apps/web/src/lib/widgets/turno.ts`) acepta `grabadora`, `escritor` y
  `dispositivoId`. Graba modelo, opciones, system prompt y tools por hash, cada paso con sus
  tokens (`pasoPreparado`/`paso`), cada tool del modelo (`toolPedida`/`toolTermino`, con
  `tool-error`), las consultas del servidor para rearmar la tarjeta (`toolDelHost`) y el total de
  tokens: `totalUsage` de cada intento, o la suma de sus pasos si el intento se cortó. El
  resultado trae `uso` y `corridaId`. Las llamadas al MCP llevan `corridaId` en `_meta`.
- **`POST /api/inicio/widget`** crea la grabadora (`tipo: 'widget'`, motivo `foco:<id>` o
  `general`, `peticion` con pregunta, historial y la portada que se veía), graba cada línea que
  emite (el `fin` con la auditoría y `corridaId`), marca `estado = 'error'` si la auditoría falla y
  la cierra en segundo plano en su `finally`. `registrar` pasa a `registrarEnLaBase` (fuente
  `inicio`, evento `widget-<hecho>`, con `entrada`/`salida`/`cache`), que sigue escribiendo en
  consola.
- **`grabadora.ts`**: `TipoDeCorrida` con `widget` y `LineaGrabada` (líneas del chat o de widget).
- **`scripts/corridas.mjs`**: nada filtraba por tipo; se ajustó la línea `error` (la de widget no
  trae `codigo`) y el `fin` de un widget muestra cierre, si se guardó y la auditoría.

**Evidencia:** `apps/web/src/lib/corridas/__tests__/corrida-de-widget.spec.ts` (7 pruebas). Contra el
código anterior fallaban 5 de 6 (sin corrida); con el arreglo pasan todas, y `pnpm typecheck` y
`pnpm --filter @maya/web test` (390 pruebas) quedan en verde. No se probó contra la base real
porque la migración todavía no está aplicada.
