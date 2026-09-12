import { EntradaConsultarPerfil, SalidaConsultarPerfil } from "@maya/schemas";
import { aEntero, buscar } from "../datos/index.js";
import type { DefinicionDeTool } from "./registro.js";

/**
 * `consultar_perfil` — LECTURA. Es la plantilla de la que salen las demas y la
 * primera que el agente llama: sin saber quien es la persona no puede decidir
 * que interfaz construir.
 */
export const consultarPerfil: DefinicionDeTool = {
  nombre: "consultar_perfil",
  titulo: "Consultar el perfil de la persona",
  descripcion:
    "Devuelve quien es el usuario: nombre, edad, ocupacion, ingreso mensual y segmento. " +
    "Llamala SIEMPRE al inicio de una conversacion: el resto de las decisiones (que componentes " +
    "mostrar, que tono usar) dependen de esto.",
  clase: "lectura",
  entrada: EntradaConsultarPerfil.shape,
  manejar: (argumentos) => {
    const { usuarioId } = EntradaConsultarPerfil.parse(argumentos);
    const fila = buscar("usuarios", "id", usuarioId);
    if (!fila) throw new Error(`no existe el usuario ${usuarioId}`);
    return SalidaConsultarPerfil.parse({
      id: fila.id,
      nombre: fila.nombre,
      edad: aEntero(fila.edad),
      ocupacion: fila.ocupacion,
      ingresoMensualCentavos: aEntero(fila.ingreso_mensual_centavos),
      ciudad: fila.ciudad,
      segmento: fila.segmento,
    });
  },
};
