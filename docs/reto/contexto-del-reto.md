---
verificado: 2026-09-12 04:30
fuentes: [presentacion-oficial-pdf, video-explicacion-2026-09-11]
---

# Contexto del reto

Material oficial en `.orca/drops/` (fuera de git por tamaño): la presentación
`Reto_UI_Generativa_Banorte_Tec` (11 láminas) y el video de explicación del
2026-09-11 (4:54, transcripción en `docs/reto/transcripcion-video.md`).

## El reto en una frase (oficial)

> **Interfaces que la IA construye en tiempo real.** El reto: que el modelo no solo
> conteste, sino que arme la pantalla que resuelve el problema financiero de quien
> pregunta.

Hoy un asistente responde con un muro de texto, la misma pantalla para cualquier
intención, y para actuar la persona se va a otra app. Aquí **el agente construye la
UI**: la pantalla se arma según la intención detectada, con componentes propios
(simuladores, tablas, formularios), y **lo que la persona toca regresa al modelo como
contexto**.

## Los tres pasos que evalúan

| Paso | Qué es | Frase de la presentación |
|---|---|---|
| 1. Interpretar la intención | El agente entiende qué quiere lograr la persona y con qué contexto llega | — |
| 2. Generar la interfaz | Decide qué componentes mostrar y los transmite mediante **A2UI o un protocolo equivalente** | "El LLM es el centro de la experiencia, no un chat pegado a un lado" |
| 3. Ejecutar la acción | La interacción con esa UI dispara nuevas acciones y **vuelve a cambiar la experiencia** | "El ciclo se cierra" |

**El ciclo se cierra** es la idea que más repiten: no basta con generar una pantalla
una vez. Cada interacción con la UI generada debe volver al agente y producir nuevas
acciones o una nueva interfaz.

## Base técnica común: tres piezas no negociables

| Pieza | Qué exigen | Cómo lo cubrimos |
|---|---|---|
| **LLM** | "Un LLM debe ser parte central de la experiencia: interpreta, decide y orquesta" | El agente en `apps/web` (skill `agente-host`) |
| **MCP** | "Model Context Protocol para exponer al modelo los datos, las herramientas y las acciones que el equipo construyó" | Servidor propio en `apps/mcp` (skill `tool-mcp`) |
| **A2UI** | "Agent-to-UI, o un protocolo equivalente, para representar y transmitir la interfaz que genera el agente" | A2UI v0.9.1 con catálogo propio (ADR 0003, skill `ui-generativa`) |

Lenguaje, framework, modelo y proveedor de infraestructura: **libre elección**.

## Arquitectura de referencia (lámina 6, literal)

```
Usuario → Agente/LLM → MCP → A2UI → Componentes
   ↑                                      |
   └──── la interacción regresa al agente como contexto ────┘
```

- Usuario: expresa una necesidad.
- Agente/LLM: interpreta intención y contexto.
- MCP: datos, herramientas y acciones propias.
- A2UI: describe la UI que se renderiza.
- Componentes: UI propia, viva y accionable.

Nuestra `docs/arquitectura/vision-general.md` sigue esta cadena pieza por pieza.

## Las cuatro reglas para todos los equipos

1. **Sus propios componentes.** No se entrega biblioteca de UI. El sistema de
   componentes que el agente invoca lo diseña y programa el equipo. (Usar primitivas
   como Tailwind es fino; el *catálogo* que el agente invoca es nuestro.)
2. **Sus propios datos y APIs.** Sintéticos, simulados o de fuentes públicas. Nada de
   Banorte real.
3. **Al menos un flujo accionable.** Un flujo donde la persona interactúe con la UI
   generada y esa interacción **produzca un cambio real** (un estado que cambia y se
   ve reflejado después).
4. **Libertad de stack.**

## Dominio: servicios y productos financieros

| Área | Ejemplos que dan |
|---|---|
| Banca personal | Cuentas, movimientos, control de gasto |
| Inversiones | Perfilamiento, portafolios, simulación |
| Crédito | Precalificación, amortización, refinanciamiento |
| Pagos | Transferencias, cobros, conciliación |
| Seguros | Cotización, coberturas, siniestros |
| Educación financiera | Diagnóstico, metas, hábitos |

"Cada equipo define el problema concreto: no hay un enunciado único."

**El ejemplo que ellos mismos usan en la portada**: usuario dice *"Quiero pagar menos
intereses de mi tarjeta"* → componente generado *Plan de pago*: "Reestructura tu saldo
de $18,400", tres opciones (12 meses · CAT 32.4% · $1,690; 18 meses · CAT 34.1% ·
$1,215; 24 meses · CAT 36.0% · $980), botón **Aplicar plan →**. Es la imagen mental
del jurado de lo que quieren ver.

## Cómo se reparten los puntos

Detalle y estrategia en `rubrica-y-entregables.md`. Resumen:

| Criterio | Peso |
|---|---|
| Cumplimiento y utilidad para el usuario | **25%** |
| Calidad y adaptabilidad de la UI generada | **20%** |
| Calidad de la solución de IA | 15% |
| Arquitectura e ingeniería | 15% |
| UX y diseño | 10% |
| Innovación | 10% |
| Presentación | 5% |

**45%** es resolver algo útil con una UI buena y adaptable. **30%** es ingeniería (LLM,
contexto, MCP, A2UI). **5%** la presentación: "la demo importa, pero no salva una
solución incompleta".

## Lo que el video agrega (detalle en `transcripcion-video.md`)

- **Registro de equipos en el stand de Banorte.** Confirmar que estamos registrados es
  lo primero del día.
- **Mentores en el stand.** Ahí se preguntan créditos, hora y plataforma de entrega.
- **El jurado pregunta por qué el stack y la arquitectura.** Respuesta escrita en
  `docs/arquitectura/trade-offs.md`.
- "Mientras mejor sea el caso o más diversificado, mejores resultados": amplitud suma,
  pero después del flujo completo.

## Consejo oficial

> Elijan un problema pequeño y resuélvanlo completo. Un solo flujo financiero, con una
> UI que de verdad cambia y una acción que de verdad ocurre, vale más que cinco
> pantallas a medias.

## Decisiones ya tomadas a partir de esto

- Stack TS (ADR 0001), Python solo detrás de una tool (ADR 0002).
- **A2UI real** con catálogo propio, no un protocolo inventado (ADR 0003).
- El caso de uso se decide con la skill `elegir-caso-de-uso` y queda en ADR 0004.

## Lo que NO vamos a hacer

- Conectar con APIs bancarias reales. Todo es sintético.
- Entrenar modelos de ML como núcleo (ADR 0002).
- Autenticación real. Un usuario demo fijo.
- Cinco pantallas a medias. Un flujo completo, con acción real, y luego lo demás.
