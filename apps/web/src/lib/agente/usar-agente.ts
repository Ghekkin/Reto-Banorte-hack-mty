"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  componentesVisibles,
  estadoVacio,
  nombresVisibles,
  procesar,
  type Accion,
  type Estado,
  type EstadoSuperficie,
  type FalloDeRender,
  type MensajeA2UI,
} from "@maya/a2ui";
import {
  MAX_PANTALLAS_ANTERIORES,
  type LineaStream,
  type MensajeHistorial,
  type PantallaAnterior,
  type PeticionAgente,
} from "@/lib/agente/tipos";
import { accionLegible, AVISO_DE_FALLO } from "@/lib/para-la-persona";

/**
 * El lado del cliente del contrato agente <-> cliente: manda el turno, lee el
 * stream JSONL linea por linea y aplica los mensajes A2UI al estado del renderer.
 *
 * Aqui esta el ciclo completo del reto: lo que la persona toca (`enviarAccion`)
 * vuelve al agente exactamente igual que lo que escribe (`enviarTexto`).
 *
 * ## El hilo guarda las pantallas, no solo el texto
 *
 * `hilo` es UNA lista en orden con las dos cosas que pasaron: lo que se dijo y lo que
 * Maya construyo. Antes solo guardaba texto y la pantalla vivia aparte, asi que cada
 * pregunta nueva borraba la tarjeta anterior: la conversacion quedaba llena de frases
 * sueltas ("en agosto tu mayor gasto fue Vivienda") sin la pantalla que las sostenia.
 *
 * Al cerrar un turno (`fin`) la superficie se **congela** en el hilo junto con la tira de
 * transparencia de ESE turno, y ahi se queda. El objeto congelado no se vuelve a tocar:
 * `procesar` devuelve estado nuevo en cada mensaje, asi que congelar es quedarse con la
 * referencia. El `historial` que viaja al agente se deriva de esta misma lista, para que
 * no haya dos versiones de la conversacion que se puedan separar.
 */
export const SUPERFICIE = "principal";

/**
 * Cual es la pantalla del turno EN CURSO: la que todavia no se congelo en el hilo.
 *
 * Vive fuera del hook porque es la unica decision del hilo que se puede equivocar en
 * silencio: si devuelve la que ya esta congelada, la pantalla se ve dos veces; si
 * devuelve `undefined` de mas, el turno en curso no se ve mientras se arma.
 *
 * La comparacion es por REFERENCIA y eso es exacto, no una aproximacion: `procesar`
 * nunca muta, devuelve estado nuevo en cada mensaje, asi que la superficie congelada al
 * cerrar el turno es identica a la del estado hasta que llegue el `createSurface` del
 * turno siguiente.
 */
export function calcularSuperficieViva(
  hilo: EntradaDelHilo[],
  superficie: EstadoSuperficie | undefined,
): EstadoSuperficie | undefined {
  for (let i = hilo.length - 1; i >= 0; i--) {
    const entrada = hilo[i]!;
    if (entrada.tipo === "pantalla") return superficie === entrada.superficie ? undefined : superficie;
  }
  return superficie;
}

/** Una entrada del hilo: una linea de conversacion, o una pantalla ya construida. */
export type EntradaDelHilo =
  | { tipo: "mensaje"; rol: MensajeHistorial["rol"]; texto: string }
  | { tipo: "pantalla"; superficie: EstadoSuperficie; transparencia: LineaStream[] };

/**
 * Donde va la pantalla del turno que acaba de cerrar.
 *
 * Un `pintar` **apila**: es otra pantalla, y la anterior se queda arriba como parte de la
 * conversacion. Un `ajustar` **actualiza la que ya estaba**, porque es LA MISMA pantalla con
 * otro parametro: apilarla dejaria la version vieja congelada justo encima de la nueva y el
 * cambio se leeria como un chat con tarjetas pegadas en vez de un dashboard que se mueve.
 *
 * Es una funcion pura y esta probada porque equivocarse aqui no rompe nada visiblemente:
 * solo hace que la misma pantalla aparezca dos veces.
 */
