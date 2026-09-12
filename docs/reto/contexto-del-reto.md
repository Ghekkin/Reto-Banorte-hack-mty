---
verificado: 2026-09-10
fuentes: [convocatoria-publica]
---

# Contexto del reto

## Lo que sabemos (2026-09-10, un día antes)

Texto de la convocatoria, literal:

> Este reto trata sobre agentes de IA que generan interfaces en tiempo real. Se trata
> de un caso de uso abierto en servicios financieros. Requiere MCP.

- Organiza: Banorte, dentro de Hack Monterrey 2026.
- Duración: 36 horas, arranca 2026-09-11.
- Detalles oficiales: **no los han dado**. Todo lo de abajo es hipótesis hasta que se
  confirme el día 1 (ver `preguntas-para-manana.md`).

## Lectura del reto

Tres frases, tres restricciones:

1. **"Agentes de IA que generan interfaces en tiempo real"**: el producto no es un
   chatbot que responde texto. Es un agente que, según lo que el usuario pide y los
   datos que obtiene, **decide qué interfaz mostrar** y la construye al vuelo: una
   tabla de movimientos, un formulario de transferencia, una gráfica de gasto, un
   comparador de créditos. La UI es la respuesta.
2. **"Caso de uso abierto en servicios financieros"**: elegimos nosotros el problema.
   Eso es una ventaja si lo elegimos rápido y una trampa si lo discutimos 6 horas.
3. **"Requiere MCP"**: las capacidades del agente (leer cuentas, mover dinero, consultar
   crédito) se exponen como tools de un servidor MCP. Probablemente evalúan que el
   MCP esté bien hecho, no solo que exista.

## Hipótesis de solución (a validar el día 1)

Un host web (Next.js) donde el usuario conversa con un agente. El agente tiene tools
de un servidor MCP propio con datos financieros simulados. Cada tool devuelve datos con
un schema conocido; el host renderiza para cada schema el componente adecuado, en
streaming, mientras el agente sigue trabajando. El agente puede además componer
varios resultados en una sola pantalla.

Apuesta a preparar: que el reto se refiera a **MCP Apps** (la extensión de MCP donde
una tool devuelve un recurso `ui://` que el cliente renderiza). Si es así, el servidor
MCP ya está listo; solo cambia cómo se entrega la UI. Si no, el mismo servidor sirve
con el agente del Vercel AI SDK.

## Ideas de caso de uso (elegir UNA el día 1, en menos de 1 hora)

Sin orden de preferencia; se decide cuando haya detalles:

- **Asesor financiero personal**: "¿en qué se me fue el dinero este mes?" → gráfica +
  categorías + acción sugerida. "¿Me conviene este crédito?" → comparador.
- **Onboarding / apertura de producto**: el agente arma el formulario justo para el
  producto que el usuario necesita, con validaciones en vivo.
- **Atención a PyMEs**: flujo de caja, conciliación, alertas; el agente genera el
  panel que el dueño necesita ese día.
- **Cobranza / negociación**: el agente presenta opciones de reestructura como
  interfaz interactiva, no como texto.

Criterio para elegir: (a) se puede demostrar en 3 minutos, (b) luce la generación de
UI (varios tipos de interfaz distintos en una conversación), (c) los datos se pueden
simular de forma creíble.

## Regla de arranque

**El primer commit sale el 2026-09-11 a las 20:00, no antes.** Hasta esa hora no se hace
commit ni push: todo lo preparado vive en el árbol de trabajo sin commitear y GitHub
sigue vacío. Por eso `.claude/settings.json` (que activa el commit+push automático) se
copia al repo **a las 20:00**, después del primer `scripts/sync.sh`.

## Lo que NO vamos a hacer

- Conectar con APIs bancarias reales. Todo es mock con datos plausibles.
- Entrenar modelos de ML como núcleo del proyecto (ver ADR 0002).
- Autenticación real. Un usuario demo fijo.
