---
estado: propuesta
fecha: 2026-09-12 08:40
---

# Paquete 2 — Gasto, fugas y control

> Documento **autocontenido**: quien lo lea puede construir las tres tools sin haber
> tocado el repo antes. Sale del análisis en [roadmap-mcp.md](roadmap-mcp.md); el
> Paquete 1 (deuda y salud financiera) va por separado y no se cruza con este.

## 1. Contexto mínimo

**Maya** es un agente de salud financiera para el Reto Banorte (Hack Monterrey 2026). Tres
piezas: un **LLM** que interpreta la intención, un servidor **MCP** que le da datos y
acciones, y **A2UI** para que el agente transmita la interfaz que construye. El reto exige
al menos un flujo accionable con **cambio real**.

Tú trabajas **solo en el servidor MCP** (`apps/mcp`) y en sus schemas
(`packages/schemas`). No tocas la web ni el agente: el cliente MCP lista las tools en
tiempo de ejecución (`listTools()` + `dynamicTool`), así que **una tool nueva se registra
sola en el agente y en su prompt**. Cero coordinación con el front.

| Dato | Valor |
|---|---|
| Servidor | Streamable HTTP stateless, puerto **3100** |
| Datos | 22 CSV en `db/datos/`, cargados en memoria al arrancar. **Nunca se escriben** |
| Estado mutable | `estado.json` (fuera de git). Las acciones escriben ahí; las lecturas lo superponen |
| Reinicio | `pnpm reiniciar-estado` borra el estado y la demo arranca igual siempre |
| Montos | **Centavos enteros**, siempre. La UI formatea |
| Idioma | Dominio en español: `cuenta`, `movimiento`, `saldo`. Nunca `account` |

## 2. Lo que te toca

| # | Tool | Clase | Tablas |
|---|---|---|---|
| 1 | `detectar_fugas` | lectura | `suscripciones`, `comercios`, `movimientos` |
| 2 | `cancelar_suscripcion` | **acción** | `suscripciones` (lee) + estado (escribe) |
| 3 | `crear_tope_gasto` | **acción** | `topes_gasto`, `categorias`, `movimientos` (lee) + estado (escribe) |

Orden: **1 → 2 → 3**. La 1 no depende de nada; puedes arrancar ya.

Dos de las tres son **acciones con cambio real**, que es exactamente lo que el reto
califica. Hoy el proyecto tiene dos (`aplicar_plan_pago`, `crear_apartado`); con esto
llega a cuatro, en pantallas distintas.

## 3. Cómo se construye una tool aquí

Cuatro archivos, siempre en este orden. Skills del repo: **`tool-mcp`** y
**`cambiar-schema`** (invócalas, traen el checklist completo).

### 3.1 El schema, primero — `packages/schemas/src/tools/<nombre>.ts`

Piezas compartidas en `packages/schemas/src/comunes.ts`, ya existen:

```ts
Centavos            // z.number().int() — monto en centavos
IdUsuario           // /^usr_[a-z0-9_]+$/
IdCuenta            // /^cta_[a-z0-9_]+$/
FechaISO            // AAAA-MM-DD
LlaveIdempotencia   // string min 8 — TODA acción la recibe
```

Patrón real, tomado de `crear-apartado.ts`:

```ts
import { z } from "zod";
import { Centavos, FechaISO, IdUsuario, LlaveIdempotencia } from "../comunes.js";

export const EntradaCrearApartado = z.object({
  usuarioId: IdUsuario,
  nombre: z.string().min(3).describe("Como lo llama la persona: 'Fondo de emergencia'"),
  montoObjetivoCentavos: Centavos,
  idempotencyKey: LlaveIdempotencia,
});
export type EntradaCrearApartado = z.infer<typeof EntradaCrearApartado>;

export const SalidaCrearApartado = z.object({
  aplicado: z.boolean(),
  yaEstaba: z.boolean(),
  mensaje: z.string(),
  meta: z.object({ /* … */ }),
});
export type SalidaCrearApartado = z.infer<typeof SalidaCrearApartado>;
```

Los `.describe()` **no son decorativos**: viajan al modelo como parte del schema de la
tool. Escríbelos pensando en quién los va a leer.

### 3.2 La tool — `apps/mcp/src/tools/<nombre>.ts`

