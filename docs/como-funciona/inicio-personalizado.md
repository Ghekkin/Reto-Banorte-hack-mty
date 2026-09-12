---
verificado: 2026-09-12 15:40 (hora de Monterrey)
estado: construido
---

# El Inicio que arma Maya: una portada por persona, con un modelo chico

## Para cualquiera

Cuando abres la app de tu banco, la pantalla de inicio es la misma para todos: tu saldo,
tus tarjetas, tus últimos movimientos. Da igual que estés con la tarjeta al límite o que
te sobre dinero cada mes.

Aquí no. **Maya arma la portada de cada persona** con las mismas piezas que usa en la
conversación: a Beto, que trae la tarjeta al 96.7 % y doce días de atraso, le pone
primero la tarjeta y el plan de pago para salir de ahí; a Ana, que no tiene tarjeta pero
sí un crédito al 27.9 %, le pone ese crédito y el simulador de ahorro; a Carmen, su
portafolio y qué tan desviado está. Arriba de las tarjetas, Maya dice en dos frases qué ve
hoy y qué recomienda, y deja tres preguntas listas para seguir la conversación.

Lo hace un **modelo pequeño y barato**, no el que conversa, y lo hace **solo cuando hace
falta**: cada diez minutos revisa si la cuenta se movió (una acción, movimientos nuevos) y
si no se movió, no gasta nada. Cuando alguien aplica un plan o crea un apartado desde Maya,
la portada se rearma sola en segundo plano: al volver a Inicio, ya cambió. Y si la portada
todavía no está lista, se ve la pantalla programada de siempre con un aviso de que Maya la
está armando; en cuanto está, entra sola.

Los botones de la portada funcionan: tocar "Aplicar plan" en Inicio manda a la persona a
Maya con esa acción ya disparada, y ahí se ejecuta de verdad.

## Técnico

### Dónde vive

| Pieza | Archivo |
|---|---|
| Configuración (`FEATURE_INICIO_PERSONALIZADO`, `MODELO_INICIO`, `INICIO_CADA_MINUTOS`) | `apps/web/src/lib/inicio/config.ts` |
| El modelo chico | `apps/web/src/lib/inicio/modelo.ts` |
| La huella de los datos (cuándo vale la pena rearmar) | `apps/web/src/lib/inicio/huella.ts` |
| Dónde se guarda la portada (`banorte.pantallas_inicio`) | `apps/web/src/lib/inicio/almacen.ts`, `db/migraciones/0002-pantallas-inicio.sql` |
| El generador (datos → modelo → `pintar_pantalla`) | `apps/web/src/lib/inicio/generar.ts` |
| El servicio (estado, rearmar si cambió, una generación en vuelo) | `apps/web/src/lib/inicio/servicio.ts` |
| El reloj | `apps/web/src/lib/inicio/reloj.ts`, arrancado desde `apps/web/src/instrumentation.ts` |
| La ruta `GET`/`POST /api/inicio` | `apps/web/src/app/api/inicio/route.ts` |
| La página | `apps/web/src/app/(app)/page.tsx` |
| La portada pintada, y el aviso mientras se arma | `apps/web/src/components/inicio/inicio-de-maya.tsx`, `refresco-del-inicio.tsx` |
| El gancho "acabo de aplicar una acción" | `lib/agente/agente.ts` (`alMutar`), conectado en `app/api/agente/route.ts` |
| La entrada a Maya con un botón ya tocado | `app/(app)/maya/page.tsx` (`?accion=`), `components/maya/consola-maya.tsx` |
| El ensayo con el modelo real | `scripts/probar-inicio.mjs` (`pnpm probar-inicio`) |

### Las cuatro puertas y una sola regla

La portada se puede rearmar desde cuatro lugares, y los cuatro pasan por
`regenerarSiCambio(usuarioId, motivo)`:

