# Bitácora de aldair

## 2026-09-13

- **00:00 · inicio** — Retomo rol `mcp`. El pedido: higiene documental del backend
  MCP tras una evaluación de estado.
- **00:00 · hecho** — Corregidos tres docs que quedaron mintiendo tras el `git pull`
  de esta sesión (`luis` había sumado el Paquete Inversiones sin actualizarlos):
  `CLAUDE.md` (15→18 tools, 92→103 pruebas), `docs/tablero.md` (mi fila y la línea
  `mcp` de "Siguiente"), y `docs/arquitectura/roadmap-mcp.md` (frontmatter
  `estado: propuesta` → `parcialmente ejecutado`, con nota de qué nivel está hecho y
  cuál no: O3 prefetch y O2 `ejecutar_decision` siguen sin hacerse).
- **00:00 · nota** — Al verificar encontré que las 3 tools de Inversiones
  (`consultar_inversiones`, `consultar_catalogo_inversiones`,
  `consultar_historico_inversion`) que agregó `luis` contradecían la enmienda del ADR
  0004 ("Inversiones es una pantalla de consulta programada, no un flujo accionable
  del agente"). Lo registré como issue
  (`docs/issues/2026-09-13-tools-inversiones-contradicen-adr-0004.md`). El usuario
  aclaró que es intencional: esas tools completan el viaje de Carmen, el agente debe
  poder consultarlas para armar su pantalla de portafolio. Revertí mi lectura:
  enmendé el ADR 0004 otra vez (2026-09-13), cerré el issue como resuelto y corregí
  `roadmap-mcp.md` (Nivel 4) y el issue de alcance del 2026-09-12, que citaban la
  restricción vieja.
- **00:00 · nota** — Confirmé por conteo directo (`grep -c "it("` en
  `apps/mcp/src/__tests__/`) que el número real hoy es 18 tools (14 lectura + 4
  acción) y 103 pruebas, antes de escribirlo en los tres docs.

## 2026-09-12

- **09:55 · hecho** — Paquete 1 del roadmap del MCP terminado: `panorama_inicial`,
  `diagnostico_salud_financiera` y `consultar_creditos`, con sus schemas en
  `packages/schemas/src/tools/`, dominio nuevo en `apps/mcp/src/dominio/salud.ts` y
  `creditos.ts`, y 36 pruebas nuevas (`salud.spec.ts`, `creditos.spec.ts`,
  `panorama.spec.ts`). El MCP queda en **12 tools y 78 pruebas**. Verificado por HTTP
  contra el servidor real: `/health` lista 12, y el ciclo `aplicar_plan_pago` →
  `panorama_inicial` devuelve `plan_activo`.
- **09:50 · nota** — Las tres tools no inventan un dato: abren tablas que ya estaban en
  `db/datos/` y que ninguna tool podía ver (`diagnostico_habitos`, `creditos`,
  `amortizaciones`, `productos_credito`). El contraste completo está en
  `docs/arquitectura/roadmap-mcp.md`.
- **09:45 · nota** — Dos hallazgos de los datos que valen para el pitch: la deuda total
  que calcula `consultar_creditos` cuadra **al centavo** con `buro.deuda_total_centavos`
  (Beto: 7,692,665 = 2,954,065 del crédito de nómina + 4,738,600 de la tarjeta), y el
  ratio deuda/ingreso cuadra con el que `diagnostico_habitos` reporta por su cuenta
  (0.1583). Son dos cálculos independientes sobre las mismas personas; las pruebas los
  fijan como invariante.
- **09:40 · a-medias** — Nada del Paquete 1 queda a medias. Lo que sigue sin existir es
  el Paquete 2 (`crear_tope_gasto`, `detectar_fugas`, `cancelar_suscripcion`), con su
  encargo escrito en `docs/arquitectura/paquete-2-gasto-fugas-y-control.md`.
- **09:30 · toque-ajeno** — `scripts/humo.sh` tenía el número de tools fijo en 9 y mi
  cambio lo rompía. Lo actualicé a 12 y le agregué cobertura de las tres nuevas, más la
  comprobación de que reestructurar **no borra** la deuda (pasa de revolvente a
  diferida). No pude correrlo tal cual: esta máquina no tiene `jq`. Lo verifiqué con un
  equivalente en Node contra el MCP levantado, y todo pasó.
- **09:10 · nota** — Registrado el issue
  `2026-09-12-catalogo-sin-types-react-dom.md`: `packages/catalogo` no declara
  `@types/react-dom` y `pnpm typecheck` falla desde la raíz en una instalación limpia.
  Es de dominio `web` y no lo arreglé de paso. Sin número de GitHub: no hay `gh` en esta
  máquina y `git pull` devuelve `Repository not found`.
- **09:00 · nota** — Esta máquina no traía `node_modules` ni `pnpm`. Se instaló pnpm
  10.32.1 con `corepack prepare` y los shims en `%LOCALAPPDATA%\corepack-shims`
  (`corepack enable` falla sin permisos de admin sobre `C:\Program Files\nodejs`).
  `pnpm install --frozen-lockfile` corrió limpio. No se usó npm ni yarn.
- **08:45 · inicio** — Tomo el rol `mcp`. Voy por el Paquete 1 del roadmap del MCP.
