---
verificado: 2026-09-12 09:40 (tools originales) · 2026-09-12 11:15 (orquestadores) · 2026-09-13 03:05 (abono a capital)
estado: construido
---

# Las tools del servidor MCP

## Para cualquiera

El MCP es la parte del sistema que sabe de dinero. La inteligencia artificial no ve la
base de datos ni hace cuentas: le **pregunta** al MCP, que es quien conoce la tarjeta de
alguien, sus movimientos del mes y qué pasaría si reestructurara su deuda.

Hay dos tipos de preguntas. Las de **lectura** contestan cómo están las cosas: quién es
esta persona, cuánto debe, en qué gastó. Las de **acción** cambian las cosas de verdad:
aplicar un plan de pago, crear un apartado de ahorro. Y ahí está lo importante: después
de una acción, las preguntas de lectura contestan distinto. Si Beto aplica su plan, su
tarjeta ya no aparece al 97 % del límite: aparece en cero, con una mensualidad fija. La
pantalla que el agente construye después de la acción es otra porque **los datos son
otros**, no porque se lo hayamos dicho.

Las tools cubren el viaje completo de la demo: primero saber con quién hablas,
luego salir de la deuda, luego entender el gasto, luego empezar a ahorrar. Tres de ellas
no miran solo la tarjeta: una le pone una calificación de 0 a 100 a cómo va la persona,
otra suma **toda** su deuda y no nada más la del plástico, y una tercera junta todo eso en
una sola respuesta para que el agente no tenga que preguntar tres veces antes de dibujar
nada.

## Técnico

### Dónde vive

| Pieza | Ruta |
|---|---|
| Servidor | `apps/mcp/src/server.ts` (Express, Streamable HTTP, `/health` y `/mcp`) |
| Registro de tools | `apps/mcp/src/tools/index.ts` → `TOOLS` |
| Una tool | `apps/mcp/src/tools/<nombre>.ts` |
| Contratos (Zod) | `packages/schemas/src/tools/<nombre>.ts` → `EntradaX` / `SalidaX` |
| Consultas compartidas | `apps/mcp/src/dominio/consultas.ts` |
| Diagnóstico de hábitos | `apps/mcp/src/dominio/salud.ts` |
| Deuda a plazo fijo | `apps/mcp/src/dominio/creditos.ts` |
| Abono a capital (simulación con cuota, pedido, hitos) | `apps/mcp/src/dominio/abonos.ts` |
| Matemática de crédito | `apps/mcp/src/dominio/finanzas.ts` |
| El tiempo del dominio | `apps/mcp/src/dominio/tiempo.ts` |
| Datos | PostgreSQL, esquema `banorte`: 22 tablas + `acciones_aplicadas` (lo mutable) |

### Las tools

| Tool | Clase | Qué devuelve | Cuándo la llama el agente |
|---|---|---|---|
| `consultar_perfil` | lectura | nombre, edad, ocupación, ingreso, segmento | siempre, al inicio |
| `consultar_tarjeta` | lectura | límite, saldo, uso, tasa, mora, intereses del mes, plan activo, `alerta` | antes de decidir cualquier pantalla de deuda |
| `consultar_movimientos` | lectura | movimientos filtrados + totales del filtro completo | para respaldar un número o detallar una categoría |
| `simular_reestructura` | lectura | una opción por plazo con mensualidad, CAT, ahorro vs. mínimo | cuando la intención es pagar menos intereses |
| `consultar_plan` | lectura | el plan aplicado y su calendario de pagos | después de la acción, y en "¿cómo va mi plan?" |
| `aplicar_plan_pago` | **acción** | el plan, el efecto (antes/después) y un mensaje | solo cuando llega la acción A2UI del mismo nombre |
| `comparar_periodos` | lectura | gasto por categoría de dos meses, categoría atípica, efecto del plan | "¿en qué se me va el dinero?" |
| `proyectar_ahorro` | lectura | meses y fecha para llegar a una meta, con tres escenarios | cuando no hay deuda que resolver |
| `crear_apartado` | **acción** | la meta creada con su fecha objetivo | solo cuando llega la acción A2UI del mismo nombre |
| `panorama_inicial` | lectura | perfil + tarjeta + puntaje + deuda + `situacion` | **siempre, al abrir la conversación**: reemplaza tres llamadas |
| `diagnostico_salud_financiera` | lectura | puntaje 0-100, tendencia, los cuatro ratios, el hábito, `serie` para graficar y `ahorroLiquidoCentavos` (nómina + ahorro de hoy) | "¿cómo voy?", o antes de proponer un plan |
| `consultar_creditos` | lectura | toda la deuda (créditos + tarjeta), mensualidad total, ratio, el más caro por CAT; con abono programado, la mensualidad, los pagos restantes y la tabla ya son los nuevos | "¿cuánto debo en total?", y antes de comprometer capacidad de pago |
| `simular_pago_credito` | lectura | un crédito a plazo pagando otra mensualidad o en otro plazo: `actual` vs. `simulado` (con los nombres de `ProyeccionPagoCredito`), ahorro, meses menos, `posible`/`motivo` y `aviso` de capacidad | «¿y si pago $6,000 al mes?», «quiero liquidarlo en 12 meses»: ajusta la tarjeta en su lugar |
| `programar_abono_capital` | **acción** | el abono guardado, `antes`/`despues`, ahorro y mensaje | solo cuando llega la acción A2UI del mismo nombre (normalmente vía `ejecutar_decision`) |
| `detectar_fugas` | lectura | suscripciones y cargos recurrentes que se escapan, con lo que costarían al año | "¿en qué se me va el dinero sin darme cuenta?" |
| `cancelar_suscripcion` | **acción** | la suscripción cancelada y lo que se deja de pagar | solo cuando llega la acción A2UI del mismo nombre |
| `crear_tope_gasto` | **acción** | el tope creado para una categoría | solo cuando llega la acción A2UI del mismo nombre |
| `analizar_gasto` | lectura | `comparar_periodos` + `detectar_fugas` + topes excedidos, más `patronGasto` | "¿en qué se me va el dinero?" — en vez de las dos por separado |
| `analizar_ahorro` | lectura | `proyectar_ahorro` + `consultar_inversiones`, más `estadoAhorro` | por su ahorro, su meta o su portafolio — en vez de las dos por separado |
| `ejecutar_decision` | **acción** | la mutación que corresponda + la lectura posterior, en una sola respuesta | siempre que la acción A2UI sea una de mutación: reemplaza el patrón "mutar y luego leer" |

