import { z } from "zod";
import type { Componente, MensajeA2UI } from "@maya/a2ui";

/**
 * El contrato agente <-> cliente, en tipos. La fuente es
 * `docs/arquitectura/contrato-agente-cliente.md`: si cambia uno, cambia el otro
 * en el mismo commit (skill `cambiar-schema`).
 */

export type RolMensaje = "usuario" | "agente" | "accion";

export type MensajeHistorial = {
  rol: RolMensaje;
  /** Solo TEXTO: el historial nunca lleva JSON A2UI. */
  texto: string;
};

export type AccionEntrante = {
  name: string;
  surfaceId: string;
  sourceComponentId: string;
  timestamp: string;
  context: Record<string, unknown>;
};

/**
 * Lo que la interfaz no pudo pintar (`client_to_server.json`, `VALIDATION_FAILED`).
 * Llega como un turno mas: el agente lee el fallo y repinta sin ese componente.
 */
export type FalloDeInterfaz = {
  code: "VALIDATION_FAILED";
  surfaceId: string;
  path: string;
  message: string;
};

/** Una pantalla que ya quedo arriba en el hilo, con lo necesario para parchearla. */
export type PantallaAnterior = {
  pantalla: string;
  arbol: Componente[];
  dataModel: Record<string, unknown>;
};

/** Cuantas pantallas de arriba viajan: las que se pueden ajustar sin repintar. */
export const MAX_PANTALLAS_ANTERIORES = 3;

export type PeticionAgente = {
  usuarioId: string;
  conversacionId: string;
  mensajes: MensajeHistorial[];
  accion?: AccionEntrante;
  /** La interfaz reporta que no pudo pintar algo del turno anterior. */
  error?: FalloDeInterfaz;
  superficie?: {
    surfaceId: string;
    componentes: string[];
    /**
     * Los componentes que se estan viendo, **tal cual se emitieron**: con su `id`, sus
     * props (los enlaces `{ path }` intactos), sus `children` y su `action`.
     *
     * Es lo que permite `ajustar_pantalla`: sin los ids, el modelo no tiene forma de
     * referirse a una tarjeta que ya existe y su unica salida es repintar la pantalla
     * completa desde las tools. Y van completos, no solo las props, porque un parche
     * fusiona por id: `updateComponents` REEMPLAZA el componente, asi que para parchear
     * una prop hay que volver a mandar el resto.
     *
     * Opcional a proposito: un cliente viejo que solo manda `componentes` sigue
     * funcionando, y el agente se limita a `pintar_pantalla`.
     */
    arbol?: Componente[];
    dataModel: Record<string, unknown>;
    /**
     * Como se llama ESTA pantalla en el hilo (`p1`, `p2`…, contadas desde la primera). Solo
     * hace falta cuando hay `anteriores`: es lo que distingue "la de ahora" de las de arriba.
     */
    pantalla?: string;
    /**
     * Las pantallas que quedaron ARRIBA en el hilo, las mas recientes primero y como mucho
     * `MAX_PANTALLAS_ANTERIORES`. Existen para que «¿y si pago $6,000?» actualice la tarjeta
     * del credito **donde esta**, aunque despues se haya pintado otra pantalla debajo: sin
     * esto, la unica salida del agente era pintarla de nuevo y dejar la vieja congelada
     * arriba con el numero anterior (`docs/como-funciona/ajustes-en-vivo.md`).
     */
    anteriores?: PantallaAnterior[];
  };
  /**
   * De que pantalla del hilo salio `accion`, si no fue de la actual. El `action` de la spec
   * no tiene donde decirlo (todas viven en la superficie `principal`), y un boton de una
   * pantalla anterior sigue vivo: sin esto, el agente buscaria el componente en la pantalla
   * equivocada.
   */
  pantallaDeLaAccion?: string;
  /** `client_capabilities.json`: que catalogos soporta el cliente. Opcional. */
  clientCapabilities?: { "v0.9": { supportedCatalogIds: string[] } };
};

/**
 * La peticion, validada. Es lo que `route.ts` aplica antes de abrir el stream: un cuerpo
 * mal formado devuelve 400 con el detalle en vez de morir a media respuesta. Los topes
 * son de sentido comun para un prompt (40 mensajes, 4 000 caracteres cada uno) y frenan
 * a quien quiera meterle un libro al modelo por la API.
 *
 * `usuarioId` lleva el patron de los ids sinteticos: es lo unico del cuerpo que se
 * interpola en el prompt como texto.
 */
/**
 * Una accion tal como la manda la interfaz. Aparte porque tiene DOS puertas: el cuerpo
 * de `POST /api/agente` y el `?accion=` con el que Inicio manda a la persona a Maya con
 * el boton que toco ya disparado (`components/inicio/inicio-de-maya.tsx`).
 */
