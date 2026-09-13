/**
 * Qué dos tarjetas lleva el Inicio de una cuenta. Lo decide el CÓDIGO, con los datos del
 * prefetch; el modelo solo escribe la conclusión y los parámetros de esas dos.
 *
 * ## Por qué no lo decide el modelo
 *
 * La escalera ya estaba escrita en el encargo (`encargoDeWidgets`) y el modelo chico se la
 * saltaba: el 2026-09-13 a Ana —crédito personal al 27.9 % y sin tarjeta— le pintó el
 * rebalanceo de su portafolio, y su titular decía «tu portafolio requiere…». Los jueces ven la
 * demo en el celular y su primera impresión es esta portada, así que el usuario pidió que las
 * tarjetas «verdaderamente vayan con esa cuenta». Una regla que ya se sabía escribir no se le
 * pide a un modelo.
 *
 * ## La regla (el orden ES la urgencia)
 *
 * 1. Tarjeta de crédito al límite (uso ≥ 50 %) o con mora, sin plan → `tarjeta` y `plan_de_pago`.
 *    Con el plan ya aplicado → `tarjeta` y `gasto_del_mes`. (Beto)
 * 2. Deuda cara a plazo con saldo: crédito personal o de nómina, o tasa ≥ 20 % → `credito` y
 *    `simulador_meta`. Una hipoteca al 10.9 % no es deuda cara. (Ana)
 * 3. Portafolio desviado de su modelo ≥ 5 puntos → `portafolio` y `rebalanceo`; sin desviación,
 *    `portafolio` y `salud`. (Carmen)
 * 4. Lo demás → `gasto_del_mes` y `salud`.
 *
 * Decidido con el usuario el 2026-09-13 05:00 (`docs/como-funciona/inicio-personalizado.md`).
 */

export type EleccionDePortada = {
  /** Las fuentes, en orden: la primera va de héroe. */
  fuentes: [string, string];
  /** El id de tarjeta que se usa para cada fuente, para que la conclusión las cite. */
  ids: [string, string];
  motivo: string;
};

const USO_ALTO = 0.5;
const TASA_CARA = 0.2;
const DESVIACION_ALTA = 0.05;
const TIPOS_CAROS = new Set(["personal", "nomina"]);

/** El id corto de la tarjeta de cada fuente: el que el modelo cita en la conclusión. */
export const ID_DE_FUENTE: Record<string, string> = {
  tarjeta: "tarjeta",
  plan_de_pago: "plan",
  credito: "credito",
  simulador_meta: "meta",
  portafolio: "portafolio",
  rebalanceo: "rebalanceo",
  gasto_del_mes: "gasto",
  salud: "salud",
};

export function widgetsPorCuenta(datos: Record<string, unknown>): EleccionDePortada {
  const elegir = (a: string, b: string, motivo: string): EleccionDePortada => ({
    fuentes: [a, b],
    ids: [ID_DE_FUENTE[a] ?? a, ID_DE_FUENTE[b] ?? b],
    motivo,
  });

  const tarjeta = objeto(objeto(datos.panorama_inicial)?.tarjeta);
  if (tarjeta && (numero(tarjeta.usoDelLimite) >= USO_ALTO || numero(tarjeta.diasMora) > 0)) {
    return tarjeta.tienePlanActivo === true
      ? elegir("tarjeta", "gasto_del_mes", "su tarjeta ya tiene plan: la tarjeta y en qué se le va el dinero")
      : elegir("tarjeta", "plan_de_pago", "tarjeta al límite o con mora: la tarjeta y su plan de pago");
  }

  const creditos = lista(objeto(datos.consultar_creditos)?.creditos).map(objeto);
  const deudaCara = creditos.some(
    (c) => c && numero(c.saldoInsolutoCentavos) > 0 && (TIPOS_CAROS.has(String(c.tipo)) || numero(c.tasaAnual) >= TASA_CARA),
  );
  if (deudaCara) return elegir("credito", "simulador_meta", "deuda cara a plazo: el crédito y su meta de ahorro");

  const portafolio = objeto(objeto(objeto(datos.analizar_ahorro)?.inversion)?.portafolio);
  if (portafolio) {
    return numero(portafolio.desviacionModeloPct) >= DESVIACION_ALTA
      ? elegir("portafolio", "rebalanceo", "portafolio desviado de su modelo: el portafolio y sus órdenes")
      : elegir("portafolio", "salud", "portafolio en su modelo: el portafolio y su salud financiera");
  }

  return elegir("gasto_del_mes", "salud", "sin deuda urgente ni portafolio: su gasto y su salud financiera");
}

function objeto(valor: unknown): Record<string, unknown> | undefined {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor) ? (valor as Record<string, unknown>) : undefined;
}

function lista(valor: unknown): unknown[] {
  return Array.isArray(valor) ? valor : [];
}

function numero(valor: unknown): number {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}
