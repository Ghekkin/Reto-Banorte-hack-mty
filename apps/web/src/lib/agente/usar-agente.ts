"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  estadoVacio,
  nombresVisibles,
  procesar,
  type Accion,
  type Estado,
  type FalloDeRender,
  type MensajeA2UI,
} from "@maya/a2ui";
import type { LineaStream, MensajeHistorial, PeticionAgente } from "@/lib/agente/tipos";

/**
 * El lado del cliente del contrato agente <-> cliente: manda el turno, lee el
 * stream JSONL linea por linea y aplica los mensajes A2UI al estado del renderer.
 *
 * Aqui esta el ciclo completo del reto: lo que la persona toca (`enviarAccion`)
 * vuelve al agente exactamente igual que lo que escribe (`enviarTexto`).
 */
export const SUPERFICIE = "principal";

/** Dos intentos de avisar y ya: mas que eso no es un componente roto, es el registro. */
const TOPE_DE_FALLOS = 2;

export function usarAgente(usuarioId: string) {
  const [estado, setEstado] = useState<Estado>(estadoVacio);
  const [historial, setHistorial] = useState<MensajeHistorial[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [sugerencias, setSugerencias] = useState<string[]>([]);
  const [razon, setRazon] = useState<string>();
  const [transparencia, setTransparencia] = useState<LineaStream[]>([]);
  const conversacionId = useRef(crearId());
  /** Cuantos fallos de render se le han contado al agente en esta conversacion. */
  const fallosReportados = useRef(0);

  /** Cambiar de usuario empieza conversacion nueva y borra la superficie. */
  const reiniciar = useCallback(() => {
    conversacionId.current = crearId();
    fallosReportados.current = 0;
    setEstado(estadoVacio());
    setHistorial([]);
    setSugerencias([]);
    setRazon(undefined);
    setTransparencia([]);
  }, []);

  const enviar = useCallback(
    async (parcial: Pick<PeticionAgente, "mensajes" | "accion" | "error">) => {
      setOcupado(true);
      setTransparencia([]);
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
                  componentes: nombresVisibles(superficie),
                  dataModel: superficie.dataModel,
                }
              : undefined,
          } satisfies PeticionAgente),
        });
        if (!respuesta.body) throw new Error("el agente no devolvio stream");

        for await (const linea of leerJSONL(respuesta.body)) {
          setTransparencia((t) => [...t, linea]);
          switch (linea.tipo) {
            case "a2ui":
              setEstado((actual) => procesar(actual, linea.mensaje as MensajeA2UI).estado);
              break;
            case "texto":
              setHistorial((h) => [...h, { rol: "agente", texto: linea.valor }]);
              break;
            case "razon":
              setRazon(linea.valor);
              break;
            case "sugerencias":
              setSugerencias(linea.valores);
              break;
            case "error":
              setHistorial((h) => [...h, { rol: "agente", texto: `⚠ ${linea.mensaje}` }]);
              break;
            default:
              break;
          }
        }
      } finally {
        setOcupado(false);
      }
    },
    [estado, usuarioId],
  );

  const enviarTexto = useCallback(
    async (texto: string) => {
      const mensajes: MensajeHistorial[] = [...historial, { rol: "usuario", texto }];
      setHistorial(mensajes);
      await enviar({ mensajes });
    },
    [enviar, historial],
  );

  /** Un toque en la UI es un turno mas: misma puerta, mismo contrato. */
  const enviarAccion = useCallback(
    async (accion: Accion) => {
      const resumen = `${accion.name} ${JSON.stringify(accion.context)}`;
      const mensajes: MensajeHistorial[] = [...historial, { rol: "accion", texto: resumen }];
      setHistorial(mensajes);
      await enviar({ mensajes, accion });
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

  return {
    superficie,
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

/** Lee el cuerpo como JSONL: una linea, un mensaje, sin esperar al final. */
async function* leerJSONL(cuerpo: ReadableStream<Uint8Array>): AsyncGenerator<LineaStream> {
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
