#!/usr/bin/env node
/**
 * Ensayo automatico del guion completo contra el agente REAL (con llave y MCP arriba).
 *
 *   node scripts/probar-guion.mjs                      # contra localhost:3000
 *   node scripts/probar-guion.mjs https://mi-dominio   # contra lo publicado
 *
 * Por que existe: las 300 pruebas del repo usan un modelo simulado. Prueban el cableado
 * —que un mensaje valide, que el reducer lo aplique, que el lienzo pinte— y no pueden
 * probar lo unico que el jurado va a ver: que el MODELO, con estos datos y este prompt,
 * entregue la pantalla correcta antes de quedarse sin pasos. Eso solo se sabe llamandolo.
 *
 * Cada caso es un turno de una conversacion de verdad: el historial se acumula y la
 * superficie anterior viaja en la peticion, igual que lo hace el navegador. Un turno que
 * no pinta, que pinta el componente equivocado o que tarda de mas, sale marcado.
 */
const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const LIMITE_MS = 15000;

/**
 * El guion, turno por turno. `componentes` son los que TIENEN que aparecer;
 * `prohibidos` los que serian un error de criterio del modelo (no de cableado).
 */
const CASOS = [
  {
    nombre: "Beto · deuda: intencion -> interfaz",
    usuario: "usr_beto",
    texto: "Quiero pagar menos intereses de mi tarjeta",
    componentes: ["ResumenTarjeta", "PlanDePago"],
    prohibidos: ["Confirmacion"],
  },
  {
    nombre: "Beto · el ciclo se cierra (accion real)",
    usuario: "usr_beto",
    accion: {
      name: "aplicar_plan_pago",
      sourceComponentId: "plan",
      context: { tarjetaId: "tar_beto_clasica", plazoMeses: 18 },
    },
    componentes: ["Confirmacion", "ResumenTarjeta"],
    // Cualquiera de las dos vale: el MCP expone la tool directa y la compuesta. Lo que
    // importa es que el estado cambie de verdad, y eso lo mira `dataModelContiene`.
    toolsAlternativas: ["ejecutar_decision", "aplicar_plan_pago"],
    dataModelContiene: "planActivo",
  },
  {
    nombre: "Beto · el plan ya aplicado se puede consultar",
    usuario: "usr_beto",
    texto: "¿Como va mi plan de pago?",
    componentes: [],
    prohibidos: [],
  },
  {
    nombre: "Beto · gasto por categoria",
    usuario: "usr_beto",
    texto: "¿Y en que se me esta yendo el dinero?",
    componentes: ["GastoPorCategoria"],
  },
  {
    nombre: "Beto · detalle de una categoria",
    usuario: "usr_beto",
    texto: "¿Que movimientos hubo en retiros de efectivo?",
    componentes: ["DetalleCategoria"],
  },
  {
    // El caso que fallaba el 2026-09-12: el modelo llamaba `proyectar_ahorro` seis veces
    // y se quedaba sin pasos sin pintar nada.
    nombre: "Beto · simulador de ahorro (el que se ciclaba)",
    usuario: "usr_beto",
    texto: "simula mi fondo de emergencia",
    componentes: ["SimuladorMeta"],
    nuevaConversacion: true,
  },
  {
    nombre: "Ana · MISMA pregunta, otra interfaz (adaptabilidad)",
    usuario: "usr_ana",
    texto: "Quiero pagar menos intereses de mi tarjeta",
    prohibidos: ["PlanDePago"],
    nuevaConversacion: true,
  },
  {
    nombre: "Ana · quiere empezar a ahorrar",
    usuario: "usr_ana",
    texto: "Quiero empezar a ahorrar",
    componentes: ["SimuladorMeta"],
  },
  {
    nombre: "Carmen · ¿como estoy?",
    usuario: "usr_carmen",
    texto: "¿Como estoy?",
    componentes: [],
    nuevaConversacion: true,
  },
];

const id = () => `c_ensayo_${Math.random().toString(36).slice(2, 10)}`;

/** Lee el stream JSONL y lo resume: que paso en el turno. */
async function turno({ usuario, conversacionId, mensajes, accion, superficie }) {
  const inicio = Date.now();
  const cuerpo = {
    usuarioId: usuario,
    conversacionId,
    mensajes,
    superficie,
    ...(accion
      ? {
          accion: {
            ...accion,
            surfaceId: "principal",
            timestamp: new Date().toISOString(),
            context: { ...accion.context, idempotencyKey: `${conversacionId}:${Date.now()}` },
          },
        }
      : {}),
  };

  const respuesta = await fetch(`${BASE}/api/agente`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  if (!respuesta.ok) {
    return { ok: false, errores: [`HTTP ${respuesta.status}: ${(await respuesta.text()).slice(0, 200)}`] };
  }

  const texto = await respuesta.text();
  const lineas = texto
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));

  const componentes = [];
  const crudos = [];
  let dataModel = {};
  const tools = [];
  const errores = [];
  let cierre = "";
  let razon = "";
  let fin = null;

  for (const l of lineas) {
    if (l.tipo === "a2ui") {
      const m = l.mensaje;
      if (m.updateComponents) {
        for (const c of m.updateComponents.components) {
          componentes.push(c.component);
          crudos.push(c);
        }
      }
      if (m.updateDataModel && (m.updateDataModel.path ?? "/") === "/") dataModel = m.updateDataModel.value ?? {};
    } else if (l.tipo === "tool") {
      tools.push(l.nombre + (l.ok ? "" : "!"));
    } else if (l.tipo === "error") {
      errores.push(`${l.codigo}: ${l.mensaje}`);
    } else if (l.tipo === "texto") {
      cierre = l.valor;
    } else if (l.tipo === "razon") {
      razon = l.valor;
    } else if (l.tipo === "fin") {
      fin = l;
    }
  }

  return { ok: true, componentes, crudos, dataModel, tools, errores, cierre, razon, fin, ms: Date.now() - inicio };
}

