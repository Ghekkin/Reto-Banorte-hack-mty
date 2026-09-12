---
verificado: 2026-09-12 13:20
estado: en-progreso
---

# Voz con ElevenLabs (premio lateral)

## Para cualquiera

Maya se puede hablar en vez de escribirle. La persona toca un botón, dice lo que
quiere ("cuánto gasté en restaurantes este mes"), y esa misma pregunta entra al
mismo Maya de siempre: el que arma la pantalla con la respuesta. ElevenLabs pone
los oídos y la voz (escuchar y contestar hablado); el cerebro que entiende la
pregunta y decide qué pantalla construir sigue siendo el agente propio del reto,
sin cambios.

Es un premio lateral (`docs/reto/premios-objetivo.md`): nunca es el único camino
para usar Maya. Si algo de la voz falla —sin micrófono, sin conexión, sin
crédito— la persona sigue escribiendo en el chat de texto exactamente como hoy.
Ahora mismo esta pieza está **construida pero apagada**: existe el código, falta
que el botón de la pantalla principal y el chat de Maya la enciendan.

## Técnico

### Dónde vive

- Flag: `NEXT_PUBLIC_FEATURE_VOZ` (`.env.example`). En `"0"` o ausente, ningún
  código de esta pieza corre.
- Config del flag (cliente y servidor): `apps/web/src/lib/voz/flag.ts` →
  `vozHabilitada()`.
- Ruta que entrega la `signed_url` de ElevenLabs, la única que conoce
  `ELEVENLABS_API_KEY` y `ELEVENLABS_AGENT_ID`:
  `apps/web/src/app/api/voz/signed-url/route.ts` (`GET`).
- Hook de cliente: `apps/web/src/lib/voz/usar-conversacion-voz.ts` →
  `usarConversacionVoz()`.
- SDK: `@elevenlabs/client` (`apps/web/package.json`). El agente conversacional
  (voz, prompt, primer mensaje) se crea y edita en la consola de ElevenLabs
  (`elevenlabs.io/app/agents`), no en este repo.

### Flujo paso a paso

1. Quien conecte el botón (rol `web`) llama `usarConversacionVoz({ ...callbacks
   })` y guarda `estado`, `iniciar`, `detener`.
2. Al tocar el botón, `iniciar()`:
   - revisa `vozHabilitada()`; si está apagado, llama `onFallback` y no toca la
     red;
   - pide permiso de micrófono (`getUserMedia`);
   - pide `GET /api/voz/signed-url` (timeout de 3 s);
   - abre la sesión de voz con `Conversation.startSession({ signedUrl,
     textOnly: false, ... })` de `@elevenlabs/client`.
3. Mientras la sesión está activa, el SDK maneja el micrófono y el audio de
   salida solo. El hook expone lo que a Maya le interesa:
   - `onTranscripcionUsuario(texto)` — lo que la persona dijo, ya transcrito.
     **Esto es lo que se conecta a `enviarTexto` de `usarAgente`**
     (`apps/web/src/lib/agente/usar-agente.ts`): la voz entra al agente exactamente
     como si se hubiera escrito, mismo contrato, mismo turno, misma pantalla.
   - `onRespuestaAgente(texto)` — lo que el agente de voz contestó, para
     subtitular si hace falta (el audio ya sonó solo).
   - `onModoCambia("speaking" | "listening")` — para animar el botón.
   - `onFallback(motivo)` — cualquier fallo, en cualquier punto de arriba.
4. `detener()` cierra la sesión (`endSession`).

### Entradas y salidas

`GET /api/voz/signed-url` (sin cuerpo):

```json
// 200
{ "signedUrl": "wss://api.elevenlabs.io/..." }

// 404 — flag apagado
{ "error": "la voz esta apagada (NEXT_PUBLIC_FEATURE_VOZ)" }

// 503 — faltan credenciales o ElevenLabs no contesto a tiempo (3 s)
{ "error": "...", "detalle"?: "..." }
```

`usarConversacionVoz(callbacks)` devuelve `{ estado, iniciar, detener,
enviarTexto, silenciarMicrofono }`. `estado` es
`"inactiva" | "conectando" | "activa" | "cerrando" | "error"`.

### Casos límite conocidos (fallback primero)

| Falla | Qué pasa |
|---|---|
| `NEXT_PUBLIC_FEATURE_VOZ` apagado | `iniciar()` no toca la red; `onFallback` de inmediato |
| Sin permiso de micrófono | `getUserMedia` rechaza; `onFallback`, `estado: "error"` |
| `/api/voz/signed-url` no contesta en 3 s | `AbortSignal.timeout`; `onFallback`, `estado: "error"` |
| Faltan `ELEVENLABS_API_KEY` / `ELEVENLABS_AGENT_ID` | la ruta responde 503 antes de llamar a ElevenLabs |
| El websocket se cae a media conversación | `onError` del SDK → `onFallback`, `estado: "error"` |

En todos los casos, quien conecte el botón decide el respaldo en `onFallback`;
el respaldo esperado es mostrar el chat de texto de Maya, que sigue funcionando
igual sin importar el estado de la voz.

### Cómo probarlo

- `pnpm --filter @maya/web test` corre `src/lib/voz/__tests__/flag.spec.ts`
  (el flag es estricto: solo `"1"` enciende).
- Con el flag apagado (o `.env` sin la variable, que es lo mismo):
  `curl http://localhost:3000/api/voz/signed-url` debe responder 404 sin salir
  a la red. Verificado 2026-09-12.
- Para probar con ElevenLabs de verdad: llenar `ELEVENLABS_API_KEY` y
  `ELEVENLABS_AGENT_ID` en `.env` (créditos gratuitos de MLH), crear un agente
  conversacional en `elevenlabs.io/app/agents`, poner
  `NEXT_PUBLIC_FEATURE_VOZ=1`, y llamar `usarConversacionVoz()` desde un botón
  de prueba.

### Pendiente

- Conectar el botón de la pantalla principal y el botón dentro del chat de
  Maya a `usarConversacionVoz()` (dueño: rol `web`, una vez esos componentes
  existan).
- Cablear `onTranscripcionUsuario` a `enviarTexto` de `usarAgente` en el punto
  de integración real.
- Registrar el agente conversacional en la consola de ElevenLabs y llenar las
  variables en el `.env` real (no en este repo).
- Anotar el registro para el premio en `docs/reto/premios-objetivo.md` una vez
  la demo lo use de verdad (skill `premio-lateral`, paso 7; dueño: rol `demo`).
