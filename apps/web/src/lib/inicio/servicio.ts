import { registrar as registrarEnLaBase } from "@/lib/corridas/escritor";
import { USUARIOS } from "@/lib/usuarios";
import { componentesDe as tarjetasDe } from "@/lib/widgets/pantalla-viva";
import { almacenEnPostgres, type Almacen, type PantallaDeInicio } from "./almacen";
import { configInicio } from "./config";
import { generarPortada, type OpcionesDeGeneracion, type PortadaGenerada } from "./generar";
import { huellaDe } from "./huella";
import { hayLlaveDelInicio } from "./modelo";

/**
 * El servicio del Inicio personalizado: la unica puerta para leer la portada de alguien
 * y para decidir si se rearma. Lo usan la pagina de Inicio, la ruta `/api/inicio`, el
 * reloj y el gancho de "acabo de aplicar una accion" del agente.
 *
 * La regla que lo gobierna es una: **el modelo corre solo cuando algo cambio.** Una
 * portada se rearma si no existe o si su huella (`huella.ts`) ya no es la de los datos
 * de hoy. Si es la misma, ninguna de las cuatro puertas gasta un token.
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
  huella: (usuarioId: string) => Promise<string>;
  generar: (usuarioId: string, opciones?: OpcionesDeGeneracion) => Promise<PortadaGenerada>;
  activo: () => boolean;
  /** Si Inicio se arma con widgets vivos. Inyectable para las pruebas. */
  widgets?: () => boolean;
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

/** Lo que la pagina necesita para decidir que pintar. No dispara nada. */
export async function estadoDelInicio(usuarioId: string, deps: Dependencias = porDefecto): Promise<EstadoDelInicio> {
  if (!deps.activo()) return { activo: false, desactualizada: false };
  try {
    const [pantalla, huella] = await Promise.all([deps.almacen.leer(usuarioId), deps.huella(usuarioId)]);
    return { activo: true, pantalla, huella, desactualizada: vencida(pantalla, huella, deps) };
  } catch (error) {
    // Sin base no hay portada ni forma de saber si cambio: la pagina programada sigue.
    console.warn(`[inicio] no pude leer la portada de ${usuarioId}: ${error instanceof Error ? error.message : String(error)}`);
    return { activo: false, desactualizada: false };
  }
}

/**
 * Una generacion en vuelo por persona. Las cuatro puertas pueden pedirla a la vez (el
 * reloj, una visita, la accion, la ruta) y el modelo se llama una sola vez: las demas
 * esperan ese mismo resultado.
 */
const enVuelo = new Map<string, Promise<ResultadoDeRegeneracion>>();

export function regenerarSiCambio(
  usuarioId: string,
  motivo: string,
  opciones: { forzar?: boolean; deps?: Dependencias } = {},
): Promise<ResultadoDeRegeneracion> {
  const pendiente = enVuelo.get(usuarioId);
  if (pendiente) return pendiente;

  const trabajo = regenerar(usuarioId, motivo, opciones.forzar ?? false, opciones.deps ?? porDefecto).finally(() =>
    enVuelo.delete(usuarioId),
  );
  enVuelo.set(usuarioId, trabajo);
  return trabajo;
}

async function regenerar(usuarioId: string, motivo: string, forzar: boolean, deps: Dependencias): Promise<ResultadoDeRegeneracion> {
  if (!deps.activo()) return { hecho: "inactivo", motivo: "flag apagado, sin llave o sin base" };
  const inicio = Date.now();

  let huella: string;
  let anterior: PantallaDeInicio | undefined;
  try {
    [huella, anterior] = await Promise.all([deps.huella(usuarioId), deps.almacen.leer(usuarioId)]);
  } catch (error) {
    const detalle = error instanceof Error ? error.message : String(error);
    registrar({ inicio: usuarioId, motivo, hecho: "fallo", detalle: `sin base: ${detalle}`, ms: Date.now() - inicio });
    return { hecho: "fallo", motivo: detalle };
  }

  if (!forzar && !vencida(anterior, huella, deps)) {
    registrar({ inicio: usuarioId, motivo, hecho: "sin-cambios", huella, ms: Date.now() - inicio });
    return { hecho: "sin-cambios", pantalla: anterior, ms: Date.now() - inicio };
  }

  const portada = await deps.generar(usuarioId, { motivo });
  if (!portada.ok) {
    registrar({ inicio: usuarioId, motivo, hecho: "fallo", corridaId: portada.corridaId, modelo: portada.modelo, pasos: portada.pasos, tools: portada.tools, detalle: portada.motivo, ms: portada.ms });
    return { hecho: "fallo", motivo: portada.motivo, pantalla: anterior, ms: portada.ms };
  }

  try {
    // La huella es la de ANTES de generar: describe los datos con los que se armo. Si
    // algo cambio mientras el modelo pensaba, la siguiente revision lo nota y rearma.
    const pantalla = await deps.almacen.guardar({
      usuarioId,
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
    registrar({ inicio: usuarioId, motivo, hecho: "fallo", detalle: `no se pudo guardar: ${detalle}`, ms: Date.now() - inicio });
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

/** Los tres usuarios, uno tras otro: es un reloj, no una carrera contra el proveedor. */
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
