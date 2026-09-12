import { z } from "zod";

/**
 * Lo que TODO componente del catalogo comparte. Si algo se repite en dos
 * schemas, sube aqui (skill `ui-generativa`).
 */

/** Cuantas columnas de la rejilla bento ocupa la tarjeta. */
export const Ancho = z
  .enum(["normal", "amplio"])
  .default("normal")
  .describe("normal = 1 columna; amplio = 2. Tablas y graficas piden amplio");

/**
 * Props que el agente puede poner en cualquier componente.
 * `razon` es la linea "¿Por que veo esto?" y es OBLIGATORIA: es la evidencia de
 * que el agente decidio, no adivino (rubrica, adaptabilidad).
 */
export const PropsBase = z.object({
  ancho: Ancho,
  razon: z
    .string()
    .min(10)
    .describe("Una frase en segunda persona que explica por que esta pantalla y no otra"),
});

/** Una tarjeta heroe por pantalla, nunca dos (skill `diseno-banorte`). */
export const Heroe = z
  .boolean()
  .default(false)
  .describe("Tarjeta de heroe con el degradado de marca. Solo una por superficie");

/** Todo monto viaja en centavos y se formatea al pintar con `formatearMonto`. */
export const Centavos = z.number().int().describe("Monto en centavos de peso");

/**
 * Una prop enlazable acepta el valor literal o `{ path }` al data model.
 * El renderer la resuelve antes de que llegue al componente.
 */
export function enlazable<T extends z.ZodTypeAny>(schema: T) {
  return z.union([schema, z.object({ path: z.string() })]);
}

/** Formato de dinero del proyecto. Los centavos NO se formatean en el servidor. */
export function formatearMonto(centavos: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(centavos / 100);
}

/** Porcentajes del dominio (CAT, uso del limite) llegan como fraccion: 0.621 -> 62.1%. */
export function formatearPorcentaje(fraccion: number): string {
  return new Intl.NumberFormat("es-MX", { style: "percent", maximumFractionDigits: 1 }).format(fraccion);
}

/** Cada entrada del catalogo: lo que el agente lee para decidir. */
export type EntradaCatalogo = {
  nombre: string;
  /** En una frase: que intencion del usuario hace que el agente elija esto. */
  cuandoUsarlo: string;
  schema: z.ZodTypeAny;
  /** Acciones que el componente puede devolver (contrato agente-cliente). */
  acciones?: string[];
};
