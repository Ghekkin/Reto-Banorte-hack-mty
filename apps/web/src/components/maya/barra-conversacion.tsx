"use client";

import { useState } from "react";
import { ArrowUp, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

/**
 * La barra de conversación: input de texto y control de voz.
 *
 * Puede renderizarse en el centro de la pantalla (estado inicial) o anclada al fondo
 * (`sticky bottom`) una vez iniciada la conversación.
 */
export function BarraConversacion({
  sugerencias = [],
  ocupado = false,
  alEnviar,
  enCentro = false,
}: {
  sugerencias?: string[];
  ocupado?: boolean;
  alEnviar: (texto: string) => void;
  enCentro?: boolean;
}) {
  const [texto, setTexto] = useState("");
  const [escuchando, setEscuchando] = useState(false);

  function enviar(valor: string) {
    const limpio = valor.trim();
    if (!limpio || ocupado) return;
    setTexto("");
    setEscuchando(false);
    alEnviar(limpio);
  }

  function alternarVoz() {
    if (ocupado) return;
    setEscuchando((prev) => !prev);
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
            placeholder={escuchando ? "Escuchando... puedes hablar ahora" : "¿Qué necesitas resolver hoy?"}
            aria-label="Escríbele a Maya"
            className="border-0 shadow-none focus-visible:ring-0 text-xs sm:text-sm md:text-base py-2"
            disabled={ocupado}
            autoFocus
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={escuchando ? "Detener voz" : "Hablar con Maya"}
            onClick={alternarVoz}
            className={`size-9 sm:size-10 shrink-0 rounded-full transition-colors ${
              escuchando
                ? "bg-tinte text-primary animate-pulse"
                : "text-muted-foreground hover:text-primary hover:bg-muted"
            }`}
            disabled={ocupado}
          >
            <Mic className="size-4 sm:size-4.5" />
          </Button>

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
    <div className="sticky bottom-20 z-30 flex w-full flex-col transition-all duration-500 ease-out md:bottom-4">
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
          placeholder={escuchando ? "Escuchando... puedes hablar ahora" : "¿Qué necesitas resolver hoy?"}
          aria-label="Escríbele a Maya"
          className="border-0 shadow-none focus-visible:ring-0 text-xs sm:text-sm placeholder:text-xs sm:placeholder:text-sm py-1.5"
          disabled={ocupado}
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={escuchando ? "Detener voz" : "Hablar con Maya"}
          onClick={alternarVoz}
          className={`size-8 sm:size-9 shrink-0 rounded-full transition-colors ${
            escuchando
              ? "bg-tinte text-primary animate-pulse"
              : "text-muted-foreground hover:text-primary hover:bg-muted"
          }`}
          disabled={ocupado}
        >
          <Mic className="size-4 sm:size-4.5" />
        </Button>

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