Las nueve primeras son las del ADR 0004. Las seis siguientes (`diagnostico_salud_financiera`
hasta `crear_tope_gasto`) son los **Paquetes 1 y 2** del [roadmap del MCP](../arquitectura/roadmap-mcp.md),
y ninguna inventa un dato nuevo: abren tablas que ya estaban en la base y que ninguna tool
podía ver. Las tres de Inversiones (`consultar_inversiones`, `consultar_catalogo_inversiones`,
`consultar_historico_inversion`) completan el viaje de Carmen (enmienda del ADR 0004,
2026-09-13). Las tres últimas son los **orquestadores del Bloque A**
(`docs/arquitectura/orquestadores.md`): `analizar_gasto` y `analizar_ahorro` son fachadas
de lectura (O4) que componen llamando por dentro a las tools atómicas — son las mismas, no
una segunda versión —, y `ejecutar_decision` es el orquestador de acción (O2).

**Dos agregados para los widgets vivos (2026-09-13, ADR 0011).** En Inicio con
`FEATURE_WIDGETS_VIVOS=1` ninguna cifra de una tarjeta la escribe el modelo: sale de una tool.
Dos tarjetas no tenían de dónde: `TermometroSaludFinanciera` pinta "ahorro acumulado" y ninguna
tool lo devolvía, y `OrdenRebalanceo` se muestra ANTES de confirmar pero las órdenes solo se
calculaban dentro de la acción. Por eso:

| Tool | Clase | Qué devuelve | Para qué |
|---|---|---|---|
| `simular_rebalanceo` | lectura | las órdenes de compra y venta que `rebalancear_portafolio` ejecutaría, sin ejecutarlas (mismo `calcularMovimientosRebalanceo`), el valor y la desviación | la tarjeta `OrdenRebalanceo` previa a confirmar |
| `diagnostico_salud_financiera.ahorroLiquidoCentavos` | campo nuevo, opcional | saldo de hoy de las cuentas de nómina y ahorro activas | `montoAhorradoCentavos` del termómetro |

Pruebas: `apps/mcp/src/__tests__/inversiones.spec.ts` (`simular_rebalanceo` da las mismas órdenes
que el cálculo de la acción y no toca el estado) y `salud.spec.ts` (el ahorro líquido de Ana y de
Beto). Ver `docs/como-funciona/widgets-vivos.md`.

`simular_pago_credito` y `programar_abono_capital` son el primer caso de **tarjetas que se ajustan
desde el chat**: la persona pregunta «¿y si pago $6,000?» sobre la `ProyeccionPagoCredito` que ya
ve, el agente simula y parchea la tarjeta, y «Programar este pago» lo guarda como abono a capital
mensual. Pagar menos que el contrato o tardar más de lo que falta no es posible por esta vía (sería
reestructurar) y la tool lo dice en `motivo`. Algoritmo y cifras en
[`docs/algoritmos/abono-a-capital.md`](../algoritmos/abono-a-capital.md). La acción necesita la
migración `db/migraciones/0005-accion-programar-abono-capital.sql` en la base: sin ella el `CHECK` de
`acciones_aplicadas` rechaza el insert.

