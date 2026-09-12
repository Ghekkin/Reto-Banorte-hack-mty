---
estado: aceptada
fecha: 2026-09-12
---

# 0004 — Un viaje de salud financiera en tres intenciones, construido en orden estricto

## Contexto

De los cinco candidatos de `docs/reto/casos-de-uso.md` el equipo eligió los tres
primeros: **reestructura de tarjeta** (1), **gasto por categoría** (2) y **meta de
ahorro** (3). El consejo oficial advierte contra "cinco pantallas a medias"; el video
dice que "mientras más diversificado sea el caso, mejores resultados". Las dos cosas se
cumplen si los tres casos son **un solo producto con un solo usuario, unos mismos datos
y un mismo catálogo**, y se construyen **uno a la vez, completo antes de empezar el
siguiente**.

## Decisión

**El producto**: un agente de salud financiera personal. Una persona le habla y el
agente construye la pantalla que su situación necesita. Los tres casos son tres
intenciones del mismo viaje: *salir de la deuda → entender el gasto → empezar a
ahorrar*.

**Historia de usuario**: "Soy Beto, tengo la tarjeta al límite; quiero pagar menos
intereses, entender en qué se me va el dinero y, cuando pueda, empezar a ahorrar."

**Tres usuarios demo, mismos datos base**: Beto (tarjeta al 97%, doce días de atraso,
gasto alto en intereses), Ana (sin deuda, saldo holgado, sin fondo de emergencia) y
Carmen (patrimonial, con portafolio). Ver skill `datos-mock`.

> **Enmienda del 2026-09-12.** Este ADR decía "dos usuarios demo" y excluía
> explícitamente "Inversiones con rendimiento variable" y "más de dos usuarios demo".
> Se enmienda por decisión del equipo al construir el shell web: **entra Carmen como
> tercer perfil y entra Inversiones como pestaña de la sección Productos**.
>
> El motivo: Carmen sostiene el ángulo de **ejecutivo de cuenta**, una audiencia que no
> es el usuario retail, y sus datos ya existían (16 instrumentos, 848 precios semanales,
> un portafolio agresivo). Cerraba el issue
> `docs/issues/2026-09-12-alcance-datos-vs-adr-0004.md`.
>
> **Lo que NO cambia**: el orden estricto de construcción de las tres fases, y que la
> demo se cuenta con Beto. Carmen es contraste, no una cuarta intención. Inversiones es
> una pantalla de consulta programada, no un flujo accionable del agente.

> **Enmienda del 2026-09-13.** Se revierte el último punto de la enmienda anterior:
> Inversiones **sí se expone al agente**, como tools de lectura del MCP
> (`consultar_inversiones`, `consultar_catalogo_inversiones`,
> `consultar_historico_inversion`, en `apps/mcp/src/tools/`). Motivo: para que el
> viaje de Carmen quede completo — que el agente interprete su intención y arme la
> pantalla de portafolio, igual que hace con Beto y Ana — Productos no puede ser una
> pestaña fija sin agente de por medio; necesita las tools para poder razonar sobre
> los datos de Carmen y construir la interfaz. Cierra el issue
> `docs/issues/2026-09-13-tools-inversiones-contradicen-adr-0004.md`.
>
> **Lo que NO cambia**: las tools de Inversiones son de **lectura únicamente** (no
> hay `comprar`/`vender`/`rebalancear`, no hay acción con cambio real sobre el
> portafolio); Carmen sigue siendo contraste y no una cuarta intención con flujo de
> acción propio; el orden estricto de construcción y la demo con Beto no se tocan.

> **Enmienda del 2026-09-12 (tarde).** Se cierra el ida y vuelta sobre Inversiones con
> una regla, no con otra reversión: **las tres tools de Inversiones se quedan** (son de
> lectura, ya están probadas y enriquecen lo que ve un juez que conecte su cliente MCP),
> pero **el viaje de Carmen no pasa por el agente**, y su chip "¿Cómo va mi portafolio?"
> se quitó de la consola.
>
> El motivo es medible, no de opinión. Se probó contra producción: Carmen pregunta por su
> portafolio y el agente, al no tener componente para eso, pinta **`MetaActiva`** con el
> valor de mercado del portafolio como si fuera la meta y lo aportado como avance. En
> pantalla eso es una barra de progreso hacia un objetivo que ya se alcanzó: la única
> interfaz generada del proyecto que **miente**.
>
> Las dos salidas eran quitar la pregunta o construir un componente de portafolio. Se
> eligió la primera: un componente nuevo a la hora 12.5 es abrir alcance, justo lo que el
> consejo oficial desaconseja ("un problema pequeño resuelto completo"). El portafolio de
> Carmen **sí se ve** en Productos → Inversiones, que es una pantalla programada y honesta
> sobre serlo.
>
> El prompt del agente ganó además una regla general: **un componente se usa solo para lo
> que dice su descripción**, y si nada del catálogo sirve, se contesta con `Text` y se
> ofrece lo que sí. Vale para cualquier pregunta fuera de guion, no solo para Carmen.
>
> **Lo que NO cambia**: Carmen sigue siendo el tercer perfil de contraste, con su
> diagnóstico de salud financiera y su gasto, que el catálogo sí sabe pintar.

### Orden de construcción (no negociable)

