"use client";

import { useState } from "react";
import { CheckCircle2, Flame, ShieldAlert, Sparkles } from "lucide-react";
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
import type { PropsEscenariosInversion } from "./schema";

type TipoEscenario = "pesimista" | "esperado" | "optimista";

export function EscenariosInversion(
  props: Partial<PropsEscenariosInversion> & Pick<PropsComponente, "alAccionar">,
) {
  const {
    montoInvertidoCentavos,
    horizonteMeses,
    escenarioPesimista,
    escenarioEsperado,
    escenarioOptimista,
    escenarioInicial = "esperado",
    heroe = false,
    razon,
    alAccionar,
  } = props;

  const [seleccionado, setSeleccionado] = useState<TipoEscenario>(escenarioInicial ?? "esperado");

  if (
    typeof montoInvertidoCentavos !== "number" ||
    typeof horizonteMeses !== "number" ||
    !escenarioPesimista ||
    !escenarioEsperado ||
    !escenarioOptimista
  ) {
    return (
      <Card className={CLASES_TARJETA}>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-4 w-32" data-slot="skeleton" />
          <Skeleton className="h-9 w-44" data-slot="skeleton" />
          <Skeleton className="h-32 w-full" data-slot="skeleton" />
        </CardContent>
      </Card>
    );
  }

  const mapaEscenarios = {
    pesimista: { ...escenarioPesimista, titulo: "Pesimista", icono: ShieldAlert, colorBadge: "text-muted-foreground" },
    esperado: { ...escenarioEsperado, titulo: "Esperado", icono: CheckCircle2, colorBadge: "text-primary" },
    optimista: { ...escenarioOptimista, titulo: "Optimista", icono: Flame, colorBadge: "text-exito" },
  };

  const actual = mapaEscenarios[seleccionado];
  const IconoActual = actual.icono;
  const anios = Math.round(horizonteMeses / 12);
  const clasesTarjeta = heroe ? CLASES_TARJETA_HEROE : CLASES_TARJETA;
  const clasesPie = heroe ? CLASES_PIE_HEROE : "";

  return (
    <Card className={clasesTarjeta}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            Escenarios de inversión a {horizonteMeses} meses ({anios} {anios === 1 ? "año" : "años"})
          </span>
          <span className="text-xs bg-tinte text-primary font-medium px-2 py-0.5 rounded-full">
            Inversión: {formatearMonto(montoInvertidoCentavos)}
          </span>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="monto text-3xl font-semibold">{formatearMonto(actual.valorFinalCentavos)}</span>
          <span className="monto flex items-center gap-1 text-sm font-semibold text-exito">
            <Sparkles className="size-4" />+{formatearMonto(actual.rendimientoCentavos)}
            <span className="text-xs text-muted-foreground font-normal">
              ({formatearPorcentaje(actual.tasaAnualPct)} anual)
            </span>
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{actual.descripcion}</p>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Selector de los 3 escenarios con tarjetas táctiles min-h-12 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {(["pesimista", "esperado", "optimista"] as const).map((tipo) => {
            const esc = mapaEscenarios[tipo];
            const activo = seleccionado === tipo;
            const Icono = esc.icono;
            return (
              <button
                key={tipo}
                type="button"
                onClick={() => setSeleccionado(tipo)}
                className={`min-h-12 rounded-xl p-3 flex flex-col justify-between text-left transition-all border ${
                  activo
                    ? "border-primary bg-tinte/50 shadow-xs"
                    : "border-borde-sutil bg-card hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-xs font-semibold flex items-center gap-1 ${esc.colorBadge}`}>
                    <Icono className="size-3.5" />
                    {esc.titulo}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    {formatearPorcentaje(esc.tasaAnualPct)}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="monto text-sm font-semibold text-foreground">
                    {formatearMonto(esc.valorFinalCentavos)}
                  </span>
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
                accion: "elegir_escenario",
                escenario: seleccionado,
                valorFinalCentavos: actual.valorFinalCentavos,
                tasaAnualPct: actual.tasaAnualPct,
              })
            }
          >
            Elegir escenario {actual.titulo}
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
