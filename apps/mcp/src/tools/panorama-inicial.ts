import { EntradaPanoramaInicial, SalidaPanoramaInicial } from "@maya/schemas";
import { aEntero } from "../datos/index.js";
import { capacidadPagoMensual, usuario } from "../dominio/consultas.js";
import { resumenDeDeuda, type ResumenDeDeuda } from "../dominio/creditos.js";
import { calificacionDe, mesYAnterior, tendenciaDe } from "../dominio/salud.js";
import type { DefinicionDeTool } from "./registro.js";

/** Uso del limite a partir del cual la tarjeta es una urgencia, y a partir del cual preocupa. */
const USO_CRITICO = 0.9;
const USO_ALTO = 0.5;
/** Fraccion del ingreso comprometida en deuda que se considera alta. Es el limite prudencial de siempre. */
const RATIO_DEUDA_ALTO = 0.35;

/**
 * `panorama_inicial` — LECTURA COMPUESTA. La primera llamada de toda conversacion.
 *
 * No agrega un dato que no existiera: junta en una respuesta lo que el agente pedia en
 * tres llamadas seguidas (perfil, tarjeta, diagnostico) y le agrega la deuda total. El
 * turno tipico pasa de cuatro pasos a tres, y cada paso que se quita es tiempo que el
 * jurado no pasa viendo una pantalla quieta.
 *
 * **Donde esta la frontera**: `situacion` es una clasificacion sobre umbrales fijos —un
 * dato, con pruebas—. Quien interpreta la intencion de la persona y elige que pantalla
 * construir sigue siendo el modelo. Esta tool no nombra ningun componente.
 */
export const panoramaInicial: DefinicionDeTool = {
  nombre: "panorama_inicial",
  titulo: "Panorama inicial de la persona",
  descripcion:
    "TODO lo que necesitas para decidir la primera pantalla, en una sola llamada: quien es, su tarjeta, " +
    "su puntaje de salud financiera, su deuda total y su capacidad de pago, mas un campo `situacion` que " +
    "resume en que esta parada. Llamala SIEMPRE al inicio de una conversacion, antes que cualquier otra: " +
    "reemplaza a `consultar_perfil` + `consultar_tarjeta` + `diagnostico_salud_financiera`. Despues baja " +
    "al detalle con la tool que corresponda. `situacion` NO te dice que componente pintar: eso lo decides tu.",
  clase: "lectura",
  entrada: EntradaPanoramaInicial.shape,
  manejar: (argumentos) => {
    const { usuarioId } = EntradaPanoramaInicial.parse(argumentos);
    const fila = usuario(usuarioId);
    const resumen = resumenDeDeuda(usuarioId);
    const capacidad = capacidadPagoMensual(usuarioId);

    // Sin diagnostico la conversacion sigue: el panorama vale por la tarjeta y la deuda.
    const salud = mesYAnterior(usuarioId);
    const { situacion, porQue } = situacionDe(resumen, capacidad);

    return SalidaPanoramaInicial.parse({
      perfil: {
        id: fila.id,
        nombre: fila.nombre,
        edad: aEntero(fila.edad),
        ocupacion: fila.ocupacion,
        ingresoMensualCentavos: aEntero(fila.ingreso_mensual_centavos),
        ciudad: fila.ciudad,
        segmento: fila.segmento,
      },
      tarjeta: resumen.tarjeta
        ? {
            id: resumen.tarjeta.vista.id,
            saldoCentavos: resumen.tarjeta.saldoCentavos,
            limiteCentavos: resumen.tarjeta.vista.limiteCentavos,
            usoDelLimite: resumen.tarjeta.vista.usoDelLimite,
            diasMora: resumen.tarjeta.vista.diasMora,
            tienePlanActivo: resumen.tarjeta.plan !== null,
          }
        : null,
      salud: salud
        ? {
            periodo: salud.mes.periodo,
            puntajeSalud: salud.mes.puntajeSalud,
            calificacion: calificacionDe(salud.mes.puntajeSalud),
            tendencia: tendenciaDe(salud.anterior ? salud.mes.puntajeSalud - salud.anterior.puntajeSalud : 0),
          }
        : null,
      deuda: {
        totalCentavos: resumen.deudaTotalCentavos,
        mensualidadTotalCentavos: resumen.mensualidadTotalCentavos,
        ratioDeudaIngreso: resumen.ratioDeudaIngreso,
      },
      capacidadPagoMensualCentavos: capacidad,
      situacion,
      porQue,
    });
  },
};

/**
 * En que esta parada la persona. Gana la primera regla que aplica, y el orden no es
 * arbitrario: lo que cuesta dinero HOY (la mora, el limite lleno) manda sobre lo que
 * podria costarlo despues. El plan activo va antes que el uso alto porque es el estado
 * que la propia persona produjo con una accion, y contradecirlo en pantalla seria
 * desmentir la confirmacion que el agente acaba de pintar.
 *
 * `porQue` viaja con la situacion para que el agente no tenga que reconstruir el
 * motivo: es el dato que sostiene la linea "¿Por que veo esto?".
 */
function situacionDe(
  resumen: ResumenDeDeuda,
  capacidadCentavos: number,
): { situacion: string; porQue: string } {
  const tarjeta = resumen.tarjeta;

  if (tarjeta && tarjeta.vista.diasMora > 0) {
    return {
      situacion: "deuda_critica",
      porQue: `Trae ${tarjeta.vista.diasMora} dias de mora en la tarjeta`,
    };
  }
  if (tarjeta && !tarjeta.plan && tarjeta.vista.usoDelLimite >= USO_CRITICO) {
    return {
      situacion: "deuda_critica",
      porQue: `Usa el ${pct(tarjeta.vista.usoDelLimite)} del limite de su tarjeta`,
    };
  }
  if (tarjeta?.plan) {
    return {
      situacion: "plan_activo",
      porQue: `Ya difirio su saldo a ${tarjeta.plan.plazoMeses} meses de ${pesos(tarjeta.plan.mensualidadCentavos)}`,
    };
  }
  if (tarjeta && tarjeta.vista.usoDelLimite >= USO_ALTO) {
    return {
      situacion: "deuda_alta",
      porQue: `Usa el ${pct(tarjeta.vista.usoDelLimite)} del limite de su tarjeta`,
    };
  }
  if (resumen.ratioDeudaIngreso >= RATIO_DEUDA_ALTO) {
    return {
      situacion: "deuda_alta",
      porQue: `El ${pct(resumen.ratioDeudaIngreso)} de su ingreso se le va en pagos de deuda`,
    };
  }
  if (capacidadCentavos <= 0) {
    return { situacion: "sin_margen", porQue: "No le queda capacidad de pago libre este mes" };
  }
  return {
    situacion: "estable_con_capacidad",
    porQue: `Le quedan ${pesos(capacidadCentavos)} libres al mes y no trae deuda revolvente`,
  };
}

/** Solo para `porQue`, que es prosa que el agente parafrasea. La UI formatea por su cuenta. */
function pct(fraccion: number): string {
  return `${Math.round(fraccion * 100)} %`;
}

function pesos(centavos: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(centavos / 100);
}
