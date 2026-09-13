"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { estadoVacio, procesar, procesarVarios, type Estado, type EstadoSuperficie, type MensajeA2UI } from "@maya/a2ui";
import { avanzarProgreso, PROGRESO_INICIAL, type ProgresoDeConsulta } from "@/lib/widgets/etapas";
import type { LineaDeWidget } from "@/lib/widgets/linea";

/**
 * El estado vivo del Inicio en el navegador: la superficie A2UI que se va actualizando
 * tarjeta por tarjeta, el foco, lo que se esta consultando y las notas de Maya.
 *
 * La superficie arranca de los mensajes guardados de la portada y despues **solo recibe
 * `updateComponents` de una tarjeta** desde `POST /api/inicio/widget`. Se aplican con el
 * mismo reducer puro del motor (`procesar`), asi que React re-renderiza la tarjeta que
 * cambio y las demas conservan su nodo, su scroll y lo que la persona tenia elegido. No
 * hay `router.refresh()`: eso volveria a pintar la pagina entera, que es justo la
 * sensacion de "cambio de diapositiva" que esto existe para quitar.
 */

export type Nota = {
  texto: string;
  /** Cual de las tres salidas cerro el turno. */
  cierre: "modificar" | "reemplazar" | "responder";
  /** La tool del MCP que lleno la tarjeta, para la linea de procedencia. */
  tool?: string;
  /** true si el auditor re-consulto el MCP y la tarjeta coincidio campo por campo. */
  verificada: boolean;
  ms: number;
};

export type ConsultaEnCurso = {
  pregunta: string;
  /** La tarjeta que se esta cambiando; `undefined` mientras el modelo decide cual. */
  widgetId?: string;
  /** En que etapa va, segun las lineas reales del stream (`lib/widgets/etapas.ts`). */
  progreso: ProgresoDeConsulta;
  /** `Date.now()` al enviar: de aqui salen los segundos de espera que se muestran. */
  desde: number;
};

const GENERAL = "general";
/** Cuanto se queda el resaltado de "esta tarjeta cambio". */
const RESALTADO_MS = 1600;

/**
 * Lleva a la vista la tarjeta que respondio. En un celular la tarjeta en foco puede estar
 * dos pantallas abajo de donde se escribio la pregunta; sin esto, la respuesta llegaba y
 * no se veia. `nearest` no mueve nada si ya se ve completa.
 */
function mostrar(widgetId: string): void {
  setTimeout(() => {
    document.querySelector(`[data-pieza="${CSS.escape(widgetId)}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, 60);
}

export function usarWidgetsVivos(mensajesIniciales: MensajeA2UI[]) {
  const [estado, setEstado] = useState<Estado>(() => procesarVarios(estadoVacio(), mensajesIniciales).estado);
  const [foco, setFoco] = useState<string>();
  const [consulta, setConsulta] = useState<ConsultaEnCurso>();
  const [notas, setNotas] = useState<Record<string, Nota>>({});
  const [actualizada, setActualizada] = useState<string>();
  const [fallo, setFallo] = useState<string>();
  const [sugerencias, setSugerencias] = useState<string[]>([]);
  const historial = useRef<Array<{ pregunta: string; respuesta: string }>>([]);
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);

  const superficie = useMemo<EstadoSuperficie | undefined>(() => estado.values().next().value, [estado]);

  const preguntar = useCallback(
    async (pregunta: string, focoElegido: string | undefined = foco) => {
      const limpia = pregunta.trim();
      if (limpia.length < 3 || consulta) return;
      setFallo(undefined);
      setSugerencias([]);
      setConsulta({ pregunta: limpia, widgetId: focoElegido, progreso: PROGRESO_INICIAL, desde: Date.now() });

      try {
        const respuesta = await fetch("/api/inicio/widget", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ pregunta: limpia, foco: focoElegido, historial: historial.current }),
        });
        if (!respuesta.ok || !respuesta.body) {
          const cuerpo = (await respuesta.json().catch(() => ({}))) as { error?: string };
          throw new Error(cuerpo.error ?? `el servidor contesto ${respuesta.status}`);
        }

        const lector = respuesta.body.getReader();
        const decodificador = new TextDecoder();
        let resto = "";
        let cerrado = false;
        for (;;) {
          const { value, done } = await lector.read();
          if (done) break;
          resto += decodificador.decode(value, { stream: true });
          const lineas = resto.split("\n");
          resto = lineas.pop() ?? "";
          for (const cruda of lineas) {
            if (!cruda.trim()) continue;
            const linea = JSON.parse(cruda) as LineaDeWidget;
            cerrado = atender(linea, limpia) || cerrado;
          }
        }
        if (!cerrado) throw new Error("La respuesta se cortó antes de terminar.");
      } catch (error) {
        setFallo(error instanceof Error ? error.message : String(error));
      } finally {
        setConsulta(undefined);
      }

      function atender(linea: LineaDeWidget, preguntaHecha: string): boolean {
        if (linea.tipo !== "fin" && linea.tipo !== "error") {
          setConsulta((c) => c && { ...c, progreso: avanzarProgreso(c.progreso, linea) });
        }
        switch (linea.tipo) {
          case "estado":
          case "tool":
            return false;
          case "a2ui": {
            const mensaje = linea.mensaje;
            const cambiada = "updateComponents" in mensaje ? mensaje.updateComponents.components[0]?.id : undefined;
            setConsulta((c) => c && { ...c, widgetId: c.widgetId ?? cambiada });
            setEstado((actual) => procesar(actual, mensaje).estado);
            return false;
          }
          case "fin": {
            const clave = linea.widgetId ?? GENERAL;
            setNotas((n) => ({
              ...n,
              [clave]: {
                texto: linea.texto,
                cierre: linea.cierre,
                tool: linea.procedencia?.tool,
                verificada: Boolean(linea.auditoria && linea.auditoria.revisados > 0 && linea.auditoria.diferencias.length === 0),
                ms: linea.ms,
              },
            }));
            setSugerencias(linea.sugerencias);
            if (linea.widgetId && linea.cierre !== "responder") {
              setActualizada(linea.widgetId);
              clearTimeout(temporizador.current);
              temporizador.current = setTimeout(() => setActualizada(undefined), RESALTADO_MS);
            }
            // El foco sigue a la tarjeta de la respuesta: la siguiente pregunta es sobre ella.
            if (linea.widgetId) {
              setFoco(linea.widgetId);
              mostrar(linea.widgetId);
            }
            historial.current = [...historial.current, { pregunta: preguntaHecha, respuesta: linea.texto.slice(0, 600) }].slice(-3);
            return true;
          }
          case "error":
            setFallo(linea.mensaje);
            return true;
        }
      }
    },
    [consulta, foco],
  );

  const cerrarNota = useCallback((clave: string) => {
    setNotas(({ [clave]: _fuera, ...resto }) => resto);
  }, []);

  return {
    superficie,
    foco,
    elegirFoco: setFoco,
    consulta,
    notas,
    notaGeneral: notas[GENERAL],
    cerrarNota,
    actualizada,
    fallo,
    descartarFallo: () => setFallo(undefined),
    sugerencias,
    preguntar,
  };
}