const verde = (t) => `\x1b[32m${t}\x1b[0m`;
const rojo = (t) => `\x1b[31m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;

let fallos = 0;
let conversacionId = id();
let mensajes = [];
let superficie;

console.log(`\nEnsayo del guion contra ${BASE}\n${"=".repeat(60)}`);

for (const caso of CASOS) {
  if (caso.nuevaConversacion) {
    conversacionId = id();
    mensajes = [];
    superficie = undefined;
  }

  if (caso.texto) mensajes = [...mensajes, { rol: "usuario", texto: caso.texto }];
  if (caso.accion) {
    mensajes = [...mensajes, { rol: "accion", texto: `${caso.accion.name} ${JSON.stringify(caso.accion.context)}` }];
  }

  const r = await turno({ usuario: caso.usuario, conversacionId, mensajes, accion: caso.accion, superficie });

  const problemas = [];
  const avisos = [];
  if (!r.ok) {
    problemas.push(...r.errores);
  } else {
    if (r.componentes.length === 0) problemas.push("no pinto ninguna pantalla");
    for (const esperado of caso.componentes ?? []) {
      if (!r.componentes.includes(esperado)) problemas.push(`falta ${esperado}`);
    }
    for (const prohibido of caso.prohibidos ?? []) {
      if (r.componentes.includes(prohibido)) problemas.push(`uso ${prohibido}, que no aplica aqui`);
    }
    for (const tool of caso.tools ?? []) {
      if (!r.tools.some((t) => t.startsWith(tool))) problemas.push(`no llamo ${tool}`);
    }
    if (caso.toolsAlternativas && !caso.toolsAlternativas.some((tool) => r.tools.some((t) => t.startsWith(tool)))) {
      problemas.push(`no llamo ninguna de: ${caso.toolsAlternativas.join(" / ")}`);
    }
    // El dato puede venir enlazado (data model) o literal en las props: las dos formas
    // son A2UI valido, y lo que se esta comprobando es que la pantalla refleje el cambio.
    if (caso.dataModelContiene) {
      const enPantalla = JSON.stringify(r.dataModel) + JSON.stringify(r.crudos);
      if (!enPantalla.includes(caso.dataModelContiene)) {
        problemas.push(`la pantalla no refleja "${caso.dataModelContiene}": la accion no se ve`);
      }
    }
    // Un error del que el turno se recupero (reintento del contrato) no es un fallo: es
    // un aviso con su costo en segundos. Solo cuenta como fallo si no hubo pantalla.
    for (const e of r.errores) {
      if (r.componentes.length > 0 && e.startsWith("a2ui:")) avisos.push(e);
      else problemas.push(e);
    }
    // Una tool que fallo y de la que el turno se recupero es un aviso con su costo en
    // segundos, no un fallo: la pantalla salio. Si NO salio, ya lo marco el bloque de
    // arriba. Lo que si es fallo es que la misma tool falle y nadie la corrija.
    const conError = r.tools.filter((t) => t.endsWith("!"));
    if (conError.length > 0) {
      const mensaje = `tool con error (reintentada): ${[...new Set(conError)].join(", ")}`;
      if (r.componentes.length > 0) avisos.push(mensaje);
      else problemas.push(mensaje);
    }
    if (!r.cierre) problemas.push("no dijo nada (texto vacio)");
    if (r.ms > LIMITE_MS) problemas.push(`tardo ${(r.ms / 1000).toFixed(1)} s (limite ${LIMITE_MS / 1000} s)`);
    // Una tool repetida con los mismos datos es el sintoma del bucle de pasos.
    const repetidas = r.tools.filter((t, i) => r.tools.indexOf(t) !== i);
    if (repetidas.length > 1) problemas.push(`tools repetidas: ${[...new Set(repetidas)].join(", ")}`);

    // El historial se acumula para el siguiente turno, como en el navegador.
    if (r.cierre) mensajes = [...mensajes, { rol: "agente", texto: r.cierre }];
    superficie = { surfaceId: "principal", componentes: [...new Set(r.componentes)], dataModel: r.dataModel };
  }

  const marca = problemas.length === 0 ? verde("PASA") : rojo("FALLA");
  if (problemas.length > 0) fallos++;
  const pasos = r.fin ? `${r.fin.pasos} pasos` : "?";
  const cache = r.fin?.cacheLeido ? `, cache ${r.fin.cacheLeido} tok` : "";
  console.log(`\n${marca}  ${caso.nombre}`);
  console.log(gris(`      ${(r.ms / 1000).toFixed(1)} s · ${pasos}${cache}`));
  if (r.componentes?.length) console.log(gris(`      pantalla: ${[...new Set(r.componentes)].join(" + ")}`));
  if (r.tools?.length) console.log(gris(`      tools: ${r.tools.join(" · ")}`));
  if (r.cierre) console.log(gris(`      dice: "${r.cierre}"`));
  for (const p of problemas) console.log(rojo(`      ✗ ${p}`));
  for (const a of avisos) console.log(`      \x1b[33m⚠ se recupero de: ${a}\x1b[0m`);
}

console.log(`\n${"=".repeat(60)}`);
console.log(fallos === 0 ? verde(`Los ${CASOS.length} pasos del guion pasan.`) : rojo(`${fallos} de ${CASOS.length} fallan.`));
process.exit(fallos === 0 ? 0 : 1);
