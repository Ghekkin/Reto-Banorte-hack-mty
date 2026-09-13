import "server-only";

import { consultar } from "@/lib/datos/tablas";
import type { CorridaTerminada, Escritor, FilaCorrida, FilaPrompt } from "./grabadora";

/**
 * El escritor de corridas contra PostgreSQL (migracion `0004-corridas-chat-y-registros.sql`).
 *
 * Se apaga solo en tres casos, y en los tres la grabadora ni siquiera arma filas:
 *  - `FEATURE_CORRIDAS_EN_DB=0`;
 *  - sin `DATABASE_URL`;
 *  - dentro de vitest: una prueba nunca escribe en la base de la demo (ADR 0010).
 *
 * Todo es "mejor esfuerzo": la grabadora encola las escrituras y un fallo se avisa en
 * consola una vez por corrida. El turno de la persona no espera a la base ni se cae por ella.
 */
export function corridasActivas(): boolean {
  return (
    (process.env.FEATURE_CORRIDAS_EN_DB ?? "1") !== "0" &&
    Boolean(process.env.DATABASE_URL) &&
    !process.env.VITEST &&
    process.env.NODE_ENV !== "test"
  );
}

/** Los prompts ya guardados en este proceso: el system prompt pesa 70 KB y no cambia entre turnos. */
const promptsGuardados = new Set<string>();

async function guardarPrompts(prompts: FilaPrompt[]): Promise<void> {
  for (const p of prompts) {
    if (promptsGuardados.has(p.hash)) continue;
    await consultar(
      "insert into banorte.prompts (hash, tipo, contenido, bytes) values ($1, $2, $3, $4) on conflict (hash) do nothing",
      [p.hash, p.tipo, p.contenido, Buffer.byteLength(p.contenido)],
    );
    promptsGuardados.add(p.hash);
  }
}

const json = (valor: unknown) => JSON.stringify(valor ?? null);

async function guardarCorrida(c: FilaCorrida): Promise<void> {
  await consultar(
    `insert into banorte.corridas (
       id, tipo, usuario_id, conversacion_id, motivo, estado, proveedor, modelo, opciones_proveedor, config,
       version_app, prompt_sistema_hash, tools_hash, tools_ofrecidas, peticion, mensajes_modelo, lineas, cierre,
       pasos, tokens_entrada, tokens_salida, tokens_cache, tokens_razonamiento, texto, error, ms, iniciada_en, terminada_en,
       dispositivo_id
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12,$13,$14::jsonb,$15::jsonb,$16::jsonb,$17::jsonb,$18,
               $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29)
     on conflict (id) do update set
       estado = excluded.estado, proveedor = excluded.proveedor, modelo = excluded.modelo,
       opciones_proveedor = excluded.opciones_proveedor, config = excluded.config,
       prompt_sistema_hash = excluded.prompt_sistema_hash, tools_hash = excluded.tools_hash,
       tools_ofrecidas = excluded.tools_ofrecidas, mensajes_modelo = excluded.mensajes_modelo,
       lineas = excluded.lineas, cierre = excluded.cierre, pasos = excluded.pasos,
       tokens_entrada = excluded.tokens_entrada, tokens_salida = excluded.tokens_salida,
       tokens_cache = excluded.tokens_cache, tokens_razonamiento = excluded.tokens_razonamiento,
       texto = excluded.texto, error = excluded.error, ms = excluded.ms, terminada_en = excluded.terminada_en`,
    [
      c.id, c.tipo, c.usuarioId, c.conversacionId, c.motivo, c.estado, c.proveedor, c.modelo,
      json(c.opcionesProveedor), json(c.config), c.versionApp, c.promptSistemaHash, c.toolsHash,
      json(c.toolsOfrecidas), json(c.peticion), json(c.mensajesModelo), json(c.lineas), c.cierre,
      c.pasos, c.tokensEntrada, c.tokensSalida, c.tokensCache, c.tokensRazonamiento, c.texto, c.error,
      c.ms, c.iniciadaEn, c.terminadaEn, c.dispositivoId,
    ],
  );
}

/** Un insert de varias filas con placeholders numerados; `casts` marca las columnas JSONB. */
async function insertarVarias(tabla: string, columnas: string[], casts: Record<string, string>, filas: unknown[][]): Promise<void> {
  if (filas.length === 0) return;
  const valores: unknown[] = [];
  const grupos = filas.map((fila) => {
    const marcas = fila.map((valor, i) => {
      valores.push(valor);
      const cast = casts[columnas[i]!];
      return `$${valores.length}${cast ? `::${cast}` : ""}`;
    });
    return `(${marcas.join(",")})`;
  });
  await consultar(`insert into banorte.${tabla} (${columnas.join(",")}) values ${grupos.join(",")}`, valores);
}

