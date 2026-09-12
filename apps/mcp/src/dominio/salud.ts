import { aDecimal, aEntero, filtrar, type Fila } from "../datos/index.js";
import { planAplicado } from "./consultas.js";

/**
 * El diagnostico mensual de habitos: puntaje, ratios y la frase ya redactada.
 *
 * A diferencia del resto del dominio, aqui casi no se calcula nada: `diagnostico_habitos`
 * trae 11 meses por persona ya resueltos desde la generacion de datos
 * (`docs/algoritmos/generacion-de-datos.md`). Lo que esta capa aporta es leerlo, ordenarlo,
 * traducir el puntaje a palabras y —lo importante— decidir si la frase sigue siendo cierta
 * despues de lo que la persona hizo en la demo.
 *
 * Detalle y umbrales: `docs/algoritmos/puntaje-de-salud.md`.
 */

export type MesDeSalud = {
  periodo: string;
  ingresoCentavos: number;
  gastoCentavos: number;
  ahorroCentavos: number;
  tasaAhorroPct: number;
  ratioDeudaIngresoPct: number;
  gastoEsencialPct: number;
  gastoDiscrecionalPct: number;
  mesesFondoEmergencia: number;
  puntajeSalud: number;
  habitoDetectado: string;
};

/**
 * Los cortes del puntaje. Salen de donde caen los tres perfiles demo: Beto en 39
 * (critica), Ana en 74 (estable) y Carmen en 85 (sana), con `fragil` para el tramo
 * intermedio que Ana y Carmen tocan en sus peores meses.
 */
const CORTE_FRAGIL = 40;
const CORTE_ESTABLE = 60;
const CORTE_SANA = 80;

/** Menos de esto entre dos meses es ruido del mes, no una tendencia. */
const PUNTOS_PARA_TENDENCIA = 3;

/** Todos los meses de una persona, del mas antiguo al mas reciente. */
export function historiaDeSalud(usuarioId: string): MesDeSalud[] {
  return filtrar("diagnostico_habitos", "usuario_id", usuarioId)
    .map(aMesDeSalud)
    .sort((a, b) => a.periodo.localeCompare(b.periodo));
}

function aMesDeSalud(fila: Fila): MesDeSalud {
  return {
    periodo: fila.periodo ?? "",
    ingresoCentavos: aEntero(fila.ingreso_centavos),
    gastoCentavos: aEntero(fila.gasto_centavos),
    ahorroCentavos: aEntero(fila.ahorro_centavos),
    tasaAhorroPct: aDecimal(fila.tasa_ahorro_pct),
    ratioDeudaIngresoPct: aDecimal(fila.ratio_deuda_ingreso_pct),
    gastoEsencialPct: aDecimal(fila.gasto_esencial_pct),
    gastoDiscrecionalPct: aDecimal(fila.gasto_discrecional_pct),
    mesesFondoEmergencia: aDecimal(fila.meses_fondo_emergencia),
    puntajeSalud: aEntero(fila.puntaje_salud),
    habitoDetectado: fila.habito_detectado ?? "",
  };
}

export function calificacionDe(puntaje: number): "critica" | "fragil" | "estable" | "sana" {
  if (puntaje < CORTE_FRAGIL) return "critica";
  if (puntaje < CORTE_ESTABLE) return "fragil";
  if (puntaje < CORTE_SANA) return "estable";
  return "sana";
}

export function tendenciaDe(cambio: number): "mejora" | "estable" | "empeora" {
  if (cambio >= PUNTOS_PARA_TENDENCIA) return "mejora";
  if (cambio <= -PUNTOS_PARA_TENDENCIA) return "empeora";
  return "estable";
}

/**
 * Si la frase del diagnostico sigue siendo cierta hoy.
 *
 * El diagnostico es una foto mensual congelada: no sabe de las acciones que la persona
 * hizo durante la demo. El unico habito que una accion vuelve falso es el de la tarjeta
 * —"Traes tu tarjeta al 97 % de su limite"— porque `aplicar_plan_pago` deja el saldo
 * revolvente en cero. Ponerlo en pantalla despues de reestructurar seria contradecir la
 * confirmacion que el propio agente acaba de pintar.
 *
 * Se detecta por el asunto de la frase y no recalculando el puntaje: el puntaje es un
 * dato de origen y no nos toca reescribirlo; lo que nos toca es no mentir con el.
 */
export function vigenciaDelHabito(usuarioId: string, habito: string): { vigente: boolean; razon: string | null } {
  const hablaDeLaTarjeta = /tarjeta/i.test(habito);
  if (hablaDeLaTarjeta && planAplicado(usuarioId)) {
    return {
      vigente: false,
      razon: "El saldo de la tarjeta ya se difirio a un plan de pago: esta frase describe la situacion anterior",
    };
  }
  return { vigente: true, razon: null };
}

/**
 * El mes a diagnosticar y el inmediato anterior, que es contra el que se mide la
 * tendencia. Sin `periodo` se toma el mas reciente que exista para esa persona.
 */
export function mesYAnterior(
  usuarioId: string,
  periodo?: string,
): { historia: MesDeSalud[]; mes: MesDeSalud; anterior: MesDeSalud | undefined } | null {
  const historia = historiaDeSalud(usuarioId);
  if (historia.length === 0) return null;

  const indice = periodo ? historia.findIndex((m) => m.periodo === periodo) : historia.length - 1;
  if (indice < 0) {
    const disponibles = `${historia[0]!.periodo} a ${historia.at(-1)!.periodo}`;
    throw new Error(`no hay diagnostico de ${usuarioId} para ${periodo}; hay de ${disponibles}`);
  }

  return { historia, mes: historia[indice]!, anterior: indice > 0 ? historia[indice - 1] : undefined };
}
