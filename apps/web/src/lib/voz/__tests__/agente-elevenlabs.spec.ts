import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { TIMEOUT_TURNO_MS } from "@/lib/agente/tipos";

/**
 * `scripts/voz/agente-elevenlabs.json` es la fuente unica de la config del agente de
 * ElevenLabs (`pnpm voz:configurar`, docs/como-funciona/premio-elevenlabs.md). Esta
 * prueba amarra las dos reglas que hacen que la voz no suene "desconectada" del MCP:
 * silencio mientras la tool corre, y un timeout que alcanza para un turno de verdad.
 */
const RAIZ_REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "..", "..");
const config = JSON.parse(readFileSync(join(RAIZ_REPO, "scripts", "voz", "agente-elevenlabs.json"), "utf8"));

describe("scripts/voz/agente-elevenlabs.json", () => {
  it("el nombre de la tool es consultar_maya (coincide con la clave de herramientasVoz)", () => {
    expect(config.tool_config.name).toBe("consultar_maya");
  });

  it("no habla antes de llamar la tool: pre_tool_speech apagado", () => {
    expect(config.tool_config.pre_tool_speech).toBe("off");
  });

  it("no saluda sola: first_message vacio, espera a que la persona hable", () => {
    expect(config.agent.first_message).toBe("");
  });

  it("el timeout de la tool alcanza para un turno completo del agente", () => {
    // Si esto falla, alguien subio TIMEOUT_TURNO_MS sin subir response_timeout_secs: un
    // turno lento (pero valido) terminaria en "tardo mucho, intenta mas tarde" con la
    // pantalla ya armada, que es justo el bug que esto existe para evitar.
    expect(config.tool_config.response_timeout_secs).toBeGreaterThan(TIMEOUT_TURNO_MS / 1000);
  });

  it("el limite de la API de ElevenLabs es 120 s: el timeout no se puede pasar de ahi", () => {
    expect(config.tool_config.response_timeout_secs).toBeLessThanOrEqual(120);
  });

  it("espera respuesta de la tool para poder leerla en voz alta", () => {
    expect(config.tool_config.expects_response).toBe(true);
  });

  it("el parametro pregunta es string, requerido, y lo decide el LLM (no un valor fijo)", () => {
    expect(config.tool_config.parameters.required).toContain("pregunta");
    const pregunta = config.tool_config.parameters.properties.pregunta;
    expect(pregunta.type).toBe("string");
    // "LLM Prompt" en el dashboard = una property con `description` y sin
    // `constant_value`/`dynamic_variable`.
    expect(pregunta.description).toBeTruthy();
    expect(pregunta.constant_value).toBeUndefined();
    expect(pregunta.dynamic_variable).toBeUndefined();
  });
});
