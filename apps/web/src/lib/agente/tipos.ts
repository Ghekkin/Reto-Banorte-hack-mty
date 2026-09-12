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
