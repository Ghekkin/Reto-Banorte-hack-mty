import {
  EntradaAnalizarGasto,
  PatronGasto,
  SalidaAnalizarGasto,
  SalidaCompararPeriodos,
  SalidaDetectarFugas,
} from "@maya/schemas";
import { categoria } from "../dominio/consultas.js";
import { todosLosTopesEvaluados, type TopeEvaluado } from "../dominio/topes.js";
import { compararPeriodos } from "./comparar-periodos.js";
import { detectarFugas } from "./detectar-fugas.js";
import type { DefinicionDeTool } from "./registro.js";

/**
 * `analizar_gasto` — LECTURA COMPUESTA. El viaje de gasto de Ana en una sola llamada:
 * junta `comparar_periodos` + `detectar_fugas` + el estatus en vivo de sus topes, y
 * agrega `patronGasto` para que el modelo no arme el mismo diagnostico a mano cada vez.
 *
 * Compone llamando a las tools atomicas por dentro (`O4`, `docs/arquitectura/
 * orquestadores.md`): son las mismas, no una segunda version. Las atomicas siguen
 * expuestas para el detalle.
 */
export const analizarGasto: DefinicionDeTool = {
  nombre: "analizar_gasto",
  titulo: "Analizar el gasto y las fugas de dinero",
  descripcion:
    "LECTURA COMPUESTA para el viaje de gasto: junta `comparar_periodos` (categoria por categoria, la " +
    "atipica) y `detectar_fugas` (suscripciones y recurrentes sin registrar) en una sola llamada, mas el " +
    "estatus en vivo de los topes de gasto que la persona ya tenga fijados. Trae `patronGasto`, la " +
    "clasificacion de en que consiste el problema. Llamala en vez de las dos por separado cuando " +
    "pregunten en que se les va el dinero. Acepta `periodoAnterior` para comparar contra un mes " +
    "cualquiera y `mesesSinUso` para el criterio de suscripcion olvidada. Baja a `comparar_periodos` o " +
    "`detectar_fugas` solo si necesitas mas detalle del que trae esta (el listado completo).",
  clase: "lectura",
  entrada: EntradaAnalizarGasto.shape,
  manejar: async (argumentos) => {
    const entrada = EntradaAnalizarGasto.parse(argumentos);

    // Los dos parametros se PASAN a las atomicas. Antes se recibia `periodo` y se llamaba
    // `detectar_fugas` sin argumentos, asi que "comparalo con julio" o "que no he usado en
    // seis meses" no tenian efecto por esta fachada y el modelo no tenia como enterarse.
    const gasto = SalidaCompararPeriodos.parse(
      await compararPeriodos.manejar({
        usuarioId: entrada.usuarioId,
        periodo: entrada.periodo,
        periodoAnterior: entrada.periodoAnterior,
      }),
    );
    const fugas = SalidaDetectarFugas.parse(
      await detectarFugas.manejar({ usuarioId: entrada.usuarioId, mesesSinUso: entrada.mesesSinUso }),
    );
    const topesExcedidos = todosLosTopesEvaluados(entrada.usuarioId).filter((t) => t.estatus === "excedido");

    const { patronGasto, porQue } = patronDe(gasto, fugas, topesExcedidos);

    return SalidaAnalizarGasto.parse({
      gasto,
      fugas,
      topesExcedidos: topesExcedidos.map((t) => ({
        categoriaId: t.categoriaId,
        categoria: categoria(t.categoriaId)?.nombre ?? t.categoriaId,
        montoLimiteCentavos: t.montoLimiteCentavos,
        gastadoActualCentavos: t.gastadoActualCentavos,
        pctUsado: t.pctUsado,
      })),
      patronGasto,
      porQue,
    });
  },
};

/**
 * En que consiste el problema de gasto. Gana la primera regla que aplica: un tope ya
 * excedido es el compromiso mas concreto (la persona lo fijo ella misma), luego una
 * fuga real (dinero que se va sin que se note), luego la categoria atipica del mes, y
 * si nada de eso aplica el gasto esta dentro de lo esperado.
 */
function patronDe(
  gasto: SalidaCompararPeriodos,
  fugas: SalidaDetectarFugas,
  topesExcedidos: TopeEvaluado[],
): { patronGasto: PatronGasto; porQue: string } {
  const primerTope = topesExcedidos[0];
  if (primerTope) {
    return {
      patronGasto: "tope_excedido",
      porQue: `Ya paso su tope de ${categoria(primerTope.categoriaId)?.nombre ?? primerTope.categoriaId}`,
    };
  }
  if (fugas.suscripciones.some((s) => s.sinUsoReciente) || fugas.recurrentesNoSuscritos.length > 0) {
    return {
      patronGasto: "fuga_detectada",
      porQue: `Tiene ${pesos(fugas.totalMensualCentavos)} al mes en suscripciones y cargos recurrentes`,
    };
  }
  if (gasto.categoriaAtipicaId) {
    const nombre = gasto.categorias.find((c) => c.categoriaId === gasto.categoriaAtipicaId)?.nombre ?? gasto.categoriaAtipicaId;
    return { patronGasto: "gasto_atipico", porQue: `${nombre} se salio de su patron este mes` };
  }
  return { patronGasto: "gasto_estable", porQue: "El gasto del mes esta dentro de lo esperado" };
}

function pesos(centavos: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(centavos / 100);
}