export const esquemaAccionEntrante = z.object({
  name: z.string().min(1).max(64),
  surfaceId: z.string().min(1).max(64),
  sourceComponentId: z.string().min(1).max(128),
  timestamp: z.string().max(64),
  context: z.record(z.string(), z.unknown()).default({}),
});

/** `p1`, `p2`…: la posicion de la pantalla en el hilo, contada desde la primera. */
const idDePantalla = z.string().regex(/^p[0-9]{1,3}$/, "pantalla invalida: p1, p2…");

export const esquemaPeticion = z
  .object({
    usuarioId: z.string().regex(/^usr_[a-z0-9_]+$/, "usuarioId invalido"),
    conversacionId: z.string().min(1).max(64),
    mensajes: z
      .array(z.object({ rol: z.enum(["usuario", "agente", "accion"]), texto: z.string().max(4000) }))
      .max(40)
      .default([]),
    accion: esquemaAccionEntrante.optional(),
    error: z
      .object({
        code: z.literal("VALIDATION_FAILED"),
        surfaceId: z.string().min(1).max(64),
        path: z.string().max(256),
        message: z.string().max(1000),
      })
      .optional(),
    superficie: z
      .object({
        surfaceId: z.string().min(1).max(64),
        componentes: z.array(z.string().max(64)).max(200).default([]),
        arbol: z
          .array(
            z
              .object({
                id: z.string().min(1).max(128),
                component: z.string().min(1).max(64),
              })
              // Las props son planas y distintas por componente: van tal cual llegan, y el
              // schema de cada una se valida contra el catalogo, no aqui.
              .catchall(z.unknown()),
          )
          .max(60)
          .optional(),
        dataModel: z.record(z.string(), z.unknown()).default({}),
        pantalla: idDePantalla.optional(),
        anteriores: z
          .array(
            z.object({
              pantalla: idDePantalla,
              arbol: z
                .array(z.object({ id: z.string().min(1).max(128), component: z.string().min(1).max(64) }).catchall(z.unknown()))
                .max(60),
              dataModel: z.record(z.string(), z.unknown()).default({}),
            }),
          )
          .max(MAX_PANTALLAS_ANTERIORES)
          .optional(),
      })
      .optional(),
    pantallaDeLaAccion: idDePantalla.optional(),
    clientCapabilities: z
      .object({ "v0.9": z.object({ supportedCatalogIds: z.array(z.string().max(512)).max(20) }) })
      .optional(),
  })
  .refine((p) => p.accion !== undefined || p.error !== undefined || p.mensajes.at(-1)?.rol === "usuario", {
    message:
      "el turno lo dispara un mensaje de la persona (mensajes[ultimo].rol === 'usuario'), una accion o un error de la interfaz",
  });

/**
 * `server_capabilities.json`: lo que este agente sabe generar. Un cliente que declare
 * otro catalogo en `clientCapabilities` recibe 400: no hay forma de pintarle nada.
 */
export function capacidadesDelServidor(urlCatalogo: string): { "v0.9": { supportedCatalogIds: string[]; acceptsInlineCatalogs: false } } {
  return { "v0.9": { supportedCatalogIds: [urlCatalogo], acceptsInlineCatalogs: false } };
}

/** Una linea del stream JSONL de respuesta. El cliente ignora lo que no conoce. */
export type LineaStream =
  | { tipo: "estado"; valor: "pensando" | "consultando" | "pintando" }
  | { tipo: "tool"; nombre: string; ms: number; ok: boolean }
  | {
      tipo: "a2ui";
      mensaje: MensajeA2UI;
      /**
       * Solo cuando el mensaje es para una pantalla ANTERIOR del hilo (un `ajustar_pantalla`
       * con `pantalla`): el cliente lo aplica a esa pantalla congelada y no a la actual.
       */
      pantalla?: string;
    }
  | { tipo: "texto"; valor: string }
  | { tipo: "razon"; valor: string }
  | { tipo: "sugerencias"; valores: string[] }
  | { tipo: "error"; codigo: "tool" | "a2ui" | "modelo" | "timeout"; mensaje: string }
  | { tipo: "fin"; pasos: number; ms: number; /** tokens que el proveedor sirvio desde su cache */ cacheLeido?: number;
      /**
       * Con cual de las tres salidas cerro el modelo. El cliente lo necesita para una cosa
       * concreta: un `ajustar` **actualiza la pantalla que ya estaba** en el hilo en vez de
       * apilar otra debajo, que es lo que hace que el cambio se vea live y no como un chat
       * con tarjetas pegadas.
       */
      cierre?: "pintar" | "ajustar" | "responder";
      /** Si el ajuste fue sobre una pantalla anterior, cual: el cliente la trae a la vista. */
      pantalla?: string;
      /** La fila de `banorte.corridas` con todo lo que paso en este turno. Solo si se grabo. */
      corridaId?: string };

export const TIMEOUT_TURNO_MS = 30_000;
