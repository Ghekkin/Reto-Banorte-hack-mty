import { EntradaRebalancearPortafolio, SalidaRebalancearPortafolio } from "@maya/schemas";
import { aplicarAccion, accionesDe } from "../datos/index.js";
import { calcularMovimientosRebalanceo, portafolioDeInversion } from "../dominio/inversiones.js";
import type { DefinicionDeTool } from "./registro.js";

/**
 * `rebalancear_portafolio` — ACCION (mutación).
 * Ejecuta de verdad las órdenes de compra y venta para rebalancear el portafolio
 * patrimonial del cliente hacia su asignación objetivo.
 *
 * Registra la mutación en `banorte.acciones_aplicadas` y actualiza la lectura
 * posterior en memoria y en base de datos.
 */
export const rebalancearPortafolio: DefinicionDeTool = {
  nombre: "rebalancear_portafolio",
  titulo: "Rebalancear portafolio al modelo objetivo",
  descripcion:
    "APLICA de verdad las órdenes de compra y venta para rebalancear el portafolio patrimonial del " +
    "cliente hacia su asignación objetivo. Cambia el estado en la base de datos (`banorte.acciones_aplicadas`). " +
    "Llamala cuando el usuario confirme el rebalanceo desde la interfaz (con `idempotencyKey`). " +
    "Posteriormente relee con `consultar_inversiones` para reflejar el portafolio alineado sin desviación.",
  clase: "accion",
  entrada: EntradaRebalancearPortafolio.shape,
  manejar: async (argumentos) => {
    const entrada = EntradaRebalancearPortafolio.parse(argumentos);

    const previas = accionesDe(entrada.usuarioId, "rebalancear_portafolio");
    const yaAplicada = previas.find((a) => a.idempotencyKey === entrada.idempotencyKey);
    if (yaAplicada) {
      const portafolioActual = portafolioDeInversion(entrada.usuarioId);
      const datosPrevios = yaAplicada.datos as {
        desviacionAntesPct?: number;
        movimientos?: Array<{
          tipo: "compra" | "venta";
          instrumentoClave: string;
          claseActivo: string;
          montoCentavos: number;
          pesoAnteriorPct: number;
          pesoNuevoPct: number;
        }>;
      };
      return SalidaRebalancearPortafolio.parse({
        aplicado: false,
        yaEstaba: true,
        mensaje: "Este rebalanceo ya se había aplicado con la misma llave de idempotencia.",
        portafolio: {
          id: portafolioActual?.id ?? entrada.portafolioId ?? "portafolio",
          nombre: portafolioActual?.nombre ?? "Portafolio patrimonial",
          desviacionAntesPct: datosPrevios.desviacionAntesPct ?? 0,
          desviacionDespuesPct: 0,
          operaciones: datosPrevios.movimientos?.length ?? 0,
          aplicadoEn: yaAplicada.aplicadaEn,
        },
        movimientos: datosPrevios.movimientos ?? [],
      });
    }

    const { portafolio, desviacionAntesPct, movimientos } = calcularMovimientosRebalanceo(
      entrada.usuarioId,
      entrada.portafolioId,
    );

    const aplicadaEn = new Date().toISOString();
    const datosAccion = {
      portafolioId: portafolio.id,
      nombrePortafolio: portafolio.nombre,
      desviacionAntesPct,
      desviacionDespuesPct: 0,
      movimientos,
    };

    const resultado = await aplicarAccion({
      id: `acc_rebal_${portafolio.id}_${Date.now()}`,
      tipo: "rebalancear_portafolio",
      usuarioId: entrada.usuarioId,
      idempotencyKey: entrada.idempotencyKey,
      aplicadaEn,
      datos: datosAccion,
    });

    const mensaje = resultado.yaEstaba
      ? "Este rebalanceo ya se había ejecutado con la misma llave."
      : `Listo: se ejecutaron ${movimientos.length} operaciones para rebalancear tu portafolio "${portafolio.nombre}". ` +
        `La desviación de ${(desviacionAntesPct * 100).toFixed(1)}% quedó eliminada (0.0%), alineado a tu modelo objetivo.`;

    return SalidaRebalancearPortafolio.parse({
      aplicado: resultado.aplicado,
      yaEstaba: resultado.yaEstaba,
      mensaje,
      portafolio: {
        id: portafolio.id,
        nombre: portafolio.nombre,
        desviacionAntesPct,
        desviacionDespuesPct: 0,
        operaciones: movimientos.length,
        aplicadoEn: aplicadaEn,
      },
      movimientos,
    });
  },
};
