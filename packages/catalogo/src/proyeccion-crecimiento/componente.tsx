"use client";

import { useState } from "react";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import type { PropsComponente } from "@maya/a2ui";
import {
  CLASES_TARJETA,
  CLASES_TARJETA_HEROE,
  CLASES_PIE_HEROE,
  formatearMonto,
  formatearPorcentaje,
} from "../comunes";
import type { PropsProyeccionCrecimiento } from "./schema";

const PASO_APORTACION = 50000; // $500.00 MXN

export function ProyeccionCrecimiento(
  props: Partial<PropsProyeccionCrecimiento> & Pick<PropsComponente, "alAccionar">,
) {
  const {
    capitalInicialCentavos,
    aportacionMensualCentavos,
    plazoMeses,
    tasaAnualEstimadaPct,
    totalAportadoCentavos,
    rendimientoEstimadoCentavos,
    valorFinalEstimadoCentavos,
    hitos,
    heroe = false,
    razon,
    alAccionar,
  } = props;

  const [aportacion, setAportacion] = useState(aportacionMensualCentavos ?? 0);

  if (
    typeof capitalInicialCentavos !== "number" ||
    typeof aportacionMensualCentavos !== "number" ||
    typeof plazoMeses !== "number" ||
    typeof tasaAnualEstimadaPct !== "number" ||
    typeof totalAportadoCentavos !== "number" ||
    typeof valorFinalEstimadoCentavos !== "number"
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

  // Recalcular estimación rápida si el usuario mueve el slider
  const tasaMensual = tasaAnualEstimadaPct / 12;
  const nuevoAportado = capitalInicialCentavos + aportacion * plazoMeses;
  // Interés compuesto aproximado con aportaciones mensuales vencidas
  let saldoSimulado = capitalInicialCentavos;
  for (let m = 0; m < plazoMeses; m++) {
    saldoSimulado = (saldoSimulado + aportacion) * (1 + tasaMensual);
  }
  const nuevoRendimiento = Math.max(0, Math.round(saldoSimulado - nuevoAportado));
  const nuevoTotal = Math.round(saldoSimulado);

  const proporcionAportado = Math.round((nuevoAportado / nuevoTotal) * 100);
  const anios = Math.round(plazoMeses / 12);
  const clasesTarjeta = heroe ? CLASES_TARJETA_HEROE : CLASES_TARJETA;
  const clasesPie = heroe ? CLASES_PIE_HEROE : "";

  return (
    <Card className={clasesTarjeta}>
      <CardHeader>
        <span className="text-xs text-muted-foreground">
          Proyección de inversión a {plazoMeses} meses ({anios} {anios === 1 ? "año" : "años"}) · Tasa estimada {formatearPorcentaje(tasaAnualEstimadaPct)} anual
        </span>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="monto text-3xl font-semibold">{formatearMonto(nuevoTotal)}</span>
          <span className="monto flex items-center gap-1 text-sm font-semibold text-exito">
            <Sparkles className="size-4" />+{formatearMonto(nuevoRendimiento)}
            <span className="text-xs text-muted-foreground font-normal">en rendimientos</span>
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Iniciando con <span className="monto font-medium">{formatearMonto(capitalInicialCentavos)}</span>
        </p>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Desglose visual de aportado vs rendimiento generado */}
        <div className="flex flex-col gap-2 rounded-xl border border-borde-sutil bg-muted/30 p-3">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Tu capital: <strong className="text-foreground monto">{formatearMonto(nuevoAportado)}</strong></span>
            <span>Rendimiento neto: <strong className="text-exito monto">{formatearMonto(nuevoRendimiento)}</strong></span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted flex">
            <div
              style={{ width: `${proporcionAportado}%` }}
              className="bg-chart-1 transition-all duration-300"
              title={`Aportado: ${formatearMonto(nuevoAportado)}`}
            />
            <div
              style={{ width: `${100 - proporcionAportado}%` }}
              className="bg-primary transition-all duration-300"
              title={`Rendimiento: ${formatearMonto(nuevoRendimiento)}`}
            />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-chart-1 inline-block" /> Aportaciones ({proporcionAportado}%)
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-primary inline-block" /> Intereses ganados ({100 - proporcionAportado}%)
            </span>
          </div>
        </div>

        {/* Ajuste interactivo de aportación */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-baseline text-sm">
            <span className="text-muted-foreground">Aportación mensual simulada</span>
            <span className="monto font-semibold text-base">{formatearMonto(aportacion)}</span>
          </div>
          <Slider
            value={[aportacion]}
            min={10000}
            max={Math.max(aportacionMensualCentavos * 4, 2000000)}
            step={PASO_APORTACION}
            onValueChange={(val) => setAportacion(Array.isArray(val) ? val[0] ?? aportacion : val)}
            aria-label="Aportación mensual"
            className="py-3"
          />
        </div>

        {/* Lista de hitos temporales */}
        {hitos && hitos.length > 0 ? (
          <div className="flex flex-col gap-1.5 border-t border-borde-sutil pt-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Evolución en el tiempo
            </span>
            {hitos.map((h) => (
              <div
                key={h.mes}
                className="flex items-center justify-between text-xs py-1 border-b border-borde-sutil last:border-0"
              >
                <span className="font-medium">{h.etiqueta}</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-muted-foreground monto text-[11px]">
                    (Aportado: {formatearMonto(h.aportadoCentavos)})
                  </span>
                  <span className="monto font-semibold text-foreground">
                    {formatearMonto(h.saldoEstimadoCentavos)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {alAccionar ? (
          <Button
            className="min-h-12 w-full rounded-xl"
            onClick={() =>
              alAccionar({
                accion: "simular_inversion",
                aportacionMensualCentavos: aportacion,
                valorFinalEstimadoCentavos: nuevoTotal,
              })
            }
          >
            Invertir con este plan <ArrowUpRight className="ml-1 size-4" />
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
