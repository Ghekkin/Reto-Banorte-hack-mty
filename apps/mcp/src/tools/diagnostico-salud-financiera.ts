import { EntradaDiagnosticoSaludFinanciera, SalidaDiagnosticoSaludFinanciera } from "@maya/schemas";
import { calificacionDe, mesYAnterior, tendenciaDe, vigenciaDelHabito } from "../dominio/salud.js";
import type { DefinicionDeTool } from "./registro.js";

/** Cuantos meses trae `serie` si el agente no pide otra cosa. */
const MESES_POR_DEFECTO = 6;

/**
 * `diagnostico_salud_financiera` — LECTURA. El retrato con el que el agente decide.
 *
 * Sin esta tool la unica pregunta que el agente sabe hacerse es "¿tiene deuda o no?".
 * Con ella sabe que Beto trae 39 puntos y lleva tres meses sin levantar, que Ana cayo
 * de 83 a 74 en un mes, y que Carmen va en 85 subiendo. Tres pantallas distintas con
 * el dato que las justifica.
 *
 * `serie` existe para que el agente pueda pedir una grafica de evolucion sin hacer
 * una segunda llamada.
 */
export const diagnosticoSaludFinanciera: DefinicionDeTool = {
  nombre: "diagnostico_salud_financiera",
  titulo: "Diagnostico de salud financiera",
  descripcion:
    "Puntaje de salud financiera (0-100) de la persona, su tendencia contra el mes anterior, los ratios " +
    "que lo explican (tasa de ahorro, deuda sobre ingreso, gasto esencial, meses de fondo de emergencia) " +
    "y el habito detectado, ya redactado. Trae `serie` con los ultimos meses para graficar la evolucion. " +
    "Llamala cuando pregunten como van, si estan bien, o antes de proponer un plan: dice de que tamano es " +
    "el problema. Si `habito.vigente` es false, el dato en que se basa ya cambio: NO lo pongas en pantalla.",
  clase: "lectura",
  entrada: EntradaDiagnosticoSaludFinanciera.shape,
  manejar: (argumentos) => {
    const entrada = EntradaDiagnosticoSaludFinanciera.parse(argumentos);
    const encontrado = mesYAnterior(entrada.usuarioId, entrada.periodo);
    if (!encontrado) throw new Error(`no hay diagnostico de habitos para ${entrada.usuarioId}`);

    const { historia, mes, anterior } = encontrado;
    const cambio = anterior ? mes.puntajeSalud - anterior.puntajeSalud : 0;
    const habito = vigenciaDelHabito(entrada.usuarioId, mes.habitoDetectado);

    // La serie termina en el mes diagnosticado, no en el mas reciente: pedir un mes
    // pasado tiene que devolver su contexto, no el de hoy.
    const hasta = historia.findIndex((m) => m.periodo === mes.periodo) + 1;
    const desde = Math.max(0, hasta - (entrada.mesesHistoria ?? MESES_POR_DEFECTO));

    return SalidaDiagnosticoSaludFinanciera.parse({
      periodo: mes.periodo,
      puntajeSalud: mes.puntajeSalud,
      calificacion: calificacionDe(mes.puntajeSalud),
      tendencia: tendenciaDe(cambio),
      cambioVsMesAnterior: cambio,
      ingresoCentavos: mes.ingresoCentavos,
      gastoCentavos: mes.gastoCentavos,
      ahorroCentavos: mes.ahorroCentavos,
      tasaAhorroPct: mes.tasaAhorroPct,
      ratioDeudaIngresoPct: mes.ratioDeudaIngresoPct,
      gastoEsencialPct: mes.gastoEsencialPct,
      gastoDiscrecionalPct: mes.gastoDiscrecionalPct,
      mesesFondoEmergencia: mes.mesesFondoEmergencia,
      habito: {
        texto: mes.habitoDetectado,
        vigente: habito.vigente,
        razonSiNoVigente: habito.razon,
      },
      serie: historia.slice(desde, hasta).map((m) => ({
        periodo: m.periodo,
        puntajeSalud: m.puntajeSalud,
        tasaAhorroPct: m.tasaAhorroPct,
        ahorroCentavos: m.ahorroCentavos,
      })),
    });
  },
};
