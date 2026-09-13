import { EntradaProyectarInversion, SalidaProyectarInversion } from "@maya/schemas";
import {
  etiquetaDeHito,
  instrumentoDelCatalogo,
  instrumentoPorOmision,
  mesesDeHito,
  portafolioDeInversion,
  proyectarCrecimiento,
} from "../dominio/inversiones.js";
import type { DefinicionDeTool } from "./registro.js";

/**
 * `proyectar_inversion` — LECTURA que calcula. Cuánto vale invertir N meses, y qué pasa
 * si el mercado se porta mal.
 *
 * Es la tool que tapa el hueco más grande que tenía el catálogo: `ProyeccionCrecimiento`
 * pide siete cifras y `EscenariosInversion` tres escenarios completos, y **nadie las
 * calculaba**, así que el modelo las escribía de memoria. Ese error no se notaba —a
 * diferencia de una mensualidad absurda— porque el interés compuesto mental cae en un
 * rango creíble, y encima el componente calibraba su propia curva contra la cifra
 * inventada.
 *
 * La convención de los escenarios (`tasa ± volatilidad`) es una CONVENCIÓN, no un
 * pronóstico, y está documentada como tal en `docs/algoritmos/proyeccion-de-inversion.md`.
 * El escenario adverso puede perder dinero y se reporta con signo negativo: es el único
 * modo honesto de contestar "¿y si me va mal?".
 */
export const proyectarInversion: DefinicionDeTool = {
  nombre: "proyectar_inversion",
  titulo: "Proyectar una inversion",
  descripcion:
    "Cuanto valdria una inversion dentro de N meses con interes compuesto: capital inicial, aportacion " +
    "mensual, el desglose entre lo aportado y el rendimiento, los hitos del camino y los tres escenarios " +
    "(pesimista, esperado, optimista). Es la UNICA fuente de estas cifras: llamala SIEMPRE antes de pintar " +
    "ProyeccionCrecimiento o EscenariosInversion, y nunca calcules un valor futuro por tu cuenta. Para una " +
    "meta de ahorro sin rendimiento usa proyectar_ahorro; esta es para dinero invertido.",
  clase: "lectura",
  entrada: EntradaProyectarInversion.shape,
  manejar: (argumentos) => {
    const entrada = EntradaProyectarInversion.parse(argumentos);

    if (entrada.instrumentoId && entrada.tasaAnual !== undefined) {
      throw new Error("manda `instrumentoId` o `tasaAnual`, no los dos: la tasa saldria de dos lugares distintos");
    }

    // La tasa sale de un instrumento real del catalogo salvo que se pida una hipotetica.
    // La volatilidad de la hipotetica se estima como fraccion de la tasa: sin ella no hay
    // con que separar los escenarios, y devolver los tres iguales seria mentir por omision.
    const instrumento = entrada.tasaAnual === undefined ? instrumentoDeLaEntrada(entrada.instrumentoId, entrada.usuarioId) : null;
    const tasa = entrada.tasaAnual ?? instrumento!.rendimientoAnualEsperado;
    const volatilidad = instrumento ? instrumento.volatilidadAnual : Number((tasa * VOLATILIDAD_HIPOTETICA).toFixed(4));

    const capitalInicial = entrada.capitalInicialCentavos ?? capitalPorOmision(entrada.usuarioId);
    const aportacion = entrada.aportacionMensualCentavos ?? 0;
    const meses = entrada.horizonteMeses;

    if (capitalInicial === 0 && aportacion === 0) {
      throw new Error("no hay nada que proyectar: manda `capitalInicialCentavos` o `aportacionMensualCentavos`");
    }

    const esperado = proyectarCrecimiento(capitalInicial, aportacion, tasa, meses);

    return SalidaProyectarInversion.parse({
      capitalInicialCentavos: capitalInicial,
      aportacionMensualCentavos: aportacion,
      horizonteMeses: meses,
      instrumento: instrumento
        ? {
            id: instrumento.id,
            nombre: instrumento.nombre,
            clave: instrumento.clave,
            tipo: instrumento.tipo,
            riesgo: instrumento.riesgo,
          }
        : null,
      tasaAnualEstimadaPct: tasa,
      volatilidadAnual: volatilidad,
      totalAportadoCentavos: esperado.totalAportadoCentavos,
      rendimientoEstimadoCentavos: esperado.rendimientoCentavos,
      valorFinalEstimadoCentavos: esperado.saldoFinalCentavos,
      hitos: mesesDeHito(meses).map((mes) => {
        const hasta = proyectarCrecimiento(capitalInicial, aportacion, tasa, mes);
        return {
          mes,
          etiqueta: etiquetaDeHito(mes),
          aportadoCentavos: hasta.totalAportadoCentavos,
          saldoEstimadoCentavos: hasta.saldoFinalCentavos,
        };
      }),
      escenarios: {
        pesimista: escenario(capitalInicial, aportacion, tasaDeEscenario(tasa, -volatilidad), meses, "pesimista"),
        esperado: escenario(capitalInicial, aportacion, tasa, meses, "esperado"),
        optimista: escenario(capitalInicial, aportacion, tasaDeEscenario(tasa, volatilidad), meses, "optimista"),
      },
      advertencia: advertenciaDe(capitalInicial, aportacion, tasa, volatilidad, meses),
    });
  },
};

