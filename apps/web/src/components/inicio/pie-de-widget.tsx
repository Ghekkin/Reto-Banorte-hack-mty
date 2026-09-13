"use client";

import { MessageCircleQuestion, ShieldCheck, X } from "lucide-react";
import { IconoBanorte } from "@/components/marca/logo-banorte";
import { Button } from "@/components/ui/button";
import type { Nota } from "./usar-widgets-vivos";

/**
 * Lo que va debajo de cada tarjeta viva de Inicio: la nota de Maya cuando la persona le
 * pregunto algo a ESA tarjeta, y el boton para preguntarle.
 *
 * La nota va pegada a su tarjeta y no en un chat aparte: es lo que hace que la respuesta se
 * lea como "esta tarjeta me contesto" y no como una conversacion encima del dashboard. No es
 * una tarjeta dentro de otra (skill `diseno-banorte`, tres capas): es un bloque de tinte suave
 * en el lienzo, debajo.
 *
 * La linea "Verificado con el banco" solo sale cuando el auditor re-consulto el MCP y la
 * tarjeta coincidio campo por campo (`fin.auditoria` de `/api/inicio/widget`).
 */
export function PieDeWidget({
  etiqueta,
  nota,
  enFoco,
  ocupado,
  alPreguntar,
  alCerrarNota,
  sugerencias = [],
  alSugerir,
}: {
  etiqueta: string;
  nota?: Nota;
  enFoco?: boolean;
  ocupado?: boolean;
  /** Sin esto no hay boton: una nota general, que no es de ninguna tarjeta. */
  alPreguntar?: () => void;
  alCerrarNota: () => void;
  /** Con foco: las preguntas listas para esta tarjeta, en el flujo y no flotando sobre ella. */
  sugerencias?: string[];
  alSugerir?: (pregunta: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {nota && (
        <div role="status" className="animar-entrada flex items-start gap-3 rounded-2xl bg-tinte/70 px-4 py-3">
          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,var(--primary)_0%,var(--marca-oscuro)_100%)] text-primary-foreground">
            <IconoBanorte className="size-3.5" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-sm text-foreground">{nota.texto}</p>
            {nota.cierre !== "responder" && nota.tool && (
              <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                {nota.verificada && <ShieldCheck aria-hidden className="size-3.5 text-exito" />}
                <span>{nota.verificada ? "Cifras verificadas con el banco" : "Datos del banco"}</span>
                <span aria-hidden>·</span>
                <code className="font-mono">{nota.tool}</code>
                <span aria-hidden>·</span>
                <span className="monto">{(nota.ms / 1000).toFixed(1)} s</span>
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={alCerrarNota} aria-label="Cerrar la nota" className="-mr-2 -mt-1 size-12 shrink-0 rounded-full md:size-9">
            <X className="size-4" />
          </Button>
        </div>
      )}
      {alPreguntar && (
        <Button
          variant="ghost"
          size="sm"
          onClick={alPreguntar}
          disabled={ocupado}
          aria-pressed={enFoco}
          className={`min-h-12 self-start rounded-full px-3 text-sm md:min-h-9 ${
            enFoco ? "bg-tinte text-primary hover:bg-tinte-fuerte hover:text-primary" : "text-muted-foreground"
          }`}
        >
          <MessageCircleQuestion aria-hidden className="size-4" />
          {enFoco ? `Preguntando sobre ${etiqueta.toLowerCase()}` : "Preguntar sobre esto"}
        </Button>
      )}
      {/* Van aqui y no flotando sobre la barra: en un celular, flotando tapaban justo la
          nota y la tarjeta por la que se estaba preguntando. */}
      {enFoco && alSugerir && sugerencias.length > 0 && (
        <div className="animar-cascada flex flex-wrap gap-2">
          {sugerencias.map((s) => (
            <Button
              key={s}
              variant="outline"
              size="sm"
              disabled={ocupado}
              onClick={() => alSugerir(s)}
              className="animar-entrada min-h-12 rounded-full bg-card text-sm hover:bg-tinte md:min-h-9"
            >
              {s}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
