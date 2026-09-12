import { EntradaConsultarSugerenciasInversion, SalidaConsultarSugerenciasInversion } from "@maya/schemas";
import { generarSugerenciasInversion } from "../dominio/sugerencias-inversion.js";
import type { DefinicionDeTool } from "./registro.js";

/**
 * `consultar_sugerencias_inversion` — Tool de lectura para obtener recomendaciones
 * de inversión personalizadas, evaluando si el cliente realmente está listo o si debe
 * priorizar liquidar pasivos tóxicos o armar su fondo de contingencia primero.
 */
export const consultarSugerenciasInversion: DefinicionDeTool = {
  nombre: "consultar_sugerencias_inversion",
  titulo: "Consultar sugerencias de inversión y alternativas financieras",
  descripcion:
    "Obtiene opciones e instrumentos de inversión acordes al perfil del usuario (pagarés Banorte, fondos de deuda gubernamental NTEGUB, " +
    "fondos de renta variable NTEIPC o coberturas). Si el usuario tiene deuda crítica en mora o sobregiro, la tool " +
    "indicará que invertir no aplica y priorizará liquidar deuda como la mejor inversión con rendimiento garantizado.",
  clase: "lectura",
  entrada: EntradaConsultarSugerenciasInversion.shape,
  manejar: (argumentos) => {
    const { usuarioId, montoSugeridoCentavos, horizonteMeses } =
      EntradaConsultarSugerenciasInversion.parse(argumentos);
    const resultado = generarSugerenciasInversion(usuarioId, montoSugeridoCentavos, horizonteMeses);
    return SalidaConsultarSugerenciasInversion.parse(resultado);
  },
};