export function colocarPantalla(
  hilo: EntradaDelHilo[],
  entrada: Extract<EntradaDelHilo, { tipo: "pantalla" }>,
  esAjuste: boolean,
): EntradaDelHilo[] {
  if (!esAjuste) return [...hilo, entrada];
  for (let i = hilo.length - 1; i >= 0; i--) {
    if (hilo[i]!.tipo === "pantalla") {
      const copia = [...hilo];
      copia[i] = entrada;
      return copia;
    }
  }
  // Un ajuste sin pantalla previa en el hilo no deberia pasar (sin pantalla no hay tool que
  // ajustar), pero si pasa, mas vale pintarla que perderla.
  return [...hilo, entrada];
}

/**
 * El id de cada pantalla del hilo (`p1`, `p2`…, contadas desde la primera), alineado con los
 * indices del hilo; `undefined` en los mensajes.
 *
 * Es posicional a proposito: el hilo solo crece por el final y un ajuste reemplaza en su lugar,
 * asi que el numero de una pantalla no cambia en toda la conversacion. Es lo que el agente usa
 * para decir "la tarjeta del credito de la p1" (`ajustar_pantalla` con `pantalla`).
 */
export function numerarPantallas(hilo: EntradaDelHilo[]): Array<string | undefined> {
  let n = 0;
  return hilo.map((e) => (e.tipo === "pantalla" ? `p${++n}` : undefined));
}

/**
 * Las pantallas de arriba que viajan al agente: todas menos la actual, **las mas recientes
 * primero** y como mucho `MAX_PANTALLAS_ANTERIORES`. Con el arbol alcanzable desde la raiz,
 * igual que la actual (issue #3).
 *
 * `actual` es el id de la pantalla que ya va en `superficie`; si no hay (la superficie viva
 * todavia no se congelo), todas las del hilo cuentan como anteriores.
 */
export function pantallasAnteriores(hilo: EntradaDelHilo[], actual: string | undefined): PantallaAnterior[] {
  const ids = numerarPantallas(hilo);
  const salida: PantallaAnterior[] = [];
  for (let i = hilo.length - 1; i >= 0 && salida.length < MAX_PANTALLAS_ANTERIORES; i--) {
    const entrada = hilo[i]!;
    const id = ids[i];
    if (entrada.tipo !== "pantalla" || !id || id === actual) continue;
    salida.push({ pantalla: id, arbol: componentesVisibles(entrada.superficie), dataModel: entrada.superficie.dataModel });
  }
  return salida;
}

/**
 * Aplica un mensaje A2UI a una pantalla que YA quedo congelada arriba en el hilo, sin tocar la
 * actual. Es el lado cliente de "la actualiza donde esta": el ajuste llega con `pantalla` y se
 * procesa sobre esa superficie, con el mismo `procesar` que la viva (referencia nueva, asi que
 * React la vuelve a pintar). Si el id no existe, el hilo se devuelve igual: mejor no mostrar el
 * cambio que pintarlo en la pantalla equivocada.
 */
export function aplicarAPantallaAnterior(hilo: EntradaDelHilo[], pantalla: string, mensaje: MensajeA2UI): EntradaDelHilo[] {
  const i = numerarPantallas(hilo).indexOf(pantalla);
  const entrada = hilo[i];
  if (i < 0 || entrada?.tipo !== "pantalla") return hilo;
  const superficie = procesar(new Map([[entrada.superficie.id, entrada.superficie]]), mensaje).estado.get(entrada.superficie.id);
  if (!superficie || superficie === entrada.superficie) return hilo;
  const copia = [...hilo];
  copia[i] = { ...entrada, superficie };
  return copia;
}