> **Las horas vigentes son las de `docs/equipo/roadmap.md`** (fase 1 a H14 = sáb 10:00,
> fase 2 a H20, fase 3 a H28, congelación H30), en hora de Monterrey. El orden y la
> regla de corte no cambian.

| Fase | Caso | Entra a la siguiente fase cuando… | Hora objetivo |
|---|---|---|---|
| 1 | Reestructura de tarjeta, **flujo accionable obligatorio** | Los 4 niveles de `probar` pasan: Beto pregunta → `PlanDePago` → aplica → estado cambia → `ConfirmacionPlan`. Ana con la misma pregunta recibe otra UI. | hora 10 |
| 2 | Gasto por categoría, **solo lectura primero** | `GastoPorCategoria` y `DetalleCategoria` funcionan y **reflejan el plan aplicado en la fase 1**. El tope de gasto (acción) es opcional y va al final. | hora 18 |
| 3 | Meta de ahorro con apartado | `SimuladorMeta` → `crear_apartado` → `MetaActiva`. Es **la respuesta adaptativa de Ana**: sin deuda, el agente le propone ahorrar. | hora 24 |
| — | Congelación | Nada nuevo. Ensayos, pulido, plan B grabado. | hora 30 |

Si la fase 1 no está completa a la hora 12, la fase 3 se cancela y la 2 se recorta.
Quien decide es `demo`, con el tablero en la mano.

### Cómo se reparten en la demo

No se demuestran tres flujos completos. Se demuestra **un viaje**:

1. Beto: intención → plan de pago → **acción** → confirmación (fase 1, completa).
2. Beto: "¿y en qué se me va el dinero?" → gasto por categoría **con el plan ya
   reflejado** (fase 2: el ciclo se cierra).
3. Ana: la misma primera pregunta → **otra interfaz**: sin deuda, meta de ahorro →
   crea apartado (fase 3 como prueba de adaptabilidad y segunda acción real).

### Catálogo (8 componentes, compartidos entre los tres casos)

| Componente | Lo usan | Notas |
|---|---|---|
| `ResumenTarjeta` | 1, 2 | Muestra "plan activo" tras la acción de 1 |
| `PlanDePago` | 1 | Tres opciones con CAT, mensualidad y ahorro en pesos |
| `Confirmacion` | 1, 3 | Genérico: título, detalle, siguiente paso |
| `Calendario` | 1, 3 | Pagos del plan / aportaciones de la meta; el mismo componente |
| `GastoPorCategoria` | 2 | Gráfica + lista; la categoría atípica resaltada |
| `DetalleCategoria` | 2 | Movimientos de una categoría |
| `SimuladorMeta` | 3 | Slider de aportación y fecha estimada |
| `MetaActiva` | 3 | Avance proyectado y primer cargo |

Más los de layout del catálogo básico de A2UI. Todo componente lleva la línea
"¿Por qué veo esto?" generada por el agente (prop `razon`).

### Tools (9; 2 de acción obligatorias, 1 opcional)

Lectura: `consultar_perfil`, `consultar_tarjeta`, `consultar_movimientos`,
`simular_reestructura`, `comparar_periodos`, `proyectar_ahorro`, `consultar_plan`.
Acción: `aplicar_plan_pago` (fase 1), `crear_apartado` (fase 3).
Opcional al final: `crear_tope_gasto`.

Sumadas por las enmiendas (fuera del viaje de Beto/Ana, para el viaje de Carmen):
`diagnostico_salud_financiera`, `consultar_creditos`, `detectar_fugas`,
`cancelar_suscripcion`, `panorama_inicial` y, por la enmienda del 2026-09-13,
`consultar_inversiones`, `consultar_catalogo_inversiones`,
`consultar_historico_inversion` (las tres de solo lectura).

### Qué NO entra

Tope de gasto salvo tiempo sobrante. Cualquier cuarta intención del agente con flujo
de **acción** propio (comprar/vender/rebalancear un portafolio, por ejemplo).

~~Inversiones con rendimiento variable. Más de dos usuarios demo.~~ Admitidos por la
enmienda del 2026-09-12. ~~Inversiones es solo consulta, el agente no genera flujos de
inversión~~ revertido por la enmienda del 2026-09-13: el agente **sí** consulta
Inversiones para Carmen, solo lectura.

## Alternativas descartadas

- **Solo el caso 1.** Seguro, pero deja la innovación en 1/3 y no da material para
  mostrar el ciclo cerrado entre intenciones.
- **Los tres en paralelo desde la hora 0.** Es exactamente "cinco pantallas a medias".
  Se descarta por el orden estricto de arriba.
- **Caso 4 (PyME)** por innovación. Datos más caros y narrativa más larga; se pierde
  el ejemplo de la portada que el jurado ya tiene en la cabeza.

## Consecuencias

- `datos-mock` genera desde el inicio todo lo que los tres casos necesitan (tarjeta,
  movimientos categorizados, cuentas, productos de ahorro), aunque la fase 3 llegue
  después: los datos no se rehacen.
- El catálogo se diseña completo en la hora 1 (8 schemas) aunque se implemente en
  orden: el agente y el prompt conocen los 8 nombres desde el principio.
- `Calendario` y `Confirmacion` son genéricos a propósito: reutilización visible ante
  el jurado y menos código.
- El guion de la demo (`docs/demo/guion-demo.md`) sigue el reparto de arriba.
