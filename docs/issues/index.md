# Registro de hallazgos (issues)

Aquí se anotan bugs, riesgos y deudas que alguien encuentra **mientras hacía otra
cosa**, y también los bugs propios que se deciden no arreglar ahora. El hallazgo
casual es el más fácil de perder: quien lo ve está ocupado en otro problema y, si no
lo escribe en ese momento, desaparece. En un hackathon, además, ese bug reaparece en
la demo.

**Cada hallazgo vive en dos lugares, siempre:** un archivo aquí (el detalle, con
archivo y línea) y un issue en GitHub (`Ghekkin/Reto-Banorte-hack-mty`, la visibilidad
para todo el equipo y el cierre automático con `Fixes #N`). Se crean los dos en el
mismo momento. Un archivo sin `github:` o un issue de GitHub sin archivo están a medias.

## Cuándo escribir aquí

- Encontraste un fallo real en el código que no es parte de tu tarea.
- Dejaste algo funcionando "por ahora" que sabes que se va a romper.
- Una dependencia rompe algo o tiene una versión problemática.
- El código hace algo distinto de lo que dice un doc.

## Cuándo NO escribir aquí

- Ideas de features. Eso va a `bitacora.md` como "idea", o a `reto/`.
- Cosas que arreglaste como parte de tu tarea normal (eso va en el commit).

## Reglas

- Un archivo por hallazgo: `YYYY-MM-DD-slug-corto.md`.
- **Sin archivo y línea, el issue no sirve.**
- **Se sube a GitHub en el momento**, con `gh issue create`, y el número va al
  frontmatter `github:`. Si todavía no tiene número, **no escribas el campo** (ni vacío
  ni con guión: un barrido automático lo daría por publicado).
- Etiquetas en GitHub: la severidad (`critica`, `alta`, `media`, `baja`) y el área
  (`web`, `mcp`, `schemas`, `ml`, `docs`, `infra`). Si no existen, se crean con
  `gh label create`.
- Si lo resuelves en la misma sesión: `estado: resuelto`, `resuelto-en:` con el hash,
  y el commit lleva `Fixes #N` para que GitHub lo cierre al hacer push. No se borra el
  archivo ni se cierra el issue a mano: `Fixes #N` lo cierra; si el arreglo vive fuera
  del código (una variable de entorno, una decisión), entonces sí `gh issue close N`
  con un comentario que diga por qué.
- Se agrega una fila a la tabla de abajo en el mismo commit.

## Formato del archivo

```markdown
---
estado: abierto        # abierto | resuelto | descartado
severidad: media       # critica (rompe la demo) | alta | media | baja
area: mcp              # web | mcp | schemas | ml | docs | infra
encontrado: 2026-09-11 15:20
github: 7              # número del issue; solo cuando ya exista
resuelto-en:           # hash del commit, solo si estado: resuelto
---

# Título en una línea, concreto

**Dónde:** `apps/mcp/src/tools/movimientos.ts:42`

**Qué esperaba:** ...

**Qué pasa:** ...

**Cómo lo reproduje / por qué estoy seguro:** ...

**Impacto en la demo:** ninguno | se nota si ... | la rompe
```

## Formato del issue en GitHub

Mismo título que el archivo. El cuerpo es el contenido del archivo sin frontmatter, más
una última línea `Ficha: docs/issues/YYYY-MM-DD-slug-corto.md`.

```bash
gh issue create \
  --repo Ghekkin/Reto-Banorte-hack-mty \
  --title "Título en una línea, concreto" \
  --label media --label mcp \
  --body-file /ruta/al/cuerpo.md
```

## Tabla

