"use client";

import { PieChart, RefreshCw, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { PropsComponente } from "@maya/a2ui";
import {
  CLASES_TARJETA,
  CLASES_TARJETA_HEROE,
  CLASES_PIE_HEROE,
  CLASES_FILA_TOCABLE,
  formatearMonto,
  formatearPorcentaje,
} from "../comunes";
import type { PropsDistribucionPortafolio } from "./schema";

const COLORES_CLASES = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-muted-foreground",
];

export function DistribucionPortafolio(
  props: Partial<PropsDistribucionPortafolio> & Pick<PropsComponente, "alAccionar">,
) {
  const {
    valorTotalCentavos,
    aportadoCentavos,
    rendimientoTotalPct,
    desviacionModeloPct,
    clases,
    heroe = false,
    razon,
    alAccionar,
  } = props;

  if (
    typeof valorTotalCentavos !== "number" ||
    typeof rendimientoTotalPct !== "number" ||
    !clases ||
    clases.length === 0
  ) {
    return (
      <Card className={CLASES_TARJETA}>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-4 w-32" data-slot="skeleton" />
          <Skeleton className="h-9 w-44" data-slot="skeleton" />
          <Skeleton className="h-28 w-full" data-slot="skeleton" />
        </CardContent>
      </Card>
    );
  }

  const clasesTarjeta = heroe ? CLASES_TARJETA_HEROE : CLASES_TARJETA;
  const clasesPie = heroe ? CLASES_PIE_HEROE : "";

  return (
    <Card className={clasesTarjeta}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <PieChart className="size-3.5" /> Asignación de activos · {clases.length} clases
          </span>
          {typeof desviacionModeloPct === "number" && desviacionModeloPct > 0.05 ? (
            <span className="text-[11px] bg-tinte text-primary font-medium px-2 py-0.5 rounded-full">
              Desviación {formatearPorcentaje(desviacionModeloPct)}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="monto text-3xl font-semibold">{formatearMonto(valorTotalCentavos)}</span>
          <span className="monto flex items-center gap-1 text-sm font-semibold text-exito">
            <TrendingUp className="size-4" />+{formatearPorcentaje(rendimientoTotalPct)}
            <span className="text-xs text-muted-foreground font-normal">rendimiento global</span>
          </span>
        </div>
        {typeof aportadoCentavos === "number" ? (
          <p className="text-xs text-muted-foreground">
            Aportado acumulado: <span className="monto font-medium">{formatearMonto(aportadoCentavos)}</span>
          </p>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Barra compuesta segmentada */}
        <div className="flex flex-col gap-1.5">
          <div className="h-3.5 w-full overflow-hidden rounded-full bg-muted flex">
            {clases.map((c, i) => (
              <div
                key={c.claseId}
                style={{ width: `${Math.max(2, Math.round(c.pesoPct * 100))}%` }}
                className={`${COLORES_CLASES[i % COLORES_CLASES.length]} transition-all`}
                title={`${c.nombre}: ${formatearPorcentaje(c.pesoPct)}`}
              />
            ))}
          </div>
        </div>

        {/* Lista de clases de activo con proporción y montos legibles en móvil */}
        <div className="flex flex-col">
          {clases.map((c, i) => {
            const colorClase = COLORES_CLASES[i % COLORES_CLASES.length];
            const Fila = alAccionar ? "button" : "div";
            return (
              <Fila
                key={c.claseId}
                {...(alAccionar
                  ? {
                      type: "button" as const,
                      onClick: () => alAccionar({ claseId: c.claseId, nombre: c.nombre }),
                    }
                  : {})}
                className={`flex w-full flex-col justify-center gap-1.5 px-2 py-2 text-left ${CLASES_FILA_TOCABLE}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className={`size-2.5 rounded-full shrink-0 ${colorClase}`} />
                    <span className="truncate text-sm font-medium text-foreground">{c.nombre}</span>
                    {typeof c.pesoObjetivoPct === "number" ? (
                      <span className="text-xs text-muted-foreground shrink-0">
                        (Obj: {formatearPorcentaje(c.pesoObjetivoPct)})
                      </span>
                    ) : null}
                  </span>
                  <div className="flex items-baseline gap-2 shrink-0">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {formatearPorcentaje(c.pesoPct)}
                    </span>
                    <span className="monto text-sm font-semibold text-foreground">
                      {formatearMonto(c.montoCentavos)}
                    </span>
                  </div>
                </div>
                <Progress
                  value={Math.round(c.pesoPct * 100)}
                  className="h-1.5"
                  aria-label={`${c.nombre}: ${formatearMonto(c.montoCentavos)}`}
                />
              </Fila>
            );
          })}
        </div>

        {alAccionar ? (
          <Button
            variant="outline"
            className="min-h-12 w-full rounded-xl"
            onClick={() => alAccionar({ accion: "rebalancear_portafolio", valorTotalCentavos })}
          >
            <RefreshCw className="mr-1.5 size-4" /> Rebalancear al modelo recomendado
          </Button>
        ) : null}
      </CardContent>

      {razon ? (
        <CardFooter className={clasesPie}>
          <p className="text-xs text-muted-foreground">¿Por qué veo esto? {razon}</p>
        </CardFooter>
      ) : null}
    </Card>
  );
}
