import { correrTurno } from "@/lib/agente/agente";
import { esquemaPeticion, type LineaStream, type PeticionAgente } from "@/lib/agente/tipos";

/**
 * `POST /api/agente` — el unico endpoint del cliente. Responde en JSONL:
 * una linea por mensaje, en orden (docs/arquitectura/contrato-agente-cliente.md).
 *
 * Sin estado en el servidor: cada peticion trae todo lo que el turno necesita.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return Response.json({ error: "cuerpo invalido: no es JSON" }, { status: 400 });
  }

  // Un cuerpo mal formado se rechaza AQUI, con 400 y el detalle, no a media respuesta.
  const validacion = esquemaPeticion.safeParse(cuerpo);
  if (!validacion.success) {
    const detalle = validacion.error.issues.map((i) => `${i.path.join(".") || "cuerpo"}: ${i.message}`);
    return Response.json({ error: "peticion invalida", detalle }, { status: 400 });
  }
  const peticion: PeticionAgente = validacion.data;

  const codificador = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controlador) {
      function emitir(linea: LineaStream) {
        controlador.enqueue(codificador.encode(JSON.stringify(linea) + "\n"));
      }
      try {
        // Si la persona cierra la pestana, el turno se corta: no se siguen llamando
        // tools (ni, peor, una accion) para nadie.
        for await (const linea of correrTurno(peticion, { senal: request.signal })) emitir(linea);
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