| Puerta | Cuándo | `motivo` en el log |
|---|---|---|
| El reloj | cada `INICIO_CADA_MINUTOS` (default 10), los tres usuarios uno tras otro | `reloj` |
| Una acción | al cerrar un turno del agente en el que una tool de acción del MCP aplicó algo | `accion` |
| Una visita | al abrir Inicio con la portada desactualizada (`after()`, después de responder) | `visita` |
| La ruta | `GET /api/inicio` con la portada desactualizada (en segundo plano) o `POST` (espera) | `consulta` / `manual` |

La regla: **el modelo corre solo cuando algo cambió.** Se calcula la huella de los datos
de la persona (`huella.ts`), se compara con la guardada junto a la portada, y si es la
misma no se hace nada. El reloj puede ser frecuente sin miedo a la cuota: una cuenta que
no se mueve cuesta dos subconsultas con índice, cero tokens. Detalle en
[`docs/algoritmos/portada-de-maya.md`](../algoritmos/portada-de-maya.md).

Además, **una generación en vuelo por persona**: si el reloj y una visita piden la misma
portada a la vez, el modelo se llama una sola vez y las dos esperan ese resultado.

### Cómo se arma una portada (`generar.ts`)

Es el mismo motor que un turno de conversación: el mismo `systemPrompt()`, las mismas
tools del MCP, la misma `pintar_pantalla` con sus cuatro validaciones
(`docs/como-funciona/agente.md`). Tres diferencias, y las tres son de costo:

1. **Otro modelo.** `MODELO_INICIO`, por default `gemini-3.5-flash-lite`. No hay intención
   que interpretar; el trabajo es elegir 3 o 4 tarjetas y enlazar números.
2. **Arranca con los datos en la mano.** Antes de llamar al modelo, `reunirDatos` pide al
   MCP lo que toda portada necesita, según la situación (prefetch determinista, O3):
   `panorama_inicial`; luego en paralelo `analizar_gasto`, `analizar_ahorro`,
   `consultar_creditos` (con amortización si no hay tarjeta), `consultar_tarjeta` si la
   hay y `simular_reestructura` si está al límite sin plan; y `proyectar_ahorro` con un
   objetivo de tres meses de gasto si no tiene meta activa pero sí capacidad. Todo eso va
   en el bloque de contexto, tal cual lo devolvió cada tool.
3. **Solo tools de lectura.** Al modelo le llegan `TOOLS_DE_APOYO` (simular, proyectar,
   históricos…) y `pintar_pantalla`; las de acción **no están en el conjunto**. Corre solo,
   sin nadie mirando: un cambio de estado desde aquí sería uno que nadie pidió.

El bucle tiene tres pasos: el 0 para pedir lo que falte (todas las tools en paralelo) o
pintar de una vez; del 1 en adelante, `toolChoice` forzado a `pintar_pantalla` y solo esa
tool visible; y un reintento si la pantalla vino inválida. Tope de 45 s.

El bloque de contexto (`encargoDePortada`) va después del system prompt, como el del
turno: es lo único que cambia entre personas, y así el prefijo se cachea. Pide una
portada, no una respuesta: de 3 a 4 tarjetas en orden de urgencia siguiendo una
**escalera** (tarjeta al límite → crédito a plazo → portafolio desviado → topes y fugas →
meta), exactamente una `heroe`, nada de `Confirmacion` ni `Text`, todo número de los datos,
los botones con su `action`, y un `texto` que saluda con lo de la tarjeta principal.

Dos cosas que el servidor completa y no le pide al modelo (en `lib/agente/pantalla.ts`,
así que valen también para la conversación):

- **La `action` por default.** Un componente con botón y sin `action` es un botón apagado.
  Si el catálogo declara `acciones` para ese componente y el modelo no puso ninguna, se le
  pone la primera con `context: {}`: todos los componentes ponen en el `context` lo que su
  acción necesita al tocarse (el plazo elegido, la suscripción de la fila). El modelo chico
  omitió la `action` de `PlanDePago` en dos corridas seguidas, con la regla escrita.
- **Comas colgantes.** El tercer intento de `parsear` quita las comas antes de `}` o `]`,
  sin tocar cadenas. Es el error de sintaxis más común de un modelo chico en un JSON largo;
  tumbó dos portadas seguidas de Carmen (2 000 tokens de data model).

