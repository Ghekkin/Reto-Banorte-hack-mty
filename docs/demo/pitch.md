---
estado: construido
verificado: 2026-09-12 10:15 (hora de Monterrey)
---

# Pitch de 5 minutos

Estructura, reglas y ensayos: skill `pitch`. El guion de lo que pasa en pantalla está en
`guion-demo.md`; aquí va lo que se **dice**, y las respuestas preparadas.

**Reparto**: una persona narra, otra teclea. Quien teclea no habla. Los prompts se pegan
desde `prompts.txt`.

**Reloj**: 1:00 el problema · 3:00 la demo · 1:00 la arquitectura y el cierre.

## Guion hablado

### 0:00–1:00 · El problema, con Maya de por medio

> "Banorte ya tiene una asistente que se llama Maya. Resuelve más de trescientas
> consultas y ejecuta diecisiete operaciones bancarias. Es buena.
>
> Y todo eso te lo entrega igual: un muro de texto y un menú. Si quieres pagar menos
> intereses, Maya te explica cómo, y después te vas a otra pantalla a hacerlo.
>
> Nuestra tesis es que a Maya no le falta capacidad. **Le falta superficie.**
>
> Lo que construimos en estas horas es Maya construyendo la pantalla. No eligiendo entre
> pantallas que programamos: **armándola en el momento**, con componentes que diseñamos
> nosotros, según quién pregunta y en qué situación está."

*(Si preguntan por la marca, antes de seguir: "es un prototipo de hackathon, no es un
producto oficial de Banorte y los datos son sintéticos". Está en el pie de la app y en el
README.)*

### 1:00–4:00 · La demo

Los tres momentos, con la frase de cada uno. El detalle de qué aparece está en
`guion-demo.md`.

| Pantalla | Qué pidió la persona | Qué se dice |
|---|---|---|
| `ResumenTarjeta` + `PlanDePago` | "Quiero pagar menos intereses de mi tarjeta" | "No programamos esta pantalla. Maya pidió los datos al MCP, lo están viendo ahí arriba, decidió que esto se resuelve con un plan de pago y describió la interfaz en A2UI. Los componentes son nuestros: no puede inventarse uno." |
| `Confirmacion` + `ResumenTarjeta` cambiada + `Calendario` | Tocó 18 meses y **Aplicar plan** | "Lo que tocó no fue un botón de una app: fue un mensaje de vuelta a Maya, que ejecutó la operación y **volvió a construir la pantalla**. Miren la tarjeta de arriba: es la misma de hace diez segundos y ya no dice lo mismo. El cambio está en la base. **El ciclo se cierra.**" |
| `GastoPorCategoria` | "¿Y en qué se me está yendo el dinero?" | "Esta pantalla sabe lo que pasó en la anterior. El plan que aplicó hace veinte segundos ya cuenta aquí. No es un dashboard con pestañas: es la misma conversación." |
| `SimuladorMeta` → `MetaActiva` (perfil Ana) | **La misma primera frase**, otra persona | "Misma frase, misma Maya, **otra pantalla**. Ana no tiene deuda, así que no tiene sentido ofrecerle un plan de pago. Y aquí hay una segunda acción real: crea su apartado y la meta aparece con su avance." |

**La frase que no se puede olvidar**, al terminar la demo:

> "Dos personas, la misma pregunta, dos interfaces distintas, y dos acciones que de
> verdad cambiaron algo."

### 4:00–5:00 · Cómo está hecho, y cierre

Sobre el diagrama de `vision-general.md`, sin leerlo:

> "Cuatro piezas. Un agente con Gemini que interpreta y orquesta. Un servidor **MCP**
> propio con dieciocho herramientas, catorce de lectura y cuatro que cambian estado. Un
> motor **A2UI** que escribimos nosotros y que pasa los setenta y seis casos de
> conformidad de la especificación oficial. Y un catálogo de ocho componentes
> financieros, que es lo único que Maya puede pintar.
>
> Tres cosas de las que estamos seguros y se pueden comprobar sin creernos:
>
> El MCP está público: pueden conectar su propio cliente con el token y llamar las mismas
> herramientas. El catálogo está publicado como JSON: pueden ver exactamente qué tiene
> permitido pintar el agente. Y ningún número de la pantalla lo escribe el modelo: todos
> vienen de una herramienta.
>
> Maya ya hacía diecisiete operaciones. Nosotros le dimos dónde mostrarlas. Gracias."

