---
verificado: 2026-09-12 10:00 (hora de Monterrey)
estado: construido
---

# Trade-offs técnicos (entregable 04)

La presentación pide "diagrama de arquitectura y los trade-offs: modelo, protocolo,
infraestructura". El diagrama está en `vision-general.md`. Aquí, cada decisión con lo
que se ganó y lo que se sacrificó.

El video del reto avisa que **el jurado va a preguntar por qué este stack y esta
arquitectura** (04:10). Este documento es la respuesta escrita; la columna "Qué
sacrificamos" no es modestia, es lo que hace creíble el resto.

## Para cualquiera

Elegimos herramientas estándar donde el jurado las va a buscar (MCP y A2UI, los dos que
pide el reto), un solo lenguaje para que cuatro personas toquen todo sin pisarse, datos
inventados pero creíbles, y una regla: nada que no esté probado entra a la demo.

## Técnico

| Dimensión | Decisión | Alternativa descartada | Qué ganamos | Qué sacrificamos | ADR |
|---|---|---|---|---|---|
| **Modelo** | **Gemini 3.8 Flash** vía el AI SDK; Claude Sonnet 5 cableado como respaldo con `MODELO=claude` | Opus 5 (6–8× el costo); Sonnet 5 como principal | Costo del hack ~$40; latencia baja; ecosistema natal de A2UI | Menos juicio en decisiones de interfaz. **Medido**: turnos entre 2.9 s y 10.5 s, y el de 10.5 s es el primero de Beto, con dos tools | 0005 |
| **Protocolo de UI** | A2UI v0.9.1 con **renderer propio** (`packages/a2ui`, ~1,310 líneas) validado con los JSON Schema **oficiales**, y **catálogo propio** | `@a2ui/react` oficial: es Lit con shadow DOM y rompe shadcn y la paleta | Estándar que el reto nombra, sin renunciar al sistema de diseño. **Pasamos los 76 casos de conformidad de la spec** | ~1,310 líneas nuestras que mantener; sin renderer oficial que presumir | 0003, 0008 |
| **Qué puede pintar el agente** | Solo los 8 componentes del catálogo, validados antes de llegar a la pantalla | Que el modelo emita HTML o JSX | La UI es **datos**, no código arbitrario: no hay inyección posible y el jurado puede leer el catálogo | El agente no puede improvisar una pantalla que no previmos | 0003 |
| **Protocolo de datos y acciones** | MCP propio, Streamable HTTP, 14 tools de lectura y 4 de acción | Llamar funciones internas sin MCP | Las mismas tools sirven a cualquier cliente: un juez puede conectar el suyo con el token | Un proceso más y un salto HTTP por tool | 0001 |
| **Dónde vive la decisión de interfaz** | En el **modelo**. El MCP clasifica la *situación financiera* (dato, con pruebas); el modelo interpreta la *intención* y elige la pantalla | Reglas en el MCP que nombren componentes | Es literalmente lo que el reto evalúa; una regla fija no es adaptabilidad | Variabilidad entre turnos: el mismo prompt puede pintar dos veces distinto | 0004 |
| **Lenguaje** | TypeScript de punta a punta, Zod como contrato compartido | Python + Next.js; NestJS | Un schema, un lenguaje, cualquiera toca cualquier archivo a las 3 am | Sin pandas ni sklearn a la mano (escape: ADR 0002) | 0001 |
| **ML** | Ninguno como núcleo; Python solo detrás de una tool con fallback en TS | Modelo propio de scoring | Cero riesgo de demo | Menos "IA" aparente; se compensa con la calidad del agente | 0002 |
| **Datos** | Sintéticos y deterministas en **PostgreSQL**, con estado mutable reiniciable e idempotencia garantizada por un índice único | CSV en el repo; base real | La acción se ve, sobrevive a un reinicio y se reinicia antes de cada ensayo | **Ya no hay demo sin red**: sin base, el MCP no arranca, a propósito | 0010 |
| **Infraestructura** | Coolify en el VPS del equipo; push a `main` despliega si el CI pasa | Vercel; VM nueva en Vultr | Infra que ya operamos, con Postgres y TimescaleDB arriba; URL pública para el jurado | Un deploy que mantener; se congela en la hora 30 | `deploy.md` |
| **Estado del agente** | Sin estado en el servidor: historial, pantalla actual y data model viajan en cada petición | Sesiones en servidor | Simplicidad; el MCP puede correr stateless | Peticiones más grandes | — |

## Las tres preguntas que esperamos del jurado

**"¿Por qué no usaron el renderer oficial de A2UI?"** Porque es Lit con shadow DOM y el
reto también evalúa UX y diseño: dentro de un shadow DOM, shadcn y los tokens de Banorte
no entran. Escribimos el nuestro y lo validamos contra sus JSON Schema, así que no
validamos contra nuestra idea del protocolo: cargamos los suyos y pasamos sus 76 casos
de conformidad.

**"¿Cómo sé que el modelo no inventa los números?"** Ninguna cifra en pantalla la escribe
el modelo: viajan en el data model y salen de una tool del MCP. El prompt lo prohíbe y el
catálogo lo hace difícil, porque las props son tipadas. La tira de progreso nombra las
herramientas que se llamaron en ese turno, y el mismo MCP está público para que lo
compruebe con su propio cliente.

**"¿La acción cambia algo de verdad?"** Sí, y se ve dos veces: la tarjeta que tocó vuelve
cambiada en el mismo turno (saldo en cero, badge de plan activo, sin atraso) y la
siguiente pregunta ya parte de ese estado. Vive en PostgreSQL con índice único sobre la
llave de idempotencia, así que un reintento no aplica el plan dos veces.

## Riesgos aceptados y su mitigación

| Riesgo | Mitigación | Estado |
|---|---|---|
| El renderer propio se desvía de la spec | Validación con los JSON Schema oficiales; 76 casos de conformidad como pruebas | cerrado |
| El modelo inventa componentes fuera del catálogo | `pintar_pantalla` es una tool: un JSON inválido vuelve como error de tool y el modelo se corrige solo | cerrado |
| Un reintento aplica una acción dos veces | `idempotencyKey` + índice único en la base | cerrado |
| La API del modelo cae en la demo | Grabación desde `estable`, hecha en la hora 30 | pendiente |
| **Sin red no hay demo** (el MCP exige base) | Postgres local y `pnpm datos:restaurar` | **pendiente de ensayar** |
| El mismo prompt pinta distinto entre turnos | El prompt fija lo que no puede faltar (la tarjeta que cambió); el resto se acepta como precio de que decida el modelo | mitigado |
