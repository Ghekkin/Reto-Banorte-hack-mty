import { registrar as registrarEnLaBase } from "@/lib/corridas/escritor";
import { DISPOSITIVO_COMUN, DISPOSITIVO_SIN_ACCIONES, dispositivoParaRegistro } from "@/lib/dispositivo";
import { USUARIOS } from "@/lib/usuarios";
import { componentesDe as tarjetasDe } from "@/lib/widgets/pantalla-viva";
import { almacenEnPostgres, type Almacen, type PantallaDeInicio } from "./almacen";
import { configInicio } from "./config";
import { generarPortada, type OpcionesDeGeneracion, type PortadaGenerada } from "./generar";
import { huellaDe, huellaSinAcciones } from "./huella";
import { hayLlaveDelInicio } from "./modelo";

/**
 * El servicio del Inicio personalizado: la unica puerta para leer la portada de alguien
 * y para decidir si se rearma. Lo usan la pagina de Inicio, la ruta `/api/inicio`, el
 * reloj y el gancho de "acabo de aplicar una accion" del agente.
 *
 * La regla que lo gobierna es una: **el modelo corre solo cuando algo cambio.** Una
 * portada se rearma si no existe o si su huella (`huella.ts`) ya no es la de los datos
 * de hoy. Si es la misma, ninguna de las cuatro puertas gasta un token.
 *
 * **Y cada dispositivo ve la suya** (ADR 0012). Hay una portada comun por persona y, aparte,
 * la de cada dispositivo que ya se aparto de ella. Cual se pinta y cual se rearma lo decide
 * `vistaDe`; el algoritmo esta en `docs/algoritmos/portada-por-dispositivo.md`.
 */

export type EstadoDelInicio = {
  /** false: flag apagado, sin llave o sin base. Inicio es la pantalla programada. */
  activo: boolean;
  pantalla?: PantallaDeInicio;
  /** true cuando no hay pantalla o se armo con datos que ya cambiaron. */
  desactualizada: boolean;
  huella?: string;
};

export type ResultadoDeRegeneracion = {
  hecho: "generada" | "sin-cambios" | "fallo" | "inactivo";
  motivo?: string;
  pantalla?: PantallaDeInicio;
  ms?: number;
};

/** Lo inyectable, para que las pruebas corran sin base, sin MCP y sin modelo. */
export type Dependencias = {
  almacen: Almacen;
  huella: (usuarioId: string, dispositivoId: string) => Promise<string>;
  generar: (usuarioId: string, opciones?: OpcionesDeGeneracion) => Promise<PortadaGenerada>;
  activo: () => boolean;
  /** Si Inicio se arma con widgets vivos. Inyectable para las pruebas. */
  widgets?: () => boolean;
  /** El reloj, en milisegundos. Inyectable para probar la espera entre intentos. */
  ahora?: () => number;
};

const porDefecto: Dependencias = {
  almacen: almacenEnPostgres,
  huella: huellaDe,
  generar: generarPortada,
  activo: inicioActivo,
  widgets: () => configInicio.widgetsVivos,
};

export function inicioActivo(): boolean {
  return configInicio.activo && hayLlaveDelInicio() && Boolean(process.env.DATABASE_URL);
}

/** De que visitante se habla. Sin `dispositivoId`, el estado comun (el reloj, un script). */
export type Ambito = { dispositivoId?: string; deps?: Dependencias };

/** Lo que la pagina necesita para decidir que pintar. No dispara nada. */
export async function estadoDelInicio(usuarioId: string, ambito: Ambito = {}): Promise<EstadoDelInicio> {
  const deps = ambito.deps ?? porDefecto;
  if (!deps.activo()) return { activo: false, desactualizada: false };
  try {
    const vista = await vistaDe(usuarioId, ambito.dispositivoId ?? DISPOSITIVO_COMUN, deps);
    return { activo: true, pantalla: vista.pantalla, huella: vista.huella, desactualizada: vista.vencida };
  } catch (error) {
    // Sin base no hay portada ni forma de saber si cambio: la pagina programada sigue.
    console.warn(`[inicio] no pude leer la portada de ${usuarioId}: ${error instanceof Error ? error.message : String(error)}`);
    return { activo: false, desactualizada: false };
  }
}

