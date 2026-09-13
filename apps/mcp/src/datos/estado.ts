import { config } from "../config.js";
import { DISPOSITIVO_COMUN, dispositivoActual } from "./dispositivo.js";
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
 *
 * **Cada dispositivo ve solo sus acciones** (`dispositivo.ts`, ADR 0012). Toda fila lleva
 * `dispositivo_id`, `accionesDe` filtra por el de la llamada en curso y `aplicarAccion` lo
 * escribe. Asi el plan que aplica un visitante no le aparece aplicado a otro que abrio a la
 * misma persona. La llave de idempotencia se guarda prefijada con el dispositivo: el indice
 * unico sigue siendo el mismo, y dos dispositivos con la misma llave no se estorban.
 */
export type AccionAplicada = {
  id: string;
  tipo: string;
  usuarioId: string;
  /** La llave que hace idempotente la accion (contrato agente-cliente). */
  idempotencyKey: string;
  aplicadaEn: string;
  datos: Record<string, unknown>;
  /** De que dispositivo es. Si una tool no lo pone, `aplicarAccion` usa el de la llamada. */
  dispositivoId?: string;
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
  // Migracion 0006. El objeto es la categoria `ext_<slug>` que el gasto crea.
  registrar_gasto_externo: "categoria",
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
  /** Migracion 0007. `comun` en las filas de antes y en lo que no trae dispositivo. */
  dispositivo_id: string | null;
};

/**
 * La llave como se guarda. En `comun` va tal cual (las filas de antes siguen valiendo); en un
 * dispositivo, prefijada: `idempotency_key` tiene indice UNICO en toda la tabla, y sin el
 * prefijo el `inicio:<hora>` de un visitante podria chocar con el de otro.
 */
function llaveEnLaBase(dispositivoId: string, llave: string): string {
  return dispositivoId === DISPOSITIVO_COMUN ? llave : `${dispositivoId}:${llave}`;
}

function desdeFila(f: FilaAccion): AccionAplicada {
  const dispositivoId = f.dispositivo_id ?? DISPOSITIVO_COMUN;
  const guardada = f.idempotency_key ?? "";
  const prefijo = llaveEnLaBase(dispositivoId, "");
  return {
    id: f.objeto_id,
    tipo: f.accion === "rebalancear" ? "rebalancear_portafolio" : f.accion,
    usuarioId: f.usuario_id,
    // Las tools comparan contra la llave que les llego, sin prefijo.
    idempotencyKey: prefijo && guardada.startsWith(prefijo) ? guardada.slice(prefijo.length) : guardada,
    dispositivoId,
    aplicadaEn: typeof f.aplicada_en === "string" ? f.aplicada_en : new Date(f.aplicada_en).toISOString(),
    datos: f.contexto ?? {},
  };
}

/** Relee las acciones de la base. Barato: son pocas filas y solo crecen en la demo. */
export async function refrescarAcciones(): Promise<void> {
  if (sinBase()) return;
  const { rows } = await obtenerPool().query<FilaAccion>(
    "select id, usuario_id, accion, objeto_id, contexto, idempotency_key, aplicada_en, dispositivo_id " +
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
  const dispositivoId = accion.dispositivoId ?? dispositivoActual();

  if (sinBase()) {
    if (cache.some((a) => a.idempotencyKey === accion.idempotencyKey && (a.dispositivoId ?? DISPOSITIVO_COMUN) === dispositivoId)) {
      return { aplicado: false, yaEstaba: true };
    }
    cache = [...cache, { ...accion, dispositivoId }];
    return { aplicado: true, yaEstaba: false };
  }

  const tipoParaDb =
    accion.tipo === "rebalancear_portafolio" || accion.tipo === "confirmar_rebalanceo"
      ? "rebalancear"
      : accion.tipo;

  const { rows } = await obtenerPool().query<{ id: string }>(
    `insert into banorte.acciones_aplicadas
       (usuario_id, accion, objeto_tipo, objeto_id, contexto, resultado, idempotency_key, aplicada_en, dispositivo_id)
     values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9)
     on conflict (idempotency_key) do nothing
     returning id`,
    [
      accion.usuarioId,
      tipoParaDb,
      objetoTipo,
      accion.id,
      JSON.stringify(accion.datos),
      JSON.stringify({ aplicadaEn: accion.aplicadaEn }),
      llaveEnLaBase(dispositivoId, accion.idempotencyKey),
      accion.aplicadaEn,
      dispositivoId,
    ],
  );

  await refrescarAcciones();
  return rows.length > 0 ? { aplicado: true, yaEstaba: false } : { aplicado: false, yaEstaba: true };
}

/** Las acciones de un usuario EN EL DISPOSITIVO DE LA LLAMADA, opcionalmente de un tipo. */
export function accionesDe(usuarioId: string, tipo?: string): AccionAplicada[] {
  const dispositivoId = dispositivoActual();
  return cache.filter((a) => {
    if (a.usuarioId !== usuarioId) return false;
    if ((a.dispositivoId ?? DISPOSITIVO_COMUN) !== dispositivoId) return false;
    if (!tipo) return true;
    if (tipo === "rebalancear_portafolio" || tipo === "rebalancear") {
      return a.tipo === "rebalancear_portafolio" || a.tipo === "rebalancear" || a.tipo === "confirmar_rebalanceo";
    }
    return a.tipo === tipo;
  });
}

/**
 * Vuelve al punto de partida: `pnpm reiniciar-estado`, antes de cada ensayo. Es de TODOS los
 * dispositivos, y por eso se lleva tambien sus portadas de Inicio (`pantallas_por_dispositivo`,
 * de la web): la portada de un dispositivo se armo con acciones que ya no existen, y una
 * pregunta vieja no deberia recibir al jurado. `to_regclass`: sin la migracion 0007 no falla.
 */
export async function reiniciarEstado(): Promise<void> {
  if (!sinBase()) {
    await obtenerPool().query("truncate table banorte.acciones_aplicadas restart identity");
    await obtenerPool().query(
      "do $$ begin if to_regclass('banorte.pantallas_por_dispositivo') is not null then " +
        "delete from banorte.pantallas_por_dispositivo; end if; end $$",
    );
  }
  cache = [];
}
