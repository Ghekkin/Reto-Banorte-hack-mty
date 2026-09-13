import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import { config as configAgente } from "@/lib/agente/config";
import { MODELOS, opcionesDelProveedor } from "@/lib/agente/modelo";
import { configInicio } from "./config";

/**
 * El modelo que arma la portada. Es OTRO que el de la conversacion (`lib/agente/modelo.ts`)
 * porque el trabajo es distinto: aqui no hay pregunta que interpretar, los datos ya
 * vienen reunidos y lo que se pide es elegir 3 o 4 tarjetas del catalogo y enlazar
 * numeros. Un modelo "lite" lo hace por una fraccion del costo, y corre solo, cada
 * cierto tiempo, para tres personas: el costo por corrida importa mas que el ingenio.
 *
 * `MODELO_INICIO` acepta cualquier id: `gemini-3.5-flash-lite` (default),
 * `gemini-3.8-flash` (el de la conversacion), `claude-haiku-4-5`… La llave es la misma
 * del agente segun el proveedor.
 */
export function proveedorDelInicio(): "gemini" | "claude" {
  return configInicio.modelo.startsWith("claude") ? "claude" : "gemini";
}

export function hayLlaveDelInicio(): boolean {
  return proveedorDelInicio() === "claude" ? Boolean(configAgente.llaveAnthropic) : Boolean(configAgente.llaveGoogle);
}

export function modeloDelInicio(): LanguageModel {
  return modeloPorId(configInicio.modelo);
}

/** Cualquier id de modelo: `claude-*` con la llave de Anthropic, lo demas con la de Google. */
export function modeloPorId(id: string): LanguageModel {
  return id.startsWith("claude") ? anthropic(id) : google(id);
}

/**
 * Pensamiento minimo en Gemini para los widgets vivos: elegir una fuente y un parametro no
 * necesita razonar. Medido el 2026-09-13 con `gemini-3.5-flash-lite`, cierra la tool en
 * 0.5-0.9 s cuando el proveedor responde normal, contra 7-9 s con el nivel por omision.
 */
export function opcionesDeWidgets(id: string): { google?: { thinkingConfig: { thinkingLevel: string } } } {
  return id.startsWith("gemini") ? { google: { thinkingConfig: { thinkingLevel: "minimal" } } } : {};
}

/**
 * El nivel de pensamiento (`GEMINI_THINKING`) solo se manda cuando el modelo es el
 * mismo de la conversacion: un "lite" puede no aceptar `thinkingLevel`, y un 400 por
 * una opcion que no le aplica dejaria a la portada sin armar.
 */
export function opcionesDelInicio(): ReturnType<typeof opcionesDelProveedor> {
  return configInicio.modelo === MODELOS.gemini ? opcionesDelProveedor() : {};
}
