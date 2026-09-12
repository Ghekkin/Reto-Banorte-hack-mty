---
verificado: 2026-09-12 05:30
estado: decidido         # los tres primeros, en orden estricto: ver decisiones/0004-caso-de-uso.md
---

# Candidatos de caso de uso

Material para la decisión de 45 minutos (skill `elegir-caso-de-uso`). Cinco candidatos,
cada uno con lo que la rúbrica exige: **un flujo accionable con cambio real**, los
componentes del catálogo que implica, las tools, y cómo se demuestra la adaptabilidad
con tres perfiles demo. La decisión final va al ADR 0004; esto es el insumo.

## Cómo se puntúan

De la skill, 1–3 por columna: **Utilidad** (25%), **Adaptabilidad** visible (20%),
**Cambio real** demostrable, **Datos** creíbles en 2 h, **Riesgo** técnico bajo,
**Innovación** (10%). Máximo 18.

## Resumen

| # | Caso | Dominio | Util. | Adapt. | Cambio | Datos | Riesgo | Innov. | Total |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Reestructura de tarjeta (plan de pago) | Crédito | 3 | 3 | 3 | 3 | 3 | 1 | **16** |
| 2 | "¿En qué se me fue el dinero?" con tope de gasto | Banca personal / Educación | 3 | 3 | 2 | 3 | 3 | 2 | **16** |
| 3 | Meta de ahorro con apartado automático | Inversiones / Educación | 2 | 2 | 3 | 3 | 3 | 2 | 15 |
| 4 | Semana de pagos de una PyME | Pagos | 2 | 2 | 3 | 2 | 2 | 3 | 14 |
| 5 | Cotizar y contratar un seguro | Seguros | 2 | 2 | 3 | 2 | 3 | 1 | 13 |

Innovación de 1 en el caso 1 porque es el ejemplo de la portada: varios equipos lo van
a hacer. Se compensa combinándolo con el 2 (ver "Recomendación").

---

## 1. Reestructura de tarjeta: plan de pago

**Historia**: "Soy Beto, tengo la tarjeta al límite y quiero pagar menos intereses."

**Es el ejemplo de la portada oficial** ("Quiero pagar menos intereses de mi tarjeta"
→ Plan de pago con 12/18/24 meses, CAT, "Aplicar plan →"). El jurado ya tiene esta
imagen en la cabeza: hacerla bien es seguro; hacerla igual que todos, no destaca.

| Paso | Qué pasa |
|---|---|
| Intención | "Quiero pagar menos intereses de mi tarjeta" |
| Contexto (tools de lectura) | `consultar_tarjeta` (saldo, tasa, pago mínimo, mora), `simular_reestructura` (3 plazos con CAT y mensualidad) |
| UI generada | `PlanDePago` con las opciones y el ahorro vs. seguir con el mínimo |
| Interacción | Elige 18 meses, toca **Aplicar plan** → `action { aplicar_plan, context: { plazo: 18 } }` |
| Acción (tool de acción) | `aplicar_plan_pago` escribe en `estado.json`: plan activo, calendario |
| Nueva UI | `ConfirmacionPlan` + `CalendarioPagos`; la tarjeta ahora muestra "plan activo" |
| Adaptabilidad | Ana (sin deuda, saldo holgado) con la misma pregunta recibe `SinDeuda` + sugerencia de meses sin intereses o de ahorro; Beto en mora recibe énfasis en regularizar primero |

Componentes: `PlanDePago`, `ConfirmacionPlan`, `CalendarioPagos`, `ResumenTarjeta`.
Tools: `consultar_tarjeta`, `simular_reestructura`, `aplicar_plan_pago`, `consultar_plan`.
Algoritmo a documentar: amortización con CAT (`docs/algoritmos/amortizacion.md`).

## 2. "¿En qué se me fue el dinero?" con tope de gasto

**Historia**: "Soy Ana, siento que gasto de más y quiero controlarlo sin hoja de cálculo."

| Paso | Qué pasa |
|---|---|
| Intención | "¿En qué se me fue el dinero este mes?" |
| Contexto | `consultar_movimientos` (6 meses, categorizados), `comparar_periodos` |
| UI generada | `GastoPorCategoria` (gráfica + lista) con la categoría que más creció resaltada |
| Interacción | Toca la categoría "Restaurantes" → `action { ver_categoria }` → `DetalleCategoria` con los movimientos; toca **Ponerme un tope** → `action { crear_tope, context: { categoria, monto } }` |
| Acción | `crear_tope_gasto` escribe el tope en `estado.json` |
| Nueva UI | `TopeActivo` con barra de avance; a partir de ahí `consultar_movimientos` devuelve el avance contra el tope y el agente lo muestra |
| Adaptabilidad | Beto (gasto concentrado en intereses y comisiones) recibe `GastoPorCategoria` con énfasis en costo financiero y un atajo al caso 1; Ana recibe hábitos |

