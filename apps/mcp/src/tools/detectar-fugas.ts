import { EntradaDetectarFugas, SalidaDetectarFugas } from "@maya/schemas";
import { aEntero } from "../datos/index.js";
import { usuario } from "../dominio/consultas.js";
import { detectarRecurrentesNoSuscritos, suscripcionesActivasDe } from "../dominio/suscripciones.js";
import type { DefinicionDeTool } from "./registro.js";

/**
 * `detectar_fugas` — LECTURA.
 * "¿En qué se me está yendo el dinero sin que me dé cuenta?"
 * Cruza suscripciones activas (con el estado mutable superpuesto) con movimientos
 * recurrentes para identificar servicios sin uso reciente y pagos recurrentes no
 * registrados como suscripción.
 */
export const detectarFugas: DefinicionDeTool = {
  nombre: "detectar_fugas",
  titulo: "Detectar fugas de dinero",
  descripcion:
    "Detecta gastos invisibles y fugas de dinero: suscripciones activas, servicios sin uso " +
    "reciente y cargos recurrentes no suscritos formalmente. Úsala cuando pregunten en qué se les " +
    "va el dinero, cómo recortar gastos fijos o qué suscripciones tienen activas.",
  clase: "lectura",
  entrada: EntradaDetectarFugas.shape,
  manejar: (argumentos) => {
    const entrada = EntradaDetectarFugas.parse(argumentos);
    const mesesSinUso = entrada.mesesSinUso ?? 2;

    const u = usuario(entrada.usuarioId);
    const ingreso = aEntero(u.ingreso_mensual_centavos);

    const activas = suscripcionesActivasDe(entrada.usuarioId, mesesSinUso);
    const totalMensualCentavos = activas.reduce((acc, s) => acc + s.montoCentavos, 0);
    const pctDelIngreso = ingreso === 0 ? 0 : Number((totalMensualCentavos / ingreso).toFixed(4));
    const totalAnualCentavos = totalMensualCentavos * 12;

    const recurrentesNoSuscritos = detectarRecurrentesNoSuscritos(entrada.usuarioId);

    return SalidaDetectarFugas.parse({
      totalMensualCentavos,
      pctDelIngreso,
      suscripciones: activas.map((s) => ({
        id: s.id,
        concepto: s.concepto,
        comercio: s.comercio,
        giro: s.giro,
        montoCentavos: s.montoCentavos,
        diaCargo: s.diaCargo,
        periodicidad: s.periodicidad,
        desde: s.desde,
        mesesActiva: s.mesesActiva,
        ultimoCargoFecha: s.ultimoCargoFecha,
        sinUsoReciente: s.sinUsoReciente,
      })),
      recurrentesNoSuscritos,
      totalAnualCentavos,
    });
  },
};
