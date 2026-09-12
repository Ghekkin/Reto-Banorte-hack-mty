# Documentación — empieza aquí

Este índice es la puerta de entrada. Si un documento no está enlazado desde aquí,
nadie lo va a leer: **todo doc nuevo se agrega a este índice en el mismo commit.**

Todo lo necesario para retomar el trabajo está en el repo. Nadie debería tener que
preguntar en el chat "¿en qué ibas?": lo dice el tablero y lo dice la bitácora de cada
quien.

## Cómo está organizada

| Carpeta / archivo | Responde a | Regla |
|---|---|---|
| `tablero.md` | ¿Quién está en qué ahora mismo? ¿Qué está bloqueado? | Cada quien edita solo su fila |
| `bitacora/` | ¿Qué pasó, cuándo, y dónde se quedó cada quien? | `equipo.md` para decisiones; `<nombre>.md` para cada persona |
| `equipo/` | ¿Quién es dueño de qué y cómo tocamos lo ajeno? | Roles = responsabilidad, no territorio |
| `reto/` | ¿Qué nos pidieron y qué falta por confirmar? | Se actualiza el día 1 cuando den detalles |
| `decisiones/` | ¿Por qué se hizo así y no de otra forma? | Un archivo por decisión (ADR), numerado, nunca se borra |
| `arquitectura/` | ¿Cómo encajan las piezas? | Diagramas en texto/mermaid, sin capturas |
| `como-funciona/` | ¿Qué hace cada feature y cómo? | **Dos niveles**: para cualquiera + técnico |
| `algoritmos/` | ¿Cómo funciona esta lógica no trivial? | Idea en palabras, pasos, entradas/salidas, límites |
| `issues/` | ¿Qué está roto o es deuda conocida? | Un archivo por hallazgo + issue en GitHub |
| `demo/` | ¿Qué vamos a mostrar y cómo verificamos que funciona? | Guion + checklist previa |

## Índice

### Coordinación
- [Tablero](tablero.md) — quién está en qué, bloqueos, siguiente
- [Arranque](equipo/arranque.md) — clonar, `.env` y `pnpm dev` en cinco minutos. **Empieza aquí**
- [Roles](equipo/roles.md) — los cuatro roles y cómo tocar dominio ajeno
- [Roadmap](equipo/roadmap.md) — las horas que quedan, bloque por bloque y rol por rol, con los cortes que deciden
- [Bitácoras](bitacora/README.md) — cómo funcionan · [Equipo](bitacora/equipo.md)

### Reto
- [Contexto del reto](reto/contexto-del-reto.md) — lo que sabemos hoy y la hipótesis de solución
- [Preguntas para el día 1](reto/preguntas-para-manana.md) — lo que hay que confirmar cuando den detalles
- [Casos de uso candidatos](reto/casos-de-uso.md) — cinco candidatos puntuados contra la rúbrica, con flujo, componentes y tools; insumo del ADR 0004
- [Rúbrica y entregables](reto/rubrica-y-entregables.md) — los 7 criterios con peso, los 4 entregables y qué los cubre
- [Premios objetivo](reto/premios-objetivo.md) — qué premios laterales vale la pena perseguir y cuáles no
- [Transcripción del video](reto/transcripcion-video.md) — la explicación oral del 2026-09-11, literal

### Decisiones
- [Cómo se escribe una decisión](decisiones/README.md)
- [0001 — Todo en TypeScript](decisiones/0001-stack-typescript.md)
- [0002 — Python solo detrás de una tool](decisiones/0002-python-solo-detras-de-una-tool.md)
- [0003 — A2UI real con catálogo propio](decisiones/0003-a2ui-como-protocolo-de-interfaz.md)
- [0004 — Caso de uso: tres intenciones en orden estricto](decisiones/0004-caso-de-uso.md)
- [0005 — Gemini 3.8 Flash principal, Sonnet 5 de respaldo](decisiones/0005-modelo-gemini-3-8-flash.md)
- [0006 — Estado del MCP en JSON](decisiones/0006-estado-del-mcp-en-json.md) — reemplazada por 0007
- [0007 — PostgreSQL como fuente de datos mock, CSV commiteados, fallback en memoria](decisiones/0007-postgresql-como-fuente-de-datos-mock.md)
- [0008 — Renderer A2UI propio, fiel a la spec](decisiones/0008-renderer-a2ui-propio.md)
- [0009 — El agente se llama Maya](decisiones/0009-maya-como-marca-del-agente.md)

