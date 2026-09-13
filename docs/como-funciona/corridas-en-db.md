---
verificado: 2026-09-13 02:15 (hora de Monterrey)
estado: construido
---

# Todo lo que pasa queda en la base: corridas, chat y registros

Piezas: `db/migraciones/0004-corridas-chat-y-registros.sql`, `db/migraciones/0008-corridas-de-widgets.sql`,
`apps/web/src/lib/corridas/grabadora.ts`, `apps/web/src/lib/corridas/escritor.ts`,
`apps/web/src/lib/agente/agente.ts`, `apps/web/src/lib/inicio/generar.ts`,
`apps/web/src/lib/widgets/turno.ts`, `apps/web/src/app/api/inicio/widget/route.ts`,
`apps/mcp/src/datos/registros.ts`, `apps/mcp/src/tools/registro.ts` y `scripts/corridas.mjs`.

## Para cualquiera

Cada vez que un modelo trabaja se guarda una **corrida**. Hay tres casos: alguien le escribe
a Maya, se arma una portada del Inicio, o alguien le pregunta algo a una tarjeta del Inicio
(widgets vivos). Una corrida responde, sin adivinar:

- **quién** preguntó, **qué** preguntó y en qué conversación;
- **con qué modelo** corrió (proveedor, versión exacta, nivel de pensamiento) y con qué
  configuración (flags, tope de pasos, tiempo máximo);
- **qué herramientas se le ofrecieron** y con qué instrucciones (el system prompt completo);
- **cada ida y vuelta con el modelo**: qué tools podía usar en ese paso, qué pidió y
  cuántos tokens gastó, cuántos salieron del caché;
- **cada herramienta que se llamó**: con qué argumentos, qué devolvió, si falló y cuánto tardó;
- **qué vio la persona**: cada línea que salió hacia el navegador, incluida la pantalla;
- **cómo terminó**: bien, sin pantalla, con error, por tiempo o porque la persona se fue.

Además quedan el **chat** (cada mensaje de la persona y de Maya, cada uno ligado a su
corrida) y los **registros**: los logs de la web, del agente, del Inicio y del MCP, que
antes solo salían en la consola.

Para verlo desde la terminal:

```bash
pnpm corridas                  # las últimas 20: quién, modelo, estado, tokens, tools
pnpm corridas --errores        # solo las que no terminaron bien
pnpm corridas cor_xxx          # una completa, paso por paso
pnpm corridas --chat c_xxx     # una conversación
pnpm corridas --registros      # los últimos logs de todo
```

Para encontrar la corrida de algo que acabas de ver en pantalla: el `fin` de la respuesta de
`/api/agente` trae `corridaId` (en las herramientas del navegador, pestaña Red).

La grabación **nunca frena a Maya**: se escribe en segundo plano cuando el turno termina, y
si la base falla el turno sigue igual (el aviso sale en consola). Con
`FEATURE_CORRIDAS_EN_DB=0` no se graba nada.

## Para quien toca el código

### Las tablas (migración 0004)

| Tabla | Una fila por | Lo importante |
|---|---|---|
| `corridas` | turno, portada o pregunta a una tarjeta | `tipo` (`turno`, `portada`, `widget`), `estado`, `proveedor`/`modelo`, `opciones_proveedor`, `config`, `tools_ofrecidas`, `peticion`, `mensajes_modelo` (sin system), `lineas`, tokens totales, `ms`, `error` |
| `corrida_pasos` | petición al modelo | `tools_activas` y `tool_choice` (lo que decidió `prepareStep`), `finish_reason`, `modelo_respuesta`, tokens del paso, `llamadas`, `advertencias`, `metadata_proveedor` |
| `corrida_tools` | llamada a tool | `paso` (-1 = prefetch del host), `origen` (`mcp`, `host`, `cierre`, `prefetch`), `argumentos`, `resultado`, `ok`, `error`, `ms` |
| `prompts` | texto distinto | el system prompt (`sistema`) y las definiciones de tools (`tools`), por hash: 70 KB que no se repiten en cada corrida |
| `conversaciones` | `conversacionId` | `usuario_id`, `turnos`, fechas |
| `mensajes_chat` | mensaje | `rol` (`usuario`, `accion`, `aviso_interfaz`, `agente`), `texto`, `datos` (A2UI, razón, sugerencias, errores o el `action` completo), `corrida_id` |
| `registros` | log | `fuente` (`web`, `agente`, `inicio`, `mcp`), `nivel`, `evento`, `corrida_id`, `usuario_id`, `datos` |

