import type { ModelMessage } from "ai";
import { esAccionDeMutacion } from "@maya/a2ui";
import type { PeticionAgente } from "./tipos";

/**
 * De la peticion del cliente a los mensajes del modelo.
 *
 * El historial es SOLO TEXTO (contrato agente-cliente): nunca viaja JSON A2UI de vuelta
 * al modelo. Se mantiene chico a proposito, y el estado real de la pantalla va en un
 * solo bloque de contexto al final, que es el mas fresco.
 */

/** Mas alla de esto, el data model de la pantalla se recorta: el modelo no lo necesita completo. */
const LIMITE_DATA_MODEL = 2000;

export function mensajesDelTurno(peticion: PeticionAgente): ModelMessage[] {
  const mensajes: ModelMessage[] = peticion.mensajes.map((m) => {
    if (m.rol === "agente") return { role: "assistant" as const, content: m.texto };
    if (m.rol === "accion") return { role: "user" as const, content: `[la persona toco la interfaz] ${m.texto}` };
    return { role: "user" as const, content: m.texto };
  });

  mensajes.push({ role: "user", content: bloqueDeContexto(peticion) });
  return mensajes;
}

/**
 * El bloque que le dice al modelo donde esta parado: con quien habla, que hay en
 * pantalla y, si vino de un toque, exactamente que accion fue y que se espera de el.
 */
function bloqueDeContexto(peticion: PeticionAgente): string {
  const partes: string[] = ["--- contexto del turno ---", `usuarioId: ${peticion.usuarioId}`];

  if (peticion.superficie) {
    partes.push(
      `pantalla actual: ${peticion.superficie.componentes.join(", ") || "(vacia)"}`,
      `data model actual: ${recortar(JSON.stringify(peticion.superficie.dataModel ?? {}))}`,
    );
  } else {
    partes.push("pantalla actual: (todavia no hay; es el primer turno)");
  }

  if (peticion.accion) {
    const { name, sourceComponentId, context } = peticion.accion;
    partes.push(
      "",
      `La persona acaba de tocar "${sourceComponentId}" y eso disparo la accion "${name}".`,
      `context de la accion: ${JSON.stringify(context)}`,
      esAccionDeMutacion(name)
        ? `"${name}" cambia estado: llama la tool "${name}" con los datos de ese context (incluida ` +
          "`idempotencyKey` tal cual viene), y DESPUES vuelve a pintar la pantalla con el resultado."
        : `"${name}" solo cambia la vista: no llames tools de accion, consulta lo que necesites y vuelve a pintar.`,
    );
  } else {
    partes.push("", "Contesta el ultimo mensaje de la persona construyendo la pantalla que lo resuelve.");
  }

  partes.push("", "Termina llamando `pintar_pantalla` exactamente una vez.");
  return partes.join("\n");
}

function recortar(texto: string): string {
  return texto.length <= LIMITE_DATA_MODEL ? texto : `${texto.slice(0, LIMITE_DATA_MODEL)}… (recortado)`;
}
