"use client";

import { useEffect, useState } from "react";
import { IconoBanorte } from "@/components/marca/logo-banorte";
import { Progress } from "@/components/ui/progress";
import { paraLaEspera, segmentosDe, textoDeEtapa, type ProgresoDeConsulta } from "@/lib/widgets/etapas";

/**
 * Lo que se ve sobre la barra de Inicio mientras Maya contesta: qué está haciendo, la pregunta
 * de la persona y en qué punto del camino va.
 *
 * **Por que sobre la barra y no en la tarjeta.** En un celular la tarjeta por la que se pregunta
 * suele estar arriba o abajo de lo que se ve, y la pregunta se escribió en la barra: ahí es donde
 * están los ojos. La tarjeta, además, lleva su propio brillo (`PiezaDecorada` en
 * `components/maya/lienzo.tsx`) para que se vea CUÁL va a cambiar.
 *
 * **Sin mentir.** El texto y los segmentos salen de las líneas reales del stream
 * (`lib/widgets/etapas.ts`); lo único que corre con el reloj son los segundos de espera, que
 * aparecen a partir de los 3 s. Con "reducir movimiento" el icono no late y el segmento actual
 * no barre: queda lleno a medias, quieto.
 *
 * Es un `role="status"` con `aria-live`: un lector de pantalla anuncia cada etapa nueva.
 */
export function PensandoMaya({
  pregunta,
  progreso,
  desde,
  sobre,
}: {
  pregunta: string;
  progreso: ProgresoDeConsulta;
  /** `Date.now()` al enviar. */
  desde: number;
  /** La tarjeta por la que se pregunta, ya en palabras ("tu crédito"). */
  sobre?: string;
}) {
  const espera = usarEspera(desde);
  const texto = textoDeEtapa(progreso.etapa, { conTarjeta: Boolean(sobre) });
  const segmentos = segmentosDe(progreso.etapa);

  return (
    <div
      role="status"
      aria-live="polite"
      data-etapa={progreso.etapa}
      className="animar-entrada pointer-events-auto flex w-full max-w-2xl flex-col gap-3 rounded-2xl border border-borde-sutil bg-card/95 px-4 py-3 shadow-md backdrop-blur-md"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="pensando-latido grid size-9 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,var(--primary)_0%,var(--marca-oscuro)_100%)] text-primary-foreground"
        >
          <IconoBanorte className="size-4" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="flex min-w-0 items-baseline gap-2 text-sm font-medium text-foreground">
            <span className="truncate">{texto}…</span>
            {espera && <span className="monto shrink-0 text-xs font-normal text-muted-foreground">{espera}</span>}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {sobre ? `Sobre ${sobre} · ` : ""}«{pregunta}»
          </p>
        </div>
      </div>
      {/* Tres segmentos: entender, consultar, responder. El actual barre (o queda a medias,
          quieto, con "reducir movimiento"); los hechos, llenos. Para lectores de pantalla ya
          lo dice el texto. */}
      <div aria-hidden className="grid grid-cols-3 gap-1">
        {segmentos.map((segmento, i) => (
          <Progress
            key={i}
            value={segmento === "hecho" ? 100 : segmento === "actual" ? null : 0}
            data-segmento={segmento}
            // El riel en tinte y no en `muted`: sobre la tarjeta translucida el gris no se veia
            // y los segmentos pendientes desaparecian (medido a 390 px).
            className={`[&_[data-slot=progress-indicator]]:bg-primary [&_[data-slot=progress-track]]:bg-tinte ${segmento === "actual" ? "pensando-segmento" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}

/** Los segundos que lleva la espera, en palabras, refrescados cada segundo. */
function usarEspera(desde: number): string | undefined {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const intervalo = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(intervalo);
  }, []);
  return paraLaEspera(ahora - desde);
}
