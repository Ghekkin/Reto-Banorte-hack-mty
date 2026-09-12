import { z } from "zod";

/**
 * Piezas que se repiten en varias tools. Si un campo aparece en dos schemas,
 * vive aqui. Dominio en espanol siempre (skill `cambiar-schema`).
 */

/** Todo monto viaja en centavos, entero. Se formatea solo al pintar. */
export const Centavos = z.number().int().describe("Monto en centavos de peso, entero");

/** ids estables de los datos sinteticos: usr_ana, tar_beto_clasica, cta_… */
export const IdUsuario = z.string().regex(/^usr_[a-z0-9_]+$/, "id de usuario invalido");
export const IdTarjeta = z.string().regex(/^tar_[a-z0-9_]+$/, "id de tarjeta invalido");
export const IdCuenta = z.string().regex(/^cta_[a-z0-9_]+$/, "id de cuenta invalido");

/** Fecha de negocio en ISO corto. Las horas del repo son de Monterrey (UTC-6). */
export const FechaISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "usa AAAA-MM-DD");

/**
 * Toda tool de accion la recibe y la respeta: dos llamadas con la misma llave
 * producen un solo cambio de estado (contrato agente-cliente, skill `tool-mcp`).
 */
export const LlaveIdempotencia = z
  .string()
  .min(8)
  .describe("conversacionId + ':' + timestamp; la tool no aplica dos veces la misma");

/** Envoltura comun de las tools de accion. */
export const ResultadoAccion = z.object({
  aplicado: z.boolean(),
  yaEstaba: z.boolean().default(false).describe("true si la llave de idempotencia ya se habia usado"),
  mensaje: z.string(),
});
export type ResultadoAccion = z.infer<typeof ResultadoAccion>;
