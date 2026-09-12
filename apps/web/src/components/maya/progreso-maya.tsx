"use client";

import { Badge } from "@/components/ui/badge";
import type { LineaStream } from "@/lib/agente/tipos";
import { cn } from "@/lib/utils";

/**
 * Las tres piezas del reto, encendiendose mientras el turno corre.
 *
 * **Por que existe.** El reto exige LLM + MCP + A2UI, y son 30 puntos de la rubrica que
 * de otro modo no se ven: la pantalla aparece y nadie sabe que hubo un modelo
 * interpretando, un servidor MCP dando datos y un protocolo describiendo la interfaz.
 * Ademas el turno mas lento tarda ~10 s, y antes de esto lo unico que se movia era el
 * spinner del boton de enviar.
 *
 * **De donde salen los datos.** De `transparencia`, que es el stream JSONL crudo tal como
 * llego (`usarAgente` guarda TODAS las lineas). No se inventa nada ni se simula: un badge
 * encendido significa que esa linea existio de verdad en la respuesta del servidor.
 *
 * Es deliberadamente una tira y no un panel desplegable: tiene que leerse proyectado y de
 * un vistazo, sin que nadie tenga que abrirla en medio de la demo.
 */

type Pieza = { clave: string; etiqueta: string; activa: boolean; detalle: string };

const LEYENDA_ESTADO: Record<string, string> = {
  pensando: "Interpretando lo que necesitas",
  consultando: "Consultando tus datos",
  pintando: "Construyendo la pantalla",
};

export function ProgresoMaya({
  transparencia,
  ocupado,
}: {
  transparencia: LineaStream[];
  ocupado: boolean;
}) {
  if (transparencia.length === 0 && !ocupado) return null;

  const tools = transparencia.filter((l) => l.tipo === "tool");
  const hayA2ui = transparencia.some((l) => l.tipo === "a2ui");
  const fin = transparencia.find((l) => l.tipo === "fin");
  const ultimoEstado = [...transparencia].reverse().find((l) => l.tipo === "estado");

  const piezas: Pieza[] = [
    {
      clave: "llm",
      etiqueta: "LLM",
      activa: transparencia.length > 0 || ocupado,
      detalle: "interpreta la intención",
    },
    {
      clave: "mcp",
      etiqueta: "MCP",
      activa: tools.length > 0,
      detalle: tools.length > 0 ? tools.map((t) => t.nombre).join(" · ") : "datos y acciones",
    },
    {
      clave: "a2ui",
      etiqueta: "A2UI",
      activa: hayA2ui,
      detalle: "describe la interfaz",
    },
  ];

  // Mientras corre manda el estado del turno; al terminar, lo que costo.
  const pie = ocupado
    ? (ultimoEstado && LEYENDA_ESTADO[ultimoEstado.valor]) ?? "Trabajando"
    : fin
      ? `${fin.pasos} ${fin.pasos === 1 ? "paso" : "pasos"} · ${(fin.ms / 1000).toFixed(1)} s`
      : "";

  return (
    <div className="animar-entrada flex flex-col gap-2 rounded-2xl border border-borde-sutil bg-card px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {piezas.map((pieza) => (
          <Badge
            key={pieza.clave}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-semibold transition-colors duration-150",
              pieza.activa ? "bg-tinte text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            {pieza.etiqueta}
          </Badge>
        ))}
        {pie && (
          <span className="monto ml-auto text-sm text-muted-foreground" aria-live="polite">
            {pie}
          </span>
        )}
      </div>

      {/* La linea de detalle nombra las herramientas que de verdad se llamaron. Es lo que
          convierte "confia en mi" en "mira, aqui estan". */}
      <p className="truncate text-sm text-muted-foreground">
        {tools.length > 0
          ? `Herramientas MCP: ${tools.map((t) => t.nombre).join(" · ")}`
          : "Maya interpreta, pide los datos al servidor MCP y describe la pantalla en A2UI."}
      </p>
    </div>
  );
}
