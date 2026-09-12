import { EntradaConsultarMovimientos, SalidaConsultarMovimientos } from "@maya/schemas";
import { aBooleano, aEntero, filtrar } from "../datos/index.js";
import { categoria, nombreDeComercio } from "../dominio/consultas.js";
import { hoy, sumarDias } from "../dominio/tiempo.js";
import type { DefinicionDeTool } from "./registro.js";

/** Cuantas filas se devuelven si el agente no pide otra cosa. */
const LIMITE_POR_DEFECTO = 20;

/**
 * `consultar_movimientos` — LECTURA. El detalle que respalda cualquier numero que el
 * agente ponga en pantalla. Devuelve los totales del filtro completo y solo `limite`
 * filas: el historial del modelo se mantiene chico a proposito.
 */
export const consultarMovimientos: DefinicionDeTool = {
  nombre: "consultar_movimientos",
  titulo: "Consultar movimientos",
  descripcion:
    "Movimientos de la persona con filtros por fecha, categoria, cuenta o solo atipicos. " +
    "Usala cuando pregunten por un gasto concreto ('¿que son esos cargos de restaurantes?') o " +
    "cuando necesites justificar un numero grande. Devuelve los totales de TODO el filtro y solo " +
    "las primeras `limite` filas (default 20). Los montos son positivos: `tipo` dice si es cargo o abono.",
  clase: "lectura",
  entrada: EntradaConsultarMovimientos.shape,
  manejar: (argumentos) => {
    const entrada = EntradaConsultarMovimientos.parse(argumentos);
    const hasta = entrada.hasta ?? hoy();
    const desde = entrada.desde ?? sumarDias(hasta, -30);
    const limite = entrada.limite ?? LIMITE_POR_DEFECTO;
    if (desde > hasta) throw new Error(`el rango esta al reves: desde ${desde} es posterior a hasta ${hasta}`);

    const filtrados = filtrar("movimientos", "usuario_id", entrada.usuarioId)
      .filter((m) => (m.fecha ?? "") >= desde && (m.fecha ?? "") <= hasta)
      .filter((m) => !entrada.categoriaId || m.categoria_id === entrada.categoriaId)
      .filter((m) => !entrada.cuentaId || m.cuenta_id === entrada.cuentaId)
      .filter((m) => !entrada.soloAtipicos || aBooleano(m.es_atipico))
      .sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? "") || (b.id ?? "").localeCompare(a.id ?? ""));

    let cargos = 0;
    let abonos = 0;
    for (const m of filtrados) {
      const monto = aEntero(m.monto_centavos);
      if (m.tipo === "abono") abonos += monto;
      else cargos += monto;
    }

    return SalidaConsultarMovimientos.parse({
      desde,
      hasta,
      total: filtrados.length,
      mostrados: Math.min(limite, filtrados.length),
      sumaCargosCentavos: cargos,
      sumaAbonosCentavos: abonos,
      movimientos: filtrados.slice(0, limite).map((m) => ({
        id: m.id,
        fecha: m.fecha,
        tipo: m.tipo === "abono" ? "abono" : "cargo",
        montoCentavos: aEntero(m.monto_centavos),
        categoriaId: m.categoria_id ?? "",
        categoria: categoria(m.categoria_id ?? "")?.nombre ?? "Sin categoria",
        comercio: nombreDeComercio(m.comercio_id ?? ""),
        descripcion: m.descripcion ?? "",
        esRecurrente: aBooleano(m.es_recurrente),
        esAtipico: aBooleano(m.es_atipico),
      })),
    });
  },
};
