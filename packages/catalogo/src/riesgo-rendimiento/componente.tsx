"use client";

import { useState } from "react";
import { ArrowRight, Check, Gauge, Sparkles } from "lucide-react";
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
import type { PropsRiesgoRendimiento } from "./schema";

const ETIQUETAS_RIESGO = ["", "Muy bajo", "Bajo", "Moderado", "Alto", "Muy alto"];

export function RiesgoRendimiento(
  props: Partial<PropsRiesgoRendimiento> & Pick<PropsComponente, "alAccionar">,
) {
  const {
    perfilInversionista,
    toleranciaRiesgoMax = 3,
    montoReferenciaCentavos,
    instrumentos,
    instrumentoSeleccionadoId,
    heroe = false,
    razon,
    alAccionar,
  } = props;

  const [seleccionadoId, setSeleccionadoId] = useState<string>(
    instrumentoSeleccionadoId ?? instrumentos?.find((i) => i.recomendado)?.id ?? instrumentos?.[0]?.id ?? "",
  );

  if (
    !perfilInversionista ||
    typeof montoReferenciaCentavos !== "number" ||
    !instrumentos ||
    instrumentos.length === 0
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

  const seleccionado = instrumentos.find((i) => i.id === seleccionadoId) ?? instrumentos[0]!;
  const gananciaAnualEstimada = Math.round(montoReferenciaCentavos * seleccionado.rendimientoAnualEsperado);
  const clasesTarjeta = heroe ? CLASES_TARJETA_HEROE : CLASES_TARJETA;
  const clasesPie = heroe ? CLASES_PIE_HEROE : "";

  return (
    <Card className={clasesTarjeta}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Gauge className="size-3.5" /> Perfil: <strong className="text-foreground">{perfilInversionista}</strong> (hasta riesgo {toleranciaRiesgoMax}/5)
          </span>
          <span className="text-xs bg-tinte text-primary font-medium px-2 py-0.5 rounded-full">
            Base: {formatearMonto(montoReferenciaCentavos)}
          </span>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="monto text-3xl font-semibold">
            {formatearPorcentaje(seleccionado.rendimientoAnualEsperado)}
          </span>
          <span className="monto flex items-center gap-1 text-sm font-semibold text-exito">
            <Sparkles className="size-4" />+{formatearMonto(gananciaAnualEstimada)}/año
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Opción: <strong className="text-foreground">{seleccionado.nombre}</strong> ({seleccionado.tipo}) · Riesgo {seleccionado.riesgo}/5 ({ETIQUETAS_RIESGO[seleccionado.riesgo]})
        </p>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Espectro comparativo ordenado por riesgo */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Opciones disponibles
          </span>
          {instrumentos.map((inst) => {
            const activo = inst.id === seleccionadoId;
            const superaTolerancia = inst.riesgo > toleranciaRiesgoMax;
            return (
              <button
                key={inst.id}
                type="button"
                onClick={() => setSeleccionadoId(inst.id)}
                className={`min-h-12 w-full rounded-xl p-2.5 flex items-center justify-between text-left transition-all border ${
                  activo
                    ? "border-primary bg-tinte/50 shadow-xs"
                    : "border-borde-sutil bg-card hover:bg-muted/40"
                } ${CLASES_FILA_TOCABLE}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex flex-col items-center justify-center size-8 rounded-lg bg-muted text-foreground font-semibold text-xs shrink-0">
                    <span>{inst.riesgo}</span>
                    <span className="text-[8px] text-muted-foreground">Riesgo</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="truncate text-sm font-medium text-foreground">{inst.nombre}</span>
                      {inst.recomendado ? (
                        <Badge variant="secondary" className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0 h-4">
                          Sugerido
                        </Badge>
                      ) : null}
                      {superaTolerancia ? (
                        <span className="text-[10px] text-advertencia bg-amber-50 dark:bg-amber-950/40 px-1 rounded">
                          Alto riesgo
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {inst.clave} · {inst.tipo}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 pl-2">
                  <span className="monto text-sm font-semibold text-foreground">
                    {formatearPorcentaje(inst.rendimientoAnualEsperado)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">anual est.</span>
                </div>
              </button>
            );
          })}
        </div>

        {alAccionar ? (
          <Button
            className="min-h-12 w-full rounded-xl"
            onClick={() =>
              alAccionar({
                accion: "seleccionar_instrumento",
                instrumentoId: seleccionado.id,
                clave: seleccionado.clave,
                rendimientoAnualEsperado: seleccionado.rendimientoAnualEsperado,
              })
            }
          >
            Invertir en {seleccionado.clave} <ArrowRight className="ml-1 size-4" />
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
