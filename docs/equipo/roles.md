# Roles

Cuatro personas, cuatro roles. Un rol es **responsabilidad**, no territorio: el dueño
decide y mantiene el doc de su dominio, pero **cualquiera puede tocar cualquier
archivo**. Lo que evita que nos pisemos no es la prohibición, son las reglas de abajo.

## Los cuatro roles

| Rol | Dueño de | Decide sobre | Su doc |
|---|---|---|---|
| **web** | `packages/catalogo/` (componentes A2UI propios: schema, React, ejemplos, tokens) y la cara visible de `apps/web` (layout, chat, tema) | Qué componentes existen, cómo se ven, qué props aceptan | `docs/como-funciona/componente-*.md` |
| **mcp** | `apps/mcp/`, datos sintéticos, estado mutable | Las tools de lectura y de acción, sus descripciones, el servidor, la capa de datos | `docs/como-funciona/tool-*.md`, `datos-mock.md` |
| **contrato** | El agente (`apps/web/src/lib/agente/`), la capa A2UI (renderer, `catalogo.json`, validación), `packages/schemas/` | Cómo el agente elige componentes, cómo cierra el ciclo con las acciones, qué contratos existen | `docs/arquitectura/` |
| **demo** | Guion, pitch, `README.md`, `trade-offs.md`, deploy, dominio, triage de issues, premios laterales | Qué entra a la demo y qué no; cuándo se congela; que los 4 entregables existan | `docs/demo/`, `docs/reto/` |

`contrato` es el rol que arbitra cuando front y back se cruzan, que es la mayor parte
del tiempo. `demo` no es el puesto de castigo: es quien llega al domingo con la
historia armada y el `estable` funcionando.

## Cuando tocas un dominio ajeno

Va a pasar todo el tiempo y está bien. El procedimiento:

1. **Pull antes de tocar.** El hook de inicio ya lo hace; si llevas rato, `scripts/sync.sh`.
2. **Cambio chico y completo.** Lo mínimo para desbloquearte, sin refactors de lo ajeno.
3. **Commit separado** de lo tuyo, con el dominio en el mensaje: `[ana/web] mcp: agrego campo categoria a consultar_movimientos`.
4. **Avisa**: una línea en tu bitácora personal y, si el dueño está, de viva voz.
5. Si no estás seguro de cómo hacerlo, **pregunta al dueño** o déjalo detrás de un
   campo opcional / un mock en vez de adivinar.

## La regla del cambio completo

Un cambio de contrato —schema de tool en `packages/schemas` o schema de props de un
componente en `packages/catalogo`— **no está terminado** hasta que todos sus
consumidores cambiaron, en el mismo commit (skill `cambiar-schema`). Quien lo
empieza lo termina. Si no puede terminarlo, agrega el campo como **opcional** para que
nada se rompa mientras tanto.

Esto es lo que hace seguro que cualquiera toque cualquier cosa: nadie deja al otro con
un schema que su lado no entiende.

## Conflictos de git

- Nunca `--force` sobre `main`. El script de sync no lo hace y tú tampoco.
- Quien hace pull resuelve el conflicto. Si el conflicto es en dominio ajeno y no
  sabes qué versión es la buena, la del dueño gana; pregúntale.
- Commits pequeños y frecuentes son la mejor prevención: se suben solos al final de
  cada turno.

## Cambiar de rol

Se puede, en cualquier momento. Actualiza tu fila del tablero y vuelve a correr la
skill `inicio` para que el commit lleve el rol nuevo.
