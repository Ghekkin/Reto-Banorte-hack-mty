---
verificado: 2026-09-12 17:45
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

**Estado real (2026-09-12 17:45):** el puente completo está construido y
**verificado en vivo** contra la cuenta de ElevenLabs de los créditos MLH —
conectar, escuchar y colgar funcionan de punta a punta en el chat de Maya
(`/maya`). Lo que falta es configurar, del lado de ElevenLabs (no de este
repo), la herramienta `consultar_maya` en el agente — ver "Configuración
pendiente en ElevenLabs" abajo — y decidir un botón de voz para la pantalla de
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
- SDK: `@elevenlabs/client` (`apps/web/package.json`). El agente conversacional
  (voz, prompt, primer mensaje, **y la tool `consultar_maya`**) se crea y
  edita en la consola de ElevenLabs (`elevenlabs.io/app/agents`), no en este
  repo.

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
   tool `consultar_maya`** (así debe estar configurada en su consola — ver
   abajo) con el texto de la pregunta.
4. `consultar_maya` (definida en `ConsolaMaya`) llama `enviarTexto(pregunta)`:
   el MISMO turno que si la persona hubiera escrito. Eso agrega el mensaje al
   hilo, corre el agente real (Gemini/Claude + MCP), pinta la pantalla A2UI en
   el chat, y **devuelve el texto que Maya dijo**.
5. Ese texto vuelve a ElevenLabs como resultado de la tool. El agente de voz
   lo lee en voz alta (su prompt le dice que lo repita, no que lo reinvente).
   La pantalla ya está en el chat desde el paso 4 — texto hablado y pantalla
   visual llegan del mismo turno, no hay carrera entre los dos.
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

### Configuración pendiente en ElevenLabs (consola, no repo)

En `elevenlabs.io/app/agents/<id>` → pestaña **Tools** → **Add Tool**:

| Campo | Valor |
|---|---|
| Tool Type | **Client** |
| Name | `consultar_maya` (debe coincidir EXACTO con la clave en `herramientasVoz` de `consola-maya.tsx`) |
| Description | "Úsala para cualquier pregunta financiera de la persona (gastos, saldo, ahorro, créditos, inversiones). Pásale la pregunta tal cual la dijo. Cuando responda, di su resultado en voz alta PALABRA POR PALABRA, sin agregar ni quitar nada — es la respuesta real de Maya, no la inventes tú." |
| Parámetro | `pregunta` — String — Required — "La pregunta financiera de la persona, tal cual la dijo" |
| Wait for response | **Sí** (el agente necesita el texto de vuelta para leerlo) |

Y en la pestaña **Agent**, el system prompt debe reforzar lo mismo: nunca
inventar cifras, siempre llamar `consultar_maya` ante cualquier pregunta
financiera, y leer su resultado tal cual.

### Casos límite conocidos (fallback primero)

| Falla | Qué pasa |
|---|---|
| `NEXT_PUBLIC_FEATURE_VOZ` apagado | El botón de voz no se pinta (`BarraConversacion` recibe `estadoVoz`/`alAlternarVoz` como `undefined`) |
| Sin permiso de micrófono | `getUserMedia` rechaza; `onFallback`, `estado: "error"`, aviso corto en el chat ("sigue escribiéndole a Maya") |
| `/api/voz/signed-url` no contesta en 3 s | `AbortSignal.timeout`; mismo aviso |
| Faltan `ELEVENLABS_API_KEY` / `ELEVENLABS_AGENT_ID` | la ruta responde 503 antes de llamar a ElevenLabs |
| El websocket se cae a media conversación | `onError` del SDK → mismo aviso, el hilo de texto ya escrito no se pierde |
| La tool `consultar_maya` no está configurada en la consola | ElevenLabs conversa con su propio LLM sin tocar nuestro flujo: no pinta pantalla ni sabe datos reales. Por eso la configuración de arriba no es opcional |

### Cómo probarlo

- `pnpm --filter @maya/web test` corre `src/lib/voz/__tests__/flag.spec.ts`
  (el flag es estricto: solo `"1"` enciende) — 123 pruebas en verde en todo
  `@maya/web`, incluida esta.
- `pnpm --filter @maya/web typecheck` en verde.
- Con el flag apagado: `curl http://localhost:3000/api/voz/signed-url`
  responde 404 sin salir a la red, y el botón de voz no aparece en `/maya`.
- **Verificado en vivo 2026-09-12 17:45** (créditos MLH reales, vía Chrome
  automatizado): con el flag encendido y las credenciales reales,
  `/api/voz/signed-url` devuelve una `wss://` real; el botón conecta
  (`"Conectando con Maya..."` → `"Escuchando... puedes hablar ahora"`) y
  cuelga limpio (vuelve a `"¿Qué necesitas resolver hoy?"`), sin errores en
  consola. **No verificado todavía**: el turno de voz completo (hablar →
  `consultar_maya` → pantalla + respuesta hablada), porque eso necesita (1) la
  tool configurada en la consola de ElevenLabs (ver arriba) y (2) un
  micrófono real diciendo algo — el entorno de prueba automatizada no tiene
  ninguno de los dos.

### Pendiente

- **Configurar la tool `consultar_maya` en la consola de ElevenLabs** (tabla
  arriba). Sin esto el botón conecta pero el agente de voz no llega a tocar
  el flujo real.
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
