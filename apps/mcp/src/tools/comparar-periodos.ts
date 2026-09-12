import { EntradaCompararPeriodos, SalidaCompararPeriodos } from "@maya/schemas";
import { aBooleano, aEntero, filtrar, type Fila } from "../datos/index.js";
import { categoria, interesesQueSeEvitan, planAplicado, tarjetaConEstado } from "../dominio/consultas.js";
import { hoy, periodoAnterior, ultimoMesCerrado } from "../dominio/tiempo.js";
import type { DefinicionDeTool } from "./registro.js";

/**
 * `comparar_periodos` — LECTURA. La fase 2: "¿en que se me va el dinero?".
 *
 * Devuelve el gasto por categoria de un mes contra el anterior y senala UNA categoria
 * atipica. Si hay un plan de pago activo, agrega `efectoDelPlan`: los intereses que la
 * persona dejara de pagar. Asi la pantalla de la fase 2 demuestra que la accion de la
 * fase 1 cambio algo de verdad.
 *
 * Que cuenta como gasto y como se elige la categoria atipica:
 * `docs/algoritmos/categoria-atipica.md`.
 */

/** Traspasos propios y aportaciones a inversion NO son gasto: solo mueven el dinero. */
const NO_ES_GASTO = new Set(["cat_transferencias", "cat_inversion"]);

/** Cuantos meses previos forman la linea base contra la que se mide lo atipico. */
const MESES_DE_BASE = 3;
/** Minimos para que un brinco cuente: 40 % sobre su base y al menos $500. */
const BRINCO_MINIMO_PCT = 0.4;
const BRINCO_MINIMO_CENTAVOS = 50_000;

export const compararPeriodos: DefinicionDeTool = {
  nombre: "comparar_periodos",
  titulo: "Comparar el gasto de dos periodos",
  descripcion:
    "Gasto por categoria de un mes (AAAA-MM; default: el ultimo mes cerrado) contra el mes anterior, con el ingreso del periodo, la " +
    "participacion de cada categoria y cual es la categoria atipica (la que mas se salio de SU propio " +
    "patron, no la mas grande). Usala cuando pregunten en que se les va el dinero o por que gastaron " +
    "mas. Si hay un plan de pago activo trae `efectoDelPlan` con los intereses que se dejan de pagar.",
  clase: "lectura",
  entrada: EntradaCompararPeriodos.shape,
  manejar: (argumentos) => {
    const entrada = EntradaCompararPeriodos.parse(argumentos);
    const movimientos = filtrar("movimientos", "usuario_id", entrada.usuarioId);

    const periodo = entrada.periodo ?? ultimoMesCerrado(hoy());
    const anterior = entrada.periodoAnterior ?? periodoAnterior(periodo);

    const delPeriodo = gastoPorCategoria(movimientos, periodo);
    const delAnterior = gastoPorCategoria(movimientos, anterior);
    const base = lineaBase(movimientos, periodo);

    const gastoTotal = suma(delPeriodo);
    const gastoAnterior = suma(delAnterior);

    const ids = [...new Set([...delPeriodo.keys(), ...delAnterior.keys()])];
    const categorias = ids
      .map((id) => {
        const monto = delPeriodo.get(id) ?? 0;
        const montoAnterior = delAnterior.get(id) ?? 0;
        const fila = categoria(id);
        return {
          categoriaId: id,
          nombre: fila?.nombre ?? id,
          grupo: fila?.grupo ?? "otros",
          esEsencial: aBooleano(fila?.es_esencial),
          color: fila?.color ?? "#6B7280",
          montoCentavos: monto,
          montoAnteriorCentavos: montoAnterior,
          variacionPct: variacion(monto, montoAnterior),
          participacionPct: gastoTotal === 0 ? 0 : Number((monto / gastoTotal).toFixed(4)),
          esAtipica: false,
        };
      })
      .sort((a, b) => b.montoCentavos - a.montoCentavos);

    const atipica = elegirAtipica(categorias, base);
    for (const c of categorias) c.esAtipica = c.categoriaId === atipica;

    return SalidaCompararPeriodos.parse({
      periodo,
      periodoAnterior: anterior,
      ingresoCentavos: ingresoDelPeriodo(movimientos, periodo),
      gastoCentavos: gastoTotal,
      gastoAnteriorCentavos: gastoAnterior,
      variacionPct: variacion(gastoTotal, gastoAnterior),
      categorias,
      categoriaAtipicaId: atipica,
      efectoDelPlan: efectoDelPlan(entrada.usuarioId, delPeriodo),
    });
  },
};

