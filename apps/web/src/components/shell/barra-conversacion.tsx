"use client";

import { useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Lo que hace que esto no sea un tablero: la barra esta siempre visible, flotando
 * abajo del lienzo. Los chips son las sugerencias que el agente ofrece.
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
    <div className="sticky bottom-4 flex flex-col gap-2">
      {sugerencias.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {sugerencias.map((s) => (
            <Button
              key={s}
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => enviar(s)}
              disabled={ocupado}
            >
              {s}
            </Button>
          ))}
        </div>
      ) : null}
      <form
        className="flex items-center gap-2 rounded-2xl border border-borde-sutil bg-card p-2 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
      >
        <Input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="¿Qué necesitas resolver hoy?"
          className="border-0 shadow-none focus-visible:ring-0"
          disabled={ocupado}
        />
        <Button type="submit" className="rounded-full" disabled={ocupado || texto.trim() === ""}>
          Enviar
          <ArrowUp data-icon="inline-end" />
        </Button>
      </form>
    </div>
  );
}
