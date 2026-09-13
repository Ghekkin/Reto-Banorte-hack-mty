"use client";

import { useRouter } from "next/navigation";
import type { Accion, PiezaDeRaiz } from "@maya/a2ui";
import { Lienzo, type DecoracionDePieza } from "@/components/maya/lienzo";
import type { PantallaDeInicio } from "@/lib/inicio/almacen";
import { etiquetaDe, sugerenciasDe } from "@/lib/widgets/etiquetas";
import { EvidenciaDeMaya } from "./inicio-de-maya";
import { PieDeWidget } from "./pie-de-widget";
import { BarraFlotanteMaya } from "./tarjetas-inicio";
import { usarWidgetsVivos, type ConsultaEnCurso } from "./usar-widgets-vivos";

/**
 * Inicio con widgets vivos (`FEATURE_WIDGETS_VIVOS`, `docs/como-funciona/widgets-vivos.md`).
 *
 * La portada es la misma que arma Maya; lo que cambia es que **cada tarjeta se puede
 * preguntar**. Debajo de cada una hay un "Preguntar sobre esto" que fija el foco de la barra;
 * la pregunta viaja a `POST /api/inicio/widget` y lo que regresa es UNA tarjeta nueva (o una
 * nota), que se aplica en su lugar. Las demas no se mueven, no parpadean y no pierden lo que
 * la persona tenia elegido.
 *
 * Mientras se consulta, solo la tarjeta en foco lleva el velo de "Consultando al banco…";
 * sin foco, la barra dice que tool del MCP se esta leyendo. Cuando llega el cambio, la
 * tarjeta se resalta un momento y su nota dice de que tool salieron los datos y si el
 * auditor los verifico.
 *
 * Los botones de accion de las tarjetas (aplicar un plan, crear un apartado) siguen yendo a
 * Maya con la accion disparada, igual que en la portada de siempre: el ciclo de accion vive
 * en un solo lugar.
 */
export function InicioVivo({ pantalla }: { pantalla: PantallaDeInicio }) {
  const router = useRouter();
  const vivo = usarWidgetsVivos(pantalla.mensajes);
  const { superficie, foco, consulta, notas, actualizada, preguntar, elegirFoco, cerrarNota } = vivo;

  const alAccionar = (accion: Accion) => {
    // Una sugerencia de la conclusion se pregunta aqui mismo, sin salir de Inicio.
    const pregunta = accion.name === "preguntar" && typeof accion.context.pregunta === "string" ? accion.context.pregunta : undefined;
    if (pregunta) {
      elegirFoco(undefined);
      void preguntar(pregunta, undefined);
      return;
    }
    router.push(`/maya?accion=${encodeURIComponent(JSON.stringify(accion))}`);
  };

  // Sin memoizar a proposito: cambia con cada etapa de la consulta, y el lienzo re-pinta
  // de todos modos cuando cambia el estado vivo.
  const decorar = (pieza: PiezaDeRaiz): DecoracionDePieza | undefined => {
    // Sin fuente (la conclusion) no hay nada que re-consultar: es la lectura de Maya.
    if (!pantalla.procedencias[pieza.id]) return undefined;
    const etiqueta = etiquetaDe(pieza.componente);
    const cargando = consulta !== undefined && consulta.widgetId === pieza.id;
    return {
      estado: cargando ? "cargando" : actualizada === pieza.id ? "actualizada" : undefined,
      aviso: cargando ? avisoDe(consulta) : undefined,
      debajo: (
        <PieDeWidget
          etiqueta={etiqueta}
          nota={notas[pieza.id]}
          enFoco={foco === pieza.id}
          ocupado={consulta !== undefined}
          alPreguntar={() => elegirFoco(foco === pieza.id ? undefined : pieza.id)}
          alCerrarNota={() => cerrarNota(pieza.id)}
          sugerencias={foco === pieza.id ? sugerenciasDeLaTarjeta(pieza.componente) : undefined}
          alSugerir={(pregunta) => void preguntar(pregunta, pieza.id)}
        />
      ),
    };
  };

  const componenteEnFoco = foco ? superficie?.componentes.get(foco)?.component : undefined;

  /** Las del modelo si las dio en la ultima respuesta; si no, las del tipo de tarjeta. */
  function sugerenciasDeLaTarjeta(componente: string): string[] {
    return vivo.sugerencias.length ? vivo.sugerencias : sugerenciasDe(componente);
  }

  return (
    <div className="relative flex flex-col gap-3 pb-40 md:gap-4 md:pb-32">
      <Lienzo superficie={superficie} conversacionId="inicio" alAccionar={alAccionar} decorar={decorar} ocultarSugerenciasEnTarjeta={false} />
      {vivo.notaGeneral && (
        <PieDeWidget etiqueta="Inicio" nota={vivo.notaGeneral} alCerrarNota={() => cerrarNota("general")} />
      )}
      <EvidenciaDeMaya pantalla={pantalla} />
      <BarraFlotanteMaya
        vivo={{
          enviar: (texto) => void preguntar(texto),
          ocupado: consulta !== undefined,
          estado: consulta ? avisoDe(consulta) : undefined,
          foco: foco && componenteEnFoco ? { etiqueta: etiquetaDe(componenteEnFoco), alQuitar: () => elegirFoco(undefined) } : undefined,
          // Con foco, las sugerencias viven en el pie de la tarjeta; sin foco, sobre la barra.
          sugerencias: foco ? [] : vivo.sugerencias,
          fallo: vivo.fallo,
          alDescartarFallo: vivo.descartarFallo,
        }}
      />
    </div>
  );
}

/** Lo que se esta haciendo, dicho para la persona y con la tool para el jurado. */
function avisoDe(consulta: ConsultaEnCurso): string {
  if (consulta.etapa === "consultando" && consulta.tool) return `Consultando ${consulta.tool}…`;
  if (consulta.etapa === "armando") return "Actualizando la tarjeta…";
  return "Maya está pensando…";
}
