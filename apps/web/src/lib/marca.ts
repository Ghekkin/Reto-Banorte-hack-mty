/**
 * El nombre del producto vive AQUI y en ningun otro lado.
 *
 * La razon es practica: el encuadre sobre Maya es una apuesta (ADR 0009). Si en el
 * stand piden no usar el nombre, se cambia esta constante y la app entera cambia, en vez
 * de perseguir el string por veinte componentes.
 */
export const MARCA = {
  nombre: "Maya",
  /** Una linea, la que iria bajo el logo. */
  tagline: "Tu banco, en una conversación",
  contexto: "Reto Banorte · Hack Monterrey 2026",
  /** Las tres piezas no negociables del reto, para el pie del sidebar. */
  piezas: "LLM · MCP · A2UI",
  /**
   * Obligatorio en el pie de la app y en el README (skill `diseno-banorte`, seccion
   * Marca). No es opcional ni se acorta: es lo que separa un homenaje de una
   * suplantacion.
   */
  aviso:
    "Prototipo de hackathon. Concepto sobre Maya, la asistente virtual de Banorte. " +
    "No es un producto oficial ni está afiliado a Grupo Financiero Banorte.",
} as const;
