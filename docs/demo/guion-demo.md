---
verificado: 2026-09-12 00:10
estado: plan            # pasa a construido cuando una corrida completa lo respalde
---

# Guion de la demo

**3 minutos.** Lo que el jurado va a buscar, literal del entregable 01: *"el flujo
completo: intención, UI generada, interacción y la acción que dispara"*. Y para el 20%
de adaptabilidad: **la misma pregunta con otro perfil produce otra interfaz**.

Antes de empezar, siempre: `pnpm reiniciar-estado`.

## Antes de leer

- **Dos personas**: una narra, otra teclea. Los prompts se pegan desde
  `docs/demo/prompts.txt`, no se escriben a mano.
- Los números de abajo salen de `db/datos/` y son los que el jurado va a ver. Si un
  número en pantalla no coincide con este guion, **es un bug**, no una variación.
- Marcado `[PENDIENTE]` lo que todavía no existe al 2026-09-12 00:10: los 7 componentes
  que son andamio y las tools de `simular_reestructura` en adelante.

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

En pantalla: nada nuestro todavía. Una captura o la app real de Banorte con una
respuesta de Maya en texto.

> "Esta es Maya, la asistente de Banorte. Hoy resuelve más de trescientas consultas y
> ejecuta diecisiete operaciones bancarias. Y todo eso te lo entrega así: texto y
> menús.
>
> Maya ya sabe hacer las cosas. Lo que le falta no es capacidad: **es superficie**."

Cambio a nuestra pantalla, vacía, con la barra de conversación abajo.

### 0:20–1:00 · Intención → interfaz generada

**Prompt 1** (usuario Beto, se pega tal cual):

```
Quiero pagar menos intereses de mi tarjeta
```

Lo que debe aparecer, en este orden:

| Momento | Qué se ve |
|---|---|
| Inmediato | Estado "pensando"; badges **LLM · MCP · A2UI** encendiéndose |
| ~1 s | `ResumenTarjeta` (héroe, degradado rojo): **$47,386 de $49,000**, "96.7 % usado", chip rojo **"12 días de atraso"** |
| ~2 s | `PlanDePago` con **tres opciones** de reestructura: 12, 18 y 24 meses, cada una con mensualidad, CAT y **cuánto ahorra frente a seguir pagando el mínimo** |
| Al pie | La línea `razon`: *"Te muestro planes de pago porque tu tarjeta está al 96.7 % y hoy pagas $2,950 al mes, de los cuales la mayor parte son intereses."* |

> "No programamos esta pantalla. Maya pidió los datos al servidor MCP, decidió que esta
> situación se resuelve con un plan de pago, y **describió la interfaz en A2UI**. Cada
> componente que ve es del catálogo que nosotros diseñamos: Maya no puede inventarse
> uno."

*(Aquí, una sola vez, se abre el **modo transparencia**: se ven las llamadas MCP y el
JSON A2UI pasando. Se cierra a los cinco segundos.)* `[PENDIENTE]`

### 1:00–1:50 · Interacción → acción real → nueva interfaz

Se toca la opción de **18 meses** y luego el botón **Aplicar plan**.

| Momento | Qué se ve |
|---|---|
| Al tocar | La opción queda seleccionada (`elegir_plazo`, solo cambia el data model) |
| Al aplicar | Estado "pensando"; en transparencia se ve `aplicar_plan_pago` |
| ~2 s | `Confirmacion`: "Tu plan quedó activo", con plazo, mensualidad y fecha del primer pago |
| Junto | `Calendario` con los 18 pagos |
| Arriba | **`ResumenTarjeta` ahora dice "Plan activo"** y el chip de atraso desaparece |

> "Lo que Beto tocó no fue un botón de una app. Fue un mensaje de vuelta a Maya, que
> ejecutó la operación con una herramienta del MCP y **volvió a construir la pantalla**
> con el resultado. El estado cambió de verdad: la tarjeta ya no dice lo mismo que hace
> diez segundos. **El ciclo se cierra.**"

