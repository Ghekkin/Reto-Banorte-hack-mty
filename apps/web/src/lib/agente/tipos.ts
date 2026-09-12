import { z } from "zod";
import type { MensajeA2UI } from "@maya/a2ui";

/**
 * El contrato agente <-> cliente, en tipos. La fuente es
 * `docs/arquitectura/contrato-agente-cliente.md`: si cambia uno, cambia el otro
 * en el mismo commit (skill `cambiar-schema`).
 */

export type RolMensaje = "usuario" | "agente" | "accion";

export type MensajeHistorial = {
  rol: RolMensaje;
  /** Solo TEXTO: el historial nunca lleva JSON A2UI. */
  texto: string;
};

export type AccionEntrante = {
  name: string;
  surfaceId: string;
  sourceComponentId: string;
  timestamp: string;
  context: Record<string, unknown>;
};

export type PeticionAgente = {
  usuarioId: string;
  conversacionId: string;
  mensajes: MensajeHistorial[];
  accion?: AccionEntrante;
  superficie?: {
    surfaceId: string;
    componentes: string[];
    dataModel: Record<string, unknown>;
  };
};

/**
 * La peticion, validada. Es lo que `route.ts` aplica antes de abrir el stream: un cuerpo
 * mal formado devuelve 400 con el detalle en vez de morir a media respuesta. Los topes
 * son de sentido comun para un prompt (40 mensajes, 4 000 caracteres cada uno) y frenan
 * a quien quiera meterle un libro al modelo por la API.
 *
 * `usuarioId` lleva el patron de los ids sinteticos: es lo unico del cuerpo que se
 * interpola en el prompt como texto.
 */
export const esquemaPeticion = z
  .object({
    usuarioId: z.string().regex(/^usr_[a-z0-9_]+$/, "usuarioId invalido"),
    conversacionId: z.string().min(1).max(64),
    mensajes: z
      .array(z.object({ rol: z.enum(["usuario", "agente", "accion"]), texto: z.string().max(4000) }))
      .max(40)
      .default([]),
    accion: z
      .object({
        name: z.string().min(1).max(64),
        surfaceId: z.string().min(1).max(64),
        sourceComponentId: z.string().min(1).max(128),
        timestamp: z.string().max(64),
        context: z.record(z.string(), z.unknown()).default({}),
      })
      .optional(),
    superficie: z
      .object({
        surfaceId: z.string().min(1).max(64),
        componentes: z.array(z.string().max(64)).max(200).default([]),
        dataModel: z.record(z.string(), z.unknown()).default({}),
      })
      .optional(),
  })
  .refine((p) => p.accion !== undefined || p.mensajes.at(-1)?.rol === "usuario", {
    message: "el turno lo dispara un mensaje de la persona (mensajes[ultimo].rol === 'usuario') o una accion",
  });

/** Una linea del stream JSONL de respuesta. El cliente ignora lo que no conoce. */
export type LineaStream =
  | { tipo: "estado"; valor: "pensando" | "consultando" | "pintando" }
  | { tipo: "tool"; nombre: string; ms: number; ok: boolean }
  | { tipo: "a2ui"; mensaje: MensajeA2UI }
  | { tipo: "texto"; valor: string }
  | { tipo: "razon"; valor: string }
  | { tipo: "sugerencias"; valores: string[] }
  | { tipo: "error"; codigo: "tool" | "a2ui" | "modelo" | "timeout"; mensaje: string }
  | { tipo: "fin"; pasos: number; ms: number };

export const TIMEOUT_TURNO_MS = 30_000;
