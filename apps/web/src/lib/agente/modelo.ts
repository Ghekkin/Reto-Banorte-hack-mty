import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import { config } from "./config";

/**
 * Lo unico que sabe cual es el modelo. El resto del codigo pide "el modelo" y no le
 * importa cual (ADR 0005: Gemini 3.1 Flash Lite principal, Claude Sonnet 5 de respaldo,
 * se cambia con `MODELO=claude` sin tocar codigo).
 *
 * El id de Gemini se puede sobreescribir con `MODELO_GEMINI` porque la cuota gratuita es por
 * modelo: cuando se agota la de `gemini-3.8-flash`, el ensayo del guion se corre en
 * `gemini-3.5-flash-lite` en vez de quedarse sin verificar.
 */
export type ProveedorModelo = "gemini" | "claude";

export const MODELOS: Record<ProveedorModelo, string> = {
  gemini: "gemini-3.1-flash-lite",
  claude: "claude-sonnet-5",
};

export function proveedorActivo(): ProveedorModelo {
  return config.modelo === "claude" ? "claude" : "gemini";
}

export function hayLlave(): boolean {
  return proveedorActivo() === "claude" ? Boolean(config.llaveAnthropic) : Boolean(config.llaveGoogle);
}

/** El `LanguageModel` del AI SDK. Las llaves las leen los proveedores del entorno. */
export function modelo(): LanguageModel {
  const proveedor = proveedorActivo();
  return proveedor === "claude" ? anthropic(MODELOS.claude) : google(MODELOS.gemini);
}

const NIVELES = new Set(["minimal", "low", "medium", "high"]);

/**
 * Opciones propias del proveedor. En Gemini, el nivel de pensamiento: `low` por
 * latencia (ADR 0005, punto 3). Un valor invalido en `.env` se ignora en vez de
 * tumbar el turno: la demo no se cae por un typo.
 */
export function opcionesDelProveedor(): { google?: { thinkingConfig: { thinkingLevel: string } } } {
  if (proveedorActivo() !== "gemini") return {};
  const nivel = config.pensamientoGemini;
  if (!NIVELES.has(nivel)) return {};
  return { google: { thinkingConfig: { thinkingLevel: nivel } } };
}

/** Para el log y el panel de transparencia: que modelo contesto este turno. */
export function nombreDelModelo(): string {
  return MODELOS[proveedorActivo()];
}
