#!/usr/bin/env node
/**
 * Ensayo de los widgets vivos contra el servidor REAL, con el modelo real
 * (docs/como-funciona/widgets-vivos.md).
 *
 *   node scripts/probar-widgets.mjs                      # contra localhost:3000
 *   node scripts/probar-widgets.mjs http://localhost:3001
 *
 * El servidor tiene que correr con FEATURE_WIDGETS_VIVOS=1. Las pruebas de
 * `apps/web/src/lib/widgets` usan un modelo simulado y garantizan las reglas; esto mide lo
 * que solo se sabe llamando al modelo: que ENTIENDA la pregunta y cierre con la salida
 * correcta, en un tiempo que se sienta vivo.
 *
 * Para cada persona:
 *   1. rearma su portada (`POST /api/inicio?forzar=1`) y exige que traiga procedencias;
 *   2. hace una pregunta general y una sobre la tarjeta que cambio (con foco);
 *   3. revisa en cada respuesta las invariantes que Banorte pidio:
 *      - nunca `createSurface` ni `updateDataModel`: no se rearma el dashboard;
 *      - solo cambia la tarjeta de la respuesta (y la conclusion si sus cifras la siguen);
 *      - si una tarjeta cambio, el AUDITOR re-consulto el MCP y dio 0 diferencias;
 *      - la respuesta llega en menos de LIMITE_MS.
 * Al final rearma las portadas otra vez, para no dejar a nadie con el Inicio del ensayo.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const LIMITE_MS = 15_000;

if (!process.env.MCP_TOKEN && existsSync(join(RAIZ, ".env"))) {
  for (const linea of readFileSync(join(RAIZ, ".env"), "utf8").split("\n")) {
    const m = linea.match(/^\s*MCP_TOKEN\s*=\s*(.*)\s*$/);
    if (m) process.env.MCP_TOKEN = m[1].replace(/^["']|["']$/g, "");
  }
}

/** Una pregunta de seguimiento que cualquier fuente de ese componente sabe contestar. */
const SEGUIMIENTO = {
  GastoPorCategoria: "¿y en julio?",
  DetalleCategoria: "¿y en julio?",
  PlanDePago: "¿y si lo difiero a 24 meses?",
  ProyeccionPagoCredito: "¿cuánto pago de puros intereses?",
  RendimientoHistorico: "muéstrame las últimas 26 semanas",
  AlertaFugas: "¿cuánto es al año?",
  TermometroSaludFinanciera: "¿cómo estaba en junio?",
  SimuladorMeta: "¿y si aparto 3,000 al mes?",
  MetaActiva: "¿cuándo llego a mi meta?",
  DistribucionPortafolio: "¿cuánto se desvió de mi modelo?",
  OrdenRebalanceo: "¿por qué vender primero?",
  ResumenTarjeta: "¿cuánto debo en total?",
};

const CASOS = [
  { usuario: "usr_beto", nombre: "Beto", pregunta: "¿en qué se me fue el dinero el mes pasado?" },
  { usuario: "usr_ana", nombre: "Ana", pregunta: "¿cuánto me falta para terminar de pagar mi crédito?" },
  { usuario: "usr_carmen", nombre: "Carmen", pregunta: "¿cómo le ha ido a NAFTRAC en las últimas 12 semanas?" },
];

const autorizacion = process.env.MCP_TOKEN ? { authorization: `Bearer ${process.env.MCP_TOKEN}` } : {};
let fallos = 0;
const filas = [];

async function rearmar(usuario) {
  const r = await fetch(`${BASE}/api/inicio?usuario=${usuario}&forzar=1`, { method: "POST", headers: autorizacion });
  const cuerpo = await r.json();
  return cuerpo.pantalla;
}

/** Manda la pregunta y junta las lineas del stream. */
async function preguntar(usuario, pregunta, foco) {
  const inicio = Date.now();
  const r = await fetch(`${BASE}/api/inicio/widget`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: `maya_usuario=${usuario}` },
    body: JSON.stringify({ pregunta, foco }),
  });
  if (!r.ok) return { error: `${r.status}: ${await r.text()}`, ms: Date.now() - inicio, lineas: [] };
  const lineas = (await r.text())
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
  return { lineas, ms: Date.now() - inicio, fin: lineas.find((l) => l.tipo === "fin"), error: lineas.find((l) => l.tipo === "error")?.mensaje };
}