```ts
import { EntradaX, SalidaX } from "@maya/schemas";
import type { DefinicionDeTool } from "./registro.js";

export const nombreDeLaTool: DefinicionDeTool = {
  nombre: "detectar_fugas",          // snake_case, es lo que ve el modelo
  titulo: "Detectar fugas de dinero",
  descripcion:
    "Escrita PARA EL MODELO: qué hace y CUÁNDO usarla. Es lo que hace que elija bien.",
  clase: "lectura",                   // "lectura" | "accion"
  entrada: EntradaX.shape,            // .shape, no el objeto
  manejar: (argumentos) => {
    const entrada = EntradaX.parse(argumentos);
    // …
    return SalidaX.parse(resultado);  // valida también la salida
  },
};
```

`registro.ts` se encarga solo de las anotaciones MCP (`readOnlyHint`,
`idempotentHint`), del log por llamada y de que **un error no lance**: se devuelve como
error de tool para que el agente pueda contarlo en pantalla en vez de romper el turno.
Tú solo lanzas `throw new Error("mensaje claro")` y él lo envuelve.

### 3.3 El alta — `apps/mcp/src/tools/index.ts`

Import + una entrada en el array `TOOLS`. **Ver §7: probablemente ya esté hecho.**

### 3.4 Acceso a datos — nunca leas un CSV

```ts
import { filtrar, buscar, aEntero, aBooleano } from "../datos/index.js";

filtrar("suscripciones", "usuario_id", "usr_ana")   // → Fila[]
buscar("suscripciones", "id", "sus_ana_netflix")    // → Fila | undefined
aEntero(fila.monto_centavos)                         // los CSV son strings
aBooleano(fila.activa)
```

Helpers de dominio que ya existen en `apps/mcp/src/dominio/consultas.ts` — **úsalos, no
los reescribas**:

```ts
nombreDeComercio(comercioId)   // "Netflix"
categoria(categoriaId)          // Fila de categorias
cuentasDe(usuarioId)            // valida pertenencia
```

Y de `dominio/tiempo.ts`: `hoy()`, `periodoDe()`, `periodoAnterior()`,
`ultimoMesCerrado()`, `sumarDias()`, `sumarMeses()`.

### 3.5 Escribir estado (solo las acciones)

```ts
import { aplicarAccion, accionesDe } from "../datos/index.js";

const resultado = aplicarAccion({
  id: `acc_…`,
  tipo: "cancelar_suscripcion",        // tu tipo nuevo
  usuarioId: entrada.usuarioId,
  idempotencyKey: entrada.idempotencyKey,
  aplicadaEn: new Date().toISOString(),
  datos: { /* lo que la lectura necesita después */ },
});
// resultado = { aplicado: boolean, yaEstaba: boolean }

accionesDe(usuarioId, "cancelar_suscripcion")   // para superponer en las lecturas
```

`aplicarAccion` ya implementa la idempotencia: **si la llave se repite, no vuelve a
aplicar**. No la reimplementes. El mecanismo soporta tipos nuevos sin tocar `estado.ts`.

## 4. Los datos que vas a tocar

### `suscripciones` — 15 filas

```
id, usuario_id, cuenta_id, comercio_id, concepto, monto_centavos,
dia_cargo, periodicidad, activa, fecha_inicio, fecha_cancelacion
```

| Usuario | Activas | Total mensual | Detalle |
|---|---|---|---|
| **Ana** | 7 | **$1,869.00** | Adobe $639 · Smart Fit $439 · Netflix $279 · Disney $199 · HBO $149 · Spotify $115 · iCloud $49 |
| **Beto** | 2 | $318.00 | Netflix Básico $179 · Disney+ con anuncios $139 |
| **Carmen** | 5 | $3,546.00 | Adobe Equipos $1,499 · Sports World $1,280 · Netflix Premium $359 · Spotify Familiar $209 · iCloud 2TB $199 |

`sus_beto_smartfit` **ya está cancelada** (`activa=false`, `fecha_cancelacion=2026-03-21`):
es el formato exacto que tu acción debe reproducir en el estado.

Las de Ana y Beto se cargan a `cta_*_nomina`; **las de Carmen a `cta_carmen_credito`**.

### `topes_gasto` — 4 filas

```
id, usuario_id, categoria_id, monto_limite_centavos, periodo,
gastado_actual_centavos, alertar_en_pct, estatus, fecha_creacion
```

| Usuario | Categoría | Límite | Gastado real 2026-08 | Situación |
|---|---|---|---|---|
| Ana | `cat_restaurantes` | $4,500 | **$7,255.50** (17 movimientos) | **161% — excedido** |
| Ana | `cat_suscripciones` | $1,500 | **$1,869.00** | **125% — excedido** |
| Beto | `cat_conveniencia` | $1,200 | — | — |
| Carmen | `cat_ropa` | $25,000 | — | — |

**`gastado_actual_centavos` viene en 0 en las 4 filas.** Es el campo que tú calculas.