| Fecha | Sev. | Área | Título | GitHub | Estado |
|---|---|---|---|---|---|
| 2026-09-12 | crítica | infra | [El PostgreSQL remoto no es alcanzable desde la máquina de desarrollo](2026-09-12-postgres-remoto-inalcanzable.md) | [#1](https://github.com/Ghekkin/Reto-Banorte-hack-mty/issues/1) | resuelto |
| 2026-09-12 | media | docs | [Los datos mock incluyen un tercer perfil e Inversiones, que el ADR 0004 excluía](2026-09-12-alcance-datos-vs-adr-0004.md) | pendiente (sin `gh`) | resuelto |
| 2026-09-13 | alta | infra | [El token de Coolify en `/opt/reto/.env` rompe el `source`](2026-09-13-env-vps-token-sin-comillas.md) | [#2](https://github.com/Ghekkin/Reto-Banorte-hack-mty/issues/2) | resuelto |
| 2026-09-12 | media | web | [El agente recibe como "pantalla actual" todos los componentes de la conversación, no los visibles](2026-09-12-componentes-visibles-acumulados.md) | [#3](https://github.com/Ghekkin/Reto-Banorte-hack-mty/issues/3) | resuelto |
| 2026-09-12 | media | web | [`packages/catalogo` no declara `@types/react-dom` y `pnpm typecheck` falla en toda la raíz](2026-09-12-catalogo-sin-types-react-dom.md) | pendiente (sin `gh`) | resuelto |
| 2026-09-13 | alta | docs | [`CLAUDE.md` tiene marcadores de conflicto commiteados](2026-09-13-claude-md-conflicto-commiteado.md) | [#4](https://github.com/Ghekkin/Reto-Banorte-hack-mty/issues/4) | resuelto |
| 2026-09-13 | crítica | infra | [En producción el agente no alcanzaba el MCP: `MCP_URL` a un hostname que no resuelve](2026-09-13-mcp-url-interna-no-resuelve.md) | [#5](https://github.com/Ghekkin/Reto-Banorte-hack-mty/issues/5) | resuelto |
| 2026-09-13 | media | mcp | [Las tools de Inversiones contradicen la enmienda del ADR 0004](2026-09-13-tools-inversiones-contradicen-adr-0004.md) | pendiente (sin `gh`) | resuelto |
| 2026-09-13 | alta | web | [`pnpm typecheck` falla en `packages/catalogo` y eso bloquea todos los deploys](2026-09-13-typecheck-catalogo-bloquea-deploys.md) | [#7](https://github.com/Ghekkin/Reto-Banorte-hack-mty/issues/7) | resuelto |
| 2026-09-13 | alta | infra | [El índice de git es compartido: un `git commit` se lleva el trabajo a medio hacer de otra sesión](2026-09-13-indice-de-git-compartido.md) | [#8](https://github.com/Ghekkin/Reto-Banorte-hack-mty/issues/8) | resuelto |
| 2026-09-12 | crítica | mcp | [`pnpm reiniciar-estado` dice que vació la tabla y no borró nada](2026-09-12-reiniciar-estado-no-borra-nada.md) | [#9](https://github.com/Ghekkin/Reto-Banorte-hack-mty/issues/9) | resuelto |
| 2026-09-12 | alta | infra | [`pnpm datos:restaurar` no puede repoblar una base vacía: el orden de tablas viola una llave foránea](2026-09-12-restaurar-orden-de-tablas.md) | [#10](https://github.com/Ghekkin/Reto-Banorte-hack-mty/issues/10) | resuelto |
| 2026-09-12 | alta | mcp | [El aislamiento de las pruebas depende de que `DATABASE_URL` esté vacía: cargar el `.env` hace que `pnpm test` escriba en la base de la demo](2026-09-12-pruebas-escriben-en-la-base-real.md) | pendiente (sin `gh`) | resuelto |
| 2026-09-12 | crítica | web | [`main` roto: marcadores de conflicto commiteados en el prompt del agente](2026-09-12-prompt-con-marcadores-de-conflicto.md) | [#11](https://github.com/Ghekkin/Reto-Banorte-hack-mty/issues/11) | resuelto |
| 2026-09-12 | media | web | [`lienzo-pinta.spec.ts` no arranca en Windows: `.pathname` de una `file://` URL no es una ruta válida](2026-09-12-jsonl-de-ejemplo-con-pathname-en-windows.md) | pendiente (sin `gh`) | resuelto |
| 2026-09-12 | crítica | infra | [La demo está caída: el proyecto de Gemini pasó su tope de gasto mensual](2026-09-12-gemini-sin-cuota.md) | [#12](https://github.com/Ghekkin/Reto-Banorte-hack-mty/issues/12) | **abierto** (cuota/spend cap de API externa) |
| 2026-09-12 | baja | docs | [Los docs fechan el trabajo del sábado como 2026-09-13](2026-09-12-fechas-de-docs-un-dia-adelante.md) | pendiente (sin `gh`) | resuelto |
| 2026-09-12 | media | web | [El agente le pone heroe a SimuladorMeta, que no lo declara, y el turno gasta un paso en reintentar](2026-09-12-heroe-en-simulador-meta.md) | [#14](https://github.com/Ghekkin/Reto-Banorte-hack-mty/issues/14) | resuelto |
| 2026-09-12 | alta | infra | [Coolify guarda una imagen por commit y el disco del VPS se llena: los deploys de la web fallan al exportar la imagen](2026-09-12-disco-del-vps-lleno-de-imagenes-viejas.md) | [#15](https://github.com/Ghekkin/Reto-Banorte-hack-mty/issues/15) | resuelto |
| 2026-09-12 | alta | web | [El agente confirma un rebalanceo que nunca se ejecutó: seis widgets disparan acciones que ninguna tool atiende](2026-09-12-agente-confirma-rebalanceo-que-no-existe.md) | [#16](https://github.com/Ghekkin/Reto-Banorte-hack-mty/issues/16) | resuelto |
| 2026-09-13 | media | web | [El log de tokens del agente y de la portada cuenta solo el último paso del turno](2026-09-13-log-de-tokens-solo-ultimo-paso.md) | [#17](https://github.com/Ghekkin/Reto-Banorte-hack-mty/issues/17) | resuelto |
| 2026-09-13 | alta | web | [El prompt del agente pide props y tools que se revirtieron: cada turno gastaba una petición en reintentar](2026-09-13-prompt-apunta-a-lo-revertido.md) | [#18](https://github.com/Ghekkin/Reto-Banorte-hack-mty/issues/18) | resuelto |
| 2026-09-13 | media | web | [`ProyeccionCrecimiento` le dice al modelo que ya llamó `proyectar_inversion`, una tool que no existe en `main`](2026-09-13-proyeccion-crecimiento-sin-tool.md) | [#19](https://github.com/Ghekkin/Reto-Banorte-hack-mty/issues/19) | abierto |
| 2026-09-13 | baja | web | [El `Spinner` anuncia "Loading" en inglés en los botones de enviar](2026-09-13-spinner-anuncia-loading-en-ingles.md) | [#20](https://github.com/Ghekkin/Reto-Banorte-hack-mty/issues/20) | abierto |
| 2026-09-13 | crítica | web | [`main` roto: `pantalla.ts` exige `montoCentavos` en `Conclusion` y el schema exige `valor`, así que ninguna pantalla con montos pasa](2026-09-13-conclusion-rechaza-montos-en-valor.md) | [#21](https://github.com/Ghekkin/Reto-Banorte-hack-mty/issues/21) | resuelto |
