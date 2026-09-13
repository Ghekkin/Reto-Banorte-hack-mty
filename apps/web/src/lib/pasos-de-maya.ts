import type { LineaStream } from "@/lib/agente/tipos";

/**
 * Lo que Maya va haciendo durante un turno, dicho para la persona y en tiempo real.
 *
 * ## Por qué existe
 *
 * Un turno tarda de 3 a 15 s. Con una sola leyenda («Consultando tus datos…») el chat se veía
 * «tieso», en palabras del usuario (2026-09-13): no se notaba que Maya estuviera haciendo algo
 * distinto en cada momento, y a quien espera se le hace eterno. Ahora cada herramienta que el
 * agente de verdad usa aparece como un paso («Revisando tus créditos», «Calculando tu crédito
 * pagando $6,000.00 al mes») que se marca al terminar.
 *
 * ## Qué NO hace
 *
 * No inventa pasos ni los adelanta: cada uno nace de una línea `estado` con `paso` que el
 * servidor manda cuando el modelo pide la herramienta (`agente.ts`), y se marca cuando llega su
 * línea `tool` con el mismo `id`. Y no es técnico: nada de nombres de tools, pasos del modelo ni
 * milisegundos; eso sigue en el stream y en `banorte.corridas`.
 */

export type EstadoDePaso = "en-curso" | "listo" | "fallo";
export type PasoEnVivo = { id: string; texto: string; estado: EstadoDePaso };

const PESOS = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** Lo que hace cada herramienta, en palabras de quien usa la app. */
const TEXTO_DE_TOOL: Record<string, string> = {
  panorama_inicial: "Revisando tu panorama financiero",
  consultar_perfil: "Revisando tu perfil",
  consultar_tarjeta: "Revisando tu tarjeta",
  consultar_movimientos: "Buscando tus movimientos",
  simular_reestructura: "Calculando planes para tu tarjeta",
  consultar_plan: "Revisando tu plan de pagos",
  comparar_periodos: "Comparando tu gasto mes contra mes",
  analizar_gasto: "Analizando en qué se te va el dinero",
  simular_gasto_externo: "Sumando ese gasto a tu mes",
  proyectar_ahorro: "Proyectando tu ahorro",
  analizar_ahorro: "Revisando tus ahorros e inversiones",
  detectar_fugas: "Buscando cargos que se te escapan",
  diagnostico_salud_financiera: "Midiendo tu salud financiera",
  consultar_creditos: "Revisando tus créditos",
  simular_pago_credito: "Calculando cómo quedaría tu crédito",
  consultar_inversiones: "Revisando tus inversiones",
  consultar_catalogo_inversiones: "Buscando opciones para invertir",
  consultar_sugerencias_inversion: "Buscando opciones para invertir",
  consultar_historico_inversion: "Revisando cómo le ha ido a tu inversión",
  simular_rebalanceo: "Calculando cómo equilibrar tu portafolio",
  orientar_consulta_no_valida: "Buscando la mejor forma de ayudarte",
  ver_componentes: "Eligiendo cómo mostrártelo",
  pintar_pantalla: "Armando tu pantalla",
  ajustar_pantalla: "Actualizando tu tarjeta",
  responder: "Preparando tu respuesta",
};

/** `ejecutar_decision` dice qué decisión se está aplicando. */
const TEXTO_DE_ACCION: Record<string, string> = {
  aplicar_plan_pago: "Aplicando tu plan de pagos",
  crear_apartado: "Creando tu apartado",
  cancelar_suscripcion: "Cancelando la suscripción",
  crear_tope_gasto: "Creando tu tope de gasto",
  rebalancear_portafolio: "Rebalanceando tu portafolio",
  confirmar_rebalanceo: "Rebalanceando tu portafolio",
  programar_abono_capital: "Programando tu pago",
  registrar_gasto_externo: "Guardando tu gasto",
};

/**
 * El texto de un paso. Si la persona pidió un dato concreto (una mensualidad, un plazo, un mes),
 * se dice: «Calculando tu crédito pagando $6,000.00 al mes» se siente atendido; «Calculando…»
 * a secas, no. Solo se usan ENTRADAS que la persona dio, nunca resultados.
 */
