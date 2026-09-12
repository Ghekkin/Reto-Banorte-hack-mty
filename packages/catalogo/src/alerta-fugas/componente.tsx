"use client";

import { AlertTriangle, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PropsComponente } from "@maya/a2ui";
import {
  CLASES_TARJETA,
  CLASES_TARJETA_HEROE,
  CLASES_PIE_HEROE,
  formatearMonto,
  formatearPorcentaje,
} from "../comunes";
import type { PropsAlertaFugas } from "./schema";

export function AlertaFugas(
  props: Partial<PropsAlertaFugas> & Pick<PropsComponente, "alAccionar">,
) {
  const {
    totalMensualCentavos,
    totalAnualCentavos,
    pctDelIngreso,
    fugas,
    heroe = false,
    razon,
    alAccionar,
  } = props;

  if (
    typeof totalMensualCentavos !== "number" ||
    typeof totalAnualCentavos !== "number" ||
    !fugas ||
    fugas.length === 0
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

  const candidatas = fugas.filter((f) => f.sinUsoReciente);
  const clasesTarjeta = heroe ? CLASES_TARJETA_HEROE : CLASES_TARJETA;
  const clasesPie = heroe ? CLASES_PIE_HEROE : "";

  return (
    <Card className={clasesTarjeta}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="size-3.5 text-primary" /> Fugas de Dinero Detectadas
          </span>
          {candidatas.length > 0 ? (
            <Badge variant="secondary" className="bg-tinte text-primary text-xs">
              {candidatas.length} sin uso reciente
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="monto text-3xl font-semibold text-primary">
            {formatearMonto(totalAnualCentavos)}
          </span>
          <span className="text-sm text-muted-foreground font-medium">al año en suscripciones</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Gasto mensual: <span className="monto font-semibold text-foreground">{formatearMonto(totalMensualCentavos)}</span>
          {typeof pctDelIngreso === "number" ? ` (${formatearPorcentaje(pctDelIngreso)} de tu ingreso)` : null}
        </p>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Suscripciones activas
        </span>

        <div className="flex flex-col gap-2">
          {fugas.map((f) => {
            return (
              <div
                key={f.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border ${
                  f.sinUsoReciente
                    ? "border-primary/30 bg-tinte/20"
                    : "border-borde-sutil bg-card"
                }`}
              >
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground truncate">{f.concepto}</span>
                    {f.sinUsoReciente ? (
                      <span className="text-[10px] bg-primary/10 text-primary font-medium px-1.5 py-0.5 rounded">
                        Sin uso {f.mesesSinUso ? `hace ${f.mesesSinUso} meses` : "reciente"}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {f.comercio} · {f.periodicidad}
                  </span>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <span className="monto text-sm font-semibold text-foreground">
                    {formatearMonto(f.montoCentavos)}
                  </span>
                  {alAccionar ? (
                    <Button
                      variant={f.sinUsoReciente ? "destructive" : "outline"}
                      size="sm"
                      className="min-h-12 px-3 rounded-xl text-xs"
                      onClick={() =>
                        alAccionar({
                          accion: "cancelar_suscripcion",
                          suscripcionId: f.id,
                          concepto: f.concepto,
                        })
                      }
                    >
                      <Ban className="size-3.5 mr-1" /> Cancelar
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      {razon ? (
        <CardFooter className={clasesPie}>
          <p className="text-xs text-muted-foreground">¿Por qué veo esto? {razon}</p>
        </CardFooter>
      ) : null}
    </Card>
  );
}
