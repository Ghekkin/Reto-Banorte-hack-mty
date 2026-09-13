#!/usr/bin/env node
/**
 * Aplica `scripts/voz/agente-elevenlabs.json` (system prompt, first_message, y la tool
 * `consultar_maya`) al agente de ElevenLabs por su API. Fuente unica de esta config:
 * docs/como-funciona/premio-elevenlabs.md — el JSON, no el dashboard.
 *
 *   pnpm voz:configurar         # aplica de verdad
 *   pnpm voz:configurar --dry   # solo imprime que mandaria, sin tocar nada
 *
 * Lee ELEVENLABS_API_KEY y ELEVENLABS_AGENT_ID del entorno o de .env (ya existen en
 * .env.example, sin variables nuevas). Idempotente: correrlo dos veces deja el mismo
 * resultado. NUNCA toca la voz (TTS) ni el modelo LLM elegidos a mano en el dashboard —
 * esos viven en `conversation_config.tts`/`conversation_config.agent.prompt.llm`, fuera
 * de lo que este script escribe.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.elevenlabs.io/v1/convai";
const DRY = process.argv.includes("--dry");

function cargarEnv() {
  const archivo = join(RAIZ, ".env");
  if (!existsSync(archivo)) return;
  for (const linea of readFileSync(archivo, "utf8").split("\n")) {
    const m = linea.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
cargarEnv();

const llave = process.env.ELEVENLABS_API_KEY;
const agenteId = process.env.ELEVENLABS_AGENT_ID;
if (!llave || !agenteId) {
  console.error("faltan ELEVENLABS_API_KEY o ELEVENLABS_AGENT_ID (ponlas en .env)");
  process.exit(1);
}

const config = JSON.parse(readFileSync(join(RAIZ, "scripts", "voz", "agente-elevenlabs.json"), "utf8"));
const nombreTool = config.tool_config.name;
const cabeceras = { "xi-api-key": llave, "content-type": "application/json" };

async function api(metodo, ruta, cuerpo) {
  const r = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers: cabeceras,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const texto = await r.text();
  const datos = texto ? JSON.parse(texto) : {};
  if (!r.ok) throw new Error(`${metodo} ${ruta} -> ${r.status}: ${texto}`);
  return datos;
}

/** Todas las tools del workspace, paginando `has_more`/`next_cursor`. */
async function todasLasTools() {
  const todas = [];
  let cursor;
  for (let pagina = 0; pagina < 20; pagina++) {
    const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const { tools, has_more, next_cursor } = await api("GET", `/tools${qs}`);
    todas.push(...tools);
    if (!has_more) break;
    cursor = next_cursor;
  }
  return todas;
}

console.log(`Buscando la tool "${nombreTool}" en el workspace…`);
const existente = (await todasLasTools()).find((t) => t.tool_config?.name === nombreTool);

let toolId;
if (existente) {
  console.log(`Ya existe (id ${existente.id}).${DRY ? " --dry: se actualizaria con:" : ""}`);
  toolId = existente.id;
  if (DRY) {
    console.log(JSON.stringify(config.tool_config, null, 2));
  } else {
    await api("PATCH", `/tools/${toolId}`, { tool_config: config.tool_config });
    console.log("Tool actualizada.");
  }
} else if (DRY) {
  console.log("No existe. --dry: se crearia con:");
  console.log(JSON.stringify(config.tool_config, null, 2));
  toolId = null;
} else {
  const creada = await api("POST", "/tools", { tool_config: config.tool_config });
  toolId = creada.id;
  console.log(`Tool creada: ${toolId}`);
}

console.log(`Leyendo el agente ${agenteId}…`);
const agente = await api("GET", `/agents/${agenteId}`);
const agenteActual = agente.conversation_config?.agent ?? {};
const promptActual = agenteActual.prompt ?? {};
const idsActuales = promptActual.tool_ids ?? [];
const toolIdsNuevos = toolId && !idsActuales.includes(toolId) ? [...idsActuales, toolId] : idsActuales;
// Una tool inline vieja con el mismo nombre (el campo deprecated `tools`) confundiria al
// agente con dos definiciones de "consultar_maya" a la vez: la sacamos.
const toolsInlineFiltradas = (promptActual.tools ?? []).filter(
  (t) => t?.name !== nombreTool && t?.tool_config?.name !== nombreTool,
);

// Se manda el objeto `agent` COMPLETO (todo lo que ya tenia + los cambios), no un
// subconjunto: asi, sea que el PATCH reemplace `agent` entero o lo mezcle por campo, nada
// de lo que ya estaba configurado (voz, idioma, variables dinamicas…) se pierde.
const parche = {
  conversation_config: {
    agent: {
      ...agenteActual,
      first_message: config.agent.first_message,
      prompt: {
        ...promptActual,
        prompt: config.agent.prompt,
        tool_ids: toolIdsNuevos,
        tools: toolsInlineFiltradas,
      },
    },
  },
};

if (DRY) {
  console.log("--dry: se aplicaria este PATCH al agente (sin tocar voz ni LLM):");
  console.log(JSON.stringify(parche, null, 2));
  console.log("\n--dry: nada se aplico de verdad.");
  process.exit(0);
}

await api("PATCH", `/agents/${agenteId}`, parche);
console.log(`Agente actualizado: first_message vacio, prompt aplicado, tool_ids incluye "${nombreTool}" (${toolId}).`);