/** Las invariantes de una respuesta. Devuelve los problemas; vacio es que paso. */
function revisar(respuesta, ids) {
  const problemas = [];
  if (respuesta.error) return [`error: ${respuesta.error}`];
  const { fin, lineas } = respuesta;
  if (!fin) return ["el stream no trajo `fin`"];
  const a2ui = lineas.filter((l) => l.tipo === "a2ui").map((l) => l.mensaje);
  if (a2ui.some((m) => "createSurface" in m || "updateDataModel" in m)) problemas.push("rearmo la superficie (createSurface/updateDataModel)");
  const cambiadas = a2ui.flatMap((m) => m.updateComponents?.components ?? []).map((c) => c.id);
  const permitidas = new Set([fin.widgetId, "conclusion"]);
  const ajenas = cambiadas.filter((id) => !permitidas.has(id));
  if (ajenas.length) problemas.push(`cambio tarjetas que no eran la de la respuesta: ${ajenas.join(", ")}`);
  if (fin.cierre === "responder" && cambiadas.length) problemas.push("responder no deberia cambiar tarjetas");
  if (fin.cierre !== "responder") {
    if (!ids.has(fin.widgetId)) problemas.push(`widgetId desconocido: ${fin.widgetId}`);
    if (!fin.auditoria || fin.auditoria.revisados < 1) problemas.push("sin auditoria contra el MCP");
    else if (fin.auditoria.diferencias.length) problemas.push(`AUDITORIA con ${fin.auditoria.diferencias.length} diferencia(s)`);
    if (!fin.guardada) problemas.push("el ajuste no se guardo");
  }
  if (respuesta.ms > LIMITE_MS) problemas.push(`tardo ${(respuesta.ms / 1000).toFixed(1)} s (tope ${LIMITE_MS / 1000} s)`);
  return problemas;
}

for (const caso of CASOS) {
  const pantalla = await rearmar(caso.usuario);
  const ids = new Set(Object.keys(pantalla?.procedencias ?? {}));
  if (ids.size === 0) {
    fallos++;
    filas.push([caso.nombre, "portada", "—", "—", "sin procedencias: ¿el servidor corre con FEATURE_WIDGETS_VIVOS=1?"]);
    continue;
  }

  const general = await preguntar(caso.usuario, caso.pregunta);
  const p1 = revisar(general, ids);
  filas.push([caso.nombre, `«${caso.pregunta}»`, general.fin ? `${general.fin.cierre} ${general.fin.widgetId ?? ""}` : "—", `${(general.ms / 1000).toFixed(1)} s`, p1.join("; ") || "ok"]);
  if (p1.length) fallos++;

  const foco = general.fin?.widgetId;
  const componente = foco ? (general.lineas.find((l) => l.tipo === "a2ui")?.mensaje.updateComponents?.components[0]?.component ??
    pantalla.mensajes.flatMap((m) => m.updateComponents?.components ?? []).find((c) => c.id === foco)?.component) : undefined;
  const seguimiento = componente && SEGUIMIENTO[componente];
  if (foco && seguimiento) {
    const conFoco = await preguntar(caso.usuario, seguimiento, foco);
    const p2 = revisar(conFoco, ids);
    if (conFoco.fin && conFoco.fin.widgetId && conFoco.fin.widgetId !== foco) p2.push(`con foco en ${foco} cambio ${conFoco.fin.widgetId}`);
    filas.push([caso.nombre, `foco ${foco} · «${seguimiento}»`, conFoco.fin ? `${conFoco.fin.cierre} ${conFoco.fin.widgetId ?? ""}` : "—", `${(conFoco.ms / 1000).toFixed(1)} s`, p2.join("; ") || "ok"]);
    if (p2.length) fallos++;
  }
}

console.log("\nWidgets vivos contra", BASE, "\n");
for (const [persona, pregunta, cierre, ms, resultado] of filas) {
  console.log(`${resultado === "ok" ? "✓" : "✗"} ${persona.padEnd(7)} ${pregunta}\n    ${cierre.padEnd(22)} ${ms.padStart(7)}  ${resultado}`);
}

if (!process.argv.includes("--sin-restaurar")) {
  for (const caso of CASOS) await rearmar(caso.usuario);
  console.log("\nPortadas rearmadas para dejar Inicio como estaba.");
}

console.log(fallos ? `\n${fallos} con problemas.` : "\nTodo en orden.");
process.exit(fallos ? 1 : 0);
