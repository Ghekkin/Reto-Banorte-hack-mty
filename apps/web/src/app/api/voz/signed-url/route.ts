import "server-only";

import { vozHabilitada } from "@/lib/voz/flag";

/**
 * `GET /api/voz/signed-url` — la unica pieza del servidor que conoce
 * `ELEVENLABS_API_KEY`. El navegador nunca ve la llave ni el id del agente:
 * pide esta url firmada y la usa directo para abrir el websocket de voz
 * (docs/como-funciona/premio-elevenlabs.md).
 *
 * Detras del flag `FEATURE_VOZ` (premio lateral): apagado, responde 404 y el
 * hook de voz cae al respaldo (texto) antes de intentar nada con la red.
 *
 * Timeout de 3 s contra la API de ElevenLabs: si no contesta a tiempo, el
 * error es un 503 con el motivo, nunca un colgado esperando al proveedor.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 3000;
const CABECERAS = { "Cache-Control": "no-store" } as const;

function error(mensaje: string, estado: number, extra?: Record<string, unknown>): Response {
  return Response.json({ error: mensaje, ...extra }, { status: estado, headers: CABECERAS });
}

export async function GET(): Promise<Response> {
  if (!vozHabilitada()) {
    return error("la voz esta apagada (NEXT_PUBLIC_FEATURE_VOZ)", 404);
  }

  const llave = process.env.ELEVENLABS_API_KEY;
  const agenteId = process.env.ELEVENLABS_AGENT_ID;
  if (!llave || !agenteId) {
    return error("faltan ELEVENLABS_API_KEY o ELEVENLABS_AGENT_ID en .env", 503);
  }

  try {
    const arriba = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agenteId)}`,
      { headers: { "xi-api-key": llave }, signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    if (!arriba.ok) {
      return error("ElevenLabs rechazo la peticion de url firmada", 502, { estadoRemoto: arriba.status });
    }
    const cuerpo = (await arriba.json()) as { signed_url?: string };
    if (!cuerpo.signed_url) return error("ElevenLabs no devolvio signed_url", 502);
    return Response.json({ signedUrl: cuerpo.signed_url }, { headers: CABECERAS });
  } catch (e) {
    return error("no se pudo contactar a ElevenLabs a tiempo", 503, {
      detalle: e instanceof Error ? e.message : String(e),
    });
  }
}
