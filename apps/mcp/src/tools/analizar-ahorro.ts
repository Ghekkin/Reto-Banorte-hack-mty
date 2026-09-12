import {
  EntradaAnalizarAhorro,
  EstadoAhorro,
  SalidaAnalizarAhorro,
  SalidaConsultarInversiones,
  SalidaProyectarAhorro,
} from "@maya/schemas";
import { consultarInversiones } from "./consultar-inversiones.js";
import { proyectarAhorro } from "./proyectar-ahorro.js";
import type { DefinicionDeTool } from "./registro.js";

/** Desviacion del portafolio contra su modelo objetivo a partir de la cual vale la pena rebalancear. */
const UMBRAL_DESVIACION = 0.05;
/** Meses o menos para considerar que una meta ya esta cerca. */
const MESES_CERCA = 6;

/**
 * `analizar_ahorro` — LECTURA COMPUESTA. El viaje de ahorro/patrimonio de Ana y Carmen
 * en una sola llamada: junta `proyectar_ahorro` (la meta activa) y
 * `consultar_inversiones` (perfil y portafolio), y agrega `estadoAhorro` para resumir
 * en que consiste el siguiente paso.
 *
 * Compone llamando a las tools atomicas por dentro (O4, `docs/arquitectura/
 * orquestadores.md`): son las mismas, no una segunda version. Las atomicas siguen
 * expuestas para el detalle.
 */
export const analizarAhorro: DefinicionDeTool = {
  nombre: "analizar_ahorro",
  titulo: "Analizar el ahorro y el portafolio de inversion",
  descripcion:
    "LECTURA COMPUESTA para el viaje de ahorro y patrimonio: junta `proyectar_ahorro` (la meta activa, " +
    "cuanto falta, cuando llega) y `consultar_inversiones` (perfil de riesgo, portafolio, posiciones) en " +
    "una sola llamada. Trae `estadoAhorro`, la clasificacion de cual es el siguiente paso. Llamala en " +
    "vez de las dos por separado cuando pregunten por su ahorro, su meta o su portafolio. Baja a " +
    "`proyectar_ahorro` con otra aportacion o a `consultar_inversiones` solo si necesitas simular algo " +
    "distinto de lo que ya trae esta.",
  clase: "lectura",
  entrada: EntradaAnalizarAhorro.shape,
  manejar: async (argumentos) => {
    const entrada = EntradaAnalizarAhorro.parse(argumentos);

    // Sin meta activa ni `montoObjetivoCentavos`, `proyectar_ahorro` no tiene contra que
    // proyectar y lanza: aqui eso es un estado legitimo (`sin_meta_activa`), no un error.
    let ahorro: SalidaProyectarAhorro | null = null;
    try {
      ahorro = SalidaProyectarAhorro.parse(await proyectarAhorro.manejar({ usuarioId: entrada.usuarioId }));
    } catch {
      ahorro = null;
    }

    const inversion = SalidaConsultarInversiones.parse(
      await consultarInversiones.manejar({ usuarioId: entrada.usuarioId }),
    );

    const { estadoAhorro, porQue } = estadoDe(ahorro, inversion);

    return SalidaAnalizarAhorro.parse({ ahorro, inversion, estadoAhorro, porQue });
  },
};

/**
 * El siguiente paso en ahorro/patrimonio. Gana la primera regla que aplica: un
 * portafolio que se desvio de su modelo es la accion mas concreta y la que mas vale
 * (dinero ya invertido, mal repartido); sin eso, lo que sigue es la meta de ahorro
 * liquido, si existe.
 */
function estadoDe(
  ahorro: SalidaProyectarAhorro | null,
  inversion: SalidaConsultarInversiones,
): { estadoAhorro: EstadoAhorro; porQue: string } {
  if (inversion.tienePortafolio && Math.abs(inversion.portafolio!.desviacionModeloPct) >= UMBRAL_DESVIACION) {
    return {
      estadoAhorro: "portafolio_desviado",
      porQue: `Su portafolio se desvio ${pct(inversion.portafolio!.desviacionModeloPct)} de su modelo objetivo`,
    };
  }
  if (!ahorro) {
    return { estadoAhorro: "sin_meta_activa", porQue: "No tiene una meta de ahorro activa" };
  }
  if (ahorro.capacidadMensualCentavos <= 0) {
    return { estadoAhorro: "sin_margen", porQue: "No le queda capacidad libre para aportar este mes" };
  }
  if (ahorro.mesesEstimados <= MESES_CERCA) {
    return { estadoAhorro: "meta_cerca", porQue: `Le faltan ${ahorro.mesesEstimados} meses para su meta` };
  }
  return { estadoAhorro: "meta_en_curso", porQue: `Va en curso, a ${ahorro.mesesEstimados} meses de su meta` };
}

function pct(fraccion: number): string {
  return `${Math.round(Math.abs(fraccion) * 100)} %`;
}
