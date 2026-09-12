import { EntradaCancelarSuscripcion, SalidaCancelarSuscripcion } from "@maya/schemas";
import { aEntero, aplicarAccion, buscar } from "../datos/index.js";
import { nombreDeComercio } from "../dominio/consultas.js";
import {
  esSuscripcionCancelada,
  pesos,
  suscripcionesActivasDe,
} from "../dominio/suscripciones.js";
import { hoy } from "../dominio/tiempo.js";
import type { DefinicionDeTool } from "./registro.js";

/**
 * `cancelar_suscripcion` — ACCION.
 * El cambio real que sigue a `detectar_fugas`: cancela de inmediato la suscripción
 * y escribe en el estado mutable. La lectura posterior de fugas o gasto mensual
 * refleja de inmediato el ahorro.
 *
 * Idempotente por `idempotencyKey`.
 */
export const cancelarSuscripcion: DefinicionDeTool = {
  nombre: "cancelar_suscripcion",
  titulo: "Cancelar una suscripción",
  descripcion:
    "CANCELA de verdad una suscripción activa de la persona. Cambia el estado. Úsala SOLO " +
    "cuando la persona confirme cancelar un servicio recurrente (streaming, membresía, etc.) y " +
    "pasa siempre `idempotencyKey`. Muestra de inmediato el ahorro mensual y anual generado.",
  clase: "accion",
  entrada: EntradaCancelarSuscripcion.shape,
  manejar: (argumentos) => {
    const entrada = EntradaCancelarSuscripcion.parse(argumentos);

    // 1. Validar que la suscripción exista
    const sub = buscar("suscripciones", "id", entrada.suscripcionId);
    if (!sub) {
      throw new Error(`no existe la suscripcion ${entrada.suscripcionId}`);
    }

    // 2. Trampa 2: Validar que pertenezca al usuario que la llama
    if (sub.usuario_id !== entrada.usuarioId) {
      throw new Error(`la suscripcion ${entrada.suscripcionId} no pertenece a ${entrada.usuarioId}`);
    }

    const comercio = nombreDeComercio(sub.comercio_id ?? "") || sub.concepto || "";
    const montoCentavos = aEntero(sub.monto_centavos);
    const ahorroMensualCentavos = montoCentavos;
    const ahorroAnualCentavos = ahorroMensualCentavos * 12;

    // 3. Si ya estaba cancelada (en CSV o en estado mutable), devuelve yaEstaba: true sin error
    if (esSuscripcionCancelada(sub, entrada.usuarioId)) {
      const restantes = suscripcionesActivasDe(entrada.usuarioId);
      const nuevoTotalMensualCentavos = restantes.reduce((acc, s) => acc + s.montoCentavos, 0);
      return SalidaCancelarSuscripcion.parse({
        aplicado: false,
        yaEstaba: true,
        mensaje: `La suscripción a ${comercio} ya estaba cancelada.`,
        suscripcion: {
          id: sub.id!,
          concepto: sub.concepto ?? "",
          comercio,
          montoCentavos,
          fechaCancelacion: sub.fecha_cancelacion || hoy(),
        },
        efecto: {
          ahorroMensualCentavos,
          ahorroAnualCentavos,
          suscripcionesRestantes: restantes.length,
          nuevoTotalMensualCentavos,
        },
      });
    }

    // 4. Aplicar acción mutable
    const fechaCancelacion = hoy();
    const resultado = aplicarAccion({
      id: `acc_cancelar_${sub.id}_${Date.now()}`,
      tipo: "cancelar_suscripcion",
      usuarioId: entrada.usuarioId,
      idempotencyKey: entrada.idempotencyKey,
      aplicadaEn: new Date().toISOString(),
      datos: {
        suscripcionId: sub.id,
        fechaCancelacion,
      },
    });

    const restantes = suscripcionesActivasDe(entrada.usuarioId);
    const nuevoTotalMensualCentavos = restantes.reduce((acc, s) => acc + s.montoCentavos, 0);

    const mensaje = resultado.yaEstaba
      ? `Esta suscripción ya se había cancelado con la misma llave; no se canceló dos veces.`
      : `Listo: cancelé ${comercio}. Te ahorras ${pesos(ahorroMensualCentavos)} al mes, ${pesos(ahorroAnualCentavos)} al año.`;

    return SalidaCancelarSuscripcion.parse({
      aplicado: resultado.aplicado,
      yaEstaba: resultado.yaEstaba,
      mensaje,
      suscripcion: {
        id: sub.id!,
        concepto: sub.concepto ?? "",
        comercio,
        montoCentavos,
        fechaCancelacion,
      },
      efecto: {
        ahorroMensualCentavos,
        ahorroAnualCentavos,
        suscripcionesRestantes: restantes.length,
        nuevoTotalMensualCentavos,
      },
    });
  },
};
