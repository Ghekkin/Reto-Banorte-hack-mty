#!/usr/bin/env node
// Lee lo que quedo grabado en la base: corridas del modelo, chat y registros.
// docs/como-funciona/corridas-en-db.md
//
//   pnpm corridas                      las ultimas 20 corridas (turnos, portadas y preguntas a tarjetas)
//   pnpm corridas --errores            solo las que no terminaron en ok
//   pnpm corridas --usuario usr_ana    las de una persona
//   pnpm corridas cor_xxx              una corrida completa: modelo, tools, pasos, llamadas, lineas, chat, logs del MCP
//   pnpm corridas cor_xxx --json       la misma, cruda, para jq
//   pnpm corridas --chat c_xxx         una conversacion, mensaje por mensaje
//   pnpm corridas --chats              las ultimas conversaciones
//   pnpm corridas --registros          los ultimos 40 registros (web, agente, inicio, mcp)
//   pnpm corridas --prompt <hash>      el system prompt o las definiciones de tools de ese hash
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
if (!process.env.DATABASE_URL && existsSync(join(RAIZ, '.env'))) {
  for (const linea of readFileSync(join(RAIZ, '.env'), 'utf8').split('\n')) {
    const m = linea.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
if (!process.env.DATABASE_URL) {
  console.error('falta DATABASE_URL (ponla en .env o en el entorno)');
  process.exit(1);
}

const args = process.argv.slice(2);
const opcion = (nombre) => {
  const i = args.indexOf(nombre);
  return i === -1 ? undefined : (args[i + 1] ?? true);
};
const bandera = (nombre) => args.includes(nombre);
const idCorrida = args.find((a) => a.startsWith('cor_'));

const gris = (t) => `\x1b[90m${t}\x1b[0m`;
const verde = (t) => `\x1b[32m${t}\x1b[0m`;
const rojo = (t) => `\x1b[31m${t}\x1b[0m`;
const amarillo = (t) => `\x1b[33m${t}\x1b[0m`;
const negrita = (t) => `\x1b[1m${t}\x1b[0m`;

const hora = (v) =>
  v ? new Date(v).toLocaleString('es-MX', { timeZone: 'America/Monterrey', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '—';
const corto = (v, n = 160) => {
  const t = typeof v === 'string' ? v : JSON.stringify(v);
  if (t === undefined || t === null) return '—';
  return t.length > n ? `${t.slice(0, n)}… (${t.length} c)` : t;
};
const num = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('es-MX'));
const pintarEstado = (e) => (e === 'ok' ? verde(e) : e === 'corriendo' ? amarillo(e) : rojo(e));

const cliente = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
await cliente.connect();
const q = async (sql, valores = []) => (await cliente.query(sql, valores)).rows;

try {
  if (opcion('--prompt')) {
    const [fila] = await q('select tipo, bytes, creado_en, contenido from banorte.prompts where hash = $1', [opcion('--prompt')]);
    if (!fila) console.log('no existe ese hash');
    else {
      console.log(gris(`${fila.tipo} · ${num(fila.bytes)} bytes · ${hora(fila.creado_en)}`));
      console.log(fila.tipo === 'tools' ? JSON.stringify(JSON.parse(fila.contenido), null, 2) : fila.contenido);
    }
  } else if (bandera('--registros')) {
    const filas = await q(
      'select creado_en, fuente, nivel, evento, corrida_id, usuario_id, datos from banorte.registros order by id desc limit 40',
    );
    for (const r of filas.reverse()) {
      const nivel = r.nivel === 'warn' || r.nivel === 'error' ? rojo(r.nivel) : gris(r.nivel);
      console.log(`${gris(hora(r.creado_en))} ${r.fuente.padEnd(6)} ${nivel.padEnd(14)} ${negrita(r.evento)} ${gris(r.usuario_id ?? '')} ${gris(r.corrida_id ?? '')}`);
      console.log(`    ${gris(corto(r.datos, 220))}`);
    }
  } else if (bandera('--chats')) {
    const filas = await q('select id, usuario_id, turnos, creada_en, actualizada_en from banorte.conversaciones order by actualizada_en desc limit 20');
    for (const c of filas) console.log(`${gris(hora(c.actualizada_en))}  ${negrita(c.id)}  ${c.usuario_id}  ${c.turnos} turno(s)`);
  } else if (opcion('--chat')) {
    const filas = await q(
      'select m.creado_en, m.rol, m.texto, m.datos, m.corrida_id, c.estado, c.ms from banorte.mensajes_chat m left join banorte.corridas c on c.id = m.corrida_id where m.conversacion_id = $1 order by m.id',
      [opcion('--chat')],
    );
    if (!filas.length) console.log('sin mensajes para esa conversacion');
    for (const m of filas) {
      const quien = m.rol === 'agente' ? verde('Maya') : m.rol === 'usuario' ? negrita('Persona') : amarillo(m.rol);
      console.log(`${gris(hora(m.creado_en))} ${quien}: ${m.texto ?? ''}`);
      if (m.rol === 'agente') {
        const componentes = (m.datos?.a2ui ?? []).flatMap((x) => x.updateComponents?.components?.map((c) => c.component) ?? []);
        if (componentes.length) console.log(`    ${gris('pantalla: ' + componentes.join(' + '))}`);
        for (const e of m.datos?.errores ?? []) console.log(`    ${rojo(`${e.codigo}: ${corto(e.mensaje, 200)}`)}`);
        console.log(`    ${gris(`${m.corrida_id} · ${m.estado ?? '?'} · ${num(m.ms)} ms`)}`);
      } else if (m.rol === 'accion') {
        console.log(`    ${gris(corto(m.datos?.accion, 200))}`);
      }
    }
  } else if (idCorrida) {
    const [c] = await q('select * from banorte.corridas where id = $1', [idCorrida]);
    if (!c) {
      console.log('no existe esa corrida');
    } else if (bandera('--json')) {
      const pasos = await q('select * from banorte.corrida_pasos where corrida_id = $1 order by paso', [idCorrida]);
      const tools = await q('select * from banorte.corrida_tools where corrida_id = $1 order by id', [idCorrida]);
      const registros = await q('select * from banorte.registros where corrida_id = $1 order by id', [idCorrida]);
      const chat = await q('select * from banorte.mensajes_chat where corrida_id = $1 order by id', [idCorrida]);
      console.log(JSON.stringify({ corrida: c, pasos, tools, registros, chat }, null, 2));
    } else {
      console.log(negrita(`${c.id}  ${c.tipo}  ${pintarEstado(c.estado)}`));
      console.log(`  cuando     ${hora(c.iniciada_en)} → ${hora(c.terminada_en)}  (${num(c.ms)} ms)`);
      console.log(`  quien      ${c.usuario_id ?? '—'}  conversacion ${c.conversacion_id ?? '—'}  motivo ${c.motivo ?? '—'}`);
      console.log(`  modelo     ${c.proveedor ?? '?'} / ${negrita(c.modelo ?? '?')}  opciones ${corto(c.opciones_proveedor)}`);
      console.log(`  config     ${corto(c.config, 300)}`);
      console.log(`  version    ${c.version_app ?? '—'}`);
      console.log(`  prompt     ${c.prompt_sistema_hash ?? '—'}   tools ${c.tools_hash ?? '—'}   ${gris('(pnpm corridas --prompt <hash>)')}`);
      console.log(`  resultado  cierre ${c.cierre ?? '—'} · ${num(c.pasos)} paso(s) · entrada ${num(c.tokens_entrada)} · cache ${num(c.tokens_cache)} · salida ${num(c.tokens_salida)} · razonamiento ${num(c.tokens_razonamiento)}`);
      if (c.error) console.log(`  error      ${rojo(c.error)}`);
      if (c.texto) console.log(`  texto      ${corto(c.texto, 300)}`);

      const ofrecidas = c.tools_ofrecidas ?? [];
      console.log(`\n${negrita(`Tools ofrecidas (${ofrecidas.length})`)}`);
      console.log(`  ${ofrecidas.map((t) => (t.origen === 'mcp' ? t.nombre : `${t.nombre}${gris(`[${t.origen}]`)}`)).join(', ')}`);

      console.log(`\n${negrita('Peticion')}`);
      console.log(`  ${gris(corto(c.peticion, 600))}`);
      const contexto = (c.mensajes_modelo ?? []).filter((m) => m.role !== 'system');
      console.log(`\n${negrita(`Mensajes al modelo (sin system: ${contexto.length})`)}`);
      for (const m of contexto) console.log(`  ${m.role}: ${gris(corto(typeof m.content === 'string' ? m.content : m.content, 500))}`);

      const pasos = await q('select * from banorte.corrida_pasos where corrida_id = $1 order by paso', [idCorrida]);
      console.log(`\n${negrita(`Pasos (${pasos.length})`)}`);
      for (const p of pasos) {
        const activas = Array.isArray(p.tools_activas) ? `${p.tools_activas.length} tools activas` : 'tools: todas';
        console.log(`  ${negrita(`#${p.paso}`)} ${p.finish_reason ?? '?'} · ${activas} · choice ${p.tool_choice ?? '—'} · entrada ${num(p.tokens_entrada)} · cache ${num(p.tokens_cache)} · salida ${num(p.tokens_salida)} · ${gris(p.modelo_respuesta ?? '')}`);
        for (const l of p.llamadas ?? []) console.log(`     → ${l.nombre} ${gris(corto(l.argumentos, 200))}`);
        if (p.texto) console.log(`     texto: ${gris(corto(p.texto, 200))}`);
        if ((p.advertencias ?? []).length) console.log(`     ${amarillo('advertencias: ' + corto(p.advertencias, 200))}`);
      }

      const tools = await q('select * from banorte.corrida_tools where corrida_id = $1 order by id', [idCorrida]);
      console.log(`\n${negrita(`Llamadas a tools (${tools.length})`)}`);
      for (const t of tools) {
        const marca = t.ok ? verde('ok') : rojo('FALLO');
        console.log(`  ${t.paso === -1 ? gris('pre') : `#${t.paso} `} ${negrita(t.nombre)} ${gris(`[${t.origen}]`)} ${marca} ${num(t.ms)} ms`);
        console.log(`       args ${gris(corto(t.argumentos, 240))}`);
        if (t.error) console.log(`       ${rojo(t.error)}`);
        console.log(`       sale ${gris(corto(t.resultado, 240))}`);
      }

      const lineas = c.lineas ?? [];
      console.log(`\n${negrita(`Stream hacia el navegador (${lineas.length} lineas)`)}`);
      for (const l of lineas) {
        if (l.tipo === 'a2ui') {
          const comps = l.mensaje?.updateComponents?.components?.map((x) => x.component);
          console.log(`  a2ui ${gris(comps ? comps.join(' + ') : Object.keys(l.mensaje ?? {}).filter((k) => k !== 'version').join(','))}`);
        } else if (l.tipo === 'error') console.log(`  ${rojo(`error${l.codigo ? ` ${l.codigo}` : ''}: ${corto(l.mensaje, 300)}`)}`);
        else if (l.tipo === 'estado') continue;
        // El `fin` de una pregunta a una tarjeta (tipo widget): como cerro y que dijo el auditor.
        else if (l.tipo === 'fin' && c.tipo === 'widget') {
          const a = l.auditoria;
          console.log(`  fin ${l.cierre ?? '?'} ${l.widgetId ?? ''} · guardada ${l.guardada ? 'si' : 'no'}` + (a ? ` · auditoria ${a.revisados ?? 0} revisada(s), ${a.diferencias?.length ?? 0} diferencia(s)` : ''));
        }
        else console.log(`  ${l.tipo} ${gris(corto(l.valor ?? l.valores ?? l.nombre ?? l, 240))}`);
      }

      const registros = await q('select creado_en, fuente, nivel, evento, datos from banorte.registros where corrida_id = $1 order by id', [idCorrida]);
      if (registros.length) {
        console.log(`\n${negrita(`Registros ligados (${registros.length})`)}`);
        for (const r of registros) console.log(`  ${gris(hora(r.creado_en))} ${r.fuente} ${r.nivel} ${negrita(r.evento)} ${gris(corto(r.datos, 200))}`);
      }
    }
  } else {
    const filtros = [];
    const valores = [];
    if (bandera('--errores')) filtros.push("c.estado <> 'ok'");
    if (opcion('--usuario')) {
      valores.push(opcion('--usuario'));
      filtros.push(`c.usuario_id = $${valores.length}`);
    }
    const filas = await q(
      `select c.id, c.tipo, c.usuario_id, c.motivo, c.modelo, c.estado, c.cierre, c.pasos, c.tokens_entrada, c.tokens_cache,
              c.tokens_salida, c.ms, c.iniciada_en, c.error,
              (select string_agg(t.nombre || case when t.ok then '' else '!' end, ' ' order by t.id)
                 from banorte.corrida_tools t where t.corrida_id = c.id and t.origen <> 'cierre') as tools
         from banorte.corridas c
        ${filtros.length ? `where ${filtros.join(' and ')}` : ''}
        order by c.iniciada_en desc limit 20`,
      valores,
    );
    if (!filas.length) console.log('todavia no hay corridas grabadas');
    for (const c of filas.reverse()) {
      console.log(
        `${gris(hora(c.iniciada_en))}  ${negrita(c.id)}  ${c.tipo.padEnd(7)} ${String(c.usuario_id ?? '').padEnd(10)} ${pintarEstado(c.estado)} ${c.cierre ?? ''}` +
          `  ${gris(`${c.modelo ?? '?'} · ${c.pasos ?? '?'} pasos · in ${num(c.tokens_entrada)} / cache ${num(c.tokens_cache)} / out ${num(c.tokens_salida)} · ${num(c.ms)} ms · ${c.motivo ?? ''}`)}`,
      );
      if (c.tools) console.log(`    ${gris(c.tools)}`);
      if (c.error) console.log(`    ${rojo(corto(c.error, 200))}`);
    }
    console.log(gris('\npnpm corridas <id> para ver una completa · --errores · --usuario usr_x · --chats · --registros'));
  }
} finally {
  await cliente.end();
}