/**
 * Que portada le toca a un dispositivo, si esta vencida y, si lo esta, DONDE se rearma.
 *
 *  1. Su portada propia, si la tiene y esta al dia: ya se aparto de la comun (aplico una
 *     accion, pregunto algo en Inicio, ajusto una tarjeta) y eso es suyo.
 *  2. Si sus datos son los comunes —misma huella: ni el ni el comun han aplicado nada—, la
 *     comun. Si esta vencida, se rearma LA COMUN: le sirve a el y a todos los que tampoco han
 *     hecho nada, y cien visitantes nuevos no son cien portadas pagadas. Una propia vieja
 *     queda tapada.
 *  3. Si no ha aplicado nada pero el comun SI (un script sin cookie aplico algo), la portada
 *     COMPARTIDA sin acciones (`DISPOSITIVO_SIN_ACCIONES`): la comun le mostraria lo que hizo
 *     otro (issue #37), y armarle una propia costaria una portada por visitante (issue #33).
 *     Se rearma ahi, una vez para todos ellos.
 *  4. Si ya aplico algo, su portada es suya y se rearma en su ambito.
 *
 * Mientras se rearma, `pantalla` es la mejor que hay para que el aviso de "Maya esta armando
 * tu inicio" sepa cual esperar que cambie: la propia vieja o la que le toca (la comun en 2, la
 * compartida en 3). Un visitante sin acciones nunca recibe la comun armada con acciones de otro.
 */
type Vista = { huella: string; pantalla?: PantallaDeInicio; vencida: boolean; destino: string };

async function vistaDe(usuarioId: string, dispositivoId: string, deps: Dependencias): Promise<Vista> {
  if (dispositivoId === DISPOSITIVO_COMUN) {
    const [huella, pantalla] = await Promise.all([deps.huella(usuarioId, DISPOSITIVO_COMUN), deps.almacen.leer(usuarioId, DISPOSITIVO_COMUN)]);
    return { huella, pantalla, vencida: vencida(pantalla, huella, deps), destino: DISPOSITIVO_COMUN };
  }

  const [huella, huellaComun, propia, comun] = await Promise.all([
    deps.huella(usuarioId, dispositivoId),
    deps.huella(usuarioId, DISPOSITIVO_COMUN),
    deps.almacen.leer(usuarioId, dispositivoId),
    deps.almacen.leer(usuarioId, DISPOSITIVO_COMUN),
  ]);
  if (propia && !vencida(propia, huella, deps)) return { huella, pantalla: propia, vencida: false, destino: dispositivoId };
  if (huella === huellaComun) {
    const alDia = Boolean(comun) && !vencida(comun, huella, deps);
    return { huella, pantalla: comun ?? propia, vencida: !alDia, destino: DISPOSITIVO_COMUN };
  }
  if (huellaSinAcciones(huella)) {
    const compartida = await deps.almacen.leer(usuarioId, DISPOSITIVO_SIN_ACCIONES);
    const alDia = Boolean(compartida) && !vencida(compartida, huella, deps);
    return { huella, pantalla: compartida ?? propia, vencida: !alDia, destino: DISPOSITIVO_SIN_ACCIONES };
  }
  return { huella, pantalla: propia ?? comun, vencida: true, destino: dispositivoId };
}

/**
 * Una generacion en vuelo por portada: (ambito, persona). Las cuatro puertas pueden pedirla
 * a la vez (el reloj, una visita, la accion, la ruta) y el modelo se llama una sola vez: las
 * demas esperan ese mismo resultado. Dos visitantes nuevos que abren a Beto a la vez esperan
 * la MISMA portada comun.
 */
const enVuelo = new Map<string, Promise<ResultadoDeRegeneracion>>();

/**
 * Los motivos que no traen un cambio de datos: alguien abrio Inicio, o el aviso de "Maya esta
 * armando tu inicio" pregunto si ya estaba. Si la generacion de una portada fallo (el modelo, la
 * red) o salio sin procedencias, sus datos siguen iguales y la portada sigue vencida: sin freno,
 * CADA visita pagaria otro intento. Con el, la misma portada (ambito, persona, huella) se
 * reintenta por visita como mucho una vez cada `ESPERA_ENTRE_INTENTOS_MS`. Una accion, el reloj
 * o `forzar` no esperan; y datos nuevos son otra huella, asi que tampoco.
 */
const MOTIVOS_PASIVOS = new Set(["visita", "consulta"]);
export const ESPERA_ENTRE_INTENTOS_MS = 5 * 60_000;
const intentosPorDependencias = new WeakMap<Dependencias, Map<string, number>>();

function intentosDe(deps: Dependencias): Map<string, number> {
  let intentos = intentosPorDependencias.get(deps);
  if (!intentos) {
    intentos = new Map();
    intentosPorDependencias.set(deps, intentos);
  }
  return intentos;
}

export function regenerarSiCambio(
  usuarioId: string,
  motivo: string,
  opciones: { forzar?: boolean; deps?: Dependencias; dispositivoId?: string } = {},
): Promise<ResultadoDeRegeneracion> {
  const deps = opciones.deps ?? porDefecto;
  const forzar = opciones.forzar ?? false;
  const dispositivoId = opciones.dispositivoId ?? DISPOSITIVO_COMUN;
  // La comun decide sin esperar nada: dos llamadas en el mismo tick comparten la generacion.
  if (dispositivoId === DISPOSITIVO_COMUN) return enUnVuelo(usuarioId, DISPOSITIVO_COMUN, motivo, forzar, deps);
  return regenerarDeDispositivo(usuarioId, dispositivoId, motivo, forzar, deps);
}