### Arquitectura
- [Visión general](arquitectura/vision-general.md) — las piezas y cómo se hablan
- [Sistema de diseño](arquitectura/diseno.md) — shadcn/ui + paleta de Banorte, con los tokens
- [El motor A2UI propio](arquitectura/renderer-a2ui.md) — `packages/a2ui`: los cuatro mensajes, bindings, árbol, las cuatro validaciones, el catálogo como JSON Schema, y qué no implementamos
- [Contrato agente ↔ cliente](arquitectura/contrato-agente-cliente.md) — el endpoint, la petición, el stream JSONL, la convención de acciones
- [Trade-offs](arquitectura/trade-offs.md) — entregable 04: modelo, protocolo, infraestructura, con lo descartado
- [Roadmap del MCP](arquitectura/roadmap-mcp.md) — contraste entre las tools que hay y los datos sin puerta, propuestas de orquestación, y el orden en que conviene pulirlo
- [Orquestadores](arquitectura/orquestadores.md) — plan en 2 bloques paralelos (MCP: `analizar_gasto`/`analizar_ahorro`/`ejecutar_decision`; agente: prefetch y ciclo de acción de 2 pasos) que concreta las propuestas O1-O4 del roadmap del MCP
- [Paquete 2 — gasto, fugas y control](arquitectura/paquete-2-gasto-fugas-y-control.md) — encargo autocontenido de las 3 tools de suscripciones y topes de gasto
- [Deploy](arquitectura/deploy.md) — URLs, servidor y commit desplegado (cuando exista)

### Cómo funciona
- [Reglas y plantilla](como-funciona/README.md)
- [Base de datos](como-funciona/base-de-datos.md) — referencia del esquema `banorte`: las 22 tablas columna por columna, relaciones, índices, restricciones, las tres rutas de carga y los trade-offs
- [Shell web](como-funciona/shell-web.md) — las cinco secciones, la navegación en móvil y escritorio, el usuario activo en cookie y la capa de datos sobre los CSV
- [Datos mock](como-funciona/datos-mock.md) — los perfiles demo, los 22 CSV y las invariantes que sostienen la demo
- [Las 12 tools del MCP](como-funciona/tools-mcp.md) — qué contesta cada una, el estado mutable que cierra el ciclo, idempotencia y casos límite
- [El catálogo](como-funciona/catalogo.md) — los 8 componentes A2UI propios: qué tool llena cada uno, qué acción devuelve, cómo se prueban
- [El agente](como-funciona/agente.md) — el turno con el AI SDK, el puente al MCP, `pintar_pantalla` y las cuatro validaciones antes de que A2UI salga

### Algoritmos
- [Reglas y plantilla](algoritmos/README.md)
- [Generación de los datos mock](algoritmos/generacion-de-datos.md) — patrones, estacionalidad, calibración del flujo, puntaje de salud financiera
- [Amortización, CAT y reestructura](algoritmos/amortizacion.md) — mensualidad, tabla que cierra en cero, CAT por bisección, escenario de pago mínimo
- [Oferta de reestructura](algoritmos/oferta-de-reestructura.md) — qué plazos se cotizan, con qué tasa y cuál se recomienda
- [Categoría atípica](algoritmos/categoria-atipica.md) — qué cuenta como gasto y cuál categoría se resalta (la que se salió de su patrón, no la más grande)
- [Proyección de ahorro](algoritmos/proyeccion-de-ahorro.md) — capacidad real de ahorro, fecha estimada y los tres escenarios del slider
- [Puntaje de salud financiera](algoritmos/puntaje-de-salud.md) — calificación, tendencia con banda muerta, y cuándo el hábito detectado deja de ser cierto
- [Validación A2UI](algoritmos/validacion-a2ui.md) — el catálogo intercambiable en los schemas oficiales, y cómo se saca un error útil de 81

### Issues
- [Registro de hallazgos](issues/index.md)

### Demo
- [Guion de la demo](demo/guion-demo.md) — los 3 prompts literales, qué debe aparecer en cada paso y los criterios de aceptación
- [Prompts para pegar](demo/prompts.txt)
- [Checklist previa](demo/checklist-previa.md)
- [Pitch](demo/pitch.md) — guion hablado, frase por pantalla, preguntas de jueces

## Reglas de escritura (resumen; el detalle está en la skill `documentar`)

1. **Escribe para alguien que llega sin contexto.** Rutas de archivo concretas, nombres
   de función, nombres de schema. El resumen ejecutivo va primero, pero no sustituye
   lo técnico.
2. **Dos niveles en el mismo documento.** Primero "para cualquiera" (sin código, sin
   jerga), después "técnico". Un juez lee lo primero; un compañero que va a tocar el
   código lee lo segundo.
3. **Cada afirmación de estado lleva fecha y hora.** "Funciona la transferencia" no
   sirve; "Al 2026-09-12 03:40 la transferencia funciona con mock, no con Python" sí.
4. **Lo que existe y lo que se planea van separados.** Un doc nunca describe algo que
   todavía no se construyó como si ya existiera. Si es plan, dice "plan" en el título.
5. **Nada de capturas de pantalla.** Envejecen a la primera iteración. Describe el
   flujo y apunta al componente.
6. **Nombres en kebab-case, español, sin acentos.**
