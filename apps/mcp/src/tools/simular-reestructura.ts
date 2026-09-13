import { EntradaSimularReestructura, SalidaSimularReestructura } from "@maya/schemas";
import { ofertasDelBanco, tarjetaConEstado, tasaParaPlazo } from "../dominio/consultas.js";
import { capacidadParaLaTarjeta } from "../dominio/creditos.js";
import { PLAZOS_POR_DEFECTO, escenarioPagoMinimo, ofertaReestructura } from "../dominio/finanzas.js";
import type { DefinicionDeTool } from "./registro.js";

/**
 * `simular_reestructura` — LECTURA (calcula, no muta). El corazon de la fase 1.
 *
 * Cotiza cada plazo y lo compara contra seguir pagando el minimo. El escenario del
 * minimo se calcula UNA vez y se comparte entre las opciones: es la misma deuda.
 *
 * El plazo recomendado es el mas corto cuya mensualidad cabe en lo que la persona puede
 * pagar por la tarjeta (`capacidadParaLaTarjeta`: el plan reemplaza el minimo, asi que no
 * se compara contra lo libre de buro); si el banco ya marco uno en sus ofertas, gana ese. Detalle en
 * `docs/algoritmos/oferta-de-reestructura.md`.
 */
export const simularReestructura: DefinicionDeTool = {
  nombre: "simular_reestructura",
  titulo: "Simular una reestructura de la tarjeta",
  descripcion:
    "Convierte el saldo revolvente de la tarjeta en mensualidades fijas y lo compara contra seguir " +
    "pagando el minimo. Devuelve una opcion por plazo con mensualidad, CAT, total, intereses, " +
    "`ahorroVsMinimoCentavos` (el numero que va grande en pantalla) y `mesesVsMinimo`. " +
    "NO cambia nada: para aplicar hace falta `aplicar_plan_pago`. Si la persona no tiene tarjeta de " +
    "credito o ya tiene un plan activo, la tool falla y te lo dice.",
  clase: "lectura",
  entrada: EntradaSimularReestructura.shape,
  manejar: (argumentos) => {
    const entrada = EntradaSimularReestructura.parse(argumentos);
    const conEstado = tarjetaConEstado(entrada.usuarioId, entrada.tarjetaId);
    if (!conEstado) throw new Error(`${entrada.usuarioId} no tiene tarjeta de credito que reestructurar`);

    const { vista, plan } = conEstado;
    if (plan) {
      throw new Error(
        `${entrada.usuarioId} ya tiene un plan de ${plan.plazoMeses} meses activo; usa consultar_plan`,
      );
    }
    if (vista.saldoOriginalCentavos <= 0) throw new Error(`la tarjeta ${vista.id} no tiene saldo que diferir`);

    const saldo = vista.saldoOriginalCentavos;
    const capacidad = capacidadParaLaTarjeta(entrada.usuarioId);
    const minimo = escenarioPagoMinimo(saldo, vista.tasaAnual);

    const delBanco = ofertasDelBanco(vista.id);
    const plazos = (entrada.plazosMeses?.length
      ? entrada.plazosMeses
      : delBanco.length
        ? delBanco.map((o) => o.plazoMeses)
        : [...PLAZOS_POR_DEFECTO]
    )
      .filter((p, i, todos) => todos.indexOf(p) === i)
      .sort((a, b) => a - b);

    const opciones = plazos.map((plazoMeses) => {
      const oferta = ofertaReestructura({
        saldoCentavos: saldo,
        tasaPlan: tasaParaPlazo(vista.id, plazoMeses, vista.tasaAnual),
        plazoMeses,
        tasaTarjeta: vista.tasaAnual,
        minimo,
      });
      return { ...oferta, cabeEnCapacidad: oferta.mensualidadCentavos <= capacidad, esRecomendado: false };
    });

    const recomendado = elegirRecomendado(opciones, delBanco);
    for (const opcion of opciones) opcion.esRecomendado = opcion.plazoMeses === recomendado;

    return SalidaSimularReestructura.parse({
      tarjetaId: vista.id,
      saldoADiferirCentavos: saldo,
      tasaTarjetaAnual: vista.tasaAnual,
      capacidadPagoMensualCentavos: capacidad,
      escenarioMinimo: {
        meses: minimo.meses,
        totalPagadoCentavos: minimo.totalPagadoCentavos,
        nuncaLiquida: minimo.nuncaLiquida,
      },
      opciones,
      plazoRecomendado: recomendado,
    });
  },
};

/**
 * Gana el plazo que el banco ya marco como recomendado (es un dato de la oferta). Si
 * no marco ninguno, el mas corto que cabe en la capacidad de pago: pagar menos meses
 * es pagar menos intereses, y la mensualidad tiene que ser realmente pagable.
 */
function elegirRecomendado(
  opciones: Array<{ plazoMeses: number; cabeEnCapacidad: boolean }>,
  delBanco: Array<{ plazoMeses: number; esRecomendado: boolean }>,
): number | null {
  const marcado = delBanco.find((o) => o.esRecomendado);
  if (marcado && opciones.some((o) => o.plazoMeses === marcado.plazoMeses)) return marcado.plazoMeses;
  return opciones.find((o) => o.cabeEnCapacidad)?.plazoMeses ?? opciones.at(-1)?.plazoMeses ?? null;
}
