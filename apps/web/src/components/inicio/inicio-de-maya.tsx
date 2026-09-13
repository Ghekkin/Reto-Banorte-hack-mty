"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { estadoVacio, nombresVisibles, procesarVarios, type Accion, type EstadoSuperficie } from "@maya/a2ui";
import { Conclusion } from "@maya/catalogo";
import { Info } from "lucide-react";
import { Lienzo } from "@/components/maya/lienzo";
import { Badge } from "@/components/ui/badge";
import type { PantallaDeInicio } from "@/lib/inicio/almacen";
import { MARCA } from "@/lib/marca";

/**
 * El Inicio que armo Maya: la portada personalizada de esta persona, pintada con el
 * mismo lienzo y el mismo motor A2UI que la conversacion.
 *
 * Arriba va la **`Conclusion`**: la lectura de la situacion, en el tamano que merece.
 * Antes ese mismo texto se pintaba como un parrafo gris de 14 px con un avatar al lado —la
 * forma de una burbuja de chat—, y el consejo, que es lo unico que un banco no te da hoy,
 * era el elemento con menos peso visual de la pantalla. Ahora es una tarjeta del catalogo
 * como las demas.
 *
 * **La pinta el modelo; el host solo si falta.** La del modelo es mas rica (titular,
 * detalle, hasta 3 cifras de apoyo y las sugerencias, todo dentro de una sola tarjeta), y
 * los dos encargos de `generar.ts` la piden como primera tarjeta. Pero si el modelo la
 * omite, la pantalla se quedaria sin veredicto —pasa: `inicio-personalizado.md` registra
 * que el modelo chico omitio props obligatorias dos corridas seguidas teniendo la regla
 * escrita—, asi que el host arma una con el `texto` y la `razon`, que ya vienen validados.
 *
 * Hasta el 2026-09-12 el host la pintaba SIEMPRE, sin mirar el arbol, y salian dos
 * conclusiones en la misma pantalla: la rica del modelo y encima una pobre armada con una
 * frase corta. Era garantizado, no intermitente, en la ruta de preguntar desde Inicio.
 *
 * Los botones de las tarjetas funcionan: un toque manda a la persona a Maya con esa
 * accion ya disparada (`/maya?accion=…`). Inicio no ejecuta nada por si mismo; el ciclo
 * de accion vive en un solo lugar.
 */
export function InicioDeMaya({ pantalla, nombre }: { pantalla: PantallaDeInicio; nombre: string }) {
  const router = useRouter();

  const superficie = useMemo<EstadoSuperficie | undefined>(() => {
    const { estado } = procesarVarios(estadoVacio(), pantalla.mensajes);
    return estado.values().next().value;
  }, [pantalla.mensajes]);

  // Lo que se va a VER, no lo que venia en el mensaje: `nombresVisibles` recorre el arbol
  // desde la raiz, asi que una Conclusion que el modelo mando pero no colgo de ningun
  // lado no cuenta —y en ese caso el host si tiene que poner la suya.
  const laPintaElModelo = useMemo(
    () => (superficie ? nombresVisibles(superficie).includes("Conclusion") : false),
    [superficie],
  );

  const irAMaya = useCallback(
    (accion: Accion) => {
      router.push(`/maya?accion=${encodeURIComponent(JSON.stringify(accion))}`);
    },
    [router],
  );

  const { titular, detalle } = partirEnTitular(pantalla.texto);

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      {!laPintaElModelo && (
        <Conclusion
          saludo={`Hola, ${nombre.split(" ")[0]}`}
          titular={titular}
          detalle={detalle}
          sugerencias={pantalla.sugerencias}
          razon={pantalla.razon}
          // Una sugerencia de la portada lleva a Maya con esa pregunta, igual que antes: la
          // consulta desde Inicio vive en la barra flotante, que reemplaza la portada.
          alAccionar={(contexto) => {
            const pregunta = typeof contexto?.pregunta === "string" ? contexto.pregunta : "";
            if (pregunta) router.push(`/maya?intencion=${encodeURIComponent(pregunta)}`);
          }}
        />
      )}
      <Lienzo superficie={superficie} conversacionId="inicio" alAccionar={irAMaya} />
      <EvidenciaDeMaya pantalla={pantalla} />
    </div>
  );
}

/**
 * Parte el texto del turno en titular (la primera frase) y detalle (el resto).
 *
 * La portada guarda UN campo `texto` de una a tres frases, y `Conclusion` quiere un
 * titular grande y un detalle. Se parte en el primer punto seguido de espacio, que en
 * espanol acierta salvo con abreviaturas; si no hay punto, todo es titular y no hay
 * detalle. No se le pide al modelo que lo parta: seria un campo mas que puede omitir, y
 * esto es determinista.
 */
export function partirEnTitular(texto: string): { titular: string; detalle?: string } {
  const limpio = texto.trim();
  const corte = limpio.search(/\.\s+/);
  if (corte === -1) return { titular: limpio };
  return { titular: limpio.slice(0, corte + 1), detalle: limpio.slice(corte + 1).trim() || undefined };
}

/**
 * La evidencia de que esto lo decidio un modelo con datos reales: que modelo, cuantas
 * tools del MCP consulto, cuanto tardo y hace cuanto se armo.
 *
 * Va **debajo** del dashboard y en letra chica, no arriba con un avatar. Es informacion
 * para el jurado ("esto no esta cableado"), no para la persona: si compite por atencion
 * con la conclusion y con los montos, la pantalla vuelve a leerse como un chat.
 *
 * El "¿Por que veo esto?" ya no vive aqui: ahora es el pie de la tarjeta `Conclusion`,
 * como en cualquier otra tarjeta del catalogo.
 */
function EvidenciaDeMaya({ pantalla }: { pantalla: PantallaDeInicio }) {
  const tools = pantalla.tools.map((t) => t.replace(/!$/, ""));

  return (
    <p
      aria-label={`Como armo ${MARCA.nombre} esta pantalla`}
      className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-xs text-muted-foreground"
    >
      <Badge variant="outline" className="rounded-full border-borde-sutil font-normal">
        {pantalla.modelo}
      </Badge>
      {tools.length > 0 && (
        <span title={tools.join(" · ")}>
          {tools.length} {tools.length === 1 ? "tool del MCP" : "tools del MCP"} · {(pantalla.ms / 1000).toFixed(1)} s
        </span>
      )}
      <span aria-hidden>·</span>
      <time dateTime={pantalla.generadaEn} suppressHydrationWarning>
        {haceCuanto(pantalla.generadaEn)}
      </time>
    </p>
  );
}
/** "hace un momento", "hace 4 min", "hace 2 h": lo que se necesita para saber si es fresca. */
export function haceCuanto(iso: string, ahora = Date.now()): string {
  const segundos = Math.max(0, Math.round((ahora - new Date(iso).getTime()) / 1000));
  if (segundos < 60) return "hace un momento";
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  return `hace ${Math.round(horas / 24)} d`;
}
