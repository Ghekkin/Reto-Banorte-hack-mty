import type { MensajeA2UI } from "@maya/a2ui";
import { config } from "@/lib/agente/config";
import { consultar } from "@/lib/datos/tablas";
import type { Procedencias, ReferenciaDeDato } from "@/lib/widgets/armar";

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
  /**
   * De donde salio cada tarjeta (modo widgets, migracion 0004). Vacio en una portada del
   * modo anterior: esa no admite preguntas por tarjeta.
   */
  procedencias: Procedencias;
  /** A que tarjeta y campo apunta cada cifra de apoyo de la Conclusion. */
  referencias: ReferenciaDeDato[];
  /** ISO 8601 de la ultima vez que una pregunta cambio una tarjeta en su lugar. */
  ajustadaEn: string | null;
};

export type PantallaNueva = Omit<PantallaDeInicio, "generadaEn" | "procedencias" | "referencias" | "ajustadaEn"> & {
  procedencias?: Procedencias;
  referencias?: ReferenciaDeDato[];
};

/** Lo que cambia cuando una pregunta ajusta tarjetas en su lugar: nada de la huella ni del modelo. */
export type AjusteDeWidgets = {
  usuarioId: string;
  mensajes: MensajeA2UI[];
  procedencias: Procedencias;
  /** La generacion sobre la que se calculo el ajuste: si la portada se rearmo mientras, no se pisa. */
  generadaEn: string;
};

/** La interfaz que el servicio usa; las pruebas la implementan en memoria. */
export type Almacen = {
  leer(usuarioId: string): Promise<PantallaDeInicio | undefined>;
  guardar(pantalla: PantallaNueva): Promise<PantallaDeInicio>;
  /**
   * Guarda el resultado de preguntarle a una tarjeta. Devuelve `undefined` si la portada ya
   * no es la misma sobre la que se hizo el ajuste (el reloj la rearmo mientras).
   */
  ajustar?(ajuste: AjusteDeWidgets): Promise<PantallaDeInicio | undefined>;
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
  procedencias: Procedencias | null;
  referencias: ReferenciaDeDato[] | null;
  ajustada_ms: string | null;
};

const COLUMNAS = `usuario_id, huella, mensajes, texto, razon, sugerencias, modelo, tools,
  entrada_tokens, salida_tokens, cache_tokens, ms,
  (extract(epoch from generada_en) * 1000)::bigint::text as generada_ms,
  procedencias, referencias, (extract(epoch from ajustada_en) * 1000)::bigint::text as ajustada_ms`;

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
          entrada_tokens, salida_tokens, cache_tokens, ms, generada_en, procedencias, referencias, ajustada_en)
       values ($1, $2, $3::jsonb, $4, $5, $6::jsonb, $7, $8::jsonb, $9, $10, $11, $12, now(), $13::jsonb, $14::jsonb, null)
       on conflict (usuario_id) do update set
         huella = excluded.huella, mensajes = excluded.mensajes, texto = excluded.texto,
         razon = excluded.razon, sugerencias = excluded.sugerencias, modelo = excluded.modelo,
         tools = excluded.tools, entrada_tokens = excluded.entrada_tokens,
         salida_tokens = excluded.salida_tokens, cache_tokens = excluded.cache_tokens,
         ms = excluded.ms, generada_en = now(), procedencias = excluded.procedencias,
         referencias = excluded.referencias, ajustada_en = null
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
        JSON.stringify(p.procedencias ?? {}),
        JSON.stringify(p.referencias ?? []),
      ],
    );
    if (!fila) throw new Error("la base no devolvio la pantalla guardada");
    return dePantalla(fila);
  },

  async ajustar(a) {
    // El `generada_en` en el where es el candado: si el reloj rearmo la portada mientras la
    // persona preguntaba, este ajuste es sobre una pantalla que ya no existe y no se escribe.
    const [fila] = await consultar<Fila>(
      `update banorte.pantallas_inicio
          set mensajes = $2::jsonb, procedencias = $3::jsonb, ajustada_en = now()
        where usuario_id = $1
          and (extract(epoch from generada_en) * 1000)::bigint = $4
      returning ${COLUMNAS}`,
      [a.usuarioId, JSON.stringify(a.mensajes), JSON.stringify(a.procedencias), new Date(a.generadaEn).getTime()],
    );
    return fila ? dePantalla(fila) : undefined;
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
    procedencias: fila.procedencias ?? {},
    referencias: fila.referencias ?? [],
    ajustadaEn: fila.ajustada_ms ? new Date(Number(fila.ajustada_ms)).toISOString() : null,
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