function enUnVuelo(usuarioId: string, ambito: string, motivo: string, forzar: boolean, deps: Dependencias): Promise<ResultadoDeRegeneracion> {
  const clave = `${ambito}|${usuarioId}`;
  const pendiente = enVuelo.get(clave);
  if (pendiente) return pendiente;

  const trabajo = regenerar(usuarioId, ambito, motivo, forzar, deps).finally(() => enVuelo.delete(clave));
  enVuelo.set(clave, trabajo);
  return trabajo;
}

async function regenerarDeDispositivo(
  usuarioId: string,
  dispositivoId: string,
  motivo: string,
  forzar: boolean,
  deps: Dependencias,
): Promise<ResultadoDeRegeneracion> {
  if (!deps.activo()) return { hecho: "inactivo", motivo: "flag apagado, sin llave o sin base" };
  const inicio = Date.now();
  let vista: Vista;
  try {
    vista = await vistaDe(usuarioId, dispositivoId, deps);
  } catch (error) {
    const detalle = error instanceof Error ? error.message : String(error);
    registrar({ inicio: usuarioId, dispositivoId, motivo, hecho: "fallo", detalle: `sin base: ${detalle}`, ms: Date.now() - inicio });
    return { hecho: "fallo", motivo: detalle };
  }
  if (!forzar && !vista.vencida) {
    registrar({ inicio: usuarioId, dispositivoId, motivo, hecho: "sin-cambios", huella: vista.huella, ms: Date.now() - inicio });
    return { hecho: "sin-cambios", pantalla: vista.pantalla, ms: Date.now() - inicio };
  }
  return enUnVuelo(usuarioId, vista.destino, motivo, forzar, deps);
}

/** Rearma la portada de UN ambito (`comun` o un dispositivo) si sus datos cambiaron. */
async function regenerar(usuarioId: string, ambito: string, motivo: string, forzar: boolean, deps: Dependencias): Promise<ResultadoDeRegeneracion> {
  if (!deps.activo()) return { hecho: "inactivo", motivo: "flag apagado, sin llave o sin base" };
  const inicio = Date.now();
  const dispositivoId = dispositivoParaRegistro(ambito);

  let huella: string;
  let anterior: PantallaDeInicio | undefined;
  try {
    [huella, anterior] = await Promise.all([deps.huella(usuarioId, ambito), deps.almacen.leer(usuarioId, ambito)]);
  } catch (error) {
    const detalle = error instanceof Error ? error.message : String(error);
    registrar({ inicio: usuarioId, dispositivoId, motivo, hecho: "fallo", detalle: `sin base: ${detalle}`, ms: Date.now() - inicio });
    return { hecho: "fallo", motivo: detalle };
  }

  if (!forzar && !vencida(anterior, huella, deps)) {
    registrar({ inicio: usuarioId, dispositivoId, motivo, hecho: "sin-cambios", huella, ms: Date.now() - inicio });
    return { hecho: "sin-cambios", pantalla: anterior, ms: Date.now() - inicio };
  }

  const ahora = deps.ahora?.() ?? Date.now();
  const intentos = intentosDe(deps);
  const claveDeIntento = `${ambito}|${usuarioId}|${huella}`;
  const ultimo = intentos.get(claveDeIntento);
  if (!forzar && MOTIVOS_PASIVOS.has(motivo) && ultimo !== undefined && ahora - ultimo < ESPERA_ENTRE_INTENTOS_MS) {
    const detalle = `en espera: esta portada se intento hace ${Math.round((ahora - ultimo) / 1000)} s`;
    registrar({ inicio: usuarioId, dispositivoId, motivo, hecho: "sin-cambios", huella, detalle, ms: Date.now() - inicio });
    return { hecho: "sin-cambios", motivo: detalle, pantalla: anterior, ms: Date.now() - inicio };
  }
  intentos.set(claveDeIntento, ahora);

  // El MCP de esta generacion lee el estado de ESE ambito: una portada de dispositivo se
  // arma con sus acciones, no con las del comun.
  const portada = await deps.generar(usuarioId, { motivo, dispositivoId: ambito });
  if (!portada.ok) {
    registrar({ inicio: usuarioId, dispositivoId, motivo, hecho: "fallo", corridaId: portada.corridaId, modelo: portada.modelo, pasos: portada.pasos, tools: portada.tools, detalle: portada.motivo, ms: portada.ms });
    return { hecho: "fallo", motivo: portada.motivo, pantalla: anterior, ms: portada.ms };
  }

  try {
    // La huella es la de ANTES de generar: describe los datos con los que se armo. Si
    // algo cambio mientras el modelo pensaba, la siguiente revision lo nota y rearma.
    const pantalla = await deps.almacen.guardar({
      usuarioId,
      dispositivoId: ambito,
      huella,
      mensajes: portada.mensajes,
      texto: portada.texto,
      razon: portada.razon,
      sugerencias: portada.sugerencias,
      modelo: portada.modelo,
      tools: portada.tools,
      entradaTokens: portada.entradaTokens,
      salidaTokens: portada.salidaTokens,
      cacheTokens: portada.cacheTokens,
      ms: portada.ms,
      procedencias: portada.procedencias,
      referencias: portada.referencias,
    });
    registrar({
      inicio: usuarioId,
      dispositivoId,
      motivo,
      hecho: "generada",
      corridaId: portada.corridaId,
      modelo: portada.modelo,
      pasos: portada.pasos,
      tools: portada.tools,
      componentes: componentesDe(pantalla),
      entrada: portada.entradaTokens,
      salida: portada.salidaTokens,
      cache: portada.cacheTokens,
      ms: portada.ms,
    });
    return { hecho: "generada", pantalla, ms: portada.ms };
  } catch (error) {
    const detalle = error instanceof Error ? error.message : String(error);
    registrar({ inicio: usuarioId, dispositivoId, motivo, hecho: "fallo", detalle: `no se pudo guardar: ${detalle}`, ms: Date.now() - inicio });
    return { hecho: "fallo", motivo: detalle, pantalla: anterior };
  }
}

