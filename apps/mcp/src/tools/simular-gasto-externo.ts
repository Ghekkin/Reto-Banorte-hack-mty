import {
  EntradaSimularGastoExterno,
  SalidaCompararPeriodos,
  SalidaSimularGastoExterno,
  type CategoriaConExterno,
  type GastoDelPeriodo,
  type GastoExterno,
} from "@maya/schemas";
import { capacidadPagoMensual } from "../dominio/consultas.js";
import {
  categoriasExternas,
  fusionar,
  gastosExternosVigentes,
  mensualExternoDe,
  normalizarNombre,
  type GastoExternoVigente,
} from "../dominio/gastos-externos.js";
import { pesos } from "../dominio/suscripciones.js";
import { hoy, ultimoMesCerrado } from "../dominio/tiempo.js";
import { compararPeriodos, variacion } from "./comparar-periodos.js";
import { capacidadDeAhorro } from "./proyectar-ahorro.js";
import type { DefinicionDeTool } from "./registro.js";

/**
 * `simular_gasto_externo` — LECTURA (calcula, no muta). «Tambien pago $3,500 de renta en
 * efectivo»: como se ve el gasto del mes y cuanto le queda libre si ese gasto contara.
 *
 * `antes` es el periodo con lo que ya guardo; `despues`, con lo simulado encima
 * (`guardado: false`). Si un gasto simulado se llama igual que uno guardado, lo reemplaza,
 * igual que pasaria al guardarlo. Solo lo mensual cuenta para las capacidades.
 * Algoritmo y limites: `docs/algoritmos/gastos-fuera-del-banco.md`.
 */
export const simularGastoExterno: DefinicionDeTool = {
  nombre: "simular_gasto_externo",
  titulo: "Simular un gasto que no pasa por el banco",
  descripcion:
    "Suma al gasto del mes lo que la persona paga FUERA del banco y el banco no ve (renta en efectivo, " +
    "lo que le da a su mamá, la colegiatura que paga otro): «también pago $3,500 de renta en efectivo». " +
    "Usala cuando mencione un gasto así, sobre todo si ya ve su gasto por categoría. Manda `gastos` con " +
    "nombre corto, monto en centavos y `frecuencia` (`mensual` si se repite cada mes, `unico` si fue una " +
    "vez; si no lo dice y suena a renta o apoyo, es mensual). Devuelve `antes` y `despues` con los nombres " +
    "de las props de `GastoPorCategoria`: si esa tarjeta ya está en pantalla, copia `despues.totalCentavos` " +
    "y `despues.categorias` tal cual con `ajustar_pantalla` (sin repintar ni recortar la lista). Trae " +
    "cuánto le queda libre al mes para deuda (`capacidadPago`) y para ahorrar (`capacidadAhorro`), antes y " +
    "si lo guardara; si trae `aviso`, ponlo en la tarjeta tal cual. NO guarda nada: para eso es la acción " +
    "`registrar_gasto_externo` con el mismo `gastos` (botón «Guardar gasto»).",
  clase: "lectura",
  entrada: EntradaSimularGastoExterno.shape,
  manejar: async (argumentos) => {
    const entrada = EntradaSimularGastoExterno.parse(argumentos);
    const periodo = entrada.periodo ?? ultimoMesCerrado(hoy());
    const gastos = normalizarGastos(entrada.gastos);

    const guardados = gastosExternosVigentes(entrada.usuarioId);
    const conSimulados = fusionar(guardados, [{ periodo, gastos, registradoEn: "" }]);
    const simulados = new Set(gastos.map((g) => normalizarNombre(g.nombre)));

    const antes = await gastoDelPeriodo(entrada.usuarioId, periodo, guardados, new Set());
    const despues = await gastoDelPeriodo(entrada.usuarioId, periodo, conSimulados, simulados);
    const capacidades = capacidadesCon(entrada.usuarioId, guardados, conSimulados);

    return SalidaSimularGastoExterno.parse({
      periodo,
      antes,
      despues,
      gastos,
      ...capacidades,
      aviso: avisoDe(capacidades),
    });
  },
};

/** Nombre sin espacios de sobra, y un solo renglon por nombre (gana el ultimo de la lista). */
export function normalizarGastos(gastos: GastoExterno[]): GastoExterno[] {
  const porNombre = new Map<string, GastoExterno>();
  for (const g of gastos) {
    const nombre = g.nombre.trim().replace(/\s+/g, " ");
    const llave = normalizarNombre(nombre);
    porNombre.delete(llave);
    porNombre.set(llave, { nombre, montoCentavos: g.montoCentavos, frecuencia: g.frecuencia });
  }
  return [...porNombre.values()];
}