/**
 * Pone una superficie ya procesada en la pantalla `id` del hilo, conservando su tira de
 * transparencia. Es como un ajuste a la pantalla ACTUAL se ve en su lugar mientras llega.
 *
 * ## Por que existe
 *
 * Un ajuste no manda `createSurface`, pero cada `updateDataModel` produce una superficie nueva
 * (`procesar` nunca muta). Si solo se guardaba en el estado vivo, `calcularSuperficieViva` la
 * veia distinta de la congelada y la consola pintaba **la pantalla completa otra vez debajo**
 * durante el turno, montada desde cero (sin animacion de cambio), y al `fin` la quitaba y
 * cambiaba la de arriba. Para la persona: «se recargo todo». El 2026-09-13 lo reporto asi el
 * usuario probando «¿y si pago $6,000?». Poniendo la superficie en su pantalla en cada parche, la
 * viva y la congelada son la misma referencia, no hay copia, y la tarjeta cambia donde esta.
 */
export function ponerEnPantalla(hilo: EntradaDelHilo[], id: string, superficie: EstadoSuperficie): EntradaDelHilo[] {
  const i = numerarPantallas(hilo).indexOf(id);
  const entrada = hilo[i];
  if (i < 0 || entrada?.tipo !== "pantalla" || entrada.superficie === superficie) return hilo;
  const copia = [...hilo];
  copia[i] = { ...entrada, superficie };
  return copia;
}

/** Dos intentos de avisar y ya: mas que eso no es un componente roto, es el registro. */
const TOPE_DE_FALLOS = 2;

