"use client";

import { ArrowRight, CheckCircle2, Clock, Sparkles, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PropsComponente } from "@maya/a2ui";
import {
  CLASES_TARJETA,
  CLASES_TARJETA_HEROE,
  CLASES_PIE_HEROE,
  formatearMonto,
} from "../comunes";
import type { PropsComparadorAntesDespues } from "./schema";

export function ComparadorAntesDespues(
  props: Partial<PropsComparadorAntesDespues> & Pick<PropsComponente, "alAccionar">,
) {
  const {
    titulo,
    ahorroNetoCentavos,
    ahorroTiempoMeses,
    escenarioActual,
    escenarioEstrategia,
    heroe = false,
    razon,
    alAccionar,
  } = props;

  if (
    !titulo ||
    typeof ahorroNetoCentavos !== "number" ||
    !escenarioActual ||
    !escenarioEstrategia
  ) {
    return (
      <Card className={CLASES_TARJETA}>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-4 w-36" data-slot="skeleton" />
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
        <span className="text-xs text-muted-foreground">Comparativa de Impacto · {titulo}</span>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="monto text-3xl font-semibold text-exito">
            +{formatearMonto(ahorroNetoCentavos)}
          </span>
          <span className="text-sm font-semibold text-exito flex items-center gap-1">
            <Sparkles className="size-4" /> Beneficio con Maya
          </span>
        </div>
        {typeof ahorroTiempoMeses === "number" && ahorroTiempoMeses > 0 ? (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="size-3.5" /> Ahorras{" "}
            <strong className="text-foreground font-semibold">{ahorroTiempoMeses} meses</strong> de tiempo
          </p>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Contraste en 2 columnas en escritorio, 1 en móvil */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Camino Actual (Status Quo) */}
          <div className="rounded-xl border border-borde-sutil bg-muted/30 p-3 flex flex-col justify-between">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <XCircle className="size-3.5 text-muted-foreground" />
                {escenarioActual.etiqueta}
              </span>
              <span className="monto text-xl font-semibold text-foreground">
                {formatearMonto(escenarioActual.costoTotalCentavos)}
              </span>
              <p className="text-xs text-muted-foreground">{escenarioActual.descripcion}</p>
            </div>
            <div className="mt-3 pt-2 border-t border-borde-sutil flex justify-between text-xs text-muted-foreground">
              <span>Tiempo: {escenarioActual.tiempoMeses} meses</span>
              {typeof escenarioActual.mensualidadCentavos === "number" ? (
                <span className="monto">{formatearMonto(escenarioActual.mensualidadCentavos)}/mes</span>
              ) : null}
            </div>
          </div>

          {/* Camino Maya (Estrategia Recomendada) */}
          <div className="rounded-xl border border-primary/40 bg-tinte/30 p-3 flex flex-col justify-between shadow-xs">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-primary" />
                {escenarioEstrategia.etiqueta}
              </span>
              <span className="monto text-xl font-semibold text-primary">
                {formatearMonto(escenarioEstrategia.costoTotalCentavos)}
              </span>
              <p className="text-xs text-foreground font-medium">{escenarioEstrategia.descripcion}</p>
            </div>
            <div className="mt-3 pt-2 border-t border-primary/20 flex justify-between text-xs text-primary font-medium">
              <span>Tiempo: {escenarioEstrategia.tiempoMeses} meses</span>
              {typeof escenarioEstrategia.mensualidadCentavos === "number" ? (
                <span className="monto">{formatearMonto(escenarioEstrategia.mensualidadCentavos)}/mes</span>
              ) : null}
            </div>
          </div>
        </div>

        {alAccionar ? (
          <Button
            className="min-h-12 w-full rounded-xl"
            onClick={() =>
              alAccionar({
                accion: "aplicar_estrategia",
                ahorroNetoCentavos,
              })
            }
          >
            Aplicar estrategia recomendada <ArrowRight className="ml-1 size-4" />
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