/**
 * Si hay que rearmar: no hay portada, o se armo con otros datos, o —solo con widgets vivos
 * encendidos— se armo sin procedencias y por eso no admite preguntas por tarjeta.
 *
 * El modo NO entra a la huella a proposito. La base es la misma en local y en produccion, y
 * una portada de widgets es A2UI normal que el modo anterior pinta sin problema; si el modo
 * cambiara la huella, un entorno con el flag y otro sin el se rearmarian la portada el uno al
 * otro en cada tick, pagando modelo cada vez. Asi, el que tiene el flag la rearma UNA vez y
 * el otro la ve al dia.
 */
function vencida(pantalla: PantallaDeInicio | undefined, huella: string, deps: Dependencias): boolean {
  if (!pantalla || pantalla.huella !== huella) return true;
  if (!deps.widgets?.()) return false;
  // Sin procedencias, o con procedencias de OTRA portada: un proceso sin esta version pudo
  // rearmarla sin tocar esa columna. Cada procedencia tiene que nombrar una tarjeta que este.
  const ids = Object.keys(pantalla.procedencias ?? {});
  const tarjetas = tarjetasDe(pantalla.mensajes);
  return ids.length === 0 || ids.some((id) => tarjetas.get(id)?.component !== pantalla.procedencias[id]?.componente);
}

/**
 * Los tres usuarios, uno tras otro: es un reloj, no una carrera contra el proveedor. Solo la
 * portada COMUN: la de un dispositivo se rearma cuando ese dispositivo vuelve (visita) o
 * aplica algo (accion), asi que el costo del reloj no crece con los visitantes.
 */
export async function regenerarTodos(motivo: string, deps?: Dependencias): Promise<Record<string, ResultadoDeRegeneracion>> {
  const salida: Record<string, ResultadoDeRegeneracion> = {};
  for (const usuario of USUARIOS) {
    salida[usuario.id] = await regenerarSiCambio(usuario.id, motivo, { deps });
  }
  return salida;
}

/** Los nombres de los componentes del catalogo que trae la pantalla, para el log y la API. */
export function componentesDe(pantalla: PantallaDeInicio): string[] {
  const actualizacion = pantalla.mensajes.find(
    (m): m is Extract<typeof m, { updateComponents: unknown }> => "updateComponents" in m,
  );
  return actualizacion?.updateComponents.components.map((c) => c.component) ?? [];
}

/**
 * Una linea JSON por revision, como el turno del agente: es lo unico que dice cuanto
 * cuesta la portada (`entrada`/`cache`) y cuantas veces el reloj paso de largo.
 */
/**
 * Cada decision del servicio queda en consola y en `banorte.registros` (fuente `inicio`),
 * con la corrida del modelo cuando lo hubo. `sin-cambios` va como `debug`: el reloj lo
 * escribe cada 10 minutos por persona y no es noticia.
 */
function registrar(linea: Record<string, unknown>): void {
  const hecho = String(linea.hecho ?? "evento");
  registrarEnLaBase({
    fuente: "inicio",
    nivel: hecho === "fallo" ? "warn" : hecho === "sin-cambios" ? "debug" : "info",
    evento: hecho,
    usuarioId: typeof linea.inicio === "string" ? linea.inicio : null,
    corridaId: typeof linea.corridaId === "string" ? linea.corridaId : null,
    datos: linea,
  });
}