export function textoDelPaso(tool: string, argumentos?: unknown): string {
  const a = objeto(argumentos) ?? {};
  switch (tool) {
    case "ejecutar_decision":
      return TEXTO_DE_ACCION[String(a.accion)] ?? "Aplicando tu decisión";
    case "simular_pago_credito":
      if (typeof a.mensualidadCentavos === "number") return `Calculando tu crédito pagando ${pesos(a.mensualidadCentavos)} al mes`;
      if (typeof a.plazoMeses === "number") return `Calculando tu crédito para liquidarlo en ${meses(a.plazoMeses)}`;
      break;
    case "simular_reestructura": {
      const plazos = Array.isArray(a.plazosMeses) ? a.plazosMeses.filter((p): p is number => typeof p === "number") : [];
      if (plazos.length === 1) return `Calculando tu plan a ${meses(plazos[0]!)}`;
      break;
    }
    case "simular_gasto_externo": {
      const gasto = objeto(Array.isArray(a.gastos) ? a.gastos[0] : undefined);
      if (gasto && typeof gasto.nombre === "string" && typeof gasto.montoCentavos === "number") {
        return `Sumando «${gasto.nombre}» (${pesos(gasto.montoCentavos)}) a tu mes`;
      }
      break;
    }
    case "proyectar_ahorro":
      if (typeof a.fechaObjetivo === "string") {
        const mes = MESES[Number(a.fechaObjetivo.slice(5, 7)) - 1];
        if (mes) return `Proyectando tu meta para ${mes}`;
      }
      if (typeof a.montoObjetivoCentavos === "number") return `Proyectando tu meta de ${pesos(a.montoObjetivoCentavos)}`;
      break;
    case "analizar_gasto":
    case "comparar_periodos":
      if (typeof a.periodo === "string") {
        const mes = MESES[Number(a.periodo.slice(5, 7)) - 1];
        if (mes) return `Analizando tu gasto de ${mes}`;
      }
      break;
  }
  return TEXTO_DE_TOOL[tool] ?? "Revisando tus datos";
}

/**
 * Los pasos del turno a partir de sus líneas, en orden.
 *
 * Siempre abre con «Entendiendo lo que necesitas», que se marca en cuanto llega el primer
 * paso real. Un paso de consulta se marca con su línea `tool`; uno de cierre (armar la
 * pantalla, actualizar la tarjeta) con la primera línea de interfaz o de texto. Un reintento
 * con el mismo texto no repite el renglón: vuelve a ponerlo en curso.
 */
export function pasosDelTurno(lineas: readonly LineaStream[]): PasoEnVivo[] {
  const pasos: PasoEnVivo[] = [{ id: "entender", texto: "Entendiendo lo que necesitas", estado: "en-curso" }];
  const porId = new Map<string, PasoEnVivo>();
  const marcar = (paso: PasoEnVivo, estado: EstadoDePaso) => {
    paso.estado = estado;
  };

  for (const linea of lineas) {
    if (linea.tipo === "estado" && linea.paso) {
      marcar(pasos[0]!, "listo");
      const repetido = pasos.find((p) => p.texto === linea.paso!.texto && p.id !== "entender");
      if (repetido) {
        marcar(repetido, "en-curso");
        porId.set(linea.paso.id, repetido);
        continue;
      }
      const nuevo: PasoEnVivo = { id: linea.paso.id, texto: linea.paso.texto, estado: "en-curso" };
      pasos.push(nuevo);
      porId.set(linea.paso.id, nuevo);
    } else if (linea.tipo === "tool" && linea.id) {
      const paso = porId.get(linea.id);
      if (paso) marcar(paso, linea.ok ? "listo" : "fallo");
    } else if (linea.tipo === "a2ui" || linea.tipo === "texto" || linea.tipo === "fin") {
      marcar(pasos[0]!, "listo");
      // Lo que queda en curso ya entregó: la interfaz o la respuesta están llegando.
      for (const paso of pasos) if (paso.estado === "en-curso") marcar(paso, "listo");
    }
  }
  // Entre una herramienta y la siguiente el modelo esta decidiendo y nada esta en curso: sin este
  // renglon el panel se ve detenido justo cuando mas se espera. Existe solo mientras tanto; en
  // cuanto llega el siguiente paso real, desaparece (no queda palomeado como si hubiera sido algo).
  const entregando = lineas.some((l) => l.tipo === "a2ui" || l.tipo === "texto" || l.tipo === "fin");
  if (!entregando && !pasos.some((p) => p.estado === "en-curso")) {
    pasos.push({ id: "siguiente", texto: "Pensando cómo mostrártelo", estado: "en-curso" });
  }
  return pasos;
}

function pesos(centavos: number): string {
  return PESOS.format(centavos / 100);
}

function meses(n: number): string {
  return n === 1 ? "1 mes" : `${n} meses`;
}

function objeto(valor: unknown): Record<string, unknown> | undefined {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor) ? (valor as Record<string, unknown>) : undefined;
}
