import { correrTurno } from "@/lib/agente/agente";
import type { LineaStream, PeticionAgente } from "@/lib/agente/tipos";

/**
 * `POST /api/agente` — el unico endpoint del cliente. Responde en JSONL:
 * una linea por mensaje, en orden (docs/arquitectura/contrato-agente-cliente.md).
 *
 * Sin estado en el servidor: cada peticion trae todo lo que el turno necesita.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  let peticion: PeticionAgente;
  try {
    peticion = (await request.json()) as PeticionAgente;
  } catch {
    return Response.json({ error: "cuerpo invalido" }, { status: 400 });
  }

  if (!peticion.usuarioId || !peticion.conversacionId) {
    return Response.json({ error: "faltan usuarioId o conversacionId" }, { status: 400 });
  }

  const codificador = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controlador) {
      function emitir(linea: LineaStream) {
        controlador.enqueue(codificador.encode(JSON.stringify(linea) + "\n"));
      }
      try {
        for await (const linea of correrTurno(peticion)) emitir(linea);
      } catch (error) {
        emitir({
          tipo: "error",
          codigo: "modelo",
          mensaje: error instanceof Error ? error.message : String(error),
        });
        emitir({ tipo: "fin", pasos: 0, ms: 0 });
      } finally {
        controlador.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