Ninguna entra en `reiniciar.sql`: reiniciar la demo borra el estado de las acciones, no la
historia. **El MCP no las carga a memoria** (`TABLAS_DE_HISTORIA` en
`apps/mcp/src/datos/postgres.ts`) y **no entran al volcado de pruebas**
(`scripts/volcar-fixture.mjs`): crecen con cada turno y ninguna tool las lee.

Desde la migración 0007, `corridas` y `conversaciones` llevan también `dispositivo_id`: de qué
visitante fue (`null` = estado común, un script o el reloj). Ver `estado-por-dispositivo.md`.

Desde la migración 0008 (issue #35), `corridas.tipo` admite también `widget`: una pregunta a una
tarjeta de Inicio (`POST /api/inicio/widget`). Antes esa llamada al modelo no dejaba nada en la
base y era el único consumo que no se podía medir. No lleva chat (`mensajes_chat`): la pregunta va
en `peticion` y la respuesta en `lineas` (el `fin`, con la auditoría) y en `texto`.

```sql
-- cuanto cuestan las preguntas a tarjetas, por como cerraron
select cierre, estado, count(*), avg(tokens_entrada)::int as entrada, avg(tokens_salida)::int as salida, avg(ms)::int as ms
  from banorte.corridas where tipo = 'widget' group by 1, 2 order by 3 desc;
```

```sql
select dispositivo_id, count(*) as turnos, max(iniciada_en) as ultimo
  from banorte.corridas where dispositivo_id is not null
 group by 1 order by ultimo desc;
```

### Cómo se graba

`crearGrabadora()` junta todo **en memoria** y se lo entrega a un `Escritor`. La separación
es lo que permite probarla sin base (`__tests__/grabadora.spec.ts` usa un escritor que solo
guarda) y lo que garantiza que el turno no espere a PostgreSQL.

1. `correrTurno` crea la grabadora y envuelve el generador del turno: cada línea que sale
   pasa por `grabadora.linea()`, y el `fin` recibe `corridaId`.
2. Antes de llamar al modelo, `configurar()` fija el modelo (el objeto real: `provider` y
   `modelId`), las opciones, la configuración, el system prompt, los mensajes y las tools. En
   ese momento se escribe la fila con `estado = 'corriendo'`: si el proceso muere a medio
   turno, queda eso.
3. `prepareStep` llama `pasoPreparado()`, `onStepFinish` llama `paso()`, y el `fullStream`
   llama `toolPedida()`/`toolTermino()` con los argumentos y la salida de cada tool. El
   prefetch de `panorama_inicial` (y los datos que reúne la portada) entran por `toolDelHost()`.
4. Al final, `resumir()` pone estado, cierre, pasos, `totalUsage` y error. `terminar()` (en el
   `finally` del generador, así corre aunque la persona cierre la pestaña) encola la escritura
   final: prompts por hash, la corrida con `upsert`, pasos, tools y el chat.

**Una pregunta a una tarjeta** (`widget`) sigue los mismos pasos repartidos en dos lugares. La
ruta `POST /api/inicio/widget` crea la grabadora, graba cada línea que emite, pone `estado =
'error'` si la auditoría encuentra diferencias y llama `terminar()` en su `finally`. `turnoDeWidget`
recibe esa grabadora (`opciones.grabadora`) y hace `configurar`, `pasoPreparado`, `paso`,
`toolPedida`/`toolTermino` y `resumir`; las consultas que el servidor hace para rearmar la tarjeta
entran por `toolDelHost()` (`paso = -1`). El turno puede intentar dos veces si el proveedor no
contesta a tiempo: los pasos se numeran seguidos y el total suma `totalUsage` de cada intento (o
los pasos que llegaron, si el intento se cortó). Llamado sin grabadora (las pruebas), el turno crea
la suya con `opciones.escritor` y la cierra él.

Las escrituras van en una sola cola por corrida, y un fallo se avisa **una vez** en consola.
Un JSON de más de 200 KB se guarda recortado y marcado (`acotar()`).

### Qué apaga la grabación

`corridasActivas()` en `escritor.ts`: `FEATURE_CORRIDAS_EN_DB=0`, sin `DATABASE_URL`, o dentro
de vitest (`VITEST`/`NODE_ENV=test`). La última es la regla del ADR 0010: **ninguna prueba
escribe en la base de la demo**, aunque la shell tenga `DATABASE_URL` exportada. Con la
grabación apagada, el `fin` no lleva `corridaId`.

### El lado del MCP

`registrarTool` (`apps/mcp/src/tools/registro.ts`) escribe cada llamada en `registros` con
fuente `mcp`: argumentos, `ok`, `ms`, bytes y el motivo si falló. El agente manda su
`corridaId` en el `_meta` de `callTool` (`mcp-cliente.ts`), así que el lado del MCP queda
ligado a la corrida. Si la llamada viene de otro cliente (humo, un inspector), no hay corrida
y el registro guarda también el resultado.

### Consultas útiles

```sql
-- cuánto cuesta cada tipo de corrida hoy
select tipo, modelo, count(*), avg(tokens_entrada)::int as entrada, avg(tokens_cache)::int as cache, avg(ms)::int as ms
  from banorte.corridas where iniciada_en > now() - interval '1 day' group by 1, 2;

-- las tools que más fallan
select nombre, count(*) filter (where not ok) as fallos, count(*) from banorte.corrida_tools group by 1 order by 2 desc;

-- los pasos con pantallas rechazadas
select c.id, t.paso, t.resultado->'errores' from banorte.corrida_tools t join banorte.corridas c on c.id = t.corrida_id
 where t.nombre = 'pintar_pantalla' and not t.ok order by t.id desc limit 20;
```

### Verificado (2026-09-13 02:12, local, modelo real)

- Turno de Beto, "¿En qué se me fue el dinero este mes?": `cor_8bb09a…`, `gemini-3.8-flash`,
  2 pasos (26,100 y 28,005 tokens de entrada; 24,448 desde caché en el segundo), 3 tools
  (`panorama_inicial` prefetch, `analizar_gasto`, `pintar_pantalla`) con argumentos y
  resultados, 12 líneas del stream y 3 registros ligados (2 del MCP por `_meta`).
- Segundo turno en la misma conversación ("¿qué significa el porcentaje?"): cerró con
  `responder`, y `pnpm corridas --chat` muestra los 4 mensajes con sus corridas.
- Portada de Ana forzada por `POST /api/inicio`: `tipo = portada`, `motivo = manual`,
  `gemini-3.5-flash-lite`, 2 pasos, 59,669 tokens de entrada, las 4 tools del prefetch.

### Pruebas

`apps/web/src/lib/corridas/__tests__/grabadora.spec.ts` (9): el `fin` lleva el `corridaId` de la
fila; la fila temprana dice `corriendo` y la final `ok` con tokens sumados de todos los
pasos; modelo, tools ofrecidas y prompt por hash; cada paso y cada tool con argumentos y
resultado; líneas y chat; sin escritor no hay `corridaId`; la portada con tipo, motivo y
pantalla; el escritor real apagado en vitest; y el recorte de JSON grandes.

`apps/web/src/lib/corridas/__tests__/corrida-de-widget.spec.ts` (7): la pregunta a una tarjeta
queda con tipo `widget`, persona, dispositivo, motivo `foco:<id>`, `peticion` y cierre; los tokens
son la suma de los pasos y cada paso guarda los suyos; tools ofrecidas y cada llamada con su paso y
origen (incluida la consulta del servidor en `paso = -1`); las líneas; un turno que no cierra queda
con estado y error; una base que rechaza la corrida (la 0008 sin aplicar) no tumba la respuesta y
avisa una sola vez; y sin escritor no hay `corridaId`.
