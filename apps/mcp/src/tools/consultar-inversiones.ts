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
    "Úsala cuando pregunten por sus inversiones, su portafolio, rendimientos de fondos o su perfil de riesgo. " +
    "Con `perfil` devuelve el modelo de OTRO perfil para contestar '¿y si fuera agresivo?'; el perfil real " +
    "de la persona no cambia.",
  clase: "lectura",
  entrada: EntradaConsultarInversiones.shape,
  manejar: (argumentos) => {
    const entrada = EntradaConsultarInversiones.parse(argumentos);
    usuario(entrada.usuarioId);

    const perfil = perfilDeInversion(entrada.usuarioId);
    const portafolio = portafolioDeInversion(entrada.usuarioId);
    const posiciones = portafolio ? posicionesDePortafolio(portafolio.id) : [];

    // El modelo puede ser de un perfil pedido, pero `perfil` sigue siendo el de la persona:
    // sobreescribirlo haria creer al modelo —y a quien vea la pantalla— que su perfil cambio.
    const perfilDelModelo = entrada.perfil ?? perfil?.tipo ?? null;
    const modeloRecomendado = perfilDelModelo ? modeloRecomendadoPara(perfilDelModelo) : [];

    return SalidaConsultarInversiones.parse({
      tienePerfil: perfil !== null,
      perfil,
      tienePortafolio: portafolio !== null,
      portafolio,
      posiciones,
      modeloRecomendado,
      perfilDelModelo: perfilDelModelo ?? "",
      perfilEsHipotetico: entrada.perfil !== undefined && entrada.perfil !== perfil?.tipo,
    });
  },
};
