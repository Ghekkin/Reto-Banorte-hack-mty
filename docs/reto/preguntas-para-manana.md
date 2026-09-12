# Preguntas para el día 1

Cuando Banorte dé los detalles, responder esto **antes de escribir código**. Anotar
las respuestas aquí con hora y actualizar `contexto-del-reto.md`.

## Sobre el reto

- [ ] ¿"Generan interfaces" significa UI web, UI dentro de un chat, UI dentro de un
      cliente MCP (MCP Apps), o cualquiera? ¿Dan un host o lo construimos?
- [ ] ¿"Requiere MCP" quiere decir que nosotros exponemos un servidor MCP, que
      consumimos uno que ellos dan, o ambos?
- [ ] ¿Dan datos, APIs o un sandbox de Banorte? ¿O todo simulado?
- [ ] ¿Hay restricciones de modelo/proveedor de IA? ¿Dan créditos/API keys?
- [ ] ¿Qué evalúan exactamente? (rúbrica: técnica, UX, negocio, pitch)
- [ ] ¿Formato de entrega: repo, demo en vivo, video, deploy público?
- [ ] ¿Hay mentores de Banorte disponibles? ¿Cuándo? → stand de Banorte
- [ ] **¿Estamos registrados en el reto?** (se registra en el stand)
- [ ] **¿Podemos llamar Maya a nuestro agente y usar el logotipo?** Encuadre: evolución
      del asistente real, sin tipografía corporativa, datos sintéticos, disclaimer en el
      README (ADR 0009 + su enmienda del 2026-09-12). El logotipo sube el riesgo de marca:
      esta pregunta pasó de "es lo normal, pero se pregunta" a **obligatoria antes del
      pitch**. Si dicen que no, se quitan los dos componentes de `components/marca/`.
- [ ] ¿Qué da Banorte por su reto y cuál es el premio principal del evento? (la página
      de MLH solo lista los de patrocinadores MLH; ver `premios-objetivo.md`)
- [ ] ¿Los premios MLH exigen registro aparte (Devpost u otro)? ¿Fecha límite?

## Sobre el equipo

- [ ] ¿Quién toma qué rol? `web`, `mcp`, `contrato`, `demo` (ver `docs/equipo/roles.md`).
      Se anota en `docs/tablero.md`; cada quien corre la skill `inicio`.
- [ ] ¿En qué máquina se presenta? ¿Tiene todo instalado?
- [ ] ¿Hora límite para congelar features? (sugerido: hora 30)
- [ ] ¿Hora del primer ensayo de demo completo? (sugerido: hora 24)

## Respuestas (2026-09-12 04:40, de la presentación oficial y el video)

- **¿UI web, dentro de un chat, o cliente MCP?** Host propio. La interfaz se transmite
  con **A2UI o protocolo equivalente** y la pintan **componentes propios** ("no se
  entrega biblioteca de UI"). Decidido: A2UI real con catálogo propio (ADR 0003).
- **¿MCP propio o consumido?** Propio: "exponer al modelo los datos, las herramientas
  y las acciones que el equipo construyó".
- **¿Datos de Banorte?** No. "Sintéticos, simulados o de fuentes públicas", creados por
  el equipo. Son un entregable (03 · Datos).
- **¿Modelo/proveedor?** Libre. "Lenguaje, framework, modelo y proveedor de
  infraestructura: libre elección de cada equipo." Créditos/API keys: **pendiente de
  confirmar**.
- **¿Qué evalúan?** Rúbrica de 7 criterios en `rubrica-y-entregables.md`. 45% utilidad
  + adaptabilidad de la UI; 30% ingeniería (LLM, contexto, MCP, A2UI); 5% presentación.
- **¿Formato de entrega?** Cuatro entregables: demo en vivo (flujo completo), repositorio
  con instrucciones, APIs y datasets, diagrama de arquitectura con trade-offs.
  **Plataforma y hora límite: pendiente de confirmar.**
- **¿Mentores?** En el **stand de Banorte** (video, 04:27). Ahí también se registran los
  equipos: **confirmar que el nuestro está registrado**.
- **Reglas duras**: componentes propios; datos propios; **al menos un flujo accionable
  con cambio real**; libertad de stack.
- **Consejo oficial**: problema pequeño, resuelto completo.
