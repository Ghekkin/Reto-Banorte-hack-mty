"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { estadoVacio, procesarVarios, type Accion, type EstadoSuperficie } from "@maya/a2ui";
import { Info } from "lucide-react";
import { IconoBanorte } from "@/components/marca/logo-banorte";
import { Lienzo } from "@/components/maya/lienzo";
import { Badge } from "@/components/ui/badge";
import type { PantallaDeInicio } from "@/lib/inicio/almacen";
import { MARCA } from "@/lib/marca";

/**
 * El Inicio que armo Maya: la portada personalizada de esta persona, pintada con el
 * mismo lienzo y el mismo motor A2UI que la conversacion.
 *
 * Arriba va lo que Maya le dice de frente (`texto`) y la evidencia de que esto lo
 * decidio un modelo con datos reales —que tools consulto, cuando, en cuanto tiempo— con
 * el "¿Por que veo esto?" plegado, como en cada tarjeta. Abajo, las tarjetas.
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

  const irAMaya = useCallback(
    (accion: Accion) => {
      router.push(`/maya?accion=${encodeURIComponent(JSON.stringify(accion))}`);
    },
    [router],
  );

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <EncabezadoDeMaya pantalla={pantalla} nombre={nombre} />
      <Lienzo superficie={superficie} conversacionId="inicio" alAccionar={irAMaya} />
    </div>
  );
}

function EncabezadoDeMaya({ pantalla, nombre }: { pantalla: PantallaDeInicio; nombre: string }) {
  const [abierta, setAbierta] = useState(false);
  const tools = pantalla.tools.map((t) => t.replace(/!$/, ""));

  return (
    <section
      aria-label={`Lo que ${MARCA.nombre} te dice hoy`}
      className="animar-entrada flex flex-col gap-3 rounded-2xl border border-borde-sutil bg-card p-4 shadow-sm md:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,var(--primary)_0%,var(--marca-oscuro)_100%)] text-primary-foreground shadow-xs">
          <IconoBanorte className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs text-muted-foreground">
            Hola, {nombre.split(" ")[0]}. {MARCA.nombre} armó tu inicio{" "}
            <time dateTime={pantalla.generadaEn} suppressHydrationWarning>
              {haceCuanto(pantalla.generadaEn)}
            </time>
          </p>
          <p className="text-sm leading-relaxed text-foreground md:text-base">{pantalla.texto}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <Badge variant="outline" className="rounded-full border-borde-sutil font-normal">
          {pantalla.modelo}
        </Badge>
        {tools.length > 0 && (
          <span className="truncate" title={tools.join(" · ")}>
            {tools.length} {tools.length === 1 ? "tool del MCP" : "tools del MCP"} · {(pantalla.ms / 1000).toFixed(1)} s
          </span>
        )}
        <button
          type="button"
          onClick={() => setAbierta((v) => !v)}
          aria-expanded={abierta}
          className="ml-auto inline-flex min-h-8 items-center gap-1 rounded-full px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
        >
          <Info className="size-3.5" aria-hidden /> ¿Por qué veo esto?
        </button>
      </div>

      {abierta && (
        <p className="rounded-xl bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {pantalla.razon}
          {tools.length > 0 && <span className="block pt-1">Consulté: {tools.join(", ")}.</span>}
        </p>
      )}

      {pantalla.sugerencias.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {pantalla.sugerencias.map((sugerencia) => (
            <Link
              key={sugerencia}
              href={`/maya?intencion=${encodeURIComponent(sugerencia)}`}
              className="rounded-full border border-borde-sutil bg-background px-3 py-1.5 text-xs text-muted-foreground shadow-2xs transition-all hover:border-primary/40 hover:bg-tinte hover:text-primary active:scale-95"
            >
              {sugerencia}
            </Link>
          ))}
        </div>
      )}
    </section>
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
