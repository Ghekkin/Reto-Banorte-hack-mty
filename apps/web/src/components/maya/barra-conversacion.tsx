"use client";

import { useState } from "react";
import { ArrowUp, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { EstadoVoz } from "@/lib/voz/usar-conversacion-voz";

/**
 * La barra de conversación: input de texto y control de voz.
 *
 * Puede renderizarse en el centro de la pantalla (estado inicial) o anclada al fondo
 * (`sticky bottom`) una vez iniciada la conversación.
 *
 * El botón de voz es controlado desde `ConsolaMaya` (`estadoVoz`/`alAlternarVoz`):
 * esta barra no sabe nada de ElevenLabs, solo pinta el estado que le pasan
 * (docs/como-funciona/premio-elevenlabs.md).
 */
export function BarraConversacion({
  sugerencias = [],
  ocupado = false,
  alEnviar,
  enCentro = false,
  estadoVoz = "inactiva",
  alAlternarVoz,
}: {
  sugerencias?: string[];
  ocupado?: boolean;
  alEnviar: (texto: string) => void;
  enCentro?: boolean;
  /** `undefined` cuando la voz esta apagada (`FEATURE_VOZ`): el boton no se pinta. */
  estadoVoz?: EstadoVoz;
  alAlternarVoz?: () => void;
}) {
  const [texto, setTexto] = useState("");
  const enSesionDeVoz = estadoVoz === "conectando" || estadoVoz === "activa";
  const placeholder =
    estadoVoz === "activa"
      ? "Escuchando... puedes hablar ahora"
      : estadoVoz === "conectando"
        ? "Conectando con Maya..."
        : "¿Qué necesitas resolver hoy?";

  function enviar(valor: string) {
    const limpio = valor.trim();
    if (!limpio || ocupado) return;
    setTexto("");
    alEnviar(limpio);
  }

  if (enCentro) {
    return (
      <div className="flex w-full flex-col items-center gap-3 sm:gap-4 transition-all duration-500 ease-out">
        <form
          className="flex w-full items-center gap-1.5 sm:gap-2 rounded-2xl border border-borde-sutil bg-card p-1.5 sm:p-2.5 shadow-lg ring-1 ring-black/5 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
          onSubmit={(e) => {
            e.preventDefault();
            enviar(texto);
          }}
        >
          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={placeholder}
            aria-label="Escríbele a Maya"
            className="border-0 shadow-none focus-visible:ring-0 text-xs sm:text-sm md:text-base py-2"
            disabled={ocupado}
            autoFocus
          />

          {alAlternarVoz && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={enSesionDeVoz ? "Detener voz" : "Hablar con Maya"}
              onClick={alAlternarVoz}
              className={`size-9 sm:size-10 shrink-0 rounded-full transition-colors ${
                enSesionDeVoz
                  ? "bg-tinte text-primary animate-pulse"
                  : "text-muted-foreground hover:text-primary hover:bg-muted"
              }`}
              disabled={estadoVoz === "cerrando" || (ocupado && !enSesionDeVoz)}
            >
              <Mic className="size-4 sm:size-4.5" />
            </Button>
          )}

          <Button
            type="submit"
            size="icon"
            aria-label="Enviar"
            className="size-9 sm:size-10 shrink-0 rounded-full bg-primary text-primary-foreground shadow-xs transition-transform hover:bg-primary/90 active:scale-95"
            disabled={ocupado || texto.trim() === ""}
          >
            {ocupado ? <Spinner /> : <ArrowUp className="size-4 sm:size-4.5" />}
          </Button>
        </form>

        {sugerencias.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 max-w-xl">
            {sugerencias.map((sugerencia) => (
              <button
                key={sugerencia}
                type="button"
                className="rounded-full border border-borde-sutil bg-card px-2.5 py-1 text-[11px] font-normal text-muted-foreground shadow-2xs transition-all hover:border-primary/40 hover:bg-tinte hover:text-primary active:scale-95 sm:px-3 sm:py-1.5 sm:text-xs"
                onClick={() => enviar(sugerencia)}
                disabled={ocupado}
              >
                {sugerencia}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    // Anclada abajo como en cualquier chat: una banda con el color del lienzo y un degradado arriba
    // tapa lo que se desplaza por detras (antes la tarjeta de abajo se asomaba alrededor del input).
    // En movil la banda baja hasta la barra de pestanas; en escritorio deja 16 px al borde.
    <div className="sticky bottom-0 z-30 -mx-3 flex flex-col bg-[linear-gradient(to_top,var(--lienzo)_70%,transparent)] px-3 pt-6 pb-[calc(5rem+env(safe-area-inset-bottom))] md:-mx-4 md:px-4 md:pb-4">
      <form
        className="flex items-center gap-1.5 sm:gap-2 rounded-2xl border border-borde-sutil bg-card/95 backdrop-blur-md p-1.5 sm:p-2 shadow-md focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
      >
        <Input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={placeholder}
          aria-label="Escríbele a Maya"
          className="border-0 shadow-none focus-visible:ring-0 text-xs sm:text-sm placeholder:text-xs sm:placeholder:text-sm py-1.5"
          disabled={ocupado}
        />

        {alAlternarVoz && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={enSesionDeVoz ? "Detener voz" : "Hablar con Maya"}
            onClick={alAlternarVoz}
            className={`size-8 sm:size-9 shrink-0 rounded-full transition-colors ${
              enSesionDeVoz
                ? "bg-tinte text-primary animate-pulse"
                : "text-muted-foreground hover:text-primary hover:bg-muted"
            }`}
            disabled={estadoVoz === "cerrando" || (ocupado && !enSesionDeVoz)}
          >
            <Mic className="size-4 sm:size-4.5" />
          </Button>
        )}

        <Button
          type="submit"
          size="icon"
          aria-label="Enviar"
          className="size-8 sm:size-9 shrink-0 rounded-full bg-primary text-primary-foreground shadow-xs transition-transform hover:bg-primary/90 active:scale-95"
          disabled={ocupado || texto.trim() === ""}
        >
          {ocupado ? <Spinner /> : <ArrowUp className="size-4 sm:size-4.5" />}
        </Button>
      </form>
    </div>
  );
}
