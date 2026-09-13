#!/usr/bin/env node
/**
 * Ensayo del Inicio personalizado contra el servidor REAL (con llave, base y MCP arriba).
 *
 *   node scripts/probar-inicio.mjs                      # contra localhost:3000
 *   node scripts/probar-inicio.mjs https://mi-dominio   # contra lo publicado
 *
 * Por que existe: las pruebas de `apps/web/src/lib/inicio` usan un modelo simulado y
 * prueban el cableado. Lo unico que el jurado va a ver —que el modelo CHICO, con estos
 * datos, elija las tarjetas correctas para cada persona— solo se sabe llamandolo.
 *
 * Para cada usuario demo: rearma la portada a la fuerza (`POST /api/inicio?forzar=1`,
 * con el `MCP_TOKEN` del .env), y revisa lo que una portada tiene que cumplir: exactamente 3
 * tarjetas (`Conclusion` incluida; el tope lo hace cumplir `armarMensajes`), exactamente una
 * heroe, ninguna `Confirmacion`, al menos una de las tarjetas
 * que resuelven la situacion de esa persona, texto con consejo y menos de 20 s.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const LIMITE_MS = 20_000;
const DE_LAYOUT = new Set(["Column", "Row", "Text", "Divider"]);

// El token va en el .env de la raiz; en el VPS, en /opt/reto/.env (MCP_TOKEN del servidor).
if (!process.env.MCP_TOKEN && existsSync(join(RAIZ, ".env"))) {
  for (const linea of readFileSync(join(RAIZ, ".env"), "utf8").split("\n")) {
    const m = linea.match(/^\s*MCP_TOKEN\s*=\s*(.*)\s*$/);
    if (m) process.env.MCP_TOKEN = m[1].replace(/^["']|["']$/g, "");
  }
}

/** Lo que cada persona tiene que ver en su portada: al menos una de estas. */
const CASOS = [
  { usuario: "usr_beto", nombre: "Beto · tarjeta al limite y en mora", esperadas: ["ResumenTarjeta", "PlanDePago"] },
  { usuario: "usr_ana", nombre: "Ana · sin tarjeta, con credito a plazo", esperadas: ["ProyeccionPagoCredito", "SimuladorMeta"] },
  {
    usuario: "usr_carmen",
    nombre: "Carmen · patrimonial con portafolio",
    esperadas: ["DistribucionPortafolio", "RendimientoHistorico", "RiesgoRendimiento", "OrdenRebalanceo", "ProyeccionCrecimiento"],
  },
];

let fallos = 0;
const filas = [];

for (const caso of CASOS) {
  const inicio = Date.now();
  let cuerpo;
  try {
    const respuesta = await fetch(`${BASE}/api/inicio?usuario=${caso.usuario}&forzar=1`, {
      method: "POST",
      headers: process.env.MCP_TOKEN ? { authorization: `Bearer ${process.env.MCP_TOKEN}` } : {},
    });
    cuerpo = await respuesta.json();
    if (!respuesta.ok && respuesta.status !== 502) {
      throw new Error(`${respuesta.status}: ${JSON.stringify(cuerpo)}`);
    }
  } catch (error) {
    fallos++;
    console.log(`✗ ${caso.nombre}: no se pudo pedir la portada: ${error.message}`);
    continue;
  }
  const ms = Date.now() - inicio;

  const problemas = [];
  if (cuerpo.hecho !== "generada") {
    problemas.push(`no se genero (${cuerpo.hecho}${cuerpo.motivo ? `: ${cuerpo.motivo}` : ""})`);
  }
  const pantalla = cuerpo.pantalla;
  const componentes = pantalla?.componentes ?? [];
  const tarjetas = componentes.filter((c) => !DE_LAYOUT.has(c));
  const actualizacion = pantalla?.mensajes?.find((m) => "updateComponents" in m);
  const heroes = (actualizacion?.updateComponents.components ?? []).filter((c) => c.heroe === true).length;

  if (cuerpo.hecho === "generada") {
    if (tarjetas.length !== 3) problemas.push(`${tarjetas.length} tarjetas (se esperan exactamente 3, Conclusion incluida)`);
    if (!componentes.includes("Conclusion")) problemas.push("sin Conclusion: la portada queda sin veredicto");
    if (heroes !== 1) problemas.push(`${heroes} heroes (se espera exactamente 1)`);
    if (componentes.includes("Confirmacion")) problemas.push("trae Confirmacion sin accion");
    if (!caso.esperadas.some((e) => componentes.includes(e))) {
      problemas.push(`ninguna de ${caso.esperadas.join("/")}`);
    }
    if (!pantalla?.texto || pantalla.texto.length < 30) problemas.push("texto vacio o demasiado corto");
    if (!pantalla?.razon) problemas.push("sin razon");
    if (ms > LIMITE_MS) problemas.push(`${(ms / 1000).toFixed(1)} s (limite ${LIMITE_MS / 1000} s)`);
  }

  const marca = problemas.length ? "✗" : "✓";
  if (problemas.length) fallos++;
  console.log(`${marca} ${caso.nombre} · ${(ms / 1000).toFixed(1)} s`);
  console.log(`    tarjetas: ${tarjetas.join(", ") || "(ninguna)"}`);
  if (pantalla?.texto) console.log(`    texto: ${pantalla.texto}`);
  if (pantalla?.tools?.length) console.log(`    tools: ${pantalla.tools.join(", ")}`);
  if (pantalla) {
    console.log(
      `    modelo: ${pantalla.modelo} · entrada ${pantalla.entradaTokens ?? "?"} · cache ${pantalla.cacheTokens ?? "?"} · salida ${pantalla.salidaTokens ?? "?"} · ${(pantalla.ms / 1000).toFixed(1)} s`,
    );
  }
  for (const p of problemas) console.log(`    ! ${p}`);
  filas.push({ usuario: caso.usuario, ok: problemas.length === 0, ms, tarjetas: tarjetas.length, tokens: pantalla?.entradaTokens ?? null });
}

console.log("");
console.log(`${filas.filter((f) => f.ok).length} de ${CASOS.length} portadas bien armadas${fallos ? `, ${fallos} con problemas` : ""}.`);
process.exit(fallos ? 1 : 0);
