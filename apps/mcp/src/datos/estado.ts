import { config } from "../config.js";
import { obtenerPool } from "./postgres.js";

/**
 * El estado que las acciones mutan: la tabla `banorte.acciones_aplicadas`.
 *
 * Los datos de partida (usuarios, movimientos, tarjetas…) no se tocan nunca. Lo que
 * una tool de accion aplica se inserta aqui, y las tools de lectura lo superponen.
 * Reiniciar la demo es truncar esta tabla (`pnpm reiniciar-estado`).
 *
 * La **idempotencia la garantiza la base**, no este codigo: `idempotency_key` tiene
 * indice unico, asi que dos llamadas con la misma llave insertan una sola fila
 * aunque lleguen a la vez. Un reintento del agente no puede aplicar el plan dos veces.
 */
export type AccionAplicada = {
  id: string;
  tipo: string;
  usuarioId: string;
  /** La llave que hace idempotente la accion (contrato agente-cliente). */
  idempotencyKey: string;
  aplicadaEn: string;
  datos: Record<string, unknown>;
};

/** Que clase de objeto toca cada accion; lo exige el CHECK de la tabla. */
const OBJETO_DE: Record<string, string> = {
  aplicar_plan_pago: "tarjeta",
  crear_apartado: "meta",
  crear_tope_gasto: "categoria",
  cancelar_suscripcion: "suscripcion",
  rebalancear: "portafolio",
  rebalancear_portafolio: "portafolio",
  confirmar_rebalanceo: "portafolio",
  // Migracion 0005: sin ella la base rechaza el insert por el CHECK de `accion`.
  programar_abono_capital: "credito",
};

/**
 * Copia en memoria de las acciones. El dominio (`consultas.ts`, `topes.ts`,
 * `suscripciones.ts`) las consulta de forma sincrona, asi que no puede haber un
 * `await` en medio; se refresca al arrancar y **antes de cada llamada a una tool**
 * (ver `tools/registro.ts`).
 *
 * Refrescar por llamada no es paranoia: `pnpm reiniciar-estado` corre en OTRO
 * proceso, y sin esto el servidor seguiria contestando desde su copia vieja. En un
 * ensayo eso se ve como "reiniciamos y sigue apareciendo el plan aplicado", cinco
 * minutos antes del pitch.
 */
let cache: AccionAplicada[] = [];
let baseDisponible = true;

export function marcarBaseNoDisponible(): void {
  baseDisponible = false;
}

/**
 * Sin `DATABASE_URL` no hay base contra la que escribir.
 * Además, bajo entorno de pruebas (VITEST o NODE_ENV === 'test'), forzamos `sinBase()`
 * para garantizar de forma determinista el aislamiento estipulado en el ADR 0010:
 * ninguna corrida de tests (aunque tenga DATABASE_URL exportada en la shell) tocará
 * ni truncará la tabla `banorte.acciones_aplicadas` de la demo.
 */
function sinBase(): boolean {
  return (
    config.urlPostgres === "" ||
    !baseDisponible ||
    Boolean(process.env.VITEST) ||
    process.env.NODE_ENV === "test"
  );
}

type FilaAccion = {
  id: string;
  usuario_id: string;
  accion: string;
  objeto_id: string;
  contexto: Record<string, unknown>;
  idempotency_key: string | null;
  aplicada_en: string;
};

function desdeFila(f: FilaAccion): AccionAplicada {
  return {
    id: f.objeto_id,
    tipo: f.accion === "rebalancear" ? "rebalancear_portafolio" : f.accion,
    usuarioId: f.usuario_id,
    idempotencyKey: f.idempotency_key ?? "",
    aplicadaEn: typeof f.aplicada_en === "string" ? f.aplicada_en : new Date(f.aplicada_en).toISOString(),
    datos: f.contexto ?? {},
  };
}

/** Relee las acciones de la base. Barato: son pocas filas y solo crecen en la demo. */
export async function refrescarAcciones(): Promise<void> {
  if (sinBase()) return;
  const { rows } = await obtenerPool().query<FilaAccion>(
    "select id, usuario_id, accion, objeto_id, contexto, idempotency_key, aplicada_en " +
      "from banorte.acciones_aplicadas order by aplicada_en",
  );
  cache = rows.map(desdeFila);
}

/**
 * Aplica una accion. Si la llave de idempotencia ya se uso, la base rechaza el
 * insert en silencio (`ON CONFLICT DO NOTHING`) y aqui se reporta `yaEstaba`.
 */
export async function aplicarAccion(
  accion: AccionAplicada,
): Promise<{ aplicado: boolean; yaEstaba: boolean }> {
  const objetoTipo = OBJETO_DE[accion.tipo];
  if (!objetoTipo) throw new Error(`accion desconocida para la base: ${accion.tipo}`);

  if (sinBase()) {
    if (cache.some((a) => a.idempotencyKey === accion.idempotencyKey)) {
      return { aplicado: false, yaEstaba: true };
    }
    cache = [...cache, accion];
    return { aplicado: true, yaEstaba: false };
  }

  const tipoParaDb =
    accion.tipo === "rebalancear_portafolio" || accion.tipo === "confirmar_rebalanceo"
      ? "rebalancear"
      : accion.tipo;

  const { rows } = await obtenerPool().query<{ id: string }>(
    `insert into banorte.acciones_aplicadas
       (usuario_id, accion, objeto_tipo, objeto_id, contexto, resultado, idempotency_key, aplicada_en)
     values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8)
     on conflict (idempotency_key) do nothing
     returning id`,
    [
      accion.usuarioId,
      tipoParaDb,
      objetoTipo,
      accion.id,
      JSON.stringify(accion.datos),
      JSON.stringify({ aplicadaEn: accion.aplicadaEn }),
      accion.idempotencyKey,
      accion.aplicadaEn,
    ],
  );

  await refrescarAcciones();
  return rows.length > 0 ? { aplicado: true, yaEstaba: false } : { aplicado: false, yaEstaba: true };
}

/** Las acciones de un usuario, opcionalmente de un tipo. */
export function accionesDe(usuarioId: string, tipo?: string): AccionAplicada[] {
  return cache.filter((a) => {
    if (a.usuarioId !== usuarioId) return false;
    if (!tipo) return true;
    if (tipo === "rebalancear_portafolio" || tipo === "rebalancear") {
      return a.tipo === "rebalancear_portafolio" || a.tipo === "rebalancear" || a.tipo === "confirmar_rebalanceo";
    }
    return a.tipo === tipo;
  });
}

/** Vuelve al punto de partida: `pnpm reiniciar-estado`, antes de cada ensayo. */
export async function reiniciarEstado(): Promise<void> {
  if (!sinBase()) {
    await obtenerPool().query("truncate table banorte.acciones_aplicadas restart identity");
  }
  cache = [];
}
