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

/** Con que periodicidad se aporta a una meta. Mismo enum que `proyectar_ahorro`. */
export const Frecuencia = z.enum(["mensual", "quincenal"]);
export type Frecuencia = z.infer<typeof Frecuencia>;

/** `2026-10-05` -> `5 de octubre`. Las fechas viajan en ISO corto y se formatean al pintar. */
export function formatearFecha(iso: string | undefined, conAnio = false): string {
  if (!iso) return "";
  const [anio, mes, dia] = iso.split("-").map(Number);
  if (!anio || !mes || !dia) return iso;
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", ...(conAnio ? { year: "numeric" } : {}) }).format(
    new Date(anio, mes - 1, dia),
  );
}

/** `2026-08` -> `agosto de 2026`. Para los encabezados de gasto por periodo. */
export function formatearPeriodo(periodo: string | undefined): string {
  if (!periodo) return "";
  const [anio, mes] = periodo.split("-").map(Number);
  if (!anio || !mes) return periodo;
  return new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(new Date(anio, mes - 1, 1));
}

/**
 * Suma meses a una fecha ISO conservando el dia (y cayendo al ultimo dia del mes si no
 * existe). La misma regla que `apps/mcp/src/dominio/tiempo.ts`: el simulador la usa para
 * mover la fecha estimada mientras la persona arrastra el slider, sin ir al agente.
 */
export function sumarMeses(fechaISO: string, meses: number): string {
  const [anio, mes, dia] = fechaISO.split("-").map(Number) as [number, number, number];
  const total = anio * 12 + (mes - 1) + meses;
  const anioDestino = Math.floor(total / 12);
  const mesDestino = (((total % 12) + 12) % 12) + 1;
  const ultimo = new Date(Date.UTC(anioDestino, mesDestino, 0)).getUTCDate();
  return `${anioDestino}-${String(mesDestino).padStart(2, "0")}-${String(Math.min(dia, ultimo)).padStart(2, "0")}`;
}

/** La fecha de hoy en ISO corto, en la zona del navegador. */
export function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
