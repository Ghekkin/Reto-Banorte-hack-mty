"use client";

import { useCallback, useRef, useState } from "react";
import { Conversation, type Status, type VoiceConversation } from "@elevenlabs/client";
import { vozHabilitada } from "@/lib/voz/flag";

/**
 * El hook de la integracion de voz (ElevenLabs, premio lateral). Envuelve
 * `@elevenlabs/client` para que quien conecte el boton principal y el chat de
 * Maya solo tenga que llamar `iniciar()` / `detener()` y leer `estado`, sin
 * saber nada de websockets, `signed_url` ni permisos de microfono.
 *
 * Deliberadamente NO decide que hacer con la transcripcion: `onTranscripcionUsuario`
 * entrega el texto tal cual, y quien conecte el boton lo pasa a `enviarTexto` de
 * `usarAgente` (mismo contrato que si la persona hubiera escrito) — asi la voz
 * es una entrada mas al mismo agente, no un camino aparte.
 *
 * Fallback primero (regla del premio lateral): CUALQUIER fallo — flag apagado,
 * sin permiso de microfono, `signed-url` que no contesta en 3 s, el websocket
 * que se cae — termina en `onFallback(motivo)` y `estado: "error"`, nunca en una
 * excepcion sin atrapar. Quien conecte el boton decide el respaldo (normalmente:
 * mostrar el chat de texto, que es identico a como esta hoy).
 *
 * Ver docs/como-funciona/premio-elevenlabs.md para los dos niveles y el flag.
 */

export type EstadoVoz = "inactiva" | "conectando" | "activa" | "cerrando" | "error";

const MAPA_ESTADO: Record<Status, EstadoVoz> = {
  disconnected: "inactiva",
  connecting: "conectando",
  connected: "activa",
  disconnecting: "cerrando",
};

export type CallbacksVoz = {
  /** Transcripcion FINAL de lo que dijo la persona. */
  onTranscripcionUsuario?: (texto: string) => void;
  /** Lo que respondio el agente de voz, en texto (el audio ya se reprodujo solo). */
  onRespuestaAgente?: (texto: string) => void;
  /** `"speaking"` mientras Maya habla, `"listening"` mientras escucha. Para animar el boton. */
  onModoCambia?: (modo: "speaking" | "listening") => void;
  /** Ver el aviso de "fallback primero" arriba: aqui se decide el respaldo. */
  onFallback?: (motivo: string) => void;
};

/** Timeout contra `/api/voz/signed-url`, igual que el que la propia ruta le aplica a ElevenLabs. */
const TIMEOUT_URL_FIRMADA_MS = 3000;

export function usarConversacionVoz(callbacks: CallbacksVoz = {}) {
  const [estado, setEstado] = useState<EstadoVoz>("inactiva");
  const conversacion = useRef<VoiceConversation | null>(null);
  const iniciando = useRef(false);
  // Ref para que `iniciar`/`detener` no cambien de identidad en cada render: los
  // callbacks pueden ser closures frescas del componente que llama sin forzar a
  // quien usa el hook a memoizarlas.
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const iniciar = useCallback(async () => {
    if (!vozHabilitada()) {
      callbacksRef.current.onFallback?.("la voz esta apagada (NEXT_PUBLIC_FEATURE_VOZ)");
      return;
    }
    if (conversacion.current || iniciando.current) return;
    iniciando.current = true;
    setEstado("conectando");

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const respuesta = await fetch("/api/voz/signed-url", { signal: AbortSignal.timeout(TIMEOUT_URL_FIRMADA_MS) });
      if (!respuesta.ok) {
        const cuerpo = await respuesta.json().catch(() => ({}));
        throw new Error((cuerpo as { error?: string }).error ?? `signed-url respondio ${respuesta.status}`);
      }
      const { signedUrl } = (await respuesta.json()) as { signedUrl: string };

      conversacion.current = await Conversation.startSession({
        signedUrl,
        textOnly: false,
        onStatusChange: ({ status }) => setEstado(MAPA_ESTADO[status]),
        onModeChange: ({ mode }) => callbacksRef.current.onModoCambia?.(mode),
        onMessage: ({ message, source }) => {
          if (source === "user") callbacksRef.current.onTranscripcionUsuario?.(message);
          else callbacksRef.current.onRespuestaAgente?.(message);
        },
        onError: (mensaje) => {
          setEstado("error");
          callbacksRef.current.onFallback?.(mensaje);
        },
      });
    } catch (e) {
      conversacion.current = null;
      setEstado("error");
      callbacksRef.current.onFallback?.(e instanceof Error ? e.message : String(e));
    } finally {
      iniciando.current = false;
    }
  }, []);

  const detener = useCallback(async () => {
    const sesion = conversacion.current;
    conversacion.current = null;
    setEstado("inactiva");
    if (sesion) await sesion.endSession();
  }, []);

  /** Alternativa de texto DENTRO de la sesion activa (manos libres a medias, ruido, etc). */
  const enviarTexto = useCallback((texto: string) => {
    conversacion.current?.sendUserMessage(texto);
  }, []);

  const silenciarMicrofono = useCallback((mudo: boolean) => {
    conversacion.current?.setMicMuted(mudo);
  }, []);

  return { estado, iniciar, detener, enviarTexto, silenciarMicrofono };
}