/**
 * El gasto del periodo en la forma de `GastoPorCategoria`: las categorias del banco de
 * `comparar_periodos` (sin tocarlas) mas las de fuera del banco de `vigentes`. Con los
 * gastos guardados es exactamente lo que lista `comparar_periodos`; con una lista hipotetica
 * es "como se veria". `totalCentavos` es la suma de lo que se lista, al centavo.
 */
export async function gastoDelPeriodo(
  usuarioId: string,
  periodo: string,
  vigentes: GastoExternoVigente[],
  simulados: Set<string>,
): Promise<GastoDelPeriodo> {
  const comparado = SalidaCompararPeriodos.parse(await compararPeriodos.manejar({ usuarioId, periodo }));

  const delBanco: CategoriaConExterno[] = comparado.categorias
    .filter((c) => !c.fueraDelBanco)
    .map((c) => ({
      categoriaId: c.categoriaId,
      nombre: c.nombre,
      montoCentavos: c.montoCentavos,
      variacionPct: c.variacionPct,
    }));
  const deFuera: CategoriaConExterno[] = categoriasExternas(usuarioId, periodo, comparado.periodoAnterior, vigentes).map(
    (c) => ({
      categoriaId: c.categoriaId,
      nombre: c.nombre,
      montoCentavos: c.montoCentavos,
      variacionPct: variacion(c.montoCentavos, c.montoAnteriorCentavos),
      fueraDelBanco: true,
      guardado: !simulados.has(normalizarNombre(c.nombre)),
      frecuencia: c.frecuencia,
    }),
  );

  const categorias = [...delBanco, ...deFuera].sort((a, b) => b.montoCentavos - a.montoCentavos);
  return { totalCentavos: categorias.reduce((s, c) => s + c.montoCentavos, 0), categorias };
}

export type Capacidades = {
  capacidadPago: { antesCentavos: number; despuesCentavos: number };
  capacidadAhorro: { antesCentavos: number; despuesCentavos: number };
};

/**
 * Lo libre al mes para deuda y para ahorro, hoy y con otra lista de gastos. Solo cuenta la
 * diferencia en lo MENSUAL: un gasto unico no le quita capacidad a los meses que vienen.
 */
export function capacidadesCon(
  usuarioId: string,
  guardados: GastoExternoVigente[],
  hipoteticos: GastoExternoVigente[],
): Capacidades {
  const extra = mensualExternoDe(usuarioId, hipoteticos) - mensualExternoDe(usuarioId, guardados);
  const pago = capacidadPagoMensual(usuarioId);
  return {
    capacidadPago: { antesCentavos: pago, despuesCentavos: pago - extra },
    capacidadAhorro: {
      antesCentavos: capacidadDeAhorro(usuarioId),
      despuesCentavos: capacidadDeAhorro(usuarioId, extra),
    },
  };
}

/**
 * La frase para la tarjeta cuando lo mensual nuevo lo deja sin nada libre: para deuda (lo
 * mas grave, va primero) o para ahorrar. Se avisa, no se bloquea. Si el gasto no agrega
 * nada mensual (uno unico, o bajar uno que ya estaba), no hay aviso: no aprieta mas.
 */
export function avisoDe({ capacidadPago, capacidadAhorro }: Capacidades): string | null {
  const extra = capacidadPago.antesCentavos - capacidadPago.despuesCentavos;
  if (extra <= 0) return null;

  if (capacidadPago.despuesCentavos <= 0) {
    return (
      `Con ${pesos(extra)} más al mes fuera del banco ya no te queda capacidad libre para pagar deudas: ` +
      `quedarías en ${pesos(capacidadPago.despuesCentavos)} al mes.`
    );
  }
  if (capacidadAhorro.despuesCentavos <= 0) {
    return capacidadAhorro.antesCentavos > 0
      ? `Con ${pesos(extra)} más al mes fuera del banco ya no te queda nada para ahorrar: hoy puedes apartar ` +
          `${pesos(capacidadAhorro.antesCentavos)} al mes.`
      : `Ya no te quedaba nada libre para ahorrar, y ${pesos(extra)} más al mes fuera del banco lo aprieta más.`;
  }
  return null;
}
