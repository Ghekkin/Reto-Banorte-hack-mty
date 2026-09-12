"use client";

import { Activity, ArrowUpRight, CheckCircle, Flame, ShieldAlert, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { PropsComponente } from "@maya/a2ui";
import {
  CLASES_TARJETA,
  CLASES_TARJETA_HEROE,
  CLASES_PIE_HEROE,
  formatearMonto,
  formatearPorcentaje,
} from "../comunes";
import type { PropsTermometroSaludFinanciera } from "./schema";

export function TermometroSaludFinanciera(
  props: Partial<PropsTermometroSaludFinanciera> & Pick<PropsComponente, "alAccionar">,
) {
  const {
    puntajeSalud,
    calificacion,
    tendencia,
    cambioVsMesAnterior,
    ratioDeudaIngresoPct,
    tasaAhorroPct,
    mesesFondoEmergencia,
    montoAhorradoCentavos,
    habito,
    heroe = false,
    razon,
    alAccionar,
  } = props;

  if (
    typeof puntajeSalud !== "number" ||
    !calificacion ||
    !tendencia ||
    typeof ratioDeudaIngresoPct !== "number" ||
    typeof tasaAhorroPct !== "number" ||
    typeof montoAhorradoCentavos !== "number"
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

  const esSana = calificacion === "sana" || calificacion === "estable";
  const clasesTarjeta = heroe ? CLASES_TARJETA_HEROE : CLASES_TARJETA;
  const clasesPie = heroe ? CLASES_PIE_HEROE : "";

  return (
    <Card className={clasesTarjeta}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Activity className="size-3.5 text-primary" /> Diagnóstico de Salud Financiera
          </span>
          <Badge
            variant="secondary"
            className={`text-xs capitalize font-medium ${
              esSana ? "bg-emerald-50 text-exito dark:bg-emerald-950/30" : "bg-tinte text-primary"
            }`}
          >
            {calificacion}
          </Badge>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="monto text-3xl font-semibold">
            {puntajeSalud} <span className="text-base text-muted-foreground font-normal">/ 100</span>
          </span>
          {typeof cambioVsMesAnterior === "number" && cambioVsMesAnterior !== 0 ? (
            <span
              className={`monto flex items-center gap-1 text-sm font-semibold ${
                cambioVsMesAnterior > 0 ? "text-exito" : "text-destructive"
              }`}
            >
              {cambioVsMesAnterior > 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
              {cambioVsMesAnterior > 0 ? "+" : ""}
              {cambioVsMesAnterior} pts vs. mes anterior
            </span>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          Ahorro líquido actual: <strong className="monto text-foreground font-semibold">{formatearMonto(montoAhorradoCentavos)}</strong>
        </p>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Los 3 pilares clave del diagnóstico */}
        <div className="flex flex-col gap-2 rounded-xl border border-borde-sutil bg-muted/30 p-3">
          {/* Pilar 1: Endeudamiento */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Endeudamiento (Deuda / Ingreso)</span>
              <span className={`monto font-semibold ${ratioDeudaIngresoPct > 0.35 ? "text-primary" : "text-foreground"}`}>
                {formatearPorcentaje(ratioDeudaIngresoPct)}
              </span>
            </div>
            <Progress
              value={Math.min(100, Math.round(ratioDeudaIngresoPct * 100))}
              className="h-1.5"
              aria-label="Ratio Deuda Ingreso"
            />
          </div>

          {/* Pilar 2: Tasa de Ahorro */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Capacidad de Ahorro mensual</span>
              <span className="monto font-semibold text-exito">
                {formatearPorcentaje(tasaAhorroPct)}
              </span>
            </div>
            <Progress
              value={Math.min(100, Math.round(tasaAhorroPct * 100))}
              className="h-1.5 [&_[data-slot=progress-indicator]]:bg-exito"
              aria-label="Tasa de Ahorro"
            />
          </div>

          {/* Pilar 3: Cobertura Fondo de Emergencia */}
          {typeof mesesFondoEmergencia === "number" ? (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Fondo de Emergencia</span>
                <span className="monto font-semibold text-foreground">
                  {mesesFondoEmergencia.toFixed(1)} meses de gasto
                </span>
              </div>
              <Progress
                value={Math.min(100, Math.round((mesesFondoEmergencia / 6) * 100))}
                className="h-1.5 [&_[data-slot=progress-indicator]]:bg-chart-1"
                aria-label="Fondo Emergencia"
              />
            </div>
          ) : null}
        </div>

        {/* Hábito detectado por IA */}
        {habito ? (
          <div className="flex items-start gap-2 rounded-xl bg-tinte/50 border border-primary/20 p-2.5 text-xs text-foreground">
            <Sparkles className="size-4 text-primary shrink-0 mt-0.5" />
            <span>{habito}</span>
          </div>
        ) : null}

        {alAccionar ? (
          <Button
            className="min-h-12 w-full rounded-xl"
            onClick={() =>
              alAccionar({
                accion: "mejorar_salud_financiera",
                puntajeSalud,
                calificacion,
              })
            }
          >
            Mejorar mi salud financiera <ArrowUpRight className="ml-1 size-4" />
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
