---
verificado: 2026-09-13 04:15
estado: en-progreso
---

# Voz con ElevenLabs (premio lateral)

## Para cualquiera

Maya se puede hablar en vez de escribirle. La persona pulsa el botón de
micrófono en el chat de Maya, dice lo que quiere ("cuánto gasté en
restaurantes este mes"), y esa misma pregunta corre por **el mismo Maya de
siempre**: el que arma la pantalla con la respuesta, con los mismos datos y
las mismas reglas. ElevenLabs pone los oídos y la voz (escuchar y contestar
hablado); el cerebro que entiende la pregunta, decide qué pantalla construir y
qué contestar sigue siendo el agente propio del reto, sin cambios y sin que
otro modelo se invente una cifra.

Así se conecta: el agente de voz de ElevenLabs **no improvisa la respuesta
financiera**. Cuando detecta que la persona pregunta algo de dinero, llama una
herramienta ("tool") que en realidad es nuestro propio agente — el mismo botón
de "enviar" que usa el chat de texto. Esa herramienta corre el turno completo
(interpreta, arma la pantalla, la pinta en el chat) y devuelve el texto que
Maya dijo; ElevenLabs lee ese texto en voz alta. Resultado: la voz y la
pantalla salen del mismo turno, al mismo tiempo, nunca de dos cerebros
distintos que podrían contradecirse.

Es un premio lateral (`docs/reto/premios-objetivo.md`): nunca es el único
camino para usar Maya. Si algo de la voz falla —sin micrófono, sin conexión,
sin crédito— la persona sigue escribiendo en el chat de texto exactamente como
hoy; el botón de voz simplemente no aparece o avisa y no hace nada más.

**Maya no habla mientras piensa.** La primera prueba real mostró dos cosas
"desconectadas": el agente de voz decía "entendí tu pregunta" antes de que el
MCP contestara, y luego decía "tardó mucho, intenta más tarde" justo cuando la
pantalla ya estaba lista. Las dos son configuración del agente de ElevenLabs
(no del código): `pre_tool_speech` apagado (silencio total mientras
`consultar_maya` corre) y un `response_timeout_secs` que alcanza para un turno
real. Ver "Configuración del agente en ElevenLabs" abajo.

**Estado real (2026-09-13 04:15):** el puente completo está construido,
**verificado en vivo** contra la cuenta de ElevenLabs de los créditos MLH, y
la configuración del agente (prompt, `first_message`, la tool) **ya está
aplicada** con `pnpm voz:configurar`. Lo que falta es probar un turno completo
hablado con micrófono real, y decidir un botón de voz para la pantalla de
Inicio, que cambió de diseño mientras esto se construía (ver "Pendiente").

## Técnico

### Dónde vive

- Flag: `NEXT_PUBLIC_FEATURE_VOZ` (`.env.example`). En `"0"` o ausente, el
  botón de voz no se pinta y ningún código de esta pieza corre.
- Config del flag (cliente y servidor): `apps/web/src/lib/voz/flag.ts` →
  `vozHabilitada()`.
- Ruta que entrega la `signed_url` de ElevenLabs, la única pieza que conoce
  `ELEVENLABS_API_KEY` y `ELEVENLABS_AGENT_ID`:
  `apps/web/src/app/api/voz/signed-url/route.ts` (`GET`).
- Hook de cliente: `apps/web/src/lib/voz/usar-conversacion-voz.ts` →
  `usarConversacionVoz()`. No sabe nada de Maya ni de `usarAgente`; solo
  conoce el SDK de ElevenLabs y expone `estado`/`iniciar`/`detener`.
- El puente hacia el agente real: `apps/web/src/components/maya/consola-maya.tsx`.
  Aquí se define la client tool `consultar_maya` (una función de una línea que
  llama `enviarTexto` de `usarAgente`) y se conecta al botón de
  `BarraConversacion` (`apps/web/src/components/maya/barra-conversacion.tsx`,
  ahora controlado por `estadoVoz`/`alAlternarVoz` en vez de manejar su propio
  estado falso).
- `enviarTexto`/`enviarAccion` de `usarAgente`
  (`apps/web/src/lib/agente/usar-agente.ts`) ahora **devuelven** el texto que
  dijo el agente en el turno (antes no devolvían nada): es lo que la voz
  necesita para poder repetirlo. Si el turno solo pintó pantalla sin decir
  nada, hay una frase de respaldo para que la voz nunca se quede en silencio.
  `enviarTexto` también acepta un segundo parámetro opcional
  `{ alResponder }`, que dispara **una vez**, apenas llega la primera línea
  `texto` del stream — antes de que el turno termine de cerrar
  (transparencia, sugerencias, congelar el hilo). Es lo que deja a la voz
  empezar a hablar en el momento exacto en que Maya ya tiene algo que decir.
- SDK: `@elevenlabs/client` (`apps/web/package.json`). El agente conversacional
  (voz, LLM, temperatura…) se crea y edita a mano en la consola de ElevenLabs
  (`elevenlabs.io/app/agents`); el `first_message`, el system prompt y la tool
  `consultar_maya` se aplican desde este repo — ver "Configuración del agente
  en ElevenLabs" abajo.

### Flujo paso a paso

1. En `/maya`, si `vozHabilitada()` es cierto, `BarraConversacion` pinta el
   botón de micrófono con `estadoVoz`/`alAlternarVoz` que le pasa
   `ConsolaMaya`.
2. Al pulsar el botón (`alAlternarVoz`), si no hay sesión activa,
   `iniciarVoz(herramientasVoz)`:
   - revisa `vozHabilitada()`; si está apagado, llama `onFallback` y no toca
     la red (en la práctica el botón ni se pinta con el flag apagado, así que
     esto es solo el cinturón extra);
   - pide permiso de micrófono (`getUserMedia`);
   - pide `GET /api/voz/signed-url` (timeout de 3 s);
   - abre la sesión con `Conversation.startSession({ signedUrl, textOnly:
     false, clientTools: herramientasVoz, ... })` de `@elevenlabs/client`.
3. La persona habla. ElevenLabs transcribe y **su propio LLM decide llamar la
   tool `consultar_maya`** con el texto de la pregunta — el prompt del agente
   le prohíbe decir nada antes de eso, y `pre_tool_speech: "off"` lo hace
   cumplir del lado de ElevenLabs (ver "Configuración del agente" abajo):
   silencio total mientras esto corre.
4. `consultar_maya` (definida en `ConsolaMaya`) llama
   `enviarTexto(pregunta, { alResponder })`: el MISMO turno que si la persona
   hubiera escrito. Eso agrega el mensaje al hilo, corre el agente real
   (Gemini/Claude + MCP), y pinta la pantalla A2UI en el chat.
5. En cuanto el servidor emite la línea `texto` del turno —que llega despues
   de que la pantalla ya esta completa (`agente.ts`, el cierre se resuelve
   antes que `texto`)— `alResponder` resuelve la promesa de la tool de una
   vez, **sin esperar** a que `enviarTexto` termine de verdad (transparencia,
   sugerencias). Ese texto vuelve a ElevenLabs como resultado de la tool, y el
   agente de voz lo lee en voz alta PALABRA POR PALABRA (se lo prohíbe
   parafrasear). La pantalla ya está en el chat — texto hablado y pantalla
   visual llegan del mismo turno, prácticamente al mismo tiempo.
6. `detenerVoz()` cierra la sesión. También se cierra sola al salir de
   `/maya` (cleanup de `useEffect`) y al terminar el turno de voz.

**Por qué una `useRef` para la tool.** `enviarTexto` cambia de identidad en
cada turno (crece el `historial` que necesita para el contexto), pero
ElevenLabs guarda la función `consultar_maya` que le diste UNA vez, al
conectar. Si esa función quedara "congelada" con el `enviarTexto` del primer
turno, la segunda pregunta de la misma conversación de voz mandaría el
historial viejo. `enviarTextoRef.current` siempre apunta al más nuevo.

### Entradas y salidas

`GET /api/voz/signed-url` (sin cuerpo):

```json
// 200
{ "signedUrl": "wss://api.elevenlabs.io/v1/convai/conversation?agent_id=...&conversation_signature=..." }

// 404 — flag apagado
{ "error": "la voz esta apagada (NEXT_PUBLIC_FEATURE_VOZ)" }

// 503 — faltan credenciales o ElevenLabs no contesto a tiempo (3 s)
{ "error": "...", "detalle"?: "..." }
```

`usarConversacionVoz(callbacks)` devuelve `{ estado, iniciar, detener,
enviarTextoALaVoz, silenciarMicrofono }`. `iniciar(herramientas)` acepta un
mapa de client tools (`HerramientasVoz`). `estado` es
`"inactiva" | "conectando" | "activa" | "cerrando" | "error"`.

`enviarTexto`/`enviarAccion` de `usarAgente` ahora devuelven `Promise<string>`
(antes `Promise<void>`): el texto hablable del turno, con un mensaje de
respaldo si el turno no dijo nada.

### Configuración del agente en ElevenLabs

La fuente de verdad es `scripts/voz/agente-elevenlabs.json` (versionado en el
repo), no la consola. Se aplica con:

```bash
pnpm voz:configurar        # aplica de verdad
pnpm voz:configurar --dry  # imprime el payload exacto, sin tocar nada
```

El script (`scripts/configurar-voz.mjs`) es idempotente: busca la tool
`consultar_maya` por nombre (la crea si no existe, la actualiza si ya
existía), y hace `PATCH` al agente con el objeto `agent` **completo** (todo lo
que ya tenía, más los cambios) para no perder nada de lo que se configuró a
mano — la voz (TTS) y el modelo LLM elegidos en el dashboard nunca se tocan,
porque viven fuera de lo que el script escribe.

Lo que aplica, y por qué:

| Campo | Valor | Por qué |
|---|---|---|
| `first_message` | `""` (vacío) | El agente espera a que la persona hable primero; no saluda solo |
| `prompt.prompt` | Ver `agente-elevenlabs.json` | 4 reglas: solo `consultar_maya` como fuente, nada antes de llamarla, repetir su resultado palabra por palabra, nunca inventar cifras |
| Tool `consultar_maya` → `pre_tool_speech` | `"off"` | Sin esto, ElevenLabs decide hablar ANTES de la tool ("entendí tu pregunta") cuando detecta que suele tardar — que es justo nuestro caso |
| Tool `consultar_maya` → `response_timeout_secs` | `45` | El turno real puede tardar hasta `TIMEOUT_TURNO_MS` (30 s, `apps/web/src/lib/agente/tipos.ts`) + red. El default de ElevenLabs es 20 s: se agotaba antes de que la pantalla terminara de armarse y el agente decía "tardó mucho, intenta más tarde" a media respuesta |
| Tool `consultar_maya` → `interruption_mode` | `"disable_during_tool"` | El silencio de la tool no se corta por ruido de fondo mientras corre |
| Tool `consultar_maya` → parámetro `pregunta` | tipo String, **Value Type = LLM Prompt**, required | El LLM de ElevenLabs decide su valor en el momento, a partir de lo que la persona dijo — no es un valor fijo ni una variable que la app ya conozca de antemano |

`apps/web/src/lib/voz/__tests__/agente-elevenlabs.spec.ts` prueba estas
reglas sobre el JSON (nombre de la tool, `pre_tool_speech`, `first_message`, y
que `response_timeout_secs` sea mayor que `TIMEOUT_TURNO_MS / 1000`): si
alguien sube el timeout del turno sin subir el de la tool, la prueba truena
antes que la demo.

**Aplicado por última vez:** 2026-09-13 04:15, contra el agente real de la
cuenta MLH (`ELEVENLABS_AGENT_ID` en `.env`).

### Casos límite conocidos (fallback primero)

| Falla | Qué pasa |
|---|---|
| `NEXT_PUBLIC_FEATURE_VOZ` apagado | El botón de voz no se pinta (`BarraConversacion` recibe `estadoVoz`/`alAlternarVoz` como `undefined`) |
| Sin permiso de micrófono | `getUserMedia` rechaza; `onFallback`, `estado: "error"`, aviso corto en el chat ("sigue escribiéndole a Maya") |
| `/api/voz/signed-url` no contesta en 3 s | `AbortSignal.timeout`; mismo aviso |
| Faltan `ELEVENLABS_API_KEY` / `ELEVENLABS_AGENT_ID` | la ruta responde 503 antes de llamar a ElevenLabs |
| El websocket se cae a media conversación | `onError` del SDK → mismo aviso, el hilo de texto ya escrito no se pierde |
| La tool `consultar_maya` no está configurada en el agente | ElevenLabs conversa con su propio LLM sin tocar nuestro flujo: no pinta pantalla ni sabe datos reales. `pnpm voz:configurar` la deja configurada |

### Cómo probarlo

- `pnpm --filter @maya/web test` — incluye `src/lib/voz/__tests__/flag.spec.ts`
  (el flag es estricto: solo `"1"` enciende) y
  `src/lib/voz/__tests__/agente-elevenlabs.spec.ts` (las reglas de
  `agente-elevenlabs.json`) — 319 pruebas en verde en todo `@maya/web`.
- `pnpm --filter @maya/web typecheck` en verde.
- Con el flag apagado: `curl http://localhost:3000/api/voz/signed-url`
  responde 404 sin salir a la red, y el botón de voz no aparece en `/maya`.
- `pnpm voz:configurar --dry` para ver el payload exacto antes de aplicarlo.
- **Verificado en vivo 2026-09-12 17:45** (créditos MLH reales, vía Chrome
  automatizado): con el flag encendido y las credenciales reales,
  `/api/voz/signed-url` devuelve una `wss://` real; el botón conecta
  (`"Conectando con Maya..."` → `"Escuchando... puedes hablar ahora"`) y
  cuelga limpio (vuelve a `"¿Qué necesitas resolver hoy?"`), sin errores en
  consola.
- **Aplicado en vivo 2026-09-13 04:15**: `pnpm voz:configurar` corrió contra
  el agente real (tool `consultar_maya` actualizada, `first_message` y
  `prompt` del agente aplicados). **No verificado todavía**: un turno de voz
  completo con micrófono real (hablar → silencio → pantalla + voz juntas) —
  el entorno de prueba automatizada no tiene micrófono.

### Riesgo conocido: las cifras que dice la voz

En `/maya` las props con cifras las sigue escribiendo el modelo en algunos
casos (`docs/issues/2026-09-13-cifras-escritas-por-el-modelo-en-maya.md`): el
texto que `consultar_maya` devuelve es el mismo `texto` que ya se ve en el
chat, así que la voz hereda ese riesgo tal cual — no es un problema nuevo de
la integración de voz, es el mismo del chat de texto, solo que ahora también
se escucha.

### Pendiente

- Probar un turno de voz completo de principio a fin con un micrófono real.
- **Botón de voz en Inicio**: cuando se diseñó esta integración, `Inicio`
  (`BarraFlotanteMaya`) tenía un botón de micrófono placeholder. Mientras
  tanto, otra sesión reescribió esa barra para que el texto llame a
  `preguntarEnInicio` (que **reemplaza el dashboard completo**, un flujo
  distinto al chat de Maya, sin `usarAgente` ni streaming) y el botón de
  micrófono desapareció. Conectar voz ahí necesitaría o (a) que el botón
  navegue a `/maya?voz=1` (ya soportado: `ConsolaMaya` arranca la voz sola con
  ese query param), o (b) una segunda tool de voz específica para
  `preguntarEnInicio` con su propio texto hablable. Se dejó sin resolver a
  propósito en vez de adivinar sobre un componente que otra persona tiene en
  vuelo — decisión de producto, no técnica.
- Anotar el registro para el premio en `docs/reto/premios-objetivo.md` una vez
  la demo lo use de verdad (skill `premio-lateral`, paso 7; dueño: rol `demo`).