/**
 * Cargos del periodo agrupados por categoria. Se excluyen los abonos (un reembolso no
 * es gasto negativo, es otra cosa) y las categorias que solo mueven dinero.
 */
function gastoPorCategoria(movimientos: Fila[], periodo: string): Map<string, number> {
  const suma = new Map<string, number>();
  for (const m of movimientos) {
    if (!(m.fecha ?? "").startsWith(periodo)) continue;
    if (m.tipo !== "cargo") continue;
    const id = m.categoria_id ?? "";
    if (NO_ES_GASTO.has(id)) continue;
    if (aBooleano(categoria(id)?.es_ingreso)) continue;
    suma.set(id, (suma.get(id) ?? 0) + aEntero(m.monto_centavos));
  }
  return suma;
}

function ingresoDelPeriodo(movimientos: Fila[], periodo: string): number {
  let total = 0;
  for (const m of movimientos) {
    if (!(m.fecha ?? "").startsWith(periodo)) continue;
    if (m.tipo !== "abono") continue;
    if (!aBooleano(categoria(m.categoria_id ?? "")?.es_ingreso)) continue;
    total += aEntero(m.monto_centavos);
  }
  return total;
}

/** Promedio mensual de cada categoria en los `MESES_DE_BASE` meses previos al periodo. */
function lineaBase(movimientos: Fila[], periodo: string): Map<string, number> {
  const acumulado = new Map<string, number>();
  let mes = periodo;
  for (let i = 0; i < MESES_DE_BASE; i++) {
    mes = periodoAnterior(mes);
    for (const [id, monto] of gastoPorCategoria(movimientos, mes)) {
      acumulado.set(id, (acumulado.get(id) ?? 0) + monto);
    }
  }
  const promedio = new Map<string, number>();
  for (const [id, total] of acumulado) promedio.set(id, Math.round(total / MESES_DE_BASE));
  return promedio;
}

/**
 * La categoria atipica es la que **mas se sale de su propio patron**, no la mas grande:
 * la renta siempre es el gasto mayor y senalarla no le sirve a nadie. Se mide el brinco
 * contra el promedio de los 3 meses previos, y se exige que sea grande en porcentaje
 * (>= 40 %) y en pesos (>= $500) para no resaltar ruido. Gana el brinco mayor en pesos.
 *
 * Sin linea base (una categoria que aparece por primera vez) cuenta como brinco completo.
 */
function elegirAtipica(
  categorias: Array<{ categoriaId: string; montoCentavos: number }>,
  base: Map<string, number>,
): string | null {
  let ganadora: string | null = null;
  let mayorBrinco = 0;
  for (const c of categorias) {
    const promedio = base.get(c.categoriaId) ?? 0;
    const brinco = c.montoCentavos - promedio;
    if (brinco < BRINCO_MINIMO_CENTAVOS) continue;
    if (promedio > 0 && brinco / promedio < BRINCO_MINIMO_PCT) continue;
    if (brinco > mayorBrinco) {
      mayorBrinco = brinco;
      ganadora = c.categoriaId;
    }
  }
  return ganadora;
}

/**
 * Lo que el plan de pago cambia en el gasto mensual: los intereses de la tarjeta
 * desaparecen y entran como mensualidad fija. Es el numero con el que la fase 2
 * demuestra el efecto de la fase 1.
 */
function efectoDelPlan(usuarioId: string, gastoDelPeriodo: Map<string, number>) {
  const plan = planAplicado(usuarioId);
  if (!plan) return null;
  const conEstado = tarjetaConEstado(usuarioId);
  return {
    interesesDelPeriodoCentavos: gastoDelPeriodo.get("cat_financiero") ?? 0,
    interesesEvitadosPorMesCentavos: conEstado ? interesesQueSeEvitan(conEstado.vista) : 0,
    mensualidadDelPlanCentavos: plan.mensualidadCentavos,
  };
}

function suma(mapa: Map<string, number>): number {
  let total = 0;
  for (const v of mapa.values()) total += v;
  return total;
}

/** Variacion relativa. Sin base previa se reporta 0: "infinito por ciento" no dice nada. */
function variacion(ahora: number, antes: number): number {
  if (antes === 0) return 0;
  return Number(((ahora - antes) / antes).toFixed(4));
}