### 1:50–2:30 · El ciclo alimenta lo siguiente

**Prompt 2** (mismo usuario):

```
¿Y en qué se me está yendo el dinero?
```

| Momento | Qué se ve |
|---|---|
| ~2 s | `GastoPorCategoria` (ancho): gráfica de barras oscuro/rojo, con **"Intereses y comisiones"** resaltado en rojo como la categoría que más pesa |
| En la misma tarjeta | Una nota: ese costo **baja a partir del plan que acaba de aplicar** |
| Al pie | `razon` explicando por qué se resalta esa categoría |

> "Esta segunda pantalla **sabe lo que pasó en la primera**. No es un dashboard con
> pestañas: es la misma conversación, y el plan que Beto aplicó hace veinte segundos ya
> está descontado aquí."

### 2:30–2:50 · Adaptabilidad: la misma pregunta, otra persona

Se cambia el perfil a **Ana** en el selector del sidebar. **Prompt 3**, idéntico al
primero:

```
Quiero pagar menos intereses de mi tarjeta
```

| Momento | Qué se ve |
|---|---|
| ~2 s | **Otra interfaz**: Ana no tiene deuda. Maya responde con `SimuladorMeta` — si no pagas intereses, lo que sigue es que tu dinero los gane — con el slider de aportación |
| Al pie | `razon`: *"No tienes deuda revolvente, así que en vez de un plan de pago te muestro qué pasaría si apartas parte de tu quincena."* |

> "Misma frase. Misma Maya. **Otra pantalla.** Porque la interfaz se decide con el
> contexto de quien pregunta, no con un menú fijo. Eso es lo que no puede hacer una app
> con pantallas programadas."

### 2:50–3:00 · Cierre

> "Maya ya hacía diecisiete operaciones. Nosotros le dimos dónde mostrarlas: un catálogo
> de componentes propio, servido por MCP, descrito en A2UI, y un ciclo que se cierra en
> cada interacción. Gracias."

## Prompts, para pegar

Viven en `docs/demo/prompts.txt`, uno por línea, en este orden:

1. `Quiero pagar menos intereses de mi tarjeta` (Beto)
2. `¿Y en qué se me está yendo el dinero?` (Beto)
3. `Quiero pagar menos intereses de mi tarjeta` (Ana)

## Criterios de aceptación del guion

Cada paso cumple, o es issue `alta`:

- [ ] Cada prompt produce su interfaz en **menos de 8 segundos**.
- [ ] Los números en pantalla coinciden con la tabla de perfiles de arriba.
- [ ] **La opción de 18 meses ahorra más** que seguir con el pago mínimo, y se ve en pesos.
- [ ] Tras aplicar el plan, `ResumenTarjeta` **cambia** y el atraso desaparece.
- [ ] El prompt 2 refleja el plan aplicado en el prompt 1.
- [ ] El prompt 3 con Ana produce un componente **distinto** al del prompt 1 con Beto.
- [ ] Cero errores en consola en toda la corrida.
- [ ] Un prompt fuera de guion no rompe nada.

## Qué falta para que este guion corra `[PENDIENTE]`

| Pieza | Dueño | Estado |
|---|---|---|
| `ResumenTarjeta`, `PlanDePago`, `Calendario`, `GastoPorCategoria`, `SimuladorMeta` | `web` | Andamio, sin construir |
| `Confirmacion` | `web` | **Construido** |
| `simular_reestructura`, `aplicar_plan_pago`, `consultar_movimientos`, `proyectar_ahorro` | `mcp` | Solo existe `consultar_perfil` |
| Agente real (hoy es mock) y la prop `razon` | `contrato` | Pendiente |
| Modo transparencia y badges | `web` | Pendiente, bloque 5 |

## Plan B

Si el modelo o la red fallan en vivo: **grabación de esta misma corrida**, hecha desde
`estable` en la hora 30, en la máquina de presentación. El guion hablado es el mismo.