### `categorias` — 18 filas

Las que te importan: `cat_suscripciones` (grupo entretenimiento, no esencial),
`cat_restaurantes`, `cat_conveniencia`, `cat_ropa`. Las de ingreso (`es_ingreso=true`) son
`cat_nomina`, `cat_honorarios`, `cat_rendimientos` — **sobre esas no se pone tope**.

### `movimientos` — 2,265 filas

```
id, cuenta_id, usuario_id, fecha, fecha_valor, tipo, monto_centavos, moneda,
categoria_id, comercio_id, descripcion, canal, referencia,
es_recurrente, es_atipico, saldo_posterior_centavos
```

`tipo` es `cargo` o `abono`; **los montos siempre son positivos**, el signo lo da `tipo`.

Verificado: los movimientos de suscripción de Ana en 2026-08 suman **exactamente**
$1,869.00 y todos traen `es_recurrente=true`. La tabla `suscripciones` y `movimientos`
están cuadradas — puedes cruzarlas con confianza.

### `comercios` — 53 filas

Los 8 de suscripción (`com_netflix`, `com_spotify`, `com_disney`, `com_hbo`, `com_icloud`,
`com_smartfit`, `com_sportsworld`, `com_adobe`) están todos en `cat_suscripciones`, con
`giro` = streaming / nube / gimnasio / software.

## 5. Spec de las tres tools

### 5.1 `detectar_fugas` — lectura

**Para qué:** "¿en qué se me está yendo el dinero sin que me dé cuenta?". Es la pantalla
más vendible que los datos permiten y nadie la ha construido.

```ts
EntradaDetectarFugas = {
  usuarioId: IdUsuario,
  mesesSinUso?: number,    // default 2 — para marcar candidatas a cancelar
}

SalidaDetectarFugas = {
  totalMensualCentavos: Centavos,
  pctDelIngreso: number,
  suscripciones: Array<{
    id, concepto, comercio, giro,
    montoCentavos, diaCargo, periodicidad,
    desde: FechaISO, mesesActiva: number,
    ultimoCargoFecha: FechaISO | null,
    sinUsoReciente: boolean,
  }>,
  recurrentesNoSuscritos: Array<{ comercio, montoCentavos, categoriaId, ultimaFecha }>,
  totalAnualCentavos: Centavos,
}
```

**Algoritmo**

1. `filtrar("suscripciones", "usuario_id", usuarioId)` y quédate con `activa=true`.
2. **Superpón el estado**: quita las canceladas por `cancelar_suscripcion`
   (`accionesDe(usuarioId, "cancelar_suscripcion")`).
3. Por cada una: `nombreDeComercio(comercio_id)`, `mesesActiva` desde `fecha_inicio`, y
   busca en `movimientos` el último cargo de ese `comercio_id`.
4. `sinUsoReciente`: sin cargo en los últimos `mesesSinUso` meses. Con estos datos casi
   ninguna lo estará — **no lo fuerces**, es una señal honesta.
5. `recurrentesNoSuscritos`: movimientos con `es_recurrente=true` cuyo `comercio_id` **no**
   esté en `suscripciones`. Es la fuga que la tabla no conoce.
6. `totalMensualCentavos` suma las activas; `pctDelIngreso` contra
   `usuarios.ingreso_mensual_centavos`.

**Por qué `mesesActiva` importa:** el Spotify de Ana lleva desde 2022 — cuatro años de
$115 al mes son $5,520. Ese número en pantalla es el que mueve a alguien a actuar.

---

### 5.2 `cancelar_suscripcion` — ACCIÓN

**Para qué:** el cambio real que sigue a la pantalla anterior. El efecto es inmediato y
visible: la siguiente lectura de gasto baja.

```ts
EntradaCancelarSuscripcion = {
  usuarioId: IdUsuario,
  suscripcionId: z.string(),
  idempotencyKey: LlaveIdempotencia,
}

SalidaCancelarSuscripcion = {
  aplicado: boolean,
  yaEstaba: boolean,
  mensaje: string,
  suscripcion: { id, concepto, comercio, montoCentavos, fechaCancelacion: FechaISO },
  efecto: {
    ahorroMensualCentavos: Centavos,
    ahorroAnualCentavos: Centavos,
    suscripcionesRestantes: number,
    nuevoTotalMensualCentavos: Centavos,
  },
}
```

**Algoritmo**

1. `buscar("suscripciones", "id", suscripcionId)`. Si no existe → error claro.
2. **Valida `usuario_id === entrada.usuarioId`.** Ver trampa 2.
3. Si ya está cancelada (en CSV o en estado) → devuelve `yaEstaba: true`, sin error. Es el
   patrón de `crear_apartado`: un reintento del agente no debe romper el turno.
