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
import type { LineaStream, MensajeHistorial, PeticionAgente } from "@/lib/agente/tipos";
import { guardarHilo, olvidarHilo, recuperarHilo } from "@/lib/agente/persistencia";

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

/** Dos intentos de avisar y ya: mas que eso no es un componente roto, es el registro. */
const TOPE_DE_FALLOS = 2;

export function usarAgente(usuarioId: string) {
  const [estado, setEstado] = useState<Estado>(estadoVacio);
  const [hilo, setHilo] = useState<EntradaDelHilo[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [sugerencias, setSugerencias] = useState<string[]>([]);
  const [razon, setRazon] = useState<string>();
  const [transparencia, setTransparencia] = useState<LineaStream[]>([]);
  const conversacionId = useRef(crearId());
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
    conversacionId.current = crearId();
    fallosReportados.current = 0;
    setEstado(estadoVacio());
    setHilo([]);
    setSugerencias([]);
    setRazon(undefined);
    setTransparencia([]);
    // Y de la sesion tambien: si solo se limpiara la memoria, recargar la pagina resucitaria
    // la conversacion que se acaba de tirar.
    olvidarHilo(usuarioId);
  }, [usuarioId]);

  /**
   * Rehidratar la conversacion de la sesion.
   *
   * Corre una sola vez por usuario y **antes de que la persona pueda escribir**, porque si
   * llegara despues de un turno le pisaria el hilo nuevo con el viejo. El `usuarioActivo` es
   * la llave: al cambiar de persona esto vuelve a correr, no encuentra nada suyo (o encuentra
   * su propia conversacion anterior, que es lo correcto) y el efecto de abajo se encarga del
   * borrado.
   */
  const hidratadoPara = useRef<string | undefined>(undefined);
  if (hidratadoPara.current !== usuarioId) {
    hidratadoPara.current = usuarioId;
    const recuperado = recuperarHilo(usuarioId);
    if (recuperado) {
      conversacionId.current = recuperado.conversacionId;
      // Ajuste de estado durante el render y no en un `useEffect`: con el efecto se pintaria
      // un fotograma con la conversacion vacia y el hilo apareceria de golpe despues.
      setEstado(recuperado.estado);
      setHilo(recuperado.hilo);
      setSugerencias(recuperado.sugerencias);
      setRazon(recuperado.razon);
    } else {
      // Otro usuario: conversacion nueva, no la de quien estaba antes.
      conversacionId.current = crearId();
      fallosReportados.current = 0;
      setEstado(estadoVacio());
      setHilo([]);
      setSugerencias([]);
      setRazon(undefined);
      setTransparencia([]);
    }
  }

  // Y se guarda cada vez que el hilo cambia. Va en un efecto porque escribir en
  // `sessionStorage` es un efecto secundario y no puede pasar durante el render.
  useEffect(() => {
    guardarHilo(usuarioId, { hilo, conversacionId: conversacionId.current, sugerencias, razon });
  }, [usuarioId, hilo, sugerencias, razon]);

  /**
   * La respuesta hablable del turno: lo que dijo el agente en `texto`, o un fallback si
   * el turno solo pintó pantalla (o truena) sin decir nada. La usa la voz (ElevenLabs,
   * `docs/como-funciona/premio-elevenlabs.md`) para que la conversación hablada nunca se
   * quede en silencio esperando una frase que no existe.
   */
  const enviar = useCallback(
    async (parcial: Pick<PeticionAgente, "mensajes" | "accion" | "error">): Promise<string> => {
      setOcupado(true);
      setTransparencia([]);
      let respuestaHablada = "";
      try {
        const superficie = estado.get(SUPERFICIE);
        const respuesta = await fetch("/api/agente", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            usuarioId,
            conversacionId: conversacionId.current,
            mensajes: parcial.mensajes,
            accion: parcial.accion,
            error: parcial.error,
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
                }
              : undefined,
          } satisfies PeticionAgente),
        });
        if (!respuesta.body) throw new Error("el agente no devolvio stream");

        // Copia local del estado y de las lineas: al llegar `fin` hace falta el valor
        // final de la superficie para congelarla, y `setEstado` no lo devuelve.
        let actual = estado;
        const lineas: LineaStream[] = [];

        for await (const linea of leerJSONL(respuesta.body)) {
          lineas.push(linea);
          setTransparencia([...lineas]);
          switch (linea.tipo) {
            case "a2ui":
              actual = procesar(actual, linea.mensaje as MensajeA2UI).estado;
              setEstado(actual);
              break;
            case "texto":
              respuestaHablada = respuestaHablada ? `${respuestaHablada} ${linea.valor}` : linea.valor;
              setHilo((h) => [...h, { tipo: "mensaje", rol: "agente", texto: linea.valor }]);
              break;
            case "razon":
              setRazon(linea.valor);
              break;
            case "sugerencias":
              setSugerencias(linea.valores);
              break;
            case "error":
              respuestaHablada = respuestaHablada || `Tuve un problema: ${linea.mensaje}`;
              setHilo((h) => [...h, { tipo: "mensaje", rol: "agente", texto: `⚠ ${linea.mensaje}` }]);
              break;
            case "fin": {
              // La pantalla del turno se queda en el hilo, con su tira de transparencia.
              // Un turno que no pinto nada (prosa, error, `responder`) no congela nada: no
              // hay que dejar un hueco vacio en la conversacion.
              const emitioA2ui = lineas.some((l) => l.tipo === "a2ui");
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
        return respuestaHablada || "Ya te deje la pantalla en tu conversacion con Maya.";
      } finally {
        setOcupado(false);
      }
    },
    [estado, usuarioId],
  );

  const enviarTexto = useCallback(
    async (texto: string): Promise<string> => {
      const mensajes: MensajeHistorial[] = [...historial, { rol: "usuario", texto }];
      setHilo((h) => [...h, { tipo: "mensaje", rol: "usuario", texto }]);
      return enviar({ mensajes });
    },
    [enviar, historial],
  );

  /** Un toque en la UI es un turno mas: misma puerta, mismo contrato. */
  const enviarAccion = useCallback(
    async (accion: Accion): Promise<string> => {
      const resumen = `${accion.name} ${JSON.stringify(accion.context)}`;
      const mensajes: MensajeHistorial[] = [...historial, { rol: "accion", texto: resumen }];
      setHilo((h) => [...h, { tipo: "mensaje", rol: "accion", texto: resumen }]);
      return enviar({ mensajes, accion });
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

function crearId(): string {
  return `c_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
}
