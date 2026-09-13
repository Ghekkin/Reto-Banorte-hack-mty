---
verificado: 2026-09-12 10:10 (hora de Monterrey)
estado: construido      # corrida completa verificada en produccion el 2026-09-12 09:00
---

# Guion de la demo

**3 minutos.** Lo que el jurado va a buscar, literal del entregable 01: *"el flujo
completo: intención, UI generada, interacción y la acción que dispara"*. Y para el 20 %
de adaptabilidad: **la misma pregunta con otro perfil produce otra interfaz**.

## Antes de leer

- **`pnpm reiniciar-estado`, siempre.** Lee su salida: dice cuántas filas borró y contra
  qué base. Si dice 0 y acabas de ensayar, algo está mal (fue el issue #9).
- **Dos personas**: una narra, otra teclea. Los prompts se pegan desde
  `docs/demo/prompts.txt`, no se escriben a mano.
- Los números salen de PostgreSQL (esquema `banorte`) y son los que el jurado va a ver.
  Si un número en pantalla no coincide con este guion, **es un bug**, no una variación.
- **Todo lo de aquí corre.** Verificado de punta a punta contra la URL pública el
  2026-09-12 a las 09:00, con el modelo real. Los tiempos son los medidos.

## Los dos perfiles, con sus números reales

| | **Beto** (protagonista) | **Ana** (la prueba de adaptabilidad) |
|---|---|---|
| Quién | Alberto Ramírez Solís, 41, supervisor de logística | Ana Sofía Treviño Cantú, 28, diseñadora de producto |
| Ingreso | $34,500 / mes | $32,000 / mes |
| Tarjeta | Clásica •••• 4821: límite **$49,000**, saldo **$47,386** (**96.7 %** de uso) | Sin deuda revolvente |
| Costo | Tasa **48.9 %**, CAT **62.1 %**, pago mínimo **$2,950.73** | — |
| Estado | **12 días de atraso**, crédito `vencido` | Al corriente |
| Además | Crédito de nómina: $29,540.65, 22 de 36 pagos | Capacidad de ahorro estable |

## Guion literal

### 0:00–0:20 · Maya hoy

En pantalla: nada nuestro todavía. Una captura de la app real de Banorte con una
respuesta de Maya en texto.

> "Esta es Maya, la asistente de Banorte. Hoy resuelve más de trescientas consultas y
> ejecuta diecisiete operaciones bancarias. Y todo eso te lo entrega así: texto y menús.
>
> Maya ya sabe hacer las cosas. Lo que le falta no es capacidad: **es superficie**."

Cambio a nuestra app, en **Inicio** de Beto. No está vacía: es la portada que Maya armó
para él (`docs/como-funciona/inicio-personalizado.md`).

### 0:20–0:35 · La portada ya es de Maya

| Momento | Qué se ve |
|---|---|
| Al abrir | Arriba, Maya en dos frases: "Tienes la tarjeta al 96.7 % de su límite con 12 días de mora… te recomiendo reestructurar a 18 meses" |
| Debajo | **Cuatro tarjetas que nadie programó**: `ResumenTarjeta` (héroe), `PlanDePago`, `GastoPorCategoria`, `TermometroSaludFinanciera`. Chip con el modelo (`gemini-3.5-flash-lite`), las tools consultadas y el tiempo |
| Si cambian a Ana o Carmen | Otra portada: el crédito al 27.9 % y el simulador; el portafolio y su desviación |

> "Ni siquiera la portada está programada. Un modelo pequeño la arma para cada persona con
> sus datos de hoy, con las mismas piezas que van a ver en la conversación, y solo la
> rearma cuando algo cambió en su cuenta. Vamos a hablar con Maya."

Se toca **Maya** (o una de las sugerencias de la portada). Si el tiempo aprieta, este
paso se cuenta en una frase sin detenerse.

### 0:35–1:00 · Intención → interfaz generada

**Prompt 1** (Beto):

```
Quiero pagar menos intereses de mi tarjeta
```

| Momento | Qué se ve |
|---|---|
| Inmediato | La tira enciende **LLM**, luego **MCP** con los nombres `panorama_inicial · simular_reestructura`, luego **A2UI** |
| ~10 s | `ResumenTarjeta` (héroe, degradado rojo): **$47,386 de $49,000**, 96.7 % usado, badge **"12 días de atraso"** |
| Junto | `PlanDePago` con **12, 18 y 24 meses**, cada uno con mensualidad, CAT y **cuánto ahorra frente a seguir pagando el mínimo** |
| Al pie de cada tarjeta | "¿Por qué veo esto?" plegado: **tócalo en vivo** y se abre la razón con el dato que la justifica |

> "No programamos esta pantalla. Maya pidió los datos al servidor MCP —los está viendo
> ahí arriba—, decidió que esta situación se resuelve con un plan de pago, y **describió
> la interfaz en A2UI**. Cada componente es del catálogo que nosotros diseñamos: Maya no
> puede inventarse uno."

### 1:00–1:50 · Interacción → acción real → nueva interfaz

Se toca **18 meses** y luego **Aplicar plan**.

| Momento | Qué se ve |
|---|---|
| Al tocar | La opción queda seleccionada; no hay turno, es estado de interfaz |
| Al aplicar | La tira enciende MCP con **`aplicar_plan_pago · consultar_plan`** |
| ~6 s | `Confirmacion`: "Tu plan quedó activo", con mensualidad de **$3,193.35** y primer pago el **12 de octubre de 2026** |
| **Arriba** | **`ResumenTarjeta` vuelve cambiada**: saldo en **$0**, badge "Plan activo", el atraso desaparece |
| Junto | `Calendario` con los 18 pagos |

> "Lo que Beto tocó no fue un botón de una app. Fue un mensaje de vuelta a Maya, que
> ejecutó la operación con una herramienta del MCP y **volvió a construir la pantalla**.
> Fíjense en la tarjeta de arriba: es la misma de hace diez segundos y ya no dice lo
> mismo. El cambio está en la base de datos. **El ciclo se cierra.**"

Opcional (10 s, si sobra tiempo): se toca **Inicio**. La portada ya se rearmó sola con el
plan aplicado: la tarjeta dice "Plan activo" y `PlanDePago` desapareció. Si todavía se ve
"Maya está armando tu inicio…", llega sola en unos segundos (medido: 4 s después de la
acción). "La portada también se enteró."

### 1:50–2:20 · El ciclo alimenta lo siguiente

**Prompt 2** (Beto):

```
¿Y en qué se me está yendo el dinero?
```

| Momento | Qué se ve |
|---|---|
| ~4 s | `GastoPorCategoria` (ancho): las seis categorías con su monto siempre visible, y **"Retiros de efectivo"** resaltado en rojo como la atípica (+74.7 %) |
| Al pie | La razón menciona que **los intereses empiezan a bajar por el plan que acaba de aplicar** |

> "Esta segunda pantalla **sabe lo que pasó en la primera**. No es un dashboard con
> pestañas: es la misma conversación, y el plan que aplicó hace veinte segundos ya cuenta
> aquí."

### 2:20–2:50 · Adaptabilidad: la misma pregunta, otra persona

Se cambia el perfil a **Ana** en el sidebar. **Prompt 3**, idéntico al primero:

```
Quiero pagar menos intereses de mi tarjeta
```

| Momento | Qué se ve |
|---|---|
| ~10–12 s | **Otra interfaz, y dos tarjetas**: `ProyeccionPagoCredito` con su crédito personal ($55,783, **27.9 % anual**, 15 mensualidades de $4,570.95, **$12,781.17 de intereses por pagar**) y `SimuladorMeta` con el slider de aportación |
| Texto | Maya dice la verdad: no tiene tarjeta, sus intereses vienen de su crédito personal, y con los $6,629 que le sobran al mes puede adelantar pagos o armar su colchón |

> Ojo al narrar: **Ana no tiene tarjeta, pero SÍ tiene deuda.** Hasta el 2026-09-12 este
> guion decía "no tiene deuda revolvente, así que el simulador", y con un crédito al 41 %
> de CAT esa respuesta era peor consejo que la que Maya da ahora. La pantalla compuesta es
> la honesta, y es la que sale de forma consistente (3 de 3 corridas con el modelo real).
> La espera es más larga que la de Beto porque son dos tarjetas con datos; el renglón
> "Consultando tus datos… / Armando tu pantalla…" la cubre. (La tira LLM · MCP · A2UI ya
> no está en la UI desde el 2026-09-13: si el jurado pregunta por las piezas, se enseñan
> en la pestaña de red, en la respuesta de `/api/agente`.)

**Prompt 4** (Ana), con esa pantalla enfrente:

```
¿Y si pago $6,000 al mes?
```

| Momento | Qué se ve |
|---|---|
| ~2–3 s | **No aparece otra pantalla.** La MISMA tarjeta del crédito cambia en su lugar: la mensualidad pasa a **$6,000.00** («$4,570.95 del contrato + $1,429.05 a capital»), los números que se movieron se iluminan, y debajo: **«Terminas en 11 meses (antes 15)»** y **«Pagas $3,470.21 menos de intereses»**. Aparece el botón **Programar este pago** |

Se toca **Programar este pago**.

| Momento | Qué se ve |
|---|---|
| ~3 s | La misma tarjeta pasa a **«Abono programado»**, sin botón, con los 11 meses ya aplicados. Sin pantalla de confirmación: la tarjeta que cambió es la confirmación |

> "No le pedí otra pantalla: le pedí otro número. **La interfaz que ya estaba se ajustó**, y
> el cambio se volvió real con un toque. Los $3,470 los calculó el banco, con la misma
> fórmula de su tabla de pagos; el modelo solo decidió qué tarjeta tocar."

> Estado: **pendiente de ensayar con el modelo real** (2026-09-13 03:05). Suma ~20 s al
> bloque de Ana; si el pitch no da, se corta el apartado de abajo y se queda este, que es el
> que muestra la interfaz ajustándose. `docs/como-funciona/ajustes-en-vivo.md`.

Se arrastra el slider del **simulador** (la segunda tarjeta) y se toca **Crear apartado**.

| Momento | Qué se ve |
|---|---|
| ~3 s | `Confirmacion` + **`MetaActiva`** con el avance y la fecha en que llega a su meta (verificado 2026-09-12 13:50: `ejecutar_decision` ok, 3.1 s) |

> "Misma frase. Misma Maya. **Otra pantalla, y otra acción real.** Porque la interfaz se
> decide con el contexto de quien pregunta, no con un menú fijo."

### 2:50–3:00 · Cierre

> "Maya ya hacía diecisiete operaciones. Nosotros le dimos dónde mostrarlas: un catálogo
> de componentes propio, servido por MCP, descrito en A2UI, y un ciclo que se cierra en
> cada interacción. Gracias."

## Prompts, para pegar

`docs/demo/prompts.txt`, uno por línea:

1. `Quiero pagar menos intereses de mi tarjeta` (Beto)
2. `¿Y en qué se me está yendo el dinero?` (Beto)
3. `Quiero pagar menos intereses de mi tarjeta` (Ana)
4. `¿Y si pago $6,000 al mes?` (Ana) → tocar **Programar este pago**

## Criterios de aceptación

Cada paso cumple, o es issue `alta`:

- [ ] Cada turno produce su interfaz en **menos de 12 segundos**.
- [ ] Los números en pantalla coinciden con la tabla de perfiles de arriba.
- [ ] **La opción de 18 meses ahorra más** que seguir con el mínimo, y se ve en pesos.
- [ ] Tras aplicar el plan, `ResumenTarjeta` **vuelve cambiada** y el atraso desaparece.
- [ ] El prompt 2 refleja el plan aplicado en el prompt 1.
- [ ] El prompt 3 con Ana produce un componente **distinto** al del prompt 1 con Beto.
- [ ] El prompt 4 **no apila otra pantalla**: la tarjeta del crédito cambia en su lugar a 11 meses y $3,470.21 menos de intereses.
- [ ] «Programar este pago» deja la misma tarjeta en «Abono programado», sin `Confirmacion` nueva.
- [ ] Ana crea el apartado y vuelve `MetaActiva`.
- [ ] Cero errores en consola en toda la corrida.
- [ ] Un prompt fuera de guion no rompe nada.

## Lo medido (2026-09-12 09:00, producción, modelo real)

| Paso | Tools | Componentes | Tiempo |
|---|---|---|---|
| 1 · Beto pide bajar intereses | `panorama_inicial` → `simular_reestructura` | `ResumenTarjeta` + `PlanDePago` | 10.5 s |
| 2 · Beto aplica 18 meses | `aplicar_plan_pago` → `consultar_plan` | `Confirmacion` + `ResumenTarjeta` (plan activo) + `Calendario` | 5.8 s |
| 3 · Beto, su gasto | `comparar_periodos` | `GastoPorCategoria` | 3.6 s |
| 4 · Ana, la misma frase | `panorama_inicial` → `consultar_tarjeta` → `consultar_creditos` → `proyectar_ahorro` | `SimuladorMeta` | 5.8 s |
| 5 · Ana crea el apartado | `crear_apartado` | `Confirmacion` + `MetaActiva` | 2.9 s |

El paso 1 es el más lento y es el primero: conviene empezar a hablar mientras corre, que
es justo para lo que sirve la tira con los badges.

Las portadas de Inicio (2026-09-12 15:20, local, `gemini-3.5-flash-lite`, tras
`reiniciar-estado`) se arman **antes** de la demo, no durante:

| Persona | Tarjetas | Tiempo |
|---|---|---|
| Beto | `ResumenTarjeta` (héroe) · `PlanDePago` · `GastoPorCategoria` · `TermometroSaludFinanciera` | 7.7 s |
| Ana | `ProyeccionPagoCredito` (héroe) · `DistribucionPortafolio` · `GastoPorCategoria` · `TermometroSaludFinanciera` | 11.6 s |
| Carmen | `DistribucionPortafolio` (héroe) · `GastoPorCategoria` · `TermometroSaludFinanciera` | 11.0 s |

Y la portada de Beto rearmada tras aplicar el plan: 3.7 s de modelo, visible 4 s después
de volver a Inicio.

## Lo que NO se enseña

- **Carmen no pregunta por su portafolio.** El catálogo no tiene componente de portafolio
  y el agente terminaba pintando su valor de mercado dentro de `MetaActiva`, como si fuera
  una meta por alcanzar. Su portafolio se ve en Productos → Inversiones, que es una
  pantalla programada (ADR 0004, enmienda del 2026-09-12 por la tarde).
- **Productos, Movimientos y Más** salvo que un juez las pida: son pantallas programadas.
  Inicio sí se enseña desde el 2026-09-12, porque ya no es programada: la arma Maya.

## Plan B

Si el modelo o la red fallan en vivo: **grabación de esta misma corrida**, hecha desde
`estable` en la hora 30, en la máquina de presentación. El guion hablado es el mismo.
