import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { validarMensaje, type MensajeA2UI } from "@maya/a2ui";
import { nombresDelCatalogo } from "@maya/catalogo";
import { hayLlave, proveedorActivo } from "./modelo";
import type { LineaStream, PeticionAgente } from "./tipos";

/**
 * El turno del agente: interpreta, llama tools, emite A2UI, cierra el ciclo.
 *
 * ESTADO: **mock**. Emite una superficie fija desde un `.jsonl` de ejemplo para
 * que el ciclo completo (escribir -> stream -> renderer -> tocar -> nuevo turno)
 * funcione sin llave de modelo y sin MCP arriba. Regla 4 del repo: lo que esta a
 * medias va detras de un mock.
 *
 * PENDIENTE (rol `contrato`, skill `agente-host`):
 *  - `conectarMcp()` y el bucle de tool calls con limite de pasos;
 *  - structured output contra `nombresDelCatalogo()`;
 *  - validar cada mensaje con `validarMensaje(m, new Set(nombresDelCatalogo()))`
 *    ANTES de emitirlo: un mensaje invalido nunca viaja;
 *  - `razon`, `sugerencias` y el timeout de 30 s.
 */
export async function* correrTurno(peticion: PeticionAgente): AsyncGenerator<LineaStream> {
  const inicio = Date.now();
  yield { tipo: "estado", valor: "pensando" };

  if (!hayLlave()) {
    yield {
      tipo: "error",
      codigo: "modelo",
      mensaje: `Sin llave para ${proveedorActivo()}: va la pantalla de ejemplo. Llena el .env para el agente real.`,
    };
  }

  yield { tipo: "estado", valor: "pintando" };

  const mensajes = await mensajesDeEjemplo();
  const nombres = new Set(nombresDelCatalogo());
  for (const mensaje of mensajes) {
    const resultado = validarMensaje(mensaje, nombres);
    if (!resultado.ok) {
      yield { tipo: "error", codigo: "a2ui", mensaje: resultado.errores.join("; ") };
      continue;
    }
    yield { tipo: "a2ui", mensaje: resultado.mensaje };
  }

  yield {
    tipo: "texto",
    valor: peticion.accion
      ? `Listo: apliqué "${peticion.accion.name}". (Respuesta de ejemplo: el agente real es la tarea del rol contrato.)`
      : "Esta es una pantalla de ejemplo del scaffold. El agente real la construirá con tus datos.",
  };
  yield { tipo: "razon", valor: "Todavía no hay agente: esto sale de packages/catalogo/ejemplos/confirmacion.jsonl." };
  yield { tipo: "fin", pasos: 0, ms: Date.now() - inicio };
}

/** Lee el `.jsonl` de ejemplo del catalogo. Desaparece cuando el agente exista. */
async function mensajesDeEjemplo(): Promise<MensajeA2UI[]> {
  const ruta = join(process.cwd(), "..", "..", "packages", "catalogo", "ejemplos", "confirmacion.jsonl");
  const texto = await readFile(ruta, "utf8");
  return texto
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => JSON.parse(l) as MensajeA2UI);
}