Componentes: `GastoPorCategoria`, `DetalleCategoria`, `TopeActivo`, `Comparativo`.
Tools: `consultar_movimientos`, `comparar_periodos`, `crear_tope_gasto`, `consultar_topes`.
Algoritmo: categorización de movimientos y detección de la categoría atípica.

## 3. Meta de ahorro con apartado automático

**Historia**: "Quiero juntar $30,000 para diciembre."

| Paso | Qué pasa |
|---|---|
| Intención | "Quiero juntar 30 mil para diciembre" |
| Contexto | `consultar_cuentas`, `proyectar_ahorro` (cuánto por quincena, con y sin rendimiento) |
| UI generada | `SimuladorMeta` con slider de aportación y fecha estimada |
| Interacción | Ajusta a $2,500/quincena, toca **Crear apartado** → `action { crear_apartado }` |
| Acción | `crear_apartado` escribe la meta y programa el cargo |
| Nueva UI | `MetaActiva` con avance proyectado y primer cargo |
| Adaptabilidad | Con saldo bajo el agente propone meta menor o plazo mayor antes de mostrar el simulador |

Componentes: `SimuladorMeta`, `MetaActiva`, `ProyeccionAhorro`.
Tools: `consultar_cuentas`, `proyectar_ahorro`, `crear_apartado`.

## 4. Semana de pagos de una PyME

**Historia**: "Tengo una tienda y quiero saber qué pagar esta semana sin quedarme sin caja."

| Paso | Qué pasa |
|---|---|
| Intención | "¿Qué tengo que pagar esta semana?" |
| Contexto | `consultar_pendientes` (proveedores, servicios, nómina), `proyectar_caja` |
| UI generada | `PagosPriorizados` con fechas, montos y la caja proyectada día a día |
| Interacción | Marca tres pagos, toca **Programar** → `action { programar_pagos, context: { ids } }` |
| Acción | `programar_pagos` escribe los pagos programados |
| Nueva UI | `CajaProyectada` actualizada con los pagos ya descontados |
| Adaptabilidad | Si la caja no alcanza, el agente muestra `PagosPriorizados` en modo "qué posponer" |

Más innovador (pocos equipos irán a PyME) pero los datos son más laboriosos y la
narrativa exige explicar un negocio en 30 segundos.

## 5. Cotizar y contratar un seguro

**Historia**: "Acabo de comprar un coche y quiero asegurarlo."

Cotización → `ComparadorCoberturas` → **Contratar** → `contratar_poliza` → `PolizaActiva`.
Flujo limpio y accionable, pero los datos de coberturas son menos intuitivos para un
jurado y la adaptabilidad es más difícil de mostrar. Candidato de respaldo.

---

## Decisión (2026-09-12): casos 1, 2 y 3, en ese orden

El equipo eligió los tres primeros como un solo viaje (deuda → gasto → ahorro), con
fases estrictas y reparto en la demo definidos en `decisiones/0004-caso-de-uso.md`.
Lo de abajo fue la recomendación previa; se conserva como registro.

## Recomendación previa

**Caso 1 como flujo principal, con el caso 2 como segunda intención** en la misma demo:

- Beto pregunta por sus intereses → plan de pago → aplica → confirmación (flujo completo,
  regla 3 cumplida, imagen que el jurado espera).
- Beto pregunta "¿y en qué se me va el dinero?" → gasto por categoría con el costo
  financiero resaltado, ahora con el plan ya activo reflejado (el ciclo se cierra).
- Ana, misma primera pregunta → otra interfaz (adaptabilidad, 20%).

Cuatro componentes propios (`PlanDePago`, `ConfirmacionPlan`, `GastoPorCategoria`,
`DetalleCategoria`) más uno de confirmación genérico, cinco tools, una de acción
obligatoria (`aplicar_plan_pago`) y una opcional (`crear_tope_gasto`) si hay tiempo.
El ángulo de innovación no es el problema sino **cómo se adapta**: mismo intent, dos
perfiles, dos pantallas, y la acción de una intención cambiando lo que muestra la
siguiente.

Si el equipo prefiere destacar por el problema y no por la adaptación, el caso 4 (PyME)
es el que ningún otro equipo va a traer.
