import { EntradaProgramarAbonoCapital, SalidaProgramarAbonoCapital } from "@maya/schemas";
import { aplicarAccion } from "../datos/index.js";
import { abonosProgramados, type AbonoProgramado } from "../dominio/abonos.js";
import { compararPago, creditoAPlazoDe } from "../dominio/creditos.js";
import { pesos } from "../dominio/suscripciones.js";
import { capacidadDeAhorro } from "./proyectar-ahorro.js";
import type { DefinicionDeTool } from "./registro.js";

/**
 * `programar_abono_capital` — **ACCION**. La persona simulo pagar mas al mes y toco
 * «Programar este pago»: desde el proximo pago, lo que pase de la mensualidad del contrato
 * va a capital cada mes. `consultar_creditos` y `simular_pago_credito` lo reflejan a partir
 * de ese momento (mensualidad, plazo, intereses y tabla de pagos nuevos).
 *
 * Re-simula antes de guardar con la misma funcion que `simular_pago_credito`
 * (`compararPago`): lo que se programa es exactamente lo que la tarjeta mostraba. Si ya no
 * es posible (menos que el contrato), falla con el motivo.
 *
 * Idempotente por `idempotencyKey`: un reintento devuelve la misma respuesta sin guardar
 * otra fila. Programar otra vez con otra llave **reemplaza** (gana la ultima); programar la
 * mensualidad del contrato deja el abono en 0, es decir, lo quita.
 */
export const programarAbonoCapital: DefinicionDeTool = {
  nombre: "programar_abono_capital",
  titulo: "Programar un abono a capital mensual",
  descripcion:
    "PROGRAMA de verdad un abono a capital mensual en un credito a plazo: desde el proximo pago, la persona " +
    "paga `mensualidadCentavos` al mes en total y lo que pase de la mensualidad del contrato va a capital, " +
    "asi que liquida antes y paga menos intereses. Cambia el estado. Llamala SOLO cuando llegue la accion " +
    "`programar_abono_capital` desde la interfaz, con la mensualidad que la persona vio en " +
    "`simular_pago_credito`, y pasa siempre `idempotencyKey`. Programar otra vez reemplaza el abono; " +
    "programar la mensualidad del contrato lo quita. Devuelve `antes` y `despues` con los nombres de " +
    "`ProyeccionPagoCredito`: ajusta la tarjeta con `despues`.",
  clase: "accion",
  entrada: EntradaProgramarAbonoCapital.shape,
  manejar: async (argumentos) => {
    const entrada = EntradaProgramarAbonoCapital.parse(argumentos);

    // Un reintento con la misma llave devuelve lo que se programo esa vez, no el estado de hoy.
    const repetido = abonosProgramados(entrada.usuarioId, entrada.creditoId).find(
      (a) => a.idempotencyKey === entrada.idempotencyKey,
    );
    if (repetido) return respuesta(repetido.datos, false, true, MENSAJE_REPETIDO);

    const { credito, base } = creditoAPlazoDe(entrada.usuarioId, entrada.creditoId);
    const comparacion = compararPago(entrada.usuarioId, credito, base, {
      mensualidadCentavos: entrada.mensualidadCentavos,
    });
    const { evaluacion } = comparacion;
    if (!evaluacion.posible) throw new Error(evaluacion.motivo);

    const despues = evaluacion.simulacion.escenario;
    const abono: AbonoProgramado = {
      creditoId: credito.id,
      alias: credito.alias,
      abonoMensualCentavos: evaluacion.abonoMensualCentavos,
      mensualidadContratoCentavos: base.mensualidadContratoCentavos,
      mensualidadCentavos: base.mensualidadContratoCentavos + evaluacion.abonoMensualCentavos,
      desde: base.fechaProximoPago,
      programadoEn: new Date().toISOString(),
      antes: comparacion.actual,
      despues,
    };

    // Lo que puede apartar al mes cambia con el abono: la tarjeta de la meta, si esta en
    // pantalla, tiene que bajar su tope en el mismo ajuste (`docs/como-funciona/ajustes-en-vivo.md`).
    const ahorroAntes = capacidadDeAhorro(entrada.usuarioId);
    const resultado = await aplicarAccion({
      id: credito.id,
      tipo: "programar_abono_capital",
      usuarioId: entrada.usuarioId,
      idempotencyKey: entrada.idempotencyKey,
      aplicadaEn: abono.programadoEn,
      datos: abono as unknown as Record<string, unknown>,
    });

    if (resultado.yaEstaba) {
      // La llave se uso en otro credito, o llego a la vez por otro camino: no se guardo nada.
      return respuesta(abono, false, true, MENSAJE_REPETIDO);
    }
    const capacidadAhorro = { antesCentavos: ahorroAntes, despuesCentavos: capacidadDeAhorro(entrada.usuarioId) };
    return { ...respuesta(abono, true, false, mensajeDe(abono, comparacion.carga.aviso)), capacidadAhorro };
  },
};

const MENSAJE_REPETIDO = "Este abono ya se había programado con la misma llave; no se programó dos veces.";

function respuesta(abono: AbonoProgramado, aplicado: boolean, yaEstaba: boolean, mensaje: string) {
  return SalidaProgramarAbonoCapital.parse({
    aplicado,
    yaEstaba,
    mensaje,
    abono: {
      creditoId: abono.creditoId,
      alias: abono.alias,
      abonoMensualCentavos: abono.abonoMensualCentavos,
      mensualidadContratoCentavos: abono.mensualidadContratoCentavos,
      desde: abono.desde,
    },
    antes: abono.antes,
    despues: abono.despues,
    ahorroInteresesCentavos: abono.antes.totalInteresesEstimadosCentavos - abono.despues.totalInteresesEstimadosCentavos,
    mesesMenos: abono.antes.plazoRestanteMeses - abono.despues.plazoRestanteMeses,
  });
}

function mensajeDe(abono: AbonoProgramado, aviso: string | null): string {
  const { despues } = abono;
  const ahorro = abono.antes.totalInteresesEstimadosCentavos - despues.totalInteresesEstimadosCentavos;
  const cierre = aviso ? ` Ojo: ${aviso.charAt(0).toLowerCase()}${aviso.slice(1)}` : "";

  if (abono.abonoMensualCentavos === 0) {
    return (
      `Listo: tu ${abono.alias} vuelve a la mensualidad del contrato, ${pesos(abono.mensualidadContratoCentavos)}, ` +
      `sin abono a capital. Lo liquidas el ${despues.fechaLiquidacion}, en ${despues.plazoRestanteMeses} pagos.` +
      cierre
    );
  }
  return (
    `Listo: desde tu pago del ${abono.desde} pagas ${pesos(abono.mensualidadCentavos)} al mes de tu ${abono.alias}, ` +
    `${pesos(abono.abonoMensualCentavos)} directo a capital. Lo liquidas el ${despues.fechaLiquidacion}, en ` +
    `${despues.plazoRestanteMeses} pagos` +
    (ahorro > 0 ? `, y te ahorras ${pesos(ahorro)} de intereses.` : ".") +
    cierre
  );
}
