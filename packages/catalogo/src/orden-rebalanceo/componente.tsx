"use client";

import { ArrowDownRight, ArrowUpRight, Check, RefreshCw, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
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
import type { PropsOrdenRebalanceo } from "./schema";

export function OrdenRebalanceo(
  props: Partial<PropsOrdenRebalanceo> & Pick<PropsComponente, "alAccionar">,
) {
  const {
    portafolioId,
    nombrePortafolio,
    valorTotalCentavos,
    comisionTotalCentavos = 0,
    movimientos,
    heroe = false,
    razon,
    alAccionar,
  } = props;

  if (
    !nombrePortafolio ||
    typeof valorTotalCentavos !== "number" ||
    !movimientos ||
    movimientos.length === 0
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
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <RefreshCw className="size-3.5 text-primary" /> Orden de Rebalanceo · {nombrePortafolio}
          </span>
          <Badge variant="secondary" className="bg-tinte text-primary text-xs">
            {movimientos.length} operaciones
          </Badge>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="monto text-3xl font-semibold">
            {formatearMonto(valorTotalCentavos)}
          </span>
          <span className="text-sm text-muted-foreground font-medium">valor del portafolio</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Comisión por intermediación:{" "}
          <strong className="monto text-exito font-medium">
            {comisionTotalCentavos === 0 ? "Sin costo ($0.00 MXN)" : formatearMonto(comisionTotalCentavos)}
          </strong>
        </p>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Ajustes requeridos
        </span>

        <div className="flex flex-col gap-2">
          {movimientos.map((m, idx) => {
            const esCompra = m.tipo === "compra";
            return (
              <div
                key={`${m.instrumentoClave}-${idx}`}
                className="flex items-center justify-between p-3 rounded-xl border border-borde-sutil bg-card"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                      esCompra ? "bg-emerald-50 text-exito dark:bg-emerald-950/30" : "bg-tinte text-primary"
                    }`}
                  >
                    {esCompra ? <ArrowDownRight className="size-4" /> : <ArrowUpRight className="size-4" />}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-foreground">{m.instrumentoClave}</span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded capitalize ${
                          esCompra ? "bg-emerald-100/50 text-exito dark:bg-emerald-950/50" : "bg-primary/10 text-primary"
                        }`}
                      >
                        {m.tipo}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground truncate">{m.claseActivo}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 pl-2">
                  <span className="monto text-sm font-semibold text-foreground">
                    {formatearMonto(m.montoCentavos)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatearPorcentaje(m.pesoAnteriorPct)} → {formatearPorcentaje(m.pesoNuevoPct)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {alAccionar ? (
          <Button
            className="min-h-12 w-full rounded-xl"
            onClick={() =>
              alAccionar({
                accion: "confirmar_rebalanceo",
                portafolioId,
                totalOperaciones: movimientos.length,
              })
            }
          >
            <ShieldCheck className="size-4 mr-1.5" /> Confirmar y rebalancear portafolio
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
