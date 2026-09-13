"use client";

import { Spinner } from "@/components/ui/spinner";
import type { LineaStream } from "@/lib/agente/tipos";

/**
 * Lo que Maya esta haciendo mientras el turno corre, dicho para la persona.
 *
 * **Por que existe.** El turno mas lento tarda ~10 s, y sin esto lo unico que se movia
 * era el spinner del boton de enviar.
 *
 * **De donde sale.** De la ultima linea `estado` del stream (`transparencia`, que
 * `usarAgente` guarda completa). No se simula nada: el texto cambia cuando el servidor
 * de verdad paso de interpretar a consultar datos o a construir la pantalla.
 *
 * **Sin texto tecnico.** Hasta el 2026-09-13 era una tira con los badges LLM · MCP · A2UI,
 * los nombres de las tools que se llamaron y "3 pasos · 5.2 s" al terminar, y se quedaba
 * en el hilo junto a cada pantalla. Era evidencia para el jurado en la pantalla de la
 * persona. Ahora solo se ve mientras Maya trabaja y desaparece al terminar; el detalle
 * sigue en el stream y en el log del servidor.
 */

const LEYENDA_ESTADO: Record<string, string> = {
  pensando: "Entendiendo lo que necesitas",
  consultando: "Consultando tus datos",
  pintando: "Armando tu pantalla",
};

export function ProgresoMaya({
  transparencia,
  ocupado,
}: {
  transparencia: LineaStream[];
  ocupado: boolean;
}) {
  if (!ocupado) return null;

  const ultimoEstado = [...transparencia].reverse().find((l) => l.tipo === "estado");
  const leyenda = (ultimoEstado && LEYENDA_ESTADO[ultimoEstado.valor]) ?? "Pensando";

  return (
    <div
      role="status"
      aria-live="polite"
      className="animar-entrada flex items-center gap-2 self-start rounded-2xl border border-borde-sutil bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm"
    >
      <Spinner className="size-4 text-primary" aria-hidden />
      <span>{leyenda}…</span>
    </div>
  );
}