async function terminar(t: CorridaTerminada): Promise<void> {
  await guardarPrompts(t.prompts);
  await guardarCorrida(t.corrida);
  const id = t.corrida.id;

  await consultar("delete from banorte.corrida_pasos where corrida_id = $1", [id]);
  await insertarVarias(
    "corrida_pasos",
    ["corrida_id", "paso", "tools_activas", "tool_choice", "finish_reason", "modelo_respuesta", "respuesta_id",
     "tokens_entrada", "tokens_salida", "tokens_cache", "tokens_razonamiento", "texto", "razonamiento",
     "llamadas", "advertencias", "metadata_proveedor", "terminado_en"],
    { tools_activas: "jsonb", llamadas: "jsonb", advertencias: "jsonb", metadata_proveedor: "jsonb" },
    t.pasos.map((p) => [
      id, p.paso, p.toolsActivas ? json(p.toolsActivas) : null, p.toolChoice, p.finishReason, p.modeloRespuesta,
      p.respuestaId, p.tokensEntrada, p.tokensSalida, p.tokensCache, p.tokensRazonamiento, p.texto, p.razonamiento,
      json(p.llamadas), json(p.advertencias), json(p.metadataProveedor), p.terminadoEn,
    ]),
  );

  await consultar("delete from banorte.corrida_tools where corrida_id = $1", [id]);
  await insertarVarias(
    "corrida_tools",
    ["corrida_id", "paso", "tool_call_id", "nombre", "origen", "argumentos", "resultado", "ok", "error", "ms", "llamada_en"],
    { argumentos: "jsonb", resultado: "jsonb" },
    t.tools.map((f) => [id, f.paso, f.toolCallId, f.nombre, f.origen, json(f.argumentos), json(f.resultado), f.ok, f.error, f.ms, f.llamadaEn]),
  );

  if (t.chat) {
    await consultar(
      `insert into banorte.conversaciones (id, usuario_id, turnos, dispositivo_id) values ($1, $2, 1, $3)
       on conflict (id) do update set turnos = banorte.conversaciones.turnos + 1, actualizada_en = now()`,
      [t.chat.conversacionId, t.chat.usuarioId, t.chat.dispositivoId],
    );
    await insertarVarias(
      "mensajes_chat",
      ["conversacion_id", "corrida_id", "rol", "texto", "datos"],
      { datos: "jsonb" },
      t.chat.mensajes.map((m) => [t.chat!.conversacionId, id, m.rol, m.texto, json(m.datos)]),
    );
  }
}

export const escritorEnPostgres: Escritor = {
  activo: corridasActivas,
  iniciar: async (prompts, corrida) => {
    await guardarPrompts(prompts);
    await guardarCorrida(corrida);
  },
  terminar,
};

/** Un escritor que no hace nada: para quien corre sin base a proposito. */
export const escritorNulo: Escritor = { activo: () => false, iniciar: async () => {}, terminar: async () => {} };

export type Registro = {
  fuente: "web" | "agente" | "inicio";
  nivel?: "debug" | "info" | "warn" | "error";
  evento: string;
  corridaId?: string | null;
  usuarioId?: string | null;
  datos?: Record<string, unknown>;
};

/**
 * Un log estructurado: sale en consola como siempre (Coolify lo muestra) y ADEMAS queda en
 * `banorte.registros`, donde se puede buscar por corrida, persona o evento. No espera a la
 * base: quien lo llama sigue en el mismo tick.
 */
export function registrar(registro: Registro): void {
  const { fuente, nivel = "info", evento, corridaId = null, usuarioId = null, datos = {} } = registro;
  const linea = JSON.stringify({ fuente, evento, ...(corridaId ? { corridaId } : {}), ...datos });
  if (nivel === "warn" || nivel === "error") console.warn(linea);
  else console.log(linea);
  if (!corridasActivas()) return;
  consultar(
    "insert into banorte.registros (fuente, nivel, evento, corrida_id, usuario_id, datos) values ($1,$2,$3,$4,$5,$6::jsonb)",
    [fuente, nivel, evento, corridaId, usuarioId, json(datos)],
  ).catch((error: unknown) => {
    console.warn(`[registros] no se pudo guardar ${fuente}/${evento}: ${error instanceof Error ? error.message : String(error)}`);
  });
}
