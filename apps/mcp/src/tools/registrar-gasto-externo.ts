import {
  EntradaRegistrarGastoExterno,
  SalidaRegistrarGastoExterno,
  type GastoDelPeriodo,
  type GastoExterno,
} from "@maya/schemas";
import { accionesDe, aplicarAccion } from "../datos/index.js";
import { categoriaIdDe, fusionar, gastosExternosVigentes, type RegistroDeGastos } from "../dominio/gastos-externos.js";
import { pesos } from "../dominio/suscripciones.js";
import { hoy, ultimoMesCerrado } from "../dominio/tiempo.js";
import type { DefinicionDeTool } from "./registro.js";
import { avisoDe, capacidadesCon, gastoDelPeriodo, normalizarGastos, type Capacidades } from "./simular-gasto-externo.js";

/**
 * `registrar_gasto_externo` — **ACCION**. La persona simulo un gasto de fuera del banco y toco
 * «Guardar gasto»: desde ahora `comparar_periodos`/`analizar_gasto` lo listan como categoria
 * (`fueraDelBanco: true`) y lo mensual se descuenta de lo libre para deuda
 * (`capacidadPagoMensual`) y para ahorro (`proyectar_ahorro`).
 *
 * Idempotente por `idempotencyKey`: un reintento devuelve lo que se guardo esa vez. Guardar
 * otra vez un gasto con el mismo nombre lo reemplaza; con monto 0, lo quita.
 * Algoritmo: `docs/algoritmos/gastos-fuera-del-banco.md`.
 */
export const registrarGastoExterno: DefinicionDeTool = {
  nombre: "registrar_gasto_externo",
  titulo: "Guardar un gasto que no pasa por el banco",
  descripcion:
    "GUARDA de verdad gastos que la persona paga fuera del banco (renta en efectivo, apoyo a un familiar): " +
    "desde ahora cuentan en su gasto por categoría y lo mensual le resta capacidad de pago y de ahorro. " +
    "Cambia el estado. Llamala SOLO cuando llegue la acción `registrar_gasto_externo` desde la interfaz " +
    "(botón «Guardar gasto»), con los mismos `gastos` que simuló `simular_gasto_externo`, y pasa siempre " +
    "`idempotencyKey`. Guardar otra vez un gasto con el mismo nombre lo reemplaza; con monto 0 lo quita. " +
    "Devuelve `despues` con los nombres de `GastoPorCategoria` (ya `guardado: true`): ajusta la tarjeta con " +
    "él, y si hay `SimuladorMeta` en pantalla su tope pasa a `capacidadAhorro.despuesCentavos`.",
  clase: "accion",
  entrada: EntradaRegistrarGastoExterno.shape,
  manejar: async (argumentos) => {
    const entrada = EntradaRegistrarGastoExterno.parse(argumentos);

    // Un reintento con la misma llave devuelve lo que se guardo esa vez, no el estado de hoy.
    const repetido = accionesDe(entrada.usuarioId, "registrar_gasto_externo").find(
      (a) => a.idempotencyKey === entrada.idempotencyKey,
    );
    if (repetido) return respuesta(repetido.datos as unknown as Guardado, false, true, MENSAJE_REPETIDO);

    const periodo = entrada.periodo ?? ultimoMesCerrado(hoy());
    const gastos = normalizarGastos(entrada.gastos);

    // Todo se calcula ANTES de guardar, con la lista como quedaria (la misma cuenta que la
    // simulacion), y se guarda con la fila: asi un reintento contesta exactamente lo mismo.
    const registro: RegistroDeGastos = { periodo, gastos, registradoEn: new Date().toISOString() };
    const guardados = gastosExternosVigentes(entrada.usuarioId);
    const conNuevos = fusionar(guardados, [registro]);
    const capacidades = capacidadesCon(entrada.usuarioId, guardados, conNuevos);
    const guardado: Guardado = {
      ...registro,
      antes: await gastoDelPeriodo(entrada.usuarioId, periodo, guardados, new Set()),
      despues: await gastoDelPeriodo(entrada.usuarioId, periodo, conNuevos, new Set()),
      ...capacidades,
    };

    const resultado = await aplicarAccion({
      id: gastos.length === 1 ? categoriaIdDe(gastos[0]!.nombre) : "gastos_externos",
      tipo: "registrar_gasto_externo",
      usuarioId: entrada.usuarioId,
      idempotencyKey: entrada.idempotencyKey,
      aplicadaEn: registro.registradoEn,
      datos: guardado as unknown as Record<string, unknown>,
    });

    // La llave ya se habia usado (llego a la vez por otro camino): no se guardo nada.
    if (resultado.yaEstaba) return respuesta(guardado, false, true, MENSAJE_REPETIDO);
    return respuesta(guardado, true, false, mensajeDe(gastos, periodo, capacidades));
  },
};

/** Lo que responde la accion; la fila guardada lo trae para contestar igual a un reintento. */
type Guardado = RegistroDeGastos & { antes: GastoDelPeriodo; despues: GastoDelPeriodo } & Partial<Capacidades>;

const MENSAJE_REPETIDO = "Estos gastos ya se habían guardado con la misma llave; no se guardaron dos veces.";

function respuesta(guardado: Guardado, aplicado: boolean, yaEstaba: boolean, mensaje: string) {
  return SalidaRegistrarGastoExterno.parse({
    aplicado,
    yaEstaba,
    mensaje,
    periodo: guardado.periodo,
    gastos: guardado.gastos,
    antes: guardado.antes,
    despues: guardado.despues,
    capacidadAhorro: guardado.capacidadAhorro,
    capacidadPago: guardado.capacidadPago,
  });
}

function mensajeDe(gastos: GastoExterno[], periodo: string, capacidades: Capacidades): string {
  const partes = gastos.map((g) =>
    g.montoCentavos === 0
      ? `quité ${g.nombre}`
      : `guardé ${g.nombre}, ${pesos(g.montoCentavos)} ${g.frecuencia === "mensual" ? "al mes" : `una vez en ${periodo}`}`,
  );
  const aviso = avisoDe(capacidades);
  const soloQuita = gastos.every((g) => g.montoCentavos === 0);
  return (
    `Listo: ${partes.join("; ")}${soloQuita ? " de tus gastos fuera del banco" : `. Ya cuenta en tu gasto de ${periodo}`}` +
    (capacidades.capacidadPago.despuesCentavos > 0
      ? `; te quedan ${pesos(capacidades.capacidadPago.despuesCentavos)} libres al mes para pagar deudas.`
      : ".") +
    (aviso ? ` Ojo: ${aviso.charAt(0).toLowerCase()}${aviso.slice(1)}` : "")
  );
}