### Qué se guarda y qué se pinta

`banorte.pantallas_inicio`, una fila por usuario (migración 0002): los tres mensajes A2UI
validados (`createSurface`, `updateComponents`, `updateDataModel`), `texto`, `razon`,
`sugerencias`, y la trazabilidad (`modelo`, `tools`, tokens de entrada/salida/caché, `ms`,
`generada_en`) junto a la `huella`. Va en la base y no en memoria porque los deploys son
cada rato, y porque la base es la misma en local y en producción: la portada que armó un
proceso la ve el otro. Por eso mismo el `catalogId` se pone **al leer**, con el
`URL_CATALOGO` de quien sirve.

La página (`page.tsx`) decide con `estadoDelInicio`:

| Estado | Qué se pinta |
|---|---|
| Inactivo (flag en 0, sin llave o sin `DATABASE_URL`) | La pantalla programada de siempre, sin aviso |
| Portada al día | `InicioDeMaya`: encabezado (saludo, `texto`, modelo, tools, tiempo, "¿Por qué veo esto?", sugerencias) y el `Lienzo` con la superficie |
| Sin portada o desactualizada | La programada + `RefrescoDelInicio` ("Maya está armando tu inicio…"), que pregunta a `/api/inicio` cada 3 s y hace `router.refresh()` cuando llega la nueva; se rinde a los 90 s |

`InicioDeMaya` reconstruye la superficie con `procesarVarios` y la pinta con el **mismo**
`Lienzo` de la conversación: mismo motor, mismas tarjetas, mismo acomodo. `data-pieza` y
`data-tamano` iguales.

### El ciclo de acción no se duplica

Un toque en la portada **no** ejecuta nada en Inicio: `InicioDeMaya` manda a
`/maya?accion=<JSON de la acción>`. `PaginaMaya` valida ese JSON con
`esquemaAccionEntrante` (el mismo schema del cuerpo de `POST /api/agente`), se lo pasa a
`ConsolaMaya` como `accionInicial`, y la consola lo envía una sola vez con `enviarAccion`
—igual que si se hubiera tocado ahí— y limpia la URL con `replaceState` para que recargar
no lo repita. La `idempotencyKey` viene en el `context` desde `emitirAccion`, con
`conversacionId: "inicio"`, así que un reintento tampoco aplica dos veces.

Cuando ese turno termina con una tool de acción aplicada, el agente llama `alMutar` y la
ruta lo convierte en `after(() => regenerarSiCambio(usuarioId, "accion"))`: la portada se
rearma en segundo plano mientras la persona sigue en Maya. Al volver a Inicio, o ya está la
nueva, o se ve llegar.

### Variables de entorno

| Variable | Default | Qué hace |
|---|---|---|
| `FEATURE_INICIO_PERSONALIZADO` | `1` | Con `0`, Inicio es la pantalla programada y no corre ningún modelo ni reloj |
| `MODELO_INICIO` | `gemini-3.5-flash-lite` | Id del modelo chico; `gemini-*` usa la llave de Google, `claude-*` la de Anthropic |
| `INICIO_CADA_MINUTOS` | `10` | Ritmo del reloj; mínimo 1 |

Sin llave del proveedor o sin `DATABASE_URL`, `inicioActivo()` es `false` y todo se apaga
solo: la página no cambia, el reloj lo dice en el log y no arranca.

### Lo medido (2026-09-12 15:20, local, modelo real, tras `reiniciar-estado`)

| Persona | Tarjetas | Tools | Entrada / caché / salida | Tiempo |
|---|---|---|---|---|
| Beto | `ResumenTarjeta` (héroe) · `PlanDePago` · `GastoPorCategoria` · `TermometroSaludFinanciera` | 7 (`simular_reestructura` y `proyectar_ahorro` prefetched) | 21 954 / 16 326 / 1 023 | 7.7 s |
| Ana | `ProyeccionPagoCredito` (héroe) · `DistribucionPortafolio` · `GastoPorCategoria` · `TermometroSaludFinanciera` | 4 | 23 985 / 16 329 / 1 768 | 11.6 s |
| Carmen | `DistribucionPortafolio` (héroe) · `GastoPorCategoria` · `TermometroSaludFinanciera` | 5 | 22 676 / 16 347 / 1 142 | 11.0 s |

