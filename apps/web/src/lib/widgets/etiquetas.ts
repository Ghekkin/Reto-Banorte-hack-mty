/**
 * Como se nombra cada tarjeta ante la persona, y que se le sugiere preguntarle.
 *
 * Es de CLIENTE a proposito (sin imports de servidor): lo usa la barra de Inicio para el
 * chip "Sobre: Tu plan de pago" y para las preguntas listas en cuanto alguien toca
 * "Preguntar sobre esto". Las sugerencias son preguntas que alguna fuente SI sabe contestar
 * cambiando la tarjeta: invitan a la interaccion que el sistema resuelve bien.
 */

type Descripcion = { etiqueta: string; sugerencias: string[] };

const POR_COMPONENTE: Record<string, Descripcion> = {
  ResumenTarjeta: { etiqueta: "Tu tarjeta", sugerencias: ["¿Qué pasa si solo pago el mínimo?", "¿Cuánto debo en total?"] },
  PlanDePago: { etiqueta: "Plan de pago", sugerencias: ["¿Y si lo difiero a 24 meses?", "Cotízame también a 6 meses", "¿Qué significa el CAT?"] },
  ProyeccionPagoCredito: { etiqueta: "Tu crédito", sugerencias: ["¿Cuánto pago de puros intereses?", "¿Cuándo termino de pagarlo?"] },
  GastoPorCategoria: { etiqueta: "Gasto por categoría", sugerencias: ["¿Y el mes anterior?", "Ordénalo por lo que más subió", "Solo las 5 más grandes"] },
  DetalleCategoria: { etiqueta: "Detalle de categoría", sugerencias: ["¿Y el mes anterior?", "¿Cuáles se repiten cada mes?"] },
  AlertaFugas: { etiqueta: "Suscripciones", sugerencias: ["¿Cuáles llevan 3 meses sin uso?", "¿Cuánto es al año?"] },
  TermometroSaludFinanciera: { etiqueta: "Salud financiera", sugerencias: ["¿Cómo estaba hace dos meses?", "¿Qué me baja el puntaje?"] },
  SimuladorMeta: { etiqueta: "Meta de ahorro", sugerencias: ["¿Y si aparto 3,000 al mes?", "¿Y si fuera quincenal?"] },
  MetaActiva: { etiqueta: "Tu meta", sugerencias: ["¿Cuándo llego a mi meta?", "¿Cuánto me falta?"] },
  DistribucionPortafolio: { etiqueta: "Portafolio", sugerencias: ["¿Cuánto se desvió de mi modelo?", "Muéstrame las órdenes para rebalancear"] },
  OrdenRebalanceo: { etiqueta: "Rebalanceo", sugerencias: ["¿Por qué vender primero?", "Regresa a mi portafolio"] },
  RendimientoHistorico: { etiqueta: "Rendimiento", sugerencias: ["Muéstrame las últimas 26 semanas", "¿Y en un año?"] },
};

export function etiquetaDe(componente: string): string {
  return POR_COMPONENTE[componente]?.etiqueta ?? "Esta tarjeta";
}

export function sugerenciasDe(componente: string): string[] {
  return POR_COMPONENTE[componente]?.sugerencias ?? [];
}
