import { EntradaSimularPagoCredito, SalidaSimularPagoCredito } from "@maya/schemas";
import { abonoVigente } from "../dominio/abonos.js";
import { compararPago, creditoAPlazoDe } from "../dominio/creditos.js";
import type { DefinicionDeTool } from "./registro.js";

/**
 * `simular_pago_credito` — LECTURA (calcula, no muta). «¿Y si pago $6,000 al mes?» o
 * «quiero liquidarlo en 12 meses» sobre un credito a plazo.
 *
 * Es abono a capital: la mensualidad del contrato se queda, lo de encima va a capital y el
 * plazo se acorta. Lo que no se logra asi (pagar menos, tardar mas) sale con `posible:
 * false` y un `motivo` con el minimo o el maximo que si funciona. Algoritmo en
 * `docs/algoritmos/abono-a-capital.md`.
 *
 * `actual` ya trae el abono programado (si lo hay): despues de `programar_abono_capital`,
 * esta tool y `consultar_creditos` cuentan la misma historia.
 */
export const simularPagoCredito: DefinicionDeTool = {
  nombre: "simular_pago_credito",
  titulo: "Simular pagar distinto un credito a plazo",
  descripcion:
    "Recalcula un credito a plazo (personal, nomina, auto, hipotecario; NO la tarjeta) si la persona " +
    "paga mas al mes. Usala cuando pregunte «¿y si pago $6,000 al mes?» (manda `mensualidadCentavos`, " +
    "el total al mes en centavos) o «quiero liquidarlo en 12 meses» (manda `plazoMeses`): exactamente uno " +
    "de los dos. Funciona como abono a capital: la mensualidad del contrato no baja y lo de encima va a " +
    "capital, asi que el plazo se acorta. Devuelve `actual` (como va hoy) y `simulado` (como quedaria), " +
    "con el ahorro en intereses y los meses menos. `simulado` tiene los mismos nombres que las props de " +
    "`ProyeccionPagoCredito`: si esa tarjeta ya esta en pantalla, copialo tal cual con `ajustar_pantalla` " +
    "(sin repintar). Si `posible` es false, NO inventes un escenario: di el `motivo` con sus palabras. Si " +
    "trae `aviso`, ponlo en la tarjeta tal cual. NO cambia nada: para dejarlo programado hace falta la " +
    "accion `programar_abono_capital` con la `mensualidadCentavos` de `simulado`.",
  clase: "lectura",
  entrada: EntradaSimularPagoCredito.shape,
  manejar: (argumentos) => {
    const entrada = EntradaSimularPagoCredito.parse(argumentos);
    const pideMensualidad = entrada.mensualidadCentavos !== undefined;
    const pidePlazo = entrada.plazoMeses !== undefined;
    if (pideMensualidad === pidePlazo) {
      throw new Error(
        "manda exactamente uno: `mensualidadCentavos` («¿y si pago $6,000 al mes?») o `plazoMeses` " +
          "(«quiero liquidarlo en 12 meses»)",
      );
    }

    const { credito, base } = creditoAPlazoDe(entrada.usuarioId, entrada.creditoId);
    const comparacion = compararPago(entrada.usuarioId, credito, base, {
      mensualidadCentavos: entrada.mensualidadCentavos,
      plazoMeses: entrada.plazoMeses,
    });

    return SalidaSimularPagoCredito.parse({
      creditoId: credito.id,
      alias: credito.alias,
      tasaAnual: credito.tasaAnual,
      saldoInsolutoCentavos: credito.saldoInsolutoCentavos,
      mensualidadContratoCentavos: base.mensualidadContratoCentavos,
      abonoProgramadoCentavos: abonoVigente(entrada.usuarioId, credito.id),
      actual: comparacion.actual,
      posible: comparacion.evaluacion.posible,
      motivo: comparacion.evaluacion.motivo,
      simulado: comparacion.evaluacion.simulacion?.escenario ?? null,
      abonoMensualCentavos: comparacion.evaluacion.abonoMensualCentavos,
      ahorroInteresesCentavos: comparacion.ahorroInteresesCentavos,
      mesesMenos: comparacion.mesesMenos,
      ...comparacion.carga,
    });
  },
};
