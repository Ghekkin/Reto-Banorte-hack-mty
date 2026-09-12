import { config } from "./config";

/**
 * Lo unico que sabe cual es el modelo. El resto del codigo pide "el modelo" y
 * no le importa cual (ADR 0005: Gemini 3.8 Flash principal, Claude de respaldo).
 *
 * PENDIENTE (rol `contrato`): devolver aqui el `LanguageModel` del AI SDK —
 * `google("gemini-3.8-flash")` o `anthropic("claude-sonnet-5")` — y el nivel de
 * pensamiento segun `GEMINI_THINKING`.
 */
export type ProveedorModelo = "gemini" | "claude";

export function proveedorActivo(): ProveedorModelo {
  return config.modelo === "claude" ? "claude" : "gemini";
}

export function hayLlave(): boolean {
  return proveedorActivo() === "claude" ? Boolean(config.llaveAnthropic) : Boolean(config.llaveGoogle);
}