## Preguntas de jueces y respuestas

| Pregunta | Respuesta corta |
|---|---|
| **¿Por qué este stack?** | TypeScript de punta a punta para que cuatro personas toquen cualquier archivo con un solo contrato, Zod compartido entre el MCP y el agente. Detalle y alternativas descartadas en `trade-offs.md`. |
| **¿Por qué no el renderer oficial de A2UI?** | Es Lit con shadow DOM: ahí dentro no entran shadcn ni los tokens de Banorte, y el reto también evalúa diseño. Escribimos el nuestro y lo validamos con **sus** JSON Schema: no validamos contra nuestra idea del protocolo, cargamos los suyos y pasamos sus 76 casos. |
| **¿Esto es A2UI de verdad o se lo inventaron?** | v0.9.1, la spec vendoreada en `packages/a2ui/spec/` con su commit de origen. Los mensajes son `createSurface`, `updateComponents` y `updateDataModel`; la acción de vuelta es la de `client_to_server.json`. |
| **¿El modelo inventa los números?** | No. Viajan en el data model y salen de una tool. El prompt lo prohíbe y las props son tipadas. La tira de arriba nombra las herramientas que se llamaron en ese turno. |
| **¿La acción cambia algo real?** | Sí: fila en PostgreSQL con índice único sobre la llave de idempotencia. Se ve dos veces, en la tarjeta que vuelve cambiada y en la siguiente pregunta. Un reintento no aplica el plan dos veces. |
| **¿Y si el modelo alucina un componente?** | No llega a la pantalla. Pintar es una tool: un JSON que no cumple el catálogo vuelve como error y el modelo se corrige solo. Si aun así algo no se pudiera pintar, el renderer se lo reporta al agente y repinta sin ese componente. |
| **¿Por qué Gemini y no un modelo más grande?** | Costo y latencia, con Claude Sonnet cableado como respaldo con una variable de entorno. El turno más lento medido son 10.5 s y es el primero; los demás están entre 2.9 y 5.8. |
| **¿Los datos son reales?** | Sintéticos, tres perfiles, generados por nosotros. Nada de Banorte. El esquema y las migraciones están en `db/`. |
| **¿Cuánto de esto es el framework y cuánto ustedes?** | shadcn son primitivas accesibles, como Tailwind. El catálogo financiero, el motor A2UI, el MCP y el agente son nuestros: ~1,310 líneas solo el motor, 288 pruebas en total. |
| **¿Qué falta?** | Un componente de portafolio para el tercer perfil, y bajar el primer turno de 10 s. Los dos están escritos como decisión, no como olvido: ADR 0004 y `trade-offs.md`. |
| **¿Por qué se llama Maya?** | Es la asistente real de Banorte y el encuadre es evolución, no crítica. Sin tipografía corporativa, con disclaimer, datos sintéticos y dominio que no imita. ADR 0009. |

## Si algo falla en vivo

| Falla | Qué se hace |
|---|---|
| Un turno tarda de más | Se sigue hablando: la tira muestra qué está pasando. Para eso existe. |
| El modelo no responde | Se cambia a la grabación sin anunciarlo como fallo: "así se ve la corrida completa". |
| Se cae la red | Grabación. El guion hablado es idéntico. |
| Sale un componente distinto al esperado | Se nombra lo que salió y por qué tiene sentido: la variabilidad es el precio de que decida un modelo, y está escrita en `trade-offs.md`. Nunca se dice "esto no es lo que debía salir". |

## Ensayos

| Hora | Duración | Qué se trabó | Qué se cambió |
|---|---|---|---|
| sáb 09:00 | — (corrida técnica, sin narración) | Nada de los 5 pasos | Se descubrió que `reiniciar-estado` no borraba (issue #9) |