/** Con una tasa hipotetica no hay volatilidad publicada; se estima como esta fraccion de la tasa. */
const VOLATILIDAD_HIPOTETICA = 0.4;

/** Nadie invierte al -80 %: el piso evita que un instrumento muy volatil produzca un absurdo. */
const TASA_MINIMA = -0.5;

function tasaDeEscenario(tasa: number, ajuste: number): number {
  return Number(Math.max(TASA_MINIMA, tasa + ajuste).toFixed(4));
}

function instrumentoDeLaEntrada(instrumentoId: string | undefined, usuarioId: string) {
  if (instrumentoId) {
    const exacto = instrumentoDelCatalogo(instrumentoId);
    if (!exacto) throw new Error(`no existe el instrumento ${instrumentoId}`);
    return exacto;
  }

  const porOmision = instrumentoPorOmision(usuarioId);
  if (!porOmision) {
    throw new Error("no hay instrumento con el que proyectar: manda `instrumentoId` o una `tasaAnual`");
  }
  return porOmision;
}

/** Sin capital dicho, se arranca de lo que ya tiene invertido. */
function capitalPorOmision(usuarioId: string): number {
  return portafolioDeInversion(usuarioId)?.valorActualCentavos ?? 0;
}

const DESCRIPCIONES = {
  pesimista: "El mercado se porta peor que su promedio histórico durante todo el plazo",
  esperado: "El instrumento rinde lo que rinde en promedio: es el escenario base",
  optimista: "El mercado se porta mejor que su promedio histórico durante todo el plazo",
} as const;

function escenario(
  capital: number,
  aportacion: number,
  tasa: number,
  meses: number,
  cual: keyof typeof DESCRIPCIONES,
) {
  const proyeccion = proyectarCrecimiento(capital, aportacion, tasa, meses);
  return {
    tasaAnualPct: tasa,
    valorFinalCentavos: proyeccion.saldoFinalCentavos,
    rendimientoCentavos: proyeccion.rendimientoCentavos,
    descripcion: DESCRIPCIONES[cual],
  };
}

/**
 * Lo que hay que decir junto al numero. Cuando el escenario adverso pierde, callarlo
 * convierte una proyeccion en una promesa.
 */
function advertenciaDe(
  capital: number,
  aportacion: number,
  tasa: number,
  volatilidad: number,
  meses: number,
): string | null {
  const adverso = proyectarCrecimiento(capital, aportacion, tasaDeEscenario(tasa, -volatilidad), meses);
  if (adverso.rendimientoCentavos >= 0) return null;

  const perdida = Math.abs(adverso.rendimientoCentavos);
  return (
    `En el escenario adverso esta inversion PIERDE ${perdida} centavos sobre lo aportado. ` +
    "Dilo: el rendimiento no esta garantizado y este instrumento puede cerrar en negativo."
  );
}
