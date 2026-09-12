"use client";

import { useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

/**
 * La barra de conversacion: lo que hace que esto no sea un tablero.
 *
 * En escritorio flota al fondo del lienzo (`sticky`). En movil va fija sobre la barra de
 * pestanas, con `bottom-16` para no taparla ni quedar tapada.
 */
export function BarraConversacion({
  sugerencias = [],
  ocupado = false,
  alEnviar,
}: {
  sugerencias?: string[];
  ocupado?: boolean;
  alEnviar: (texto: string) => void;
}) {
  const [texto, setTexto] = useState("");

  function enviar(valor: string) {
    const limpio = valor.trim();
    if (!limpio || ocupado) return;
    setTexto("");
    alEnviar(limpio);
  }

  return (
    <div className="sticky bottom-16 z-30 flex flex-col gap-2 md:bottom-4">
      {sugerencias.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sugerencias.map((sugerencia) => (
            <Button
              key={sugerencia}
              variant="outline"
              size="sm"
              className="min-h-11 rounded-full bg-card text-xs shadow-sm hover:bg-tinte sm:min-h-9"
              onClick={() => enviar(sugerencia)}
              disabled={ocupado}
            >
              {sugerencia}
            </Button>
          ))}
        </div>
      )}

      <form
        className="flex items-center gap-2 rounded-2xl border border-borde-sutil bg-card p-2 shadow-md"
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
      >
        <Input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="¿Qué necesitas resolver hoy?"
          aria-label="Escríbele a Maya"
          className="border-0 shadow-none focus-visible:ring-0"
          disabled={ocupado}
        />
        <Button
          type="submit"
          size="icon"
          aria-label="Enviar"
          className="size-11 shrink-0 rounded-full sm:size-10"
          disabled={ocupado || texto.trim() === ""}
        >
          {ocupado ? <Spinner /> : <ArrowUp />}
        </Button>
      </form>
    </div>
  );
}
