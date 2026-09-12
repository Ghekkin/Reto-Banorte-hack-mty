"use client";

import { AlertCircle, CalendarCheck, PiggyBank, Sparkles } from "lucide-react";
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
import type { PropsProyeccionPagoCredito } from "./schema";

export function ProyeccionPagoCredito(
  props: Partial<PropsProyeccionPagoCredito> & Pick<PropsComponente, "alAccionar">,
) {
  const {
    creditoId,
    alias,
    saldoInsolutoCentavos,
    mensualidadCentavos,
    tasaAnualPct,
    plazoRestanteMeses,
    totalInteresesEstimadosCentavos,
    ahorroConAbonoCapitalCentavos,
    amortizacionResumen,
    heroe = false,
    razon,
    alAccionar,
  } = props;

  if (
    typeof saldoInsolutoCentavos !== "number" ||
    typeof mensualidadCentavos !== "number" ||
    typeof tasaAnualPct !== "number" ||
    typeof plazoRestanteMeses !== "number" ||
    typeof totalInteresesEstimadosCentavos !== "number" ||
    !amortizacionResumen ||
    amortizacionResumen.length === 0
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

  const costoTotalCentavos = saldoInsolutoCentavos + totalInteresesEstimadosCentavos;
  const pctCapital = Math.round((saldoInsolutoCentavos / costoTotalCentavos) * 100);
  const clasesTarjeta = heroe ? CLASES_TARJETA_HEROE : CLASES_TARJETA;
  const clasesPie = heroe ? CLASES_PIE_HEROE : "";

  return (
    <Card className={clasesTarjeta}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <CalendarCheck className="size-3.5" /> {alias} · {plazoRestanteMeses} meses restantes
          </span>
          <span className="text-xs bg-tinte text-primary font-medium px-2 py-0.5 rounded-full">
            Tasa {formatearPorcentaje(tasaAnualPct)} anual
          </span>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="monto text-3xl font-semibold">{formatearMonto(saldoInsolutoCentavos)}</span>
          <span className="text-sm text-muted-foreground font-medium">
            de saldo insoluto pendiente
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Mensualidad regular: <span className="monto font-semibold text-foreground">{formatearMonto(mensualidadCentavos)}</span>
        </p>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Desglose de Deuda: Capital vs Intereses */}
        <div className="flex flex-col gap-2 rounded-xl border border-borde-sutil bg-muted/30 p-3">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Capital a liquidar: <strong className="text-foreground monto">{formatearMonto(saldoInsolutoCentavos)}</strong></span>
            <span>Intereses futuros: <strong className="text-destructive monto">{formatearMonto(totalInteresesEstimadosCentavos)}</strong></span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted flex">
            <div
              style={{ width: `${pctCapital}%` }}
              className="bg-chart-1 transition-all"
              title={`Capital: ${formatearMonto(saldoInsolutoCentavos)}`}
            />
            <div
              style={{ width: `${100 - pctCapital}%` }}
              className="bg-primary transition-all"
              title={`Intereses: ${formatearMonto(totalInteresesEstimadosCentavos)}`}
            />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-chart-1 inline-block" /> Capital ({pctCapital}%)
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-primary inline-block" /> Intereses proyectados ({100 - pctCapital}%)
            </span>
          </div>
        </div>

        {/* Notificación de oportunidad de ahorro por abono a capital */}
        {typeof ahorroConAbonoCapitalCentavos === "number" && ahorroConAbonoCapitalCentavos > 0 ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-exito/30 bg-emerald-50 dark:bg-emerald-950/20 p-3 text-xs">
            <PiggyBank className="size-4 text-exito shrink-0 mt-0.5" />
            <div>
              <strong className="text-exito font-semibold">Oportunidad de ahorro: </strong>
              <span>
                Un abono extraordinario puede ahorrarte hasta{" "}
                <strong className="monto font-semibold text-exito">{formatearMonto(ahorroConAbonoCapitalCentavos)}</strong> en intereses.
              </span>
            </div>
          </div>
        ) : null}

        {/* Hitos cronológicos de amortización */}
        <div className="flex flex-col gap-1.5 border-t border-borde-sutil pt-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Evolución del saldo por periodo
          </span>
          {amortizacionResumen.map((hito) => (
            <div
              key={hito.numeroPago}
              className={`flex items-center justify-between py-1.5 px-1 border-b border-borde-sutil last:border-0 text-xs ${CLASES_FILA_TOCABLE}`}
            >
              <div className="flex flex-col">
                <span className="font-medium text-foreground">{hito.periodo}</span>
                <span className="text-[11px] text-muted-foreground">
                  Pago #{hito.numeroPago} (Int: {formatearMonto(hito.interesCentavos)})
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="monto font-semibold text-foreground">
                  {formatearMonto(hito.saldoFinalCentavos)}
                </span>
                <span className="text-[10px] text-muted-foreground">Saldo restante</span>
              </div>
            </div>
          ))}
        </div>

        {alAccionar ? (
          <Button
            className="min-h-12 w-full rounded-xl"
            onClick={() =>
              alAccionar({
                accion: "simular_abono_capital",
                creditoId,
                saldoInsolutoCentavos,
              })
            }
          >
            <Sparkles className="mr-1.5 size-4" /> Simular abono a capital
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