El caché del proveedor sirve ~16 300 tokens en cada portada: es el system prompt, que las
tres comparten. Lo que se paga por portada son ~6 000 tokens de entrada nuevos (los datos
de la persona) y ~1 500 de salida; con un modelo "lite" es una fracción de centavo, y
solo se paga cuando la cuenta se movió.

Antes del prefetch situacional, el modelo chico elegía las tarjetas que podía llenar con
lo que tenía (el portafolio de Ana) en vez de las que resolvían su situación (su crédito
al 27.9 %), y armaba dos tarjetas en vez de tres o cuatro. Con los datos en la mano y la
escalera en el encargo, las tres portadas salieron bien armadas (3 de 3, dos corridas).

### Cómo probarlo

```bash
pnpm --filter @maya/web test        # 31 pruebas de lib/inicio + 6 nuevas del agente, sin llave ni base
pnpm probar-inicio                  # las tres portadas con el modelo REAL (necesita pnpm dev y llave)
pnpm probar-inicio https://maya.157.173.204.174.sslip.io   # contra lo publicado (MCP_TOKEN del VPS)
```

- `huella.spec.ts`: la huella es la misma para los mismos datos y cambia con una acción,
  un movimiento, la versión del generador o el tamaño del catálogo.
- `generar.spec.ts`: pinta en un paso; pide una tool de apoyo y pinta en el siguiente;
  reintenta una pantalla inválida; devuelve el motivo si no pinta; y **nunca ejecuta una
  tool de acción**, aunque el modelo la pida.
- `servicio.spec.ts`: genera y guarda; con la misma huella no llama al modelo; con otra
  rearma; `forzar`; dos peticiones a la vez comparten una generación; si el modelo falla la
  anterior se queda; inactivo no toca nada.
- `inicio-pinta.spec.ts`: `InicioDeMaya` renderiza el `.jsonl` de ejemplo sin componentes
  desconocidos, con el saludo, la evidencia y las sugerencias.

En el navegador (2026-09-12 15:35, Playwright a 1 440 y 390 px): la portada de Beto, la
programada con el aviso mientras se rearma y la llegada sola de la nueva, "Aplicar plan"
desde Inicio ejecutando la acción en Maya, y la portada rearmada con el plan activo al
volver. Sin errores de consola. Ver la bitácora de parlack.

### Casos límite conocidos

- **El modelo no entrega pantalla** (dos inválidas, timeout, proveedor caído): la anterior
  se queda con su huella vieja, así que sigue "desactualizada" y la siguiente puerta lo
  vuelve a intentar. Mientras, Inicio muestra la programada con el aviso; el aviso se rinde
  a los 90 s y la página queda como la de siempre.
- **`pnpm reiniciar-estado`**: no toca `pantallas_inicio`; cambia la huella (se van las
  acciones) y las portadas quedan desactualizadas solas. **Abre Inicio de cada persona
  después de reiniciar** o espera al reloj: es un paso del checklist.
- **Dos procesos contra la misma base** (local y producción): cada uno rearma cuando ve la
  huella distinta; el que llegue último gana, y los dos guardan una portada válida. El
  modelo no forma parte de la huella a propósito: dos entornos con `MODELO_INICIO`
  distinto se rearmarían uno al otro sin parar.
- **Cambiar el prompt de la portada o el catálogo**: sube `VERSION_DEL_GENERADOR` en
  `huella.ts` (o el catálogo crece solo) y las tres portadas se rearman en la siguiente
  revisión.
- **Un componente cuya `action` necesita algo que el componente no manda**: hoy no hay
  ninguno (todos ponen sus ids en el `context` al tocarse), pero si se agrega uno así, la
  `action` por default con `context: {}` lo dejaría sin dato. Declararla en el ejemplo
  `.jsonl` del componente es lo que enseña al modelo a ponerla completa.