**El total no se afirma en ningún lado que pueda quedar desfasado.** `pnpm humo` comprueba
que estén, por nombre, las nueve del viaje del ADR 0004 —lo que la demo necesita— e imprime
el total sin juzgarlo. Antes afirmaba un número fijo, y el CI se ponía rojo cada vez que
alguien agregaba una tool: castigaba trabajo bien hecho.

#### Por qué `panorama_inicial` no decide la pantalla

Devuelve un campo `situacion` (`deuda_critica`, `plan_activo`, `deuda_alta`, `sin_margen`,
`estable_con_capacidad`) y un `porQue` con el dato que lo produjo. Es una clasificación
sobre umbrales fijos —un dato, con pruebas—, **no** una instrucción de interfaz: no nombra
ningún componente. Quien interpreta la intención y elige qué construir sigue siendo el
modelo. Esa frontera es la respuesta cuando un juez pregunte si el MCP está decidiendo la
UI.

#### Los orquestadores (Bloque A)

Plan completo en `docs/arquitectura/orquestadores.md`. Tres tools, dos ideas:

- **Fachadas de lectura (O4).** `analizar_gasto` y `analizar_ahorro` llaman por dentro a
  las tools atómicas (`comparar_periodos` + `detectar_fugas`; `proyectar_ahorro` +
  `consultar_inversiones`) y agregan una clasificación sobre umbrales fijos
  (`patronGasto`, `estadoAhorro`), igual que `panorama_inicial` con `situacion`. No
  inventan un dato nuevo: cada campo compuesto es idéntico al que devuelve su tool
  especializada (`src/__tests__/orquestadores.spec.ts` lo comprueba con `toEqual`). Las
  atómicas siguen expuestas para el detalle.
- **Orquestador de acción (O2).** `ejecutar_decision` recibe la acción tal como llega de
  la interfaz (su `name` es idéntico al nombre de la tool de mutación:
  `esAccionDeMutacion` en `packages/a2ui/src/acciones.ts`), despacha a esa tool sin
  reimplementar su lógica, y devuelve ya la lectura posterior. El ciclo de acción pasa de
  3 llamadas a 2. No agrega lógica de negocio: solo despacha y relee.

### Cómo se registra una tool

`apps/mcp/src/tools/registro.ts`. Cada tool declara `clase: "lectura" | "accion"`, y de
ahí salen las anotaciones MCP (`readOnlyHint`, `idempotentHint`). El envoltorio:

- valida la entrada con el schema Zod **dentro** de la tool (`EntradaX.parse`);
- valida la salida con `SalidaX.parse` antes de devolverla: una tool no puede publicar
  algo que el agente no espera;
- registra una línea de log por llamada con `ms` y `ok`;
- **nunca lanza hacia afuera**: un error se devuelve como error de tool para que el
  agente lo pueda contar en pantalla en vez de romper el turno.

### El estado mutable, y por qué el ciclo se cierra

Los datos de partida **no se tocan nunca**. Lo que una acción aplica se inserta en
`banorte.acciones_aplicadas`, y las lecturas lo superponen:

- `dominio/consultas.ts` → `planAplicado(usuarioId)` y `apartadosCreados(usuarioId)` leen
  el estado; `tarjetaConEstado(usuarioId)` es la **única** función que decide cuánto debe
  alguien, para que dos tools no contesten cosas distintas.
- Con un plan aplicado: saldo revolvente `0`, uso del límite `0`, pago mínimo `0`, mora
  `0`, `planActivo` con la mensualidad, y `alerta: "plan_activo"`.
- Toda escritura va a un temporal y se renombra encima (`escribirEstado`): el rename es
  atómico, así que nadie lee jamás un JSON a medias.
- Un plan es **por tarjeta** (`planAplicado(usuarioId, tarjetaId)`); `tarjetaConEstado`
  solo superpone el plan de esa tarjeta.
- `pnpm reiniciar-estado` vuelve el archivo a cero y **surte efecto en el servidor que ya
  está corriendo**: la capa de datos lee el archivo en cada llamada, sin caché en memoria.
  Con caché, el script decía "estado reiniciado" y el servidor seguía contestando con el
  plan viejo hasta reiniciarlo, que es justo el susto que uno no quiere cinco minutos antes
  del pitch. El archivo pesa unos KB; leerlo siempre no se nota. Se corre antes de cada
  ensayo (skill `checklist-demo`).

