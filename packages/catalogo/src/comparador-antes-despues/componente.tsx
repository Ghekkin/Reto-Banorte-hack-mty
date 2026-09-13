"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PropsComponente } from "@maya/a2ui";
import { CLASES_BOTON_PIE, formatearMonto } from "../comunes";
import { EsqueletoCuerpo, EsqueletoEncabezado, EsqueletoPie, EsqueletoTarjeta, Linea } from "../esqueletos";
import { PieTarjeta, Tarjeta } from "../tarjeta";
import { SERIES } from "../graficas";
import type { PropsComparadorAntesDespues } from "./schema";

/**
 * Qué pasa si sigues igual contra qué pasa si aplicas la estrategia.
 *
 * **Dos barras, una escala.** Es una comparación de magnitud (skill `dataviz`), y eso lo
 * dice mejor un par de barras horizontales con su monto al lado que dos tarjetas de
 * texto una junto a la otra. La barra del camino actual va en rojo (lo que duele) y la de
 * la estrategia en oscuro (lo bueno): el mismo par de tonos que el resto del catálogo.
 * El ahorro es el número grande, porque es lo que decide la conversación.
 */
export function ComparadorAntesDespues(props: Partial<PropsComparadorAntesDespues> & Pick<PropsComponente, "alAccionar">) {
  const { titulo, ahorroNetoCentavos, ahorroTiempoMeses, escenarioActual, escenarioEstrategia, heroe = false, razon, alAccionar } = props;

  if (!titulo || typeof ahorroNetoCentavos !== "number" || !escenarioActual || !escenarioEstrategia) {
    return (
      <EsqueletoTarjeta heroe={heroe} etiqueta="Comparando los dos caminos">
        <EsqueletoEncabezado />
        <EsqueletoCuerpo className="flex flex-col gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="flex justify-between">
                <Linea tamano="sm" ancho="w-40" />
                <Linea tamano="sm" ancho="w-24" />
              </div>
              <Skeleton className={`h-2.5 rounded-full ${i === 0 ? "w-full" : "w-1/3"}`} />
              <Linea tamano="xs" ancho="w-32" />
            </div>
          ))}
        </EsqueletoCuerpo>
        <EsqueletoPie heroe={heroe} boton />
      </EsqueletoTarjeta>
    );
  }

  const suave = heroe ? "text-primary-foreground/80" : "text-muted-foreground";
  const mayor = Math.max(escenarioActual.costoTotalCentavos, escenarioEstrategia.costoTotalCentavos, 1);
  const caminos = [
    { ...escenarioActual, color: heroe ? "rgb(255 255 255 / 0.45)" : SERIES.acento },
    { ...escenarioEstrategia, color: heroe ? "var(--primary-foreground)" : SERIES.principal },
  ];

  return (
    <Tarjeta heroe={heroe}>
      <CardHeader>
        <span className={`text-xs ${suave}`}>{titulo}</span>
        <span className="monto text-3xl font-semibold">{formatearMonto(ahorroNetoCentavos)}</span>
        <span className={`text-sm ${suave}`}>
          de ahorro con la estrategia
          {typeof ahorroTiempoMeses === "number" && ahorroTiempoMeses > 0 ? (
            <>
              {" "}
              · terminas <span className="font-medium">{ahorroTiempoMeses} meses antes</span>
            </>
          ) : null}
        </span>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {caminos.map((c) => (
          <div key={c.etiqueta} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-medium">{c.etiqueta}</span>
              <span className="monto shrink-0 text-sm font-semibold">{formatearMonto(c.costoTotalCentavos)}</span>
            </div>
            <div className={`h-2.5 w-full overflow-hidden rounded-full ${heroe ? "bg-white/20" : "bg-muted"}`}>
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(2, Math.round((c.costoTotalCentavos / mayor) * 100))}%`, background: c.color }}
              />
            </div>
            <span className={`monto text-xs ${suave}`}>
              {c.tiempoMeses} meses
              {typeof c.mensualidadCentavos === "number" ? ` · ${formatearMonto(c.mensualidadCentavos)} al mes` : ""}
            </span>
          </div>
        ))}
        {escenarioEstrategia.descripcion ? <p className="text-sm">{escenarioEstrategia.descripcion}</p> : null}
      </CardContent>

      <PieTarjeta razon={razon} heroe={heroe}>
        {alAccionar ? (
          <Button
            className={`${CLASES_BOTON_PIE} ${heroe ? "bg-white/90 text-primary hover:bg-white" : ""}`}
            size="lg"
            onClick={() => alAccionar({ accion: "elegir_estrategia", ahorroNetoCentavos })}
          >
            Aplicar estrategia <ArrowRight />
          </Button>
        ) : null}
      </PieTarjeta>
    </Tarjeta>
  );
}
