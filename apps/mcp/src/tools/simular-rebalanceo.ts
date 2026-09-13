import { EntradaSimularRebalanceo, SalidaSimularRebalanceo } from "@maya/schemas";
import { calcularMovimientosRebalanceo } from "../dominio/inversiones.js";
import type { DefinicionDeTool } from "./registro.js";

/**
 * `simular_rebalanceo` — LECTURA. Las ordenes de rebalanceo sin aplicarlas.
 *
 * Es el par de lectura de `rebalancear_portafolio`, con el mismo calculo: lo que la
 * tarjeta `OrdenRebalanceo` muestra antes de confirmar es, peso por peso, lo que se
 * ejecutaria. Sin esta tool las ordenes solo existian dentro de la accion, y la tarjeta
 * previa se llenaba con montos que escribia el modelo.
 */
export const simularRebalanceo: DefinicionDeTool = {
  nombre: "simular_rebalanceo",
  titulo: "Simular el rebalanceo del portafolio",
  descripcion:
    "Calcula las ordenes de compra y venta que llevarian el portafolio de la persona a su modelo " +
    "objetivo, SIN ejecutarlas. Usala para mostrar `OrdenRebalanceo` antes de que la persona confirme; " +
    "la confirmacion es `rebalancear_portafolio`, que aplica exactamente estas ordenes.",
  clase: "lectura",
  entrada: EntradaSimularRebalanceo.shape,
  manejar: (argumentos) => {
    const entrada = EntradaSimularRebalanceo.parse(argumentos);
    const { portafolio, movimientos } = calcularMovimientosRebalanceo(entrada.usuarioId, entrada.portafolioId);

    return SalidaSimularRebalanceo.parse({
      portafolio: {
        id: portafolio.id,
        nombre: portafolio.nombre,
        valorTotalCentavos: portafolio.valorActualCentavos,
        desviacionModeloPct: portafolio.desviacionModeloPct,
      },
      comisionTotalCentavos: 0,
      movimientos,
      sinDesviacion: movimientos.length === 0,
    });
  },
};
