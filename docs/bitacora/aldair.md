# Bitácora de aldair

## 2026-09-13

- **10:12 · hecho** — Cerrado el pendiente que dejé anoche (23:41): el usuario probó la voz
  de verdad y reportó dos cosas "desconectadas" — Maya decía "entendí tu pregunta" antes de
  que el MCP contestara, y luego "tardó mucho, intenta más tarde" justo cuando la pantalla
  ya estaba armada. Las dos eran configuración del agente de ElevenLabs, no del código:
  `pre_tool_speech: "auto"` (default) lo hacía hablar antes de la tool cuando detectaba
  latencia, y `response_timeout_secs: 20` (default) se agotaba contra un turno que puede
  tardar hasta `TIMEOUT_TURNO_MS` (30 s). Con el usuario en modo plan decidimos: (1) el
  agente queda callado mientras el MCP piensa, (2) habla apenas la pantalla está lista, no
  antes ni un momento después. Hecho:
  - `usar-agente.ts`: `enviar`/`enviarTexto` ganan un segundo parámetro opcional
    `{ alResponder }` que dispara UNA vez con la primera línea `texto` del stream — antes
    de que el turno termine de cerrar (transparencia, sugerencias). Es lo que deja a la voz
    arrancar en el momento exacto, no unos segundos después por trabajo que no le importa.
  - `consola-maya.tsx`: `consultar_maya` ahora resuelve su promesa en cuanto `alResponder`
    dispara (una carrera contra el `enviarTexto` completo, que sigue de respaldo si el turno
    termina sin decir nada).
  - `barra-conversacion.tsx`: el botón de mic ya no se deshabilita por `ocupado` mientras hay
    sesión de voz activa (antes no se podía colgar mientras Maya procesaba).
  - **Config del agente versionada en el repo**: `scripts/voz/agente-elevenlabs.json`
    (prompt de 4 reglas, `first_message: ""`, la tool `consultar_maya` con
    `pre_tool_speech: "off"`, `response_timeout_secs: 45`, `interruption_mode:
    "disable_during_tool"`) + `scripts/configurar-voz.mjs` (`pnpm voz:configurar [--dry]`):
    idempotente, busca la tool por nombre (crea o actualiza), y hace `PATCH` al agente con
    el objeto `agent` COMPLETO para no perder la voz/LLM elegidos a mano en el dashboard.
    **Aplicado de verdad** contra el agente real de la cuenta MLH — confirmado con `--dry`
    antes (el payload no tocaba `tts` ni `llm`) y con el `PATCH` real después.
  - Prueba nueva `agente-elevenlabs.spec.ts` que amarra `response_timeout_secs >
    TIMEOUT_TURNO_MS / 1000`: si alguien sube el timeout del turno sin subir el de la tool,
    la prueba truena antes que la demo.
  - typecheck y `pnpm test` (319 pruebas) en verde. Doc actualizado:
    `docs/como-funciona/premio-elevenlabs.md` (nueva sección "Configuración del agente en
    ElevenLabs" con la tabla de cada campo y su porqué).
  - **No verificado**: un turno de voz completo con micrófono real (el entorno de esta
    sesión no tiene uno). **Sigue pendiente** (sin cambios desde anoche): el botón de voz en
    Inicio, porque `BarraFlotanteMaya` es ahora un flujo distinto (`preguntarEnInicio`, sin
    `usarAgente`).
- **03:20 · toque-ajeno** — El sync trajo 10 commits (sergio: masonry y transición de Inicio;
  parlack: corridas en PostgreSQL, docs en Astro) y chocó en 10 archivos. Resuelto conservando
  todo: `Lienzo` combina `acomodo="masonry"` con `decorar` (`PiezaDecorada` sirve a los dos),
  `BarraFlotanteMaya` usa `useTransicionDeInicio` sin modo vivo, la portada de widgets graba su
  corrida igual que la de parlack, y `InicioVivo` también va en masonry. **Mi migración pasó a
  `0005-procedencia-widgets.sql`**: parlack ya tenía una `0004` (las dos son idempotentes; la base
  ya las tiene). El `armarMensajes` nuevo completa defaults del schema, así que «la tarjeta queda
  igual» ahora compara solo lo que produce el widget. 288 pruebas en web en verde.
- **02:45 · hecho** — **Widgets vivos** construidos de punta a punta detrás de
  `FEATURE_WIDGETS_VIVOS` (plan en `docs/equipo/plan-widgets-vivos.md`, fases 0 a 7). Viene de
  la revisión con Banorte: preguntar en Inicio se sentía como cambiar de diapositiva, y el equipo
  pidió que las cifras tras un cambio salieran del MCP y no de Gemini. Quedó: `lib/widgets/`
  (13 fuentes con adaptador, consultor con lista blanca, `pintar_widgets`, turno con
  `modificar_widget`/`reemplazar_widget`/`responder`, verificador de cifras, auditor),
  `POST /api/inicio/widget` en stream, migración 0005, y la UI (`InicioVivo`, pie por tarjeta,
  velo solo en la tarjeta en foco). ADR 0011 y `docs/como-funciona/widgets-vivos.md`.
- **02:40 · nota** — Medido: la portada por fuentes cuesta ~7–8.5 mil tokens de entrada y
  300–400 de salida en 2–6 s (antes ~22 mil / 1–1.7 mil en 7.7–11.6 s). `pnpm probar-widgets`
  con el modelo real: 6 de 6, 1.1–2.4 s por pregunta, auditoría en 0 diferencias. 605 pruebas
  en verde (web 229, mcp 135).
- **02:10 · decisión** — El turno de widgets va con `gemini-3.5-flash-lite` y
  `thinkingLevel: minimal` (`MODELO_WIDGETS`): `gemini-3.8-flash` tardaba 7–20 s en cerrar una
  tool. Esa noche el proveedor tuvo varianza alta (mismo turno trivial: 0.5 s, 8 s, >30 s), así
  que un intento que no cierra en 11 s se repite una vez; todas las tools del turno son de lectura.
- **01:55 · decisión** — El modo NO entra a la huella del Inicio. La base es compartida con
  producción; con el modo en la huella, local (flag en 1) y producción (flag en 0) se habrían
  rearmado la portada uno al otro en cada tick. En su lugar, `vencida` trata como vencida una
  portada sin procedencias solo donde el flag está encendido.
- **01:30 · toque-ajeno** — Dominio `contrato` y `web`: `lib/agente/pantalla.ts` exporta
  `completarAccion`; `components/maya/lienzo.tsx` recibe `decorar` (opcional, la conversación no
  lo usa); `BarraFlotanteMaya` tiene un modo `vivo` (sin él, igual que antes). MCP:
  `simular_rebalanceo` (lectura) y `ahorroLiquidoCentavos` en `diagnostico_salud_financiera`.
- **01:15 · nota** — Registrado `docs/issues/2026-09-13-cifras-escritas-por-el-modelo-en-maya.md`:
  en `/maya` las props con cifras las sigue escribiendo el modelo (portadas guardadas con
  «$2,954,065» por $29,540.65). Sin número de GitHub: no hay `gh` en esta máquina.
- **01:00 · a-medias** — Fase 8 del plan (llevar las fuentes a `/maya`) no se hizo; es el issue
  de arriba. Para ver los widgets vivos en local: `FEATURE_WIDGETS_VIVOS=1` en `.env`, reiniciar
  `pnpm dev`, y la primera visita rearma las portadas.
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

- **23:41 · hecho** — Terminada la conexión real de la voz (seguía de las 19:21): el
  usuario ya había llenado `.env` con la cuenta MLH y pidió que el push-to-talk del
  chat de Maya de verdad corriera nuestro flujo. Cambié el diseño: el agente de voz de
  ElevenLabs NO improvisa la respuesta — llama una client tool `consultar_maya` que es
  literalmente `enviarTexto` de `usarAgente`, así que el turno de voz es el MISMO turno
  que el de texto (misma pantalla, mismos datos), y el texto que Maya dice lo lee
  ElevenLabs en voz alta. Para eso `enviarTexto`/`enviarAccion` en
  `apps/web/src/lib/agente/usar-agente.ts` ahora **devuelven** el texto hablable del
  turno (antes `Promise<void>`), con frase de respaldo si el turno no dijo nada.
  `usar-conversacion-voz.ts` ganó `clientTools` en `iniciar(herramientas)`.
  `BarraConversacion` (`apps/web/src/components/maya/barra-conversacion.tsx`) dejó de
  fingir un `escuchando` local: ahora es controlada (`estadoVoz`/`alAlternarVoz` desde
  `ConsolaMaya`), y el botón desaparece si `FEATURE_VOZ` está apagado. `?voz=1` en
  `/maya` arranca la sesión sola (atajo pensado para un botón de Inicio). **Verificado
  en vivo** con Chrome automatizado y las credenciales MLH reales: reinstalé deps
  (`three`/`@react-three/fiber` de otra sesión no estaban instaladas), reinicié
  `pnpm dev` (maté el proceso viejo en :3000, que no traía el `.env` nuevo), y
  `/api/voz/signed-url` devolvió una `wss://` real de ElevenLabs; el botón hizo el
  ciclo completo conectando → escuchando → colgado sin errores en consola. Typecheck y
  `pnpm test` (123 pruebas) en verde. **No verificado**: un turno de voz completo
  hablado, porque falta configurar la tool `consultar_maya` en la consola de
  ElevenLabs (documentado en el doc) y no hay micrófono real en el entorno de prueba.
  **A medias a propósito**: el botón de voz de Inicio, porque `BarraFlotanteMaya`
  cambió de diseño en paralelo (ahora es texto → `preguntarEnInicio`, sin mic) — lo
  dejé anotado como decisión pendiente en vez de adivinar sobre trabajo ajeno en
  vuelo. Doc actualizado con los dos niveles y la config exacta de ElevenLabs:
  `docs/como-funciona/premio-elevenlabs.md`.
- **19:21 · toque-ajeno** — El usuario pidió la integración de voz de ElevenLabs (premio
  lateral, dominio `web`/`demo`, no `mcp`). Construida detrás de `FEATURE_VOZ` (skill
  `premio-lateral`): `@elevenlabs/client` como dependencia,
  `apps/web/src/lib/voz/flag.ts` (`vozHabilitada()`),
  `apps/web/src/app/api/voz/signed-url/route.ts` (única pieza que conoce
  `ELEVENLABS_API_KEY`/`ELEVENLABS_AGENT_ID`, timeout de 3 s contra ElevenLabs), y el
  hook `apps/web/src/lib/voz/usar-conversacion-voz.ts` (`usarConversacionVoz`) que
  entrega la transcripción por `onTranscripcionUsuario` — pensado para conectarse a
  `enviarTexto` de `usarAgente` cuando el botón exista. Con el flag apagado (default),
  `pnpm dev` + `curl /api/voz/signed-url` responde 404 sin tocar la red; typecheck y
  `pnpm test` (71 pruebas, incluye `flag.spec.ts` nuevo) en verde. Doc en
  `docs/como-funciona/premio-elevenlabs.md`, nota de estado en
  `docs/reto/premios-objetivo.md`. **Queda a medias a propósito**: nadie llama al hook
  todavía — falta que `web` conecte el botón de la pantalla principal y el del chat de
  Maya, y que se cree el agente conversacional en la consola de ElevenLabs con los
  créditos de MLH.
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