4. `aplicarAccion({ tipo: "cancelar_suscripcion", datos: { suscripcionId, fechaCancelacion: hoy() } })`.
5. `efecto` se calcula recontando las activas ya con el estado superpuesto.

**El `mensaje`** lo parafrasea el agente en pantalla. Escríbelo con el dato que prueba el
cambio: `"Listo: cancelé HBO Max. Te ahorras $149.00 al mes, $1,788.00 al año."`

---

### 5.3 `crear_tope_gasto` — ACCIÓN

**Para qué:** hoy la fase 2 del producto (gasto por categoría) es **solo lectura**. Esto la
vuelve accionable.

```ts
EntradaCrearTopeGasto = {
  usuarioId: IdUsuario,
  categoriaId: z.string(),
  montoLimiteCentavos: Centavos,
  periodo?: z.enum(["mensual"]),     // default mensual
  alertarEnPct?: number,              // default 0.8
  idempotencyKey: LlaveIdempotencia,
}

SalidaCrearTopeGasto = {
  aplicado: boolean,
  yaEstaba: boolean,
  mensaje: string,
  tope: {
    id, categoriaId, categoria: string, color: string,
    montoLimiteCentavos, gastadoActualCentavos, pctUsado: number,
    estatus: "dentro" | "cerca" | "excedido",
    alertarEnPct, periodo, fechaCreacion: FechaISO,
  },
  promedioHistoricoCentavos: Centavos,   // lo que gasta normalmente en esa categoría
}
```

**Algoritmo**

1. Valida que `categoriaId` existe con `categoria(categoriaId)`. Si `es_ingreso` → error:
   no se pone tope a un ingreso.
2. Valida `montoLimiteCentavos > 0`.
3. Duplicado: si ya hay tope para ese usuario+categoría (en `topes_gasto` o en el estado),
   devuelve el existente con `yaEstaba: true`.
4. **Calcula `gastadoActualCentavos` en vivo**: suma `movimientos` del usuario con esa
   categoría, `tipo="cargo"`, en el periodo en curso. Ver trampa 1.
5. `pctUsado = gastado / limite`. `estatus`: `excedido` si ≥ 1, `cerca` si ≥ `alertarEnPct`,
   si no `dentro`.
6. `promedioHistoricoCentavos`: promedio de los 3 meses previos. Sirve para que el agente
   avise *"te estás poniendo un tope por debajo de lo que normalmente gastas"* — que es
   justo el caso de Ana.
7. `aplicarAccion({ tipo: "crear_tope_gasto", … })`.

**El caso que se demuestra solo:** Ana pone tope de $4,500 a restaurantes y ya lleva
$7,255.50 gastados este mes. El tope nace **excedido**, y esa pantalla es honesta y útil el
primer segundo. No lo escondas detrás de una validación.

## 6. Trampas

1. **`topes_gasto.gastado_actual_centavos` viene en 0 en las 4 filas.** Si lo lees en vez
   de calcularlo, todo tope nace vacío y la pantalla miente en vivo.
2. **`cancelar_suscripcion` debe validar `usuario_id`.** Sin esa línea, pasar un id ajeno
   cancela la suscripción de otra persona. Es el mismo control que `crear_apartado` ya hace
   con `cuentaOrigenId` — hay precedente en el repo, cópialo.
3. **Las suscripciones de Carmen se cargan a `cta_carmen_credito`**, no a una de nómina. No
   asumas tipo de cuenta.
4. **Los CSV no se escriben nunca.** Solo `aplicarAccion()`. Si escribes un CSV,
   `pnpm reiniciar-estado` deja de funcionar y el siguiente ensayo arranca sucio.
5. **Toda acción recibe y respeta `idempotencyKey`.** El agente puede reintentar; dos
   llamadas con la misma llave producen **un solo** cambio.
6. **`es_recurrente` no es lo mismo que "está en `suscripciones`".** La diferencia entre
   ambos conjuntos es precisamente el valor de `recurrentesNoSuscritos`.
7. **Reinicia el estado antes de cada prueba manual**: con acciones nuevas se ensucia
   rápido y vas a estar depurando un estado viejo.

## 7. Archivos

### Creas (todos nuevos — nadie más los toca)

