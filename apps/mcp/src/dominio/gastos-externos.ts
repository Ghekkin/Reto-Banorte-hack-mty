import { accionesDe } from "../datos/index.js";
import { periodoAnterior } from "./tiempo.js";

/**
 * Gastos fuera del banco: «tambien pago $3,500 de renta en efectivo». Lo que la persona
 * paga sin que pase por sus cuentas y que, por lo tanto, ningun movimiento muestra.
 * Documentado en `docs/algoritmos/gastos-fuera-del-banco.md`.
 *
 * Viven en el estado mutable: cada `registrar_gasto_externo` guarda sus `gastos` y el
 * `periodo` en que se registraron. Las lecturas los superponen:
 *
 * - `comparar_periodos` (y `analizar_gasto`) los lista como categorias `ext_<slug>`.
 * - `capacidadPagoMensual` y `capacidadDeAhorro` restan lo MENSUAL: lo que se repite cada
 *   mes compite con la deuda y con el ahorro; un gasto unico no.
 *
 * Este modulo solo lee `acciones_aplicadas`: no importa `consultas.ts`, que es quien lo usa.
 */

export type FrecuenciaDeGasto = "mensual" | "unico";

export type GastoExterno = { nombre: string; montoCentavos: number; frecuencia: FrecuenciaDeGasto };

/** Un gasto con el periodo desde el que cuenta (el de su registro). */
export type GastoExternoVigente = GastoExterno & { categoriaId: string; periodo: string };

/** Lo que guarda cada fila de `registrar_gasto_externo`. */
export type RegistroDeGastos = { periodo: string; gastos: GastoExterno[]; registradoEn: string };

/** Minusculas, sin acentos y sin espacios de sobra: «Renta », «renta» y «RENTÁ» son el mismo gasto. */
export function normalizarNombre(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** `ext_apoyo_a_mi_mama`. El prefijo nunca choca con los `cat_…` del banco. */
export function categoriaIdDe(nombre: string): string {
  const slug = normalizarNombre(nombre)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `ext_${slug || "gasto"}`;
}

/**
 * Los gastos que siguen en pie, de todos los periodos. Se recorren los registros en orden y
 * **gana el ultimo por nombre normalizado**: guardar «Renta» otra vez la reemplaza (con su
 * monto, frecuencia y periodo nuevos) y guardarla con monto 0 la quita.
 */
export function gastosExternosVigentes(usuarioId: string): GastoExternoVigente[] {
  return fusionar(
    [],
    accionesDe(usuarioId, "registrar_gasto_externo").map((a) => a.datos as unknown as RegistroDeGastos),
  );
}

/**
 * Aplica registros encima de una lista de vigentes, con la misma regla de reemplazo. La usa
 * la simulacion para ver "como quedaria si guardara esto" sin guardar nada.
 */
export function fusionar(base: GastoExternoVigente[], registros: RegistroDeGastos[]): GastoExternoVigente[] {
  const porNombre = new Map<string, GastoExternoVigente>();
  for (const g of base) porNombre.set(normalizarNombre(g.nombre), g);
  for (const registro of registros) {
    for (const gasto of registro.gastos ?? []) {
      const llave = normalizarNombre(gasto.nombre);
      // Se borra antes de volver a poner: el reemplazo queda al final, en orden de registro.
      porNombre.delete(llave);
      if (gasto.montoCentavos > 0) {
        porNombre.set(llave, {
          nombre: gasto.nombre.trim(),
          montoCentavos: gasto.montoCentavos,
          frecuencia: gasto.frecuencia,
          categoriaId: categoriaIdDe(gasto.nombre),
          periodo: registro.periodo,
        });
      }
    }
  }
  return [...porNombre.values()];
}

/**
 * ¿Cuenta este gasto en ese periodo? Uno mensual, en su periodo de registro y en todos los
 * siguientes; uno unico, solo en el suyo. Los periodos son `AAAA-MM`: se comparan como texto.
 */
export function aplicaEn(gasto: Pick<GastoExternoVigente, "frecuencia" | "periodo">, periodo: string): boolean {
  return gasto.frecuencia === "mensual" ? gasto.periodo <= periodo : gasto.periodo === periodo;
}

/** Los gastos de fuera del banco que cuentan en un periodo. */
export function gastosExternosDe(usuarioId: string, periodo: string, vigentes = gastosExternosVigentes(usuarioId)) {
  return vigentes.filter((g) => aplicaEn(g, periodo));
}

/** Lo que sale cada mes fuera del banco: la suma de los gastos MENSUALES vigentes. */
export function mensualExternoDe(usuarioId: string, vigentes = gastosExternosVigentes(usuarioId)): number {
  return vigentes.filter((g) => g.frecuencia === "mensual").reduce((suma, g) => suma + g.montoCentavos, 0);
}

/** Color neutro para lo que no es una categoria del banco (el gris de `comparar_periodos`). */
export const COLOR_FUERA_DEL_BANCO = "#6B7280";
export const GRUPO_FUERA_DEL_BANCO = "fuera_del_banco";

export type CategoriaExterna = {
  categoriaId: string;
  nombre: string;
  grupo: string;
  esEsencial: boolean;
  color: string;
  montoCentavos: number;
  montoAnteriorCentavos: number;
  fueraDelBanco: true;
  frecuencia: FrecuenciaDeGasto;
};

/**
 * Las categorias de fuera del banco de un periodo contra su anterior, en la forma de
 * `comparar_periodos`. `montoAnterior` es el monto si el gasto tambien contaba en el periodo
 * anterior (un mensual registrado antes), y 0 si no. Un gasto que solo cuenta en el anterior
 * aparece con monto 0, igual que una categoria del banco que dejo de tener cargos.
 */
export function categoriasExternas(
  usuarioId: string,
  periodo: string,
  anterior = periodoAnterior(periodo),
  vigentes = gastosExternosVigentes(usuarioId),
): CategoriaExterna[] {
  return vigentes
    .filter((g) => aplicaEn(g, periodo) || aplicaEn(g, anterior))
    .map((g) => ({
      categoriaId: g.categoriaId,
      nombre: g.nombre,
      grupo: GRUPO_FUERA_DEL_BANCO,
      esEsencial: false,
      color: COLOR_FUERA_DEL_BANCO,
      montoCentavos: aplicaEn(g, periodo) ? g.montoCentavos : 0,
      montoAnteriorCentavos: aplicaEn(g, anterior) ? g.montoCentavos : 0,
      fueraDelBanco: true as const,
      frecuencia: g.frecuencia,
    }));
}