### Idempotencia

Toda tool de acción exige `idempotencyKey` (`conversacionId + ":" + timestamp`, la pone
el renderer en `packages/a2ui/src/acciones.ts`). Dos llamadas con la misma llave aplican
**un** cambio: `aplicarAccion` en `apps/mcp/src/datos/estado.ts` compara la llave antes
de escribir. Además, `aplicar_plan_pago` no aplica un segundo plan aunque venga con otra
llave, y `crear_apartado` no duplica una meta con el mismo nombre.

### "Hoy" no es `new Date()`

Los datos sintéticos terminan el 2026-09-12. Si "hoy" fuera el reloj del servidor, el día
del pitch "los últimos 30 días" saldrían vacíos. `dominio/tiempo.ts` → `hoy()` devuelve
`MCP_HOY` si está puesta, y si no, la fecha del movimiento más reciente.

### Lo que las tools rechazan (con un motivo que el agente puede leer)

- Una `tarjetaId` que no es de la persona, o que es de **débito**: una tarjeta de débito
  tiene límite 0 y tasa 0, y devolverla como si fuera de crédito diría "saludable" sobre
  algo que no puede tener deuda.
- Un rango `desde > hasta` en `consultar_movimientos`.
- Una `cuentaOrigenId` de otra persona en `crear_apartado`.
- Un segundo plan sobre la misma tarjeta, con cualquier llave.
- En `simular_pago_credito`: mandar las dos (o ninguna) de `mensualidadCentavos` y `plazoMeses`, un
  crédito ajeno, o la tarjeta vista como crédito (`cred_beto_tdc`). `programar_abono_capital` además
  rechaza una mensualidad menor que la del contrato, con el mismo `motivo` de la simulación.
- `comparar_periodos` sin `periodo` usa el **último mes cerrado** (`ultimoMesCerrado`),
  nunca el mes en curso a medias: contra meses completos, todo parecería bajar.

### Casos límite conocidos

- **Ana no tiene tarjeta de crédito.** `consultar_tarjeta` devuelve `tarjeta: null` y
  `alerta: "sin_tarjeta_credito"` en vez de fallar; `simular_reestructura` sí falla, con
  un mensaje que el agente puede leer en voz alta. Es la puerta de la adaptabilidad.
- **Plazo que el banco no cotizó.** `simular_reestructura` acepta cualquier plazo entre 3
  y 60 meses; si no está en la tabla de ofertas, se cotiza con la tasa de respaldo
  (`docs/algoritmos/oferta-de-reestructura.md`).
- **Pagando el mínimo, la deuda podría no amortizar nunca.** Se reporta
  `nuncaLiquida: true` en vez de colgarse.
- **Un plazo cuya mensualidad no cabe en la capacidad de pago** no se bloquea: se marca
  `cabeEnCapacidad: false` y se avisa en el mensaje. Quien decide es la persona.

### Cómo probarlo

```bash
pnpm --filter @maya/mcp test     # finanzas, lecturas, salud, créditos, panorama, acciones, auditoría y orquestadores
pnpm dev                         # levanta mcp (3100) y web (3000)
pnpm humo                        # lecturas y el ciclo completo de la acción por HTTP
pnpm reiniciar-estado            # después del humo, antes de un ensayo
```

**El total de tools y de pruebas no se afirma en ningún lado que pueda quedar
desfasado** (motivo en la sección de arriba): `apps/mcp/src/tools/index.ts` → `TOOLS` y
`pnpm --filter @maya/mcp test` son la fuente de verdad, no este documento.

`apps/mcp/src/__tests__/finanzas.spec.ts` compara la matemática contra
la tabla `banorte.planes_reestructura`: si alguien cambia una fórmula, el test truena, porque
la pantalla y los datos tienen que decir lo mismo.

### Algoritmos involucrados

- `docs/algoritmos/amortizacion.md` — mensualidad, CAT, escenario de pago mínimo.
- `docs/algoritmos/oferta-de-reestructura.md` — qué tasa, qué plazo se recomienda.
- `docs/algoritmos/abono-a-capital.md` — pagar más al mes un crédito a plazo: simulación, plazo
  objetivo, qué no es posible y el aviso de capacidad.
- `docs/algoritmos/categoria-atipica.md` — qué cuenta como gasto y cuál se resalta.
- `docs/algoritmos/proyeccion-de-ahorro.md` — capacidad de ahorro y fecha estimada.
- `docs/algoritmos/puntaje-de-salud.md` — calificación, tendencia, y cuándo el hábito
  detectado deja de ser cierto.