```
packages/schemas/src/tools/detectar-fugas.ts
packages/schemas/src/tools/cancelar-suscripcion.ts
packages/schemas/src/tools/crear-tope-gasto.ts

apps/mcp/src/tools/detectar-fugas.ts
apps/mcp/src/tools/cancelar-suscripcion.ts
apps/mcp/src/tools/crear-tope-gasto.ts

apps/mcp/src/dominio/suscripciones.ts    ← helpers de 5.1 y 5.2 (por eso van juntas)
apps/mcp/src/dominio/topes.ts            ← helpers de 5.3

apps/mcp/src/__tests__/suscripciones.spec.ts
apps/mcp/src/__tests__/topes.spec.ts

docs/algoritmos/deteccion-de-fugas.md    ← regla 3 del repo: todo algoritmo se explica
```

### Usas, pero NO modificas

`apps/mcp/src/datos/` (index, csv, estado, memoria) · `apps/mcp/src/dominio/consultas.ts` ·
`apps/mcp/src/dominio/tiempo.ts` · `apps/mcp/src/tools/registro.ts` ·
`packages/schemas/src/comunes.ts` · los CSV de `db/datos/` · **todo `apps/web/`**.

Tampoco toques las specs existentes (`lecturas.spec.ts`, `acciones.spec.ts`): tus pruebas
van en archivos nuevos.

### Superficie compartida con el Paquete 1 — solo 2 archivos

| Archivo | Qué pasa |
|---|---|
| `packages/schemas/src/index.ts` | Ambos agregan 3 `export *` |
| `apps/mcp/src/tools/index.ts` | Ambos agregan import + entrada en `TOOLS` |

Los dos son listas **append-only**: si hay conflicto, **se quedan los dos bloques**.
Idealmente el equipo hace un *commit de preparación* con los 12 esqueletos ya registrados,
y entonces nadie vuelve a tocar un index.

## 8. Cómo probar

```bash
pnpm install                 # una vez. Node 22 + pnpm 10. NUNCA npm ni yarn
pnpm dev                     # levanta mcp (3100) y web (3000)
pnpm typecheck               # tsc en los 5 paquetes
pnpm test                    # vitest
pnpm humo                    # prueba de humo del MCP (requiere pnpm dev corriendo)
pnpm reiniciar-estado        # ANTES de cada prueba manual
curl localhost:3100/health   # debe listar tu tool nueva
```

**"Hecho" tiene definición** (skill `probar`): typecheck en verde · tests de la tool ·
humo del MCP · y el ciclo verificado a mano. Para tus acciones, el ciclo es:

```
detectar_fugas          → 7 suscripciones, $1,869.00/mes
cancelar_suscripcion    → aplicado: true
detectar_fugas          → 6 suscripciones, $1,720.00/mes   ← el cambio real, demostrado
```

Si la segunda lectura no cambia, la acción no sirve: eso es media feature según el reto.

## 9. Reglas del repo que te aplican

1. **Todo se documenta**, en dos niveles: una parte que entienda cualquiera y una técnica.
   Tu doc de algoritmo va en `docs/algoritmos/`.
2. **Un bug encontrado nunca se ignora**: archivo en `docs/issues/` **y**
   `gh issue create --repo Ghekkin/Reto-Banorte-hack-mty` en el mismo momento. Autorización
   permanente, no se pregunta. Skill `registrar-issue`.
3. **Sin acentos en nombres de archivo**; kebab-case, en español.
4. **`main` siempre arranca.** Lo que está a medias va detrás de un mock o un campo
   opcional antes de terminar el turno — porque al terminar el turno **se sube solo**
   (hook `Stop` → commit + pull --rebase + push).
5. **Commits con el dominio al frente**: `mcp: detectar fugas de suscripciones`.
6. **45 minutos atorado es el máximo.** Después: pregunta, rodea con un mock, y issue.
7. **Los imports internos de un paquete no llevan extensión** (`from "./registro"`), pero
   los de `node_modules` sí (`@modelcontextprotocol/sdk/server/mcp.js`). En `apps/mcp` el
   código existente usa `.js` en imports relativos — **sigue el estilo del archivo vecino**.
8. Al abrir sesión: skill **`inicio`**. Al cerrar: skill **`cerrar`**. Tu fila del tablero
   (`docs/tablero.md`) es tuya; nadie más la toca.

## 10. Cuándo empezar

Este paquete **no es la ruta crítica**. El cuello de botella son los componentes del
catálogo A2UI (faltan 7 de 8) — sin ellos el agente no tiene con qué pintar lo que tus
tools devuelvan. Consulta `docs/tablero.md` y el roadmap antes de arrancar: si la fase 1
sigue abierta, rinde más ayudar ahí.

Cuando entres, la **1** (`detectar_fugas`) no depende de nada ni de nadie.
