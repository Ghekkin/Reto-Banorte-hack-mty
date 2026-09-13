import { EntradaConsultarInversiones, SalidaConsultarInversiones } from "@maya/schemas";
import { usuario } from "../dominio/consultas.js";
import {
  modeloRecomendadoPara,
  perfilDeInversion,
  portafolioDeInversion,
  posicionesDePortafolio,
} from "../dominio/inversiones.js";
import type { DefinicionDeTool } from "./registro.js";

/**
 * `consultar_inversiones` — LECTURA.
 * Retrato integral de inversión del usuario: perfil de inversionista (conservador/moderado/agresivo),
 * portafolio patrimonial activo, valuación de posiciones a mercado con plusvalía y peso vs objetivo,
 * y modelo de asignación recomendado.
 */
export const consultarInversiones: DefinicionDeTool = {
  nombre: "consultar_inversiones",
  titulo: "Consultar perfil y portafolio de inversiones",
  descripcion:
    "Consulta el perfil de inversión de la persona, su portafolio patrimonial activo con desglose de " +
    "posiciones a mercado (plusvalía, peso actual y peso objetivo), y el modelo de asignación recomendado. " +
    "Úsala cuando pregunten por sus inversiones, su portafolio, rendimientos de fondos o su perfil de riesgo.",
  clase: "lectura",
  entrada: EntradaConsultarInversiones.shape,
  manejar: (argumentos) => {
    const entrada = EntradaConsultarInversiones.parse(argumentos);
    usuario(entrada.usuarioId);

    const perfil = perfilDeInversion(entrada.usuarioId);
    const portafolio = portafolioDeInversion(entrada.usuarioId);
    const posiciones = portafolio ? posicionesDePortafolio(portafolio.id) : [];
    const modeloRecomendado = perfil ? modeloRecomendadoPara(perfil.tipo) : [];

    return SalidaConsultarInversiones.parse({
      tienePerfil: perfil !== null,
      perfil,
      tienePortafolio: portafolio !== null,
      portafolio,
      posiciones,
      modeloRecomendado,
    });
  },
};
