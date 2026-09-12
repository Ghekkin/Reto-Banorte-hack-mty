import type { MensajeA2UI } from "@maya/a2ui";
import { config } from "@/lib/agente/config";
import { consultar } from "@/lib/datos/tablas";

/**
 * Donde vive la portada que Maya armo para cada persona: `banorte.pantallas_inicio`
 * (migracion 0002), una fila por usuario.
 *
 * Va en la base y no en memoria por dos razones: los deploys son cada rato y un
 * reinicio no puede dejar Inicio en blanco hasta el siguiente tick; y la base es la
 * misma en local y en produccion, asi que la portada que armo un proceso la ve el otro.
 */
export type PantallaDeInicio = {
  usuarioId: string;
  huella: string;
  /** Los tres mensajes A2UI validados: `createSurface`, `updateComponents`, `updateDataModel`. */
  mensajes: MensajeA2UI[];
  texto: string;
  razon: string;
  sugerencias: string[];
  modelo: string;
  tools: string[];
  entradaTokens: number | null;
  salidaTokens: number | null;
  cacheTokens: number | null;
  ms: number;
  /** ISO 8601, en UTC. */
  generadaEn: string;
};

export type PantallaNueva = Omit<PantallaDeInicio, "generadaEn">;

/** La interfaz que el servicio usa; las pruebas la implementan en memoria. */
export type Almacen = {
  leer(usuarioId: string): Promise<PantallaDeInicio | undefined>;
  guardar(pantalla: PantallaNueva): Promise<PantallaDeInicio>;
};

type Fila = {
  usuario_id: string;
  huella: string;
  mensajes: MensajeA2UI[];
  texto: string;
  razon: string;
  sugerencias: string[];
  modelo: string;
  tools: string[];
  entrada_tokens: number | null;
  salida_tokens: number | null;
  cache_tokens: number | null;
  ms: number;
  generada_ms: string;
};

const COLUMNAS = `usuario_id, huella, mensajes, texto, razon, sugerencias, modelo, tools,
  entrada_tokens, salida_tokens, cache_tokens, ms,
  (extract(epoch from generada_en) * 1000)::bigint::text as generada_ms`;

export const almacenEnPostgres: Almacen = {
  async leer(usuarioId) {
    const [fila] = await consultar<Fila>(
      `select ${COLUMNAS} from banorte.pantallas_inicio where usuario_id = $1`,
      [usuarioId],
    );
    return fila ? dePantalla(fila) : undefined;
  },

  async guardar(p) {
    const [fila] = await consultar<Fila>(
      `insert into banorte.pantallas_inicio
         (usuario_id, huella, mensajes, texto, razon, sugerencias, modelo, tools,
          entrada_tokens, salida_tokens, cache_tokens, ms, generada_en)
       values ($1, $2, $3::jsonb, $4, $5, $6::jsonb, $7, $8::jsonb, $9, $10, $11, $12, now())
       on conflict (usuario_id) do update set
         huella = excluded.huella, mensajes = excluded.mensajes, texto = excluded.texto,
         razon = excluded.razon, sugerencias = excluded.sugerencias, modelo = excluded.modelo,
         tools = excluded.tools, entrada_tokens = excluded.entrada_tokens,
         salida_tokens = excluded.salida_tokens, cache_tokens = excluded.cache_tokens,
         ms = excluded.ms, generada_en = now()
       returning ${COLUMNAS}`,
      [
        p.usuarioId,
        p.huella,
        JSON.stringify(p.mensajes),
        p.texto,
        p.razon,
        JSON.stringify(p.sugerencias),
        p.modelo,
        JSON.stringify(p.tools),
        p.entradaTokens,
        p.salidaTokens,
        p.cacheTokens,
        p.ms,
      ],
    );
    if (!fila) throw new Error("la base no devolvio la pantalla guardada");
    return dePantalla(fila);
  },
};

function dePantalla(fila: Fila): PantallaDeInicio {
  return {
    usuarioId: fila.usuario_id,
    huella: fila.huella,
    mensajes: conElCatalogoDeAqui(fila.mensajes),
    texto: fila.texto,
    razon: fila.razon,
    sugerencias: fila.sugerencias ?? [],
    modelo: fila.modelo,
    tools: fila.tools ?? [],
    entradaTokens: fila.entrada_tokens,
    salidaTokens: fila.salida_tokens,
    cacheTokens: fila.cache_tokens,
    ms: fila.ms,
    generadaEn: new Date(Number(fila.generada_ms)).toISOString(),
  };
}

/**
 * La base es la misma en local y en produccion, asi que la portada pudo armarla un
 * proceso con OTRO `URL_CATALOGO`. El `catalogId` se pone al leer, no al guardar: cada
 * quien sirve su pantalla con el catalogo que si puede abrir.
 */
export function conElCatalogoDeAqui(mensajes: MensajeA2UI[]): MensajeA2UI[] {
  return mensajes.map((m) =>
    "createSurface" in m ? { ...m, createSurface: { ...m.createSurface, catalogId: config.urlCatalogo } } : m,
  );
}
