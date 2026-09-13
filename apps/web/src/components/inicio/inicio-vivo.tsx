"use client";

import { useRouter } from "next/navigation";
import type { Accion, PiezaDeRaiz } from "@maya/a2ui";
import { Lienzo, type DecoracionDePieza } from "@/components/maya/lienzo";
import type { PantallaDeInicio } from "@/lib/inicio/almacen";
import { textoDeEtapa } from "@/lib/widgets/etapas";
import { etiquetaDe, sugerenciasDe } from "@/lib/widgets/etiquetas";
import { EvidenciaDeMaya } from "./inicio-de-maya";
import { PensandoMaya } from "./pensando-maya";
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
 * **Mientras Maya piensa** (2 a 8 s, a veces mas), sobre la barra va `PensandoMaya`: la etapa
 * real del turno («Consultando tus datos»), la pregunta que se hizo y los segundos de espera; y
 * la tarjeta que se va a tocar lleva un brillo que la recorre, sin taparla. Antes era un velo
 * blanco que lavaba la tarjeta con el aviso en su borde de arriba (fuera de la pantalla en un
 * celular) y, sin foco, solo el placeholder de la barra. Ver `lib/widgets/etapas.ts`.
 * Cuando llega el cambio, la tarjeta se resalta un momento y su nota dice de que tool salieron
 * los datos y si el auditor los verifico.
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
      aviso: cargando ? `${textoDeEtapa(consulta.progreso.etapa, { conTarjeta: true })}…` : undefined,
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

  /** La tarjeta por la que se pregunta, en palabras ("tu crédito"); sin tarjeta, nada. */
  function sobreQue(c: ConsultaEnCurso): string | undefined {
    const componente = c.widgetId ? superficie?.componentes.get(c.widgetId)?.component : undefined;
    return componente ? etiquetaDe(componente).toLowerCase() : undefined;
  }

  /** Las del modelo si las dio en la ultima respuesta; si no, las del tipo de tarjeta. */
  function sugerenciasDeLaTarjeta(componente: string): string[] {
    return vivo.sugerencias.length ? vivo.sugerencias : sugerenciasDe(componente);
  }

  return (
    <div className="relative flex flex-col gap-3 pb-40 md:gap-4 md:pb-32">
      <Lienzo superficie={superficie} conversacionId="inicio" acomodo="masonry" alAccionar={alAccionar} decorar={decorar} ocultarSugerenciasEnTarjeta={false} />
      {vivo.notaGeneral && (
        <PieDeWidget etiqueta="Inicio" nota={vivo.notaGeneral} alCerrarNota={() => cerrarNota("general")} />
      )}
      <EvidenciaDeMaya pantalla={pantalla} />
      <BarraFlotanteMaya
        vivo={{
          enviar: (texto) => void preguntar(texto),
          ocupado: consulta !== undefined,
          // Corto: con el chip de foco, a 390 px cabe poco. Lo que pasa lo dice `PensandoMaya`.
          estado: consulta ? "Un momento…" : undefined,
          pensando: consulta && (
            <PensandoMaya
              pregunta={consulta.pregunta}
              progreso={consulta.progreso}
              desde={consulta.desde}
              sobre={sobreQue(consulta)}
            />
          ),
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