export function usarAgente(usuarioId: string) {
  const [estado, setEstado] = useState<Estado>(estadoVacio);
  const [hilo, setHilo] = useState<EntradaDelHilo[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [sugerencias, setSugerencias] = useState<string[]>([]);
  const [razon, setRazon] = useState<string>();
  const [transparencia, setTransparencia] = useState<LineaStream[]>([]);
  /** La ultima pantalla de ARRIBA que un ajuste cambio, para traerla a la vista. */
  const [pantallaAjustada, setPantallaAjustada] = useState<{ pantalla: string; vez: number }>();
  const conversacionId = useRef(crearId());
  const peticionActiva = useRef<AbortController | null>(null);
  const ultimoUsuarioId = useRef(usuarioId);
  /**
   * El historial que viaja al agente sale del hilo, no de un estado paralelo: una sola
   * conversacion, imposible que las dos versiones se separen (contrato agente-cliente:
   * `mensajes` lleva SOLO texto, nunca JSON A2UI).
   */
  const historial = useMemo<MensajeHistorial[]>(
    () =>
      hilo
        .filter((e): e is Extract<EntradaDelHilo, { tipo: "mensaje" }> => e.tipo === "mensaje")
        .map(({ rol, texto }) => ({ rol, texto })),
    [hilo],
  );

  /** Cuantos fallos de render se le han contado al agente en esta conversacion. */
  const fallosReportados = useRef(0);

  /** Cambiar de usuario empieza conversacion nueva y borra la superficie. */
  const reiniciar = useCallback(() => {
    peticionActiva.current?.abort();
    peticionActiva.current = null;
    conversacionId.current = crearId();
    fallosReportados.current = 0;
    setEstado(estadoVacio());
    setHilo([]);
    setSugerencias([]);
    setRazon(undefined);
    setTransparencia([]);
    setPantallaAjustada(undefined);
    setOcupado(false);
  }, []);

  useEffect(() => {
    if (ultimoUsuarioId.current !== usuarioId) {
      ultimoUsuarioId.current = usuarioId;
      reiniciar();
    }
  }, [usuarioId, reiniciar]);

  useEffect(() => {
    return () => {
      peticionActiva.current?.abort();
    };
  }, []);

  /**
   * La respuesta hablable del turno: lo que dijo el agente en `texto`, o un fallback si
   * el turno solo pintó pantalla (o truena) sin decir nada. La usa la voz (ElevenLabs,
   * `docs/como-funciona/premio-elevenlabs.md`) para que la conversación hablada nunca se
   * quede en silencio esperando una frase que no existe.
   *
   * `alResponder` (opcional) dispara UNA vez, en cuanto llega la primera linea `texto` del
   * turno — que el servidor emite justo cuando la pantalla ya esta completa
   * (`agente.ts`: el cierre se resuelve antes que `texto`). Es lo que deja a la voz
   * arrancar en el momento exacto en que Maya tiene algo que decir, sin esperar a `fin`
   * (transparencia, sugerencias) ni adelantarse mientras el turno sigue en vuelo.
   */
  const enviar = useCallback(
    async (
      parcial: Pick<PeticionAgente, "mensajes" | "accion" | "error" | "pantallaDeLaAccion">,
      opciones?: { alResponder?: (texto: string) => void },
    ): Promise<string> => {
      setOcupado(true);
      setTransparencia([]);
      let respuestaHablada = "";
      let huboError = false;
      let yaAvisado = false;
      peticionActiva.current?.abort();
      const controlador = new AbortController();
      peticionActiva.current = controlador;
      try {
        const superficie = estado.get(SUPERFICIE);
        // La viva ya esta congelada al final del hilo (no hay turno en vuelo): es la ultima.
        const pantallas = numerarPantallas(hilo).filter((id): id is string => Boolean(id));
        const idActual = superficie && calcularSuperficieViva(hilo, superficie) === undefined ? pantallas.at(-1) : undefined;
        const anteriores = pantallasAnteriores(hilo, idActual);
        const respuesta = await fetch("/api/agente", {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: controlador.signal,
          body: JSON.stringify({
            usuarioId,
            conversacionId: conversacionId.current,
            mensajes: parcial.mensajes,
            accion: parcial.accion,
            error: parcial.error,
            ...(parcial.pantallaDeLaAccion ? { pantallaDeLaAccion: parcial.pantallaDeLaAccion } : {}),
            superficie: superficie
              ? {
                  surfaceId: superficie.id,
                  // Lo alcanzable desde la raiz, no el Map completo: ese acumula los
                  // componentes de toda la conversacion y le mentiria al agente (issue #3).
                  // Los nombres para leer de un vistazo; el arbol completo (ids, props,
                  // enlaces) para que el agente pueda PARCHEAR en vez de repintar todo.
                  componentes: nombresVisibles(superficie),
                  arbol: componentesVisibles(superficie),
                  dataModel: superficie.dataModel,
                  ...(idActual ? { pantalla: idActual } : {}),
                  ...(anteriores.length ? { anteriores } : {}),
                }
              : undefined,
          } satisfies PeticionAgente),
        });
        if (!respuesta.body) throw new Error("el agente no devolvio stream");

        // Copia local del estado y de las lineas: al llegar `fin` hace falta el valor
        // final de la superficie para congelarla, y `setEstado` no lo devuelve.
        let actual = estado;
        let huboCreateSurface = false;
        const lineas: LineaStream[] = [];

        for await (const linea of leerJSONL(respuesta.body)) {
          lineas.push(linea);
          setTransparencia([...lineas]);
          switch (linea.tipo) {
            case "a2ui":
              // Un ajuste a una pantalla de arriba se aplica a ESA, congelada; la actual no se toca.
              if (linea.pantalla && linea.pantalla !== idActual) {
                const { pantalla, mensaje } = linea;
                setHilo((h) => aplicarAPantallaAnterior(h, pantalla, mensaje as MensajeA2UI));
                break;
              }
              if ("createSurface" in linea.mensaje) huboCreateSurface = true;
              actual = procesar(actual, linea.mensaje as MensajeA2UI).estado;
              setEstado(actual);
              // Sin `createSurface` es un ajuste a la pantalla que YA esta en el hilo: se aplica
              // ahi mismo, para que no aparezca una copia completa debajo (`ponerEnPantalla`).
              if (!huboCreateSurface && idActual) {
                const nueva = actual.get(SUPERFICIE);
                if (nueva) setHilo((h) => ponerEnPantalla(h, idActual, nueva));
              }
              break;
            case "texto":
              respuestaHablada = respuestaHablada ? `${respuestaHablada} ${linea.valor}` : linea.valor;
              setHilo((h) => [...h, { tipo: "mensaje", rol: "agente", texto: linea.valor }]);
              if (!yaAvisado) {
                yaAvisado = true;
                opciones?.alResponder?.(linea.valor);
              }
              break;
            case "razon":
              setRazon(linea.valor);
              break;
            case "sugerencias":
              setSugerencias(linea.valores);
              break;
            case "error":
              // El detalle es para el equipo (queda en `transparencia` y en la consola); la
              // persona lee la frase que el servidor manda despues en `texto`, o el aviso de abajo.
              huboError = true;
              console.warn(`[agente] ${linea.codigo}: ${linea.mensaje}`);
              break;
            case "fin": {
              // La pantalla del turno se queda en el hilo, con su tira de transparencia.
              // Un turno que no pinto nada (prosa, error, `responder`) no congela nada: no
              // hay que dejar un hueco vacio en la conversacion.
              if (linea.cierre === "ajustar" && linea.pantalla && linea.pantalla !== idActual) {
                // Ya quedo aplicado arriba, linea por linea. Solo falta llevar la vista hasta alla.
                const pantalla = linea.pantalla;
                setPantallaAjustada((p) => ({ pantalla, vez: (p?.vez ?? 0) + 1 }));
                break;
              }
              const emitioA2ui = lineas.some((l) => l.tipo === "a2ui" && !l.pantalla);
              const pantalla = actual.get(SUPERFICIE);
              if (emitioA2ui && pantalla && pantalla.componentes.size > 0 && linea.cierre !== "responder") {
                const congelada = [...lineas];
                const entrada = { tipo: "pantalla" as const, superficie: pantalla, transparencia: congelada };
                setHilo((h) => colocarPantalla(h, entrada, linea.cierre === "ajustar"));
              }
              break;
            }
            default:
              break;
          }
        }
        if (huboError && !respuestaHablada) {
          respuestaHablada = AVISO_DE_FALLO;
          setHilo((h) => [...h, { tipo: "mensaje", rol: "agente", texto: AVISO_DE_FALLO }]);
        }
        return respuestaHablada || "Ya te deje la pantalla en tu conversacion con Maya.";
      } catch {
        if (controlador.signal.aborted) return "";
        if (!respuestaHablada) {
          respuestaHablada = AVISO_DE_FALLO;
          setHilo((h) => [...h, { tipo: "mensaje", rol: "agente", texto: AVISO_DE_FALLO }]);
        }
        return respuestaHablada;
      } finally {
        if (peticionActiva.current === controlador) {
          peticionActiva.current = null;
          setOcupado(false);
        }
      }
    },
    [estado, hilo, usuarioId],
  );

  const enviarTexto = useCallback(
    async (texto: string, opciones?: { alResponder?: (texto: string) => void }): Promise<string> => {
      const mensajes: MensajeHistorial[] = [...historial, { rol: "usuario", texto }];
      setHilo((h) => [...h, { tipo: "mensaje", rol: "usuario", texto }]);
      return enviar({ mensajes }, opciones);
    },
    [enviar, historial],
  );

  /**
   * Un toque en la UI es un turno mas: misma puerta, mismo contrato. `pantalla` es de cual
   * pantalla del hilo salio (`p1`…): los botones de las de arriba siguen vivos, y el agente
   * tiene que saber en cual buscar la tarjeta para cambiarla en su lugar.
   */
  const enviarAccion = useCallback(
    async (accion: Accion, pantalla?: string): Promise<string> => {
      const resumen = `${accion.name} ${JSON.stringify(accion.context)}`;
      const mensajes: MensajeHistorial[] = [...historial, { rol: "accion", texto: resumen }];
      // Al modelo le va el nombre y el context; a la persona, la accion en palabras.
      setHilo((h) => [...h, { tipo: "mensaje", rol: "accion", texto: accionLegible(accion) }]);
      return enviar({ mensajes, accion, ...(pantalla ? { pantallaDeLaAccion: pantalla } : {}) });
    },
    [enviar, historial],
  );

  /**
   * El canal de error de la spec (`VALIDATION_FAILED`): el renderer no supo pintar un
   * componente y se lo cuenta al agente, que repinta sin el.
   *
   * Tres frenos, y los tres hicieron falta. `Superficie` ya no reporta dos veces el MISMO
   * fallo, pero eso no basta: si el agente reintenta con OTRO componente que tampoco se
   * puede pintar, cada intento es un fallo distinto y el ping-pong no se acaba. Paso de
   * verdad el 2026-09-12 09:20, con el registro del renderer vacio en la consola: once
   * turnos seguidos, uno por componente del catalogo. Asi que:
   *
   *  1. `TOPE_DE_FALLOS` por conversacion. Al pasarlo, se anota y se calla: si la
   *     interfaz no puede pintar nada, el problema no lo va a arreglar el agente.
   *  2. Nada de reportar con un turno en vuelo.
   *  3. No entra al hilo visible como un turno de la persona: `historial.ts` ya le cuenta
   *     el fallo al modelo desde `peticion.error`, y en la pantalla decia "Tocaste:" algo
   *     que nadie toco. Va al panel de transparencia, que es su lugar.
   */
  const reportarFallo = useCallback(
    async (fallo: FalloDeRender) => {
      const resumen = `la interfaz no pudo pintar ${fallo.path}: ${fallo.message}`;
      if (fallosReportados.current >= TOPE_DE_FALLOS || ocupado) {
        console.warn(`[a2ui] ${resumen} (no se reporta: ${ocupado ? "turno en vuelo" : "tope alcanzado"})`);
        return;
      }
      fallosReportados.current++;
      setTransparencia((t) => [...t, { tipo: "error", codigo: "a2ui", mensaje: resumen }]);
      await enviar({ mensajes: historial, error: fallo });
    },
    [enviar, historial, ocupado],
  );

  const superficie = useMemo(() => estado.get(SUPERFICIE), [estado]);

  const superficieViva = useMemo(() => calcularSuperficieViva(hilo, superficie), [hilo, superficie]);

  return {
    hilo,
    superficie,
    superficieViva,
    pantallaAjustada,
    conversacionId: conversacionId.current,
    historial,
    ocupado,
    sugerencias,
    razon,
    transparencia,
    enviarTexto,
    enviarAccion,
    reportarFallo,
    reiniciar,
  };
}

/** Lee el cuerpo como JSONL: una linea, un mensaje, sin esperar al final. */async function* leerJSONL(cuerpo: ReadableStream<Uint8Array>): AsyncGenerator<LineaStream> {
  const lector = cuerpo.getReader();
  const decodificador = new TextDecoder();
  let resto = "";
  while (true) {
    const { done, value } = await lector.read();
    if (done) break;
    resto += decodificador.decode(value, { stream: true });
    const lineas = resto.split("\n");
    resto = lineas.pop() ?? "";
    for (const linea of lineas) {
      if (linea.trim() === "") continue;
      try {
        yield JSON.parse(linea) as LineaStream;
      } catch {
        console.warn("[agente] linea no parseable:", linea);
      }
    }
  }
}

/**
 * `getRandomValues` y no `randomUUID`: el segundo solo existe en contexto seguro (HTTPS o
 * localhost), y abriendo la web por `http://<ip>:3000` revienta el render de Maya.
 */
function crearId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return `c_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}
