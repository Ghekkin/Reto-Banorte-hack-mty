# Roles

Cuatro personas, cuatro roles. Un rol es **responsabilidad**, no territorio: el dueño
decide y mantiene el doc de su dominio, pero **cualquiera puede tocar cualquier
archivo**. Lo que evita que nos pisemos no es la prohibición, son las reglas de abajo.

## Los cuatro roles

| Rol | Dueño de | Decide sobre | Su doc |
|---|---|---|---|
| **web** | `apps/web/` | El host: chat, streaming, componentes generados, diseño | `docs/como-funciona/` de cada componente |
| **mcp** | `apps/mcp/`, datos mock | Las tools, sus descripciones, el servidor, la capa de datos | `docs/como-funciona/` de cada tool |
| **contrato** | `packages/schemas/`, el pegamento agente↔tools (loop del AI SDK, cliente MCP, `registry.ts`) | Qué schemas existen, cómo se llama una tool desde el host, qué componente pinta cada `tipo` | `docs/arquitectura/` |
| **demo** | Deploy, dominio, guion, pitch, docs transversales, triage de issues, premios laterales | Qué entra a la demo y qué no; cuándo se congela | `docs/demo/`, `docs/reto/` |

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

Un cambio de schema en `packages/schemas` **no está terminado** hasta que el mock de
la tool y el componente que lo pinta también cambiaron, en el mismo commit. Quien lo
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
