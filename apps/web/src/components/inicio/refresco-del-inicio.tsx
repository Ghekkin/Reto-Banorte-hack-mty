"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { MARCA } from "@/lib/marca";

/**
 * Mientras Maya rearma la portada, Inicio muestra la pantalla programada y esta pieza
 * pregunta cada pocos segundos a `/api/inicio` si ya esta la nueva. En cuanto llega,
 * refresca la pagina: las tarjetas de Maya entran solas, sin que nadie recargue.
 *
 * Es lo que hace visible el ciclo en la demo: se aplica el plan en Maya, se vuelve a
 * Inicio y, si la portada todavia no esta, se ve llegar. Deja de preguntar a los 90 s:
 * si el modelo no contesto en ese tiempo, no va a contestar, y una pagina que pregunta
 * para siempre es un bug que nadie ve.
 */
const CADA_MS = 3_000;
const TOPE_MS = 90_000;

export function RefrescoDelInicio({ usuarioId, generadaEn }: { usuarioId: string; generadaEn: string | null }) {
  const router = useRouter();
  const [rendida, setRendida] = useState(false);

  useEffect(() => {
    const arranque = Date.now();
    let activo = true;

    const preguntar = async () => {
      if (!activo) return;
      if (Date.now() - arranque > TOPE_MS) {
        setRendida(true);
        return;
      }
      try {
        const respuesta = await fetch(`/api/inicio?usuario=${encodeURIComponent(usuarioId)}`, { cache: "no-store" });
        const cuerpo = (await respuesta.json()) as {
          activo: boolean;
          desactualizada: boolean;
          pantalla: { generadaEn: string } | null;
        };
        if (!cuerpo.activo) {
          setRendida(true);
          return;
        }
        if (!cuerpo.desactualizada && cuerpo.pantalla && cuerpo.pantalla.generadaEn !== generadaEn) {
          router.refresh();
          return;
        }
      } catch {
        // La red parpadeo: se vuelve a preguntar en el siguiente tick.
      }
      if (activo) temporizador = setTimeout(preguntar, CADA_MS);
    };

    let temporizador = setTimeout(preguntar, CADA_MS);
    return () => {
      activo = false;
      clearTimeout(temporizador);
    };
  }, [usuarioId, generadaEn, router]);

  if (rendida) return null;

  return (
    <div
      role="status"
      className="animar-entrada flex items-center gap-2 rounded-2xl border border-borde-sutil bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm"
    >
      <Spinner className="size-4 text-primary" aria-label="" />
      <span>{MARCA.nombre} está armando tu inicio con tus datos de hoy…</span>
    </div>
  );
}
