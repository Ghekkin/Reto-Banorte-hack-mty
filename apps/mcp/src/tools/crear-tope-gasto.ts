import { EntradaCrearTopeGasto, SalidaCrearTopeGasto } from "@maya/schemas";
import { aBooleano, aplicarAccion } from "../datos/index.js";
import { categoria, usuario } from "../dominio/consultas.js";
import { pesos } from "../dominio/suscripciones.js";
import { hoy } from "../dominio/tiempo.js";
import {
  buscarTopeExistente,
  calcularGastadoCategoriaPeriodo,
  calcularPromedioHistorico,
  evaluarEstatusTope,
} from "../dominio/topes.js";
import type { DefinicionDeTool } from "./registro.js";

/**
 * `crear_tope_gasto` — ACCION.
 * Fija un límite de gasto mensual para una categoría.
 * Trampa 1: El gasto del periodo en curso se calcula en vivo contra movimientos,
 * nunca se lee de `topes_gasto.gastado_actual_centavos` (que viene en 0).
 * Si el usuario ya gastó más que el límite fijado, el tope nace con estatus "excedido".
 *
 * Idempotente por `idempotencyKey`.
 */
export const crearTopeGasto: DefinicionDeTool = {
  nombre: "crear_tope_gasto",
  titulo: "Crear un tope de gasto",
  descripcion:
    "FIJA un tope de gasto mensual para una categoría y evalúa en vivo si el gasto actual está " +
    "dentro, cerca o excedido respecto al límite. Úsala cuando la persona pida poner un límite o " +
    "controlar sus gastos en una categoría específica y pasa siempre `idempotencyKey`.",
  clase: "accion",
  entrada: EntradaCrearTopeGasto.shape,
  manejar: async (argumentos) => {
    const entrada = EntradaCrearTopeGasto.parse(argumentos);

    // 1. Validar existencia del usuario
    usuario(entrada.usuarioId);

    // 2. Validar que la categoría exista y no sea de ingreso
    const catFila = categoria(entrada.categoriaId);
    if (!catFila) {
      throw new Error(`no existe la categoria ${entrada.categoriaId}`);
    }
    if (aBooleano(catFila.es_ingreso)) {
      throw new Error("no se puede poner un tope a una categoria de ingreso");
    }

    // 3. Validar límite positivo
    if (entrada.montoLimiteCentavos <= 0) {
      throw new Error("el monto limite tiene que ser mayor que cero");
    }

    const alertarEnPct = entrada.alertarEnPct ?? 0.8;
    const periodo = "mensual" as const;

    // Calcular gasto actual y promedio histórico en vivo
    const gastadoActualCentavos = calcularGastadoCategoriaPeriodo(entrada.usuarioId, entrada.categoriaId);
    const promedioHistoricoCentavos = calcularPromedioHistorico(entrada.usuarioId, entrada.categoriaId);

    // 4. Verificar duplicados (en los datos de partida o en el estado mutable)
    const existente = buscarTopeExistente(entrada.usuarioId, entrada.categoriaId);
    if (existente) {
      const evalExistente = evaluarEstatusTope(
        gastadoActualCentavos,
        existente.montoLimiteCentavos,
        existente.alertarEnPct,
      );
      return SalidaCrearTopeGasto.parse({
        aplicado: false,
        yaEstaba: true,
        mensaje: `Ya tienes un tope para ${catFila.nombre} con un límite de ${pesos(existente.montoLimiteCentavos)}.`,
        tope: {
          id: existente.id,
          categoriaId: entrada.categoriaId,
          categoria: catFila.nombre ?? entrada.categoriaId,
          color: catFila.color ?? "#6B7280",
          montoLimiteCentavos: existente.montoLimiteCentavos,
          gastadoActualCentavos,
          pctUsado: evalExistente.pctUsado,
          estatus: evalExistente.estatus,
          alertarEnPct: existente.alertarEnPct,
          periodo: "mensual",
          fechaCreacion: existente.fechaCreacion,
        },
        promedioHistoricoCentavos,
      });
    }

    // 5. Evaluar nuevo tope y registrar acción
    const evalNuevo = evaluarEstatusTope(gastadoActualCentavos, entrada.montoLimiteCentavos, alertarEnPct);
    const nuevoId = `tope_${entrada.usuarioId.replace("usr_", "")}_${entrada.categoriaId.replace("cat_", "")}_${Date.now()}`;
    const fechaCreacion = hoy();

    const resultado = await aplicarAccion({
      id: `acc_${nuevoId}`,
      tipo: "crear_tope_gasto",
      usuarioId: entrada.usuarioId,
      idempotencyKey: entrada.idempotencyKey,
      aplicadaEn: new Date().toISOString(),
      datos: {
        id: nuevoId,
        categoriaId: entrada.categoriaId,
        montoLimiteCentavos: entrada.montoLimiteCentavos,
        alertarEnPct,
        periodo,
        fechaCreacion,
      },
    });

    const mensaje = resultado.yaEstaba
      ? "Este tope ya se había creado con la misma llave; no se creó dos veces."
      : `Listo: fijé un tope de ${pesos(entrada.montoLimiteCentavos)} al mes para ${catFila.nombre}.`;

    return SalidaCrearTopeGasto.parse({
      aplicado: resultado.aplicado,
      yaEstaba: resultado.yaEstaba,
      mensaje,
      tope: {
        id: nuevoId,
        categoriaId: entrada.categoriaId,
        categoria: catFila.nombre ?? entrada.categoriaId,
        color: catFila.color ?? "#6B7280",
        montoLimiteCentavos: entrada.montoLimiteCentavos,
        gastadoActualCentavos,
        pctUsado: evalNuevo.pctUsado,
        estatus: evalNuevo.estatus,
        alertarEnPct,
        periodo,
        fechaCreacion,
      },
      promedioHistoricoCentavos,
    });
  },
};
