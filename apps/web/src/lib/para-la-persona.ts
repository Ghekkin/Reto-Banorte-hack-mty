import type { Accion } from "@maya/a2ui";

/**
 * Lo que la persona lee cuando el hilo tiene que contar algo que por dentro es tecnico.
 *
 * Hasta el 2026-09-13 el hilo decia `Tocaste: aplicar_plan_pago {"plazoMeses":12,…}` y los
 * errores salian tal cual del servidor (`⚠ no pude conectar al MCP en http://…`). Eso le
 * sirve al equipo, no a quien usa la app: el detalle se queda en el stream y en la consola.
 */

/** Las acciones del catalogo (`acciones` de cada `schema.ts`), en palabras. */
const ETIQUETAS: Record<string, string> = {
  aplicar_plan_pago: "Aplicar el plan de pago",
  cancelar_suscripcion: "Cancelar la suscripción",
  confirmar_rebalanceo: "Confirmar el rebalanceo",
  consultar_movimientos: "Ver mis movimientos",
  crear_apartado: "Crear el apartado",
  elegir_escenario: "Elegir este escenario",
  elegir_estrategia: "Elegir esta estrategia",
  elegir_instrumento: "Elegir este instrumento",
  elegir_plan_inversion: "Elegir este plan de inversión",
  orden_rebalanceo: "Ver la orden de rebalanceo",
  rebalancear_portafolio: "Rebalancear mi portafolio",
  simular_meta: "Simular una meta",
  simular_plan: "Simular un plan",
  ver_categoria: "Ver la categoría",
  ver_como_mejorar: "Ver cómo mejorar",
  ver_detalle_instrumento: "Ver el detalle",
  ver_orden_rebalanceo: "Ver la orden de rebalanceo",
};

/**
 * El toque en una frase corta. Si el `context` trae el dato que la persona reconoce (la
 * pregunta que toco, la suscripcion, la categoria), se usa ese; si la accion no esta en
 * la tabla, su nombre sin guiones bajos. Nunca el JSON del `context`.
 */
export function accionLegible(accion: Pick<Accion, "name" | "context">): string {
  const contexto = accion.context ?? {};
  const texto = (clave: string) => (typeof contexto[clave] === "string" ? (contexto[clave] as string).trim() : "");

  if (texto("pregunta")) return texto("pregunta");
  if (accion.name === "cancelar_suscripcion" && texto("concepto")) return `Cancelar ${texto("concepto")}`;
  if (texto("categoria")) return `Ver ${texto("categoria")}`;

  const etiqueta = ETIQUETAS[accion.name];
  if (etiqueta) return etiqueta;
  const palabras = accion.name.replaceAll("_", " ").trim();
  return palabras ? palabras.charAt(0).toUpperCase() + palabras.slice(1) : "Elegiste una opción";
}

/** Lo que se dice cuando el turno fallo y el servidor no mando ninguna frase propia. */
export const AVISO_DE_FALLO = "Algo falló de mi lado. Intenta de nuevo.";
