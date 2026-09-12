---
verificado: 2026-09-12 05:10
fuentes: [video-whatsapp-2026-09-11-20-20, transcripcion-automatica-faster-whisper-medium]
---

# Transcripción del video de explicación (2026-09-11, 4:54)

Transcripción automática (faster-whisper, modelo `medium`, español). Puede tener
errores menores de reconocimiento; los evidentes van anotados entre corchetes. El
video narra las láminas de la presentación; **lo que agrega** está al final.

## Qué agrega sobre la presentación

| Dato nuevo | Dónde lo dicen | Qué hacemos |
|---|---|---|
| **Hay registro de equipos**, y se hace en el stand de Banorte ("los equipos que faltan por registrarse… los podemos atender ahí en el stand") | 04:27–04:36 | **Confirmar que estamos registrados.** Es lo primero del día. |
| **Los mentores están en el stand de Banorte** | 04:27 | Ahí se resuelven las preguntas pendientes: créditos/API keys, hora y plataforma de entrega. |
| **El jurado va a preguntar por qué se eligió el stack y la arquitectura** ("les vamos a preguntar sobre por qué ocuparon tal stack, tal arquitectura") | 04:10–04:13 | `docs/arquitectura/trade-offs.md` es la respuesta escrita; el pitch lleva una frase por decisión. |
| "Mientras mejor sea el caso **o más diversificado**, mejores resultados" | 02:52 | Matiz al "problema pequeño resuelto completo": un flujo completo primero; luego amplitud si sobra tiempo. |
| Innovación = "que no sea algo repetitivo que ya se había visto antes" | 03:44 | El ángulo distinto se decide en el ADR 0004, no se improvisa el domingo. |
| Interpretación de la intención "gracias a los agentes" (transcrito "la gente") | 01:07 | Confirma que la interpretación es del LLM, no de reglas. |

No dicen: hora límite de entrega, plataforma de entrega, si dan créditos o API keys,
formato exacto del pitch. Se preguntan en el stand.

## Transcripción literal

- **[00:00]** Hola a todos, hoy vamos a presentarles un reto bastante interesante y espero que estén emocionados tanto como nosotros.
- **[00:10]** El reto que nosotros vamos a proponer es el de UI. Este es un nuevo protocolo libre, lo creó Google hace no mucho tiempo.
- **[00:23]** Este tipo de protocolo lo que hace es diseñar la interfaz o el front dependiendo de la pregunta del usuario.
- **[00:35]** Prácticamente se adapta a la pregunta que le haga. En vez de tratar con texto claro, viñetas o algo muy tradicional,
- **[00:46]** la iniciativa de esto busca tener algo mejor visualmente, una mejor experiencia. No solamente algo claro,
- **[00:55]** sino gráficas, tablas o un tipo de contenido visualmente mejor.
- **[01:01]** Aquí los tres pasos importantes que nosotros vemos uno es interpretar la acción.
- **[01:07]** Esto es gracias a [los agentes] que van a detectar la intención de la persona para hacer la pregunta.
- **[01:14]** Después genera la interfaz en tiempo real justamente adecuándose al tipo de problema que intenta resolver.
- **[01:22]** Y después ejecuta la acción y justamente entrega a la persona el front final.
- **[01:28]** Este proyecto está muy acostado al tema bancario pero es libre de hacerse en cualquier tema.
- **[01:34]** Puede hacerse en crédito, inversiones, banca personal, pagos, seguros, etc.
- **[01:39]** Estos temas son totalmente abiertos y pueden hacerlo con tal libertad.
- **[01:43]** Nosotros vemos tres fuentes importantes o tres pilares.
- **[01:47]** El tema de los LLM sub-agentes que tienen que tener esta solución tiene que estar con un protocolo MCP
- **[01:54]** y justamente la interfaz A2UI.
- **[01:57]** En esta parte vemos como una arquitectura ejemplo de cómo estaríamos viendo el flujo.
- **[02:04]** El usuario hace una pregunta, el agente la interpreta y manda la señal al MCP
- **[02:11]** que con sus herramientas, tools, products, lo que tenga configurado, manda a la A2UI
- **[02:17]** y crea la interfaz con los componentes previamente realizados.
- **[02:22]** Es prácticamente el flujo que nosotros vemos en esta solución.
- **[02:27]** Lo que cada equipo va a construir va a tener sus propios componentes,
- **[02:31]** son libres de hacernos sus propios datos, se envía y ustedes crean sus propios datos [sintéticos],
- **[02:37]** tablas, lo que crea es necesario para la solución.
- **[02:39]** Están libres de hacer lo que más se les acomode.
- **[02:42]** Y también la libertad está buena, sea en Python, TypeScript, como mejor se les acomode.
- **[02:48]** Y justamente al menos un flujo accionable o un caso de uso.
- **[02:52]** Mientras mejor sea el caso o más diversificado sea, pues obviamente mejor resultados van a obtener.
- **[03:01]** ¿Cómo vamos a evaluarlo?
- **[03:03]** Tenemos una rubrica justamente donde vemos puntos cruciales en cada etapa
- **[03:08]** desde el cumplimiento de utilidad para el usuario que justamente cumpla la función de solucionar el problema,
- **[03:14]** la calidad y adaptabilidad.
- **[03:16]** Prácticamente que el front sí se adapte a la solución esperada del usuario.
- **[03:21]** La calidad de la solución va de la mano con la interfaz y la parte del código.
- **[03:26]** La arquitectura e ingeniería es de cómo diseña la parte de la arquitectura técnica
- **[03:30]** y cómo los problemas se pueden ir abordando ya sea a través de los agentes o [MCP].
- **[03:35]** Mientras más robusta sea la solución, el mejor puntaje va a obtener.
- **[03:39]** La parte del UI diseño prácticamente es la interfaz de cómo se visualiza.
- **[03:44]** La innovación, que la solución sea bastante y novedosa,
- **[03:48]** o sea que no sea algo repetitivo que ya se había visto antes.
- **[03:52]** Y la presentación, justamente tener como este speech bien preparado.
- **[03:57]** ¿Qué queremos por parte de los equipos?
- **[04:01]** Una corrida en vivo, justamente de cómo está funcionando.
- **[04:04]** El repositorio, las [APIs] y datos, justamente para poder validar lo que se construyó.
- **[04:10]** Y las [decisiones], justamente les vamos a preguntar nosotros
- **[04:13]** sobre por qué ocuparon tal [stack], tal arquitectura, etc.
- **[04:18]** Aquí tiene libertad [de creatividad] para resolver el problema.
- **[04:21]** Siéntanse con la capacidad de adaptarlo a la necesidad que ustedes vean conveniente.
- **[04:27]** Y pues nada, nosotros vamos a estar en el stand de Banorte.
- **[04:31]** Aquí están las redes sociales para que nos puedan seguir los equipos que faltan por registrarse.
- **[04:36]** Los podemos atender ahí en el stand.
- **[04:39]** Entonces creo que sería todo y muchas gracias y mucho éxito.
