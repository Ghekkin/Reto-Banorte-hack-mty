import type { MensajeA2UI } from "@maya/a2ui";
import { config } from "@/lib/agente/config";
import { consultar } from "@/lib/datos/tablas";
import { DISPOSITIVO_COMUN } from "@/lib/dispositivo";
import type { Procedencias, ReferenciaDeDato } from "@/lib/widgets/armar";

/**
 * Donde vive la portada que Maya armo para cada persona. Dos tablas, y la diferencia es de
 * quien es la portada (ADR 0012):
 *
 *  - `banorte.pantallas_inicio` (migracion 0002): la **comun**, una fila por persona. La
 *    arma el reloj y la ve todo visitante que no ha cambiado nada.
 *  - `banorte.pantallas_por_dispositivo` (migracion 0007): la de un **dispositivo** que ya
 *    se aparto de la comun —aplico una accion, pregunto algo, ajusto una tarjeta—, una fila
 *    por (dispositivo, persona). Lo que un visitante hace en su Inicio no le cambia el Inicio
 *    a nadie mas. Cual de las dos se pinta lo decide `servicio.ts`.
 *
 * Aqui no se decide nada: `leer` lee EXACTAMENTE el ambito que se le pide.
 *
 * Va en la base y no en memoria por dos razones: los deploys son cada rato y un
 * reinicio no puede dejar Inicio en blanco hasta el siguiente tick; y la base es la
 * misma en local y en produccion, asi que la portada que armo un proceso la ve el otro.
 */
export type PantallaDeInicio = {
  usuarioId: string;
  /** De quien es: `comun` (la de `pantallas_inicio`) o el id de un dispositivo. */
  dispositivoId: string;
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
   * De donde salio cada tarjeta (modo widgets, migracion 0005). Vacio en una portada del
   * modo anterior: esa no admite preguntas por tarjeta.
   */
  procedencias: Procedencias;
  /** A que tarjeta y campo apunta cada cifra de apoyo de la Conclusion. */
  referencias: ReferenciaDeDato[];
  /** ISO 8601 de la ultima vez que una pregunta cambio una tarjeta en su lugar. */
  ajustadaEn: string | null;
};

export type PantallaNueva = Omit<PantallaDeInicio, "generadaEn" | "procedencias" | "referencias" | "ajustadaEn" | "dispositivoId"> & {
  procedencias?: Procedencias;
  referencias?: ReferenciaDeDato[];
  /** Donde se guarda. Sin el, la comun. */
  dispositivoId?: string;
};

/** Lo que cambia cuando una pregunta ajusta tarjetas en su lugar: nada de la huella ni del modelo. */
export type AjusteDeWidgets = {
  usuarioId: string;
  mensajes: MensajeA2UI[];
  procedencias: Procedencias;
  /** La generacion sobre la que se calculo el ajuste: si la portada se rearmo mientras, no se pisa. */
  generadaEn: string;
  /** Quien pregunto. Sin el, se ajusta la comun (como antes de la migracion 0007). */
  dispositivoId?: string;
  /**
   * La portada que la persona estaba viendo cuando pregunto. Si era la COMUN y quien pregunta
   * es un dispositivo, el ajuste no se escribe encima de la comun: se copia a una portada
   * propia del dispositivo, con la misma generacion, y la comun queda intacta para los demas.
   */
  base?: PantallaDeInicio;
};

