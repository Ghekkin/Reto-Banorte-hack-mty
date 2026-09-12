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

**Dos usuarios demo, mismos datos base**: Beto (tarjeta al 94%, un pago atrasado,
gasto alto en intereses y restaurantes) y Ana (sin deuda, saldo holgado, gasto
estable). Ver skill `datos-mock`.

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

### Qué NO entra

Tope de gasto salvo tiempo sobrante. Inversiones con rendimiento variable. Más de dos
usuarios demo. Cualquier cuarta intención.

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
