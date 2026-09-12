---
verificado: 2026-09-12 04:10
estado: construido
---

# El catálogo: los 8 componentes que el agente puede invocar

## Para cualquiera

Maya no dibuja pantallas libremente: tiene una caja con **ocho piezas** y arma cada
pantalla con ellas, como quien arma con bloques. Cada pieza resuelve una sola cosa: una
muestra la tarjeta y cuánto se debe, otra compara plazos para pagar menos intereses, otra
enseña en qué se fue el dinero, otra deja mover cuánto ahorrar y ver cuándo se llega.

Eso es lo que hace que el sistema sea confiable: el agente decide **cuáles** piezas y con
**qué números**, pero no puede inventar una pieza que no existe ni ponerle un dato con la
forma equivocada. Cada pieza sabe pintarse mientras llegan los datos (un esqueleto gris),
qué decir si no hay nada, y qué botón dispara una acción real.

Dos de las ocho tienen botón que cambia cosas de verdad: **aplicar el plan de pago** y
**crear el apartado de ahorro**. Las otras seis muestran, comparan y explican.

## Técnico

### Dónde vive

| Pieza | Ruta |
|---|---|
| Paquete | `packages/catalogo/` — `src/<nombre-kebab>/{schema.ts, componente.tsx, README.md}` |
| Registro | `packages/catalogo/src/index.ts` → `CATALOGO` (schemas) y `registrarCatalogo()` (React) |
| Ejemplos | `packages/catalogo/ejemplos/<nombre-kebab>.jsonl`, uno por componente |
| Catálogo publicado | `packages/catalogo/catalogo.json` (`pnpm catalogo`), servido en `/catalogo/v1.json` |
| Comunes | `packages/catalogo/src/comunes.ts`: `PropsBase` (`ancho`, `razon`), `Heroe`, `Centavos`, formateo |

### Los ocho

| Componente | Fase | Datos que lo llenan | Acción que devuelve |
|---|---|---|---|
| `ResumenTarjeta` | 1, 2 | `consultar_tarjeta` | — (héroe de la pantalla de deuda; tras el plan, "Plan activo") |
| `PlanDePago` | 1 | `simular_reestructura.opciones` | `aplicar_plan_pago` con `{ plazoMeses, tarjetaId }` |
| `Confirmacion` | 1, 3 | la salida de la acción | — |
| `Calendario` | 1, 3 | `consultar_plan.calendario` / aportaciones | — |
| `GastoPorCategoria` | 2 | `comparar_periodos` | `ver_categoria` con `{ categoriaId, categoria }` |
| `DetalleCategoria` | 2 | `consultar_movimientos` | — |
| `SimuladorMeta` | 3 | `proyectar_ahorro` | `crear_apartado` con `{ nombre, montoObjetivoCentavos, aportacionCentavos, frecuencia }` |
| `MetaActiva` | 3 | `crear_apartado.meta` / `proyectar_ahorro` | — |

Las props de cada uno están alineadas con lo que devuelven las tools (mismos nombres,
centavos enteros, fechas `AAAA-MM-DD`): el modelo mapea sin traducir. El detalle de cada
prop está en el `README.md` de su carpeta y en `catalogo.json`.

### Reglas que todos cumplen

- **Sobre primitivas de shadcn** (`card`, `badge`, `progress`, `radio-group`, `slider`,
  `table`, `scroll-area`, `chart`, `skeleton`, `button`), cero hex en el `.tsx`: todo color
  es un token de `globals.css` (skill `diseno-banorte`).
- **Tres estados**: cargando (`Skeleton` del tamaño final: el data model puede llegar
  después que los componentes), vacío (una frase útil), y el normal.
- **Un solo botón primario** en los que tienen acción; **un solo héroe** por pantalla (lo
  valida el agente en `armarMensajes`).
- **El componente nunca hace fetch ni calcula negocio.** La única aritmética local es la
  del `SimuladorMeta` (faltante entre aportación, para mover la fecha con el slider sin ir
  al agente por cada tick; el número autoritativo vuelve de la tool después de la acción)
  y la selección de plazo en `PlanDePago` (estado de interfaz, no de negocio).
- **Acciones = eventos A2UI.** El componente declara `action.event.name` y, al confirmar,
  el renderer resuelve el `context` contra el data model, agrega lo que el componente sabe
  (`contextoExtra`: el plazo o la aportación elegida) y la `idempotencyKey`.

### La galería: `/catalogo`

Una página que pinta **todos** los componentes con el renderer de verdad, a partir de sus
`.jsonl`. Sirve a dos públicos:

- **Al equipo**: es el banco de pruebas. Se ven los ocho con datos y en estado de carga,
  sin llave de modelo y sin el MCP arriba. Si uno se rompe, se ve aquí antes que en la demo.
- **A un juez**: al lado de `/catalogo/v1.json` (el catálogo legible por máquina, el
  `catalogId` de cada superficie) está la misma cosa en pantalla.

Cada ficha trae el `cuandoUsarlo` que lee el modelo, la tabla de props del schema, el
`.jsonl` fuente desplegable, el render con datos y el estado de carga al lado. Y al tocar
el botón de un componente, el pie muestra **el mensaje A2UI que viajaría al agente**
(`{ version, action }` de `client_to_server.json`, con `idempotencyKey`): el ciclo cerrado,
visible sin gastar un turno de modelo.

| Pieza | Ruta |
|---|---|
| Página (server: lee los `.jsonl`) | `apps/web/src/app/catalogo/page.tsx` |
| Galería (cliente: el renderer) | `apps/web/src/app/catalogo/galeria.tsx` |

**No es el producto**: vive fuera del grupo de rutas `(app)`, así que no lleva el shell ni
la navegación, y no toca nada de `components/`. El producto es `/maya`.

### Cómo se prueba

```bash
pnpm --filter @maya/catalogo test   # 42 pruebas
```

- `catalogo.spec.ts`: el catálogo publicado describe todo lo que el agente puede emitir,
  todo lo publicado está registrado en el renderer, y **cada ejemplo `.jsonl` valida contra
  los JSON Schema oficiales de A2UI** con nuestro catálogo dentro.
- `render.spec.tsx`: **cada componente pinta su ejemplo** con `react-dom/server` (sin DOM),
  muestra dinero formateado y la línea "¿Por qué veo esto?", y su estado de carga sale
  como `Skeleton` cuando el data model llega vacío. Un componente que truena al recibir sus
  props no lo detecta ningún schema; esto sí.

Y en el agente, los mismos `.jsonl` entran al system prompt como few-shot
(`prompt.ts` → `ejemplosEnTexto()`): un ejemplo real por componente enseña la forma mejor
que cualquier regla.

### Agregar un componente

Skill `ui-generativa`. Carpeta con los tres archivos, el `.jsonl`, dos líneas en
`src/index.ts`, `pnpm catalogo`. Las pruebas del paquete dicen exactamente qué falta si se
olvida un paso; el agente, el prompt y la validación lo toman solos.