/** La interfaz que el servicio usa; las pruebas la implementan en memoria. */
export type Almacen = {
  /** La portada de ESE ambito, sin caer a otro: `comun` o un dispositivo. */
  leer(usuarioId: string, dispositivoId?: string): Promise<PantallaDeInicio | undefined>;
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
  async leer(usuarioId, dispositivoId = DISPOSITIVO_COMUN) {
    if (dispositivoId !== DISPOSITIVO_COMUN) return porDispositivo.leer(usuarioId, dispositivoId);
    const [fila] = await consultar<Fila>(
      `select ${COLUMNAS} from banorte.pantallas_inicio where usuario_id = $1`,
      [usuarioId],
    );
    return fila ? dePantalla(fila) : undefined;
  },

  async guardar(p) {
    if (p.dispositivoId && p.dispositivoId !== DISPOSITIVO_COMUN) return porDispositivo.guardar(p, p.dispositivoId);
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
    if (a.dispositivoId && a.dispositivoId !== DISPOSITIVO_COMUN) return porDispositivo.ajustar(a, a.dispositivoId);
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
    dispositivoId: DISPOSITIVO_COMUN,
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
 * La portada de un dispositivo (`pantallas_por_dispositivo`, migracion 0007). La pantalla va
 * entera en una columna JSONB y no una columna por campo: asi un campo nuevo de la portada
 * no obliga a migrar dos tablas. Lo que se consulta o sirve de candado —huella, generacion,
 * ajuste— va en columnas.
 */
type FilaDeDispositivo = {
  dispositivo_id: string;
  usuario_id: string;
  huella: string;
  pantalla: Omit<PantallaDeInicio, "usuarioId" | "dispositivoId" | "huella" | "generadaEn" | "ajustadaEn">;
  generada_ms: string;
  ajustada_ms: string | null;
};

const COLUMNAS_DE_DISPOSITIVO = `dispositivo_id, usuario_id, huella, pantalla,
  (extract(epoch from generada_en) * 1000)::bigint::text as generada_ms,
  (extract(epoch from ajustada_en) * 1000)::bigint::text as ajustada_ms`;

/** Lo que ya vive en columnas y por eso no va dentro de `pantalla`. */
const CAMPOS_EN_COLUMNAS = ["usuarioId", "dispositivoId", "huella", "generadaEn", "ajustadaEn"];

/** Lo que va a la columna `pantalla`: la portada completa menos lo que ya vive en columnas. */
function cuerpoDe(p: PantallaNueva | PantallaDeInicio): string {
  const cuerpo: Record<string, unknown> = { ...p };
  for (const campo of CAMPOS_EN_COLUMNAS) delete cuerpo[campo];
  return JSON.stringify(cuerpo);
}

const porDispositivo = {
  async leer(usuarioId: string, dispositivoId: string): Promise<PantallaDeInicio | undefined> {
    const [fila] = await consultar<FilaDeDispositivo>(
      `select ${COLUMNAS_DE_DISPOSITIVO} from banorte.pantallas_por_dispositivo
        where dispositivo_id = $1 and usuario_id = $2`,
      [dispositivoId, usuarioId],
    );
    return fila ? deFilaDeDispositivo(fila) : undefined;
  },

  async guardar(p: PantallaNueva, dispositivoId: string): Promise<PantallaDeInicio> {
    const [fila] = await consultar<FilaDeDispositivo>(
      `insert into banorte.pantallas_por_dispositivo (dispositivo_id, usuario_id, huella, pantalla, generada_en, ajustada_en)
       values ($1, $2, $3, $4::jsonb, now(), null)
       on conflict (dispositivo_id, usuario_id) do update set
         huella = excluded.huella, pantalla = excluded.pantalla, generada_en = now(), ajustada_en = null
       returning ${COLUMNAS_DE_DISPOSITIVO}`,
      [dispositivoId, p.usuarioId, p.huella, cuerpoDe({ ...p, procedencias: p.procedencias ?? {}, referencias: p.referencias ?? [] })],
    );
    if (!fila) throw new Error("la base no devolvio la pantalla guardada");
    return deFilaDeDispositivo(fila);
  },

  async ajustar(a: AjusteDeWidgets, dispositivoId: string): Promise<PantallaDeInicio | undefined> {
    const cambios = JSON.stringify({ mensajes: a.mensajes, procedencias: a.procedencias });

    // La persona ya tenia portada propia: se ajusta esa, con el mismo candado de generacion.
    if (!a.base || a.base.dispositivoId === dispositivoId) {
      const [fila] = await consultar<FilaDeDispositivo>(
        `update banorte.pantallas_por_dispositivo
            set pantalla = pantalla || $3::jsonb, ajustada_en = now()
          where dispositivo_id = $1 and usuario_id = $2
            and (extract(epoch from generada_en) * 1000)::bigint = $4
        returning ${COLUMNAS_DE_DISPOSITIVO}`,
        [dispositivoId, a.usuarioId, cambios, new Date(a.generadaEn).getTime()],
      );
      return fila ? deFilaDeDispositivo(fila) : undefined;
    }

    // Estaba viendo la COMUN: el ajuste se vuelve su portada propia, con la generacion de la
    // comun (la pagina la usa de `key`, y asi no se remonta lo que ya ve). Si ya tenia una
    // propia VENCIDA (otra huella), se reemplaza; si tiene una al dia, otra peticion se
    // adelanto y esta no la pisa.
    if (a.base.generadaEn !== a.generadaEn) return undefined;
    const [fila] = await consultar<FilaDeDispositivo>(
      `insert into banorte.pantallas_por_dispositivo as p (dispositivo_id, usuario_id, huella, pantalla, generada_en, ajustada_en)
       values ($1, $2, $3, $4::jsonb, $5::timestamptz, now())
       on conflict (dispositivo_id, usuario_id) do update set
         huella = excluded.huella, pantalla = excluded.pantalla,
         generada_en = excluded.generada_en, ajustada_en = excluded.ajustada_en
       where p.huella <> excluded.huella
       returning ${COLUMNAS_DE_DISPOSITIVO}`,
      [
        dispositivoId,
        a.usuarioId,
        a.base.huella,
        cuerpoDe({ ...a.base, mensajes: a.mensajes, procedencias: a.procedencias }),
        a.generadaEn,
      ],
    );
    return fila ? deFilaDeDispositivo(fila) : undefined;
  },
};

function deFilaDeDispositivo(fila: FilaDeDispositivo): PantallaDeInicio {
  const p = fila.pantalla;
  return {
    ...p,
    usuarioId: fila.usuario_id,
    dispositivoId: fila.dispositivo_id,
    huella: fila.huella,
    mensajes: conElCatalogoDeAqui(p.mensajes ?? []),
    sugerencias: p.sugerencias ?? [],
    tools: p.tools ?? [],
    procedencias: p.procedencias ?? {},
    referencias: p.referencias ?? [],
    generadaEn: new Date(Number(fila.generada_ms)).toISOString(),
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
