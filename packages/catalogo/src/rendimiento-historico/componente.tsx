"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PropsComponente } from "@maya/a2ui";
import {
  CLASES_TARJETA,
  CLASES_TARJETA_HEROE,
  CLASES_PIE_HEROE,
  formatearFecha,
  formatearMonto,
  formatearPorcentaje,
} from "../comunes";
import type { PropsRendimientoHistorico } from "./schema";

export function RendimientoHistorico(
  props: Partial<PropsRendimientoHistorico> & Pick<PropsComponente, "alAccionar">,
) {
  const {
    instrumentoId,
    nombre,
    clave,
    tipo,
    periodo,
    precioInicialCentavos,
    precioFinalCentavos,
    rendimientoPeriodoPct,
    puntos,
    heroe = false,
    razon,
    alAccionar,
  } = props;

  if (
    !puntos ||
    typeof precioFinalCentavos !== "number" ||
    typeof precioInicialCentavos !== "number" ||
    typeof rendimientoPeriodoPct !== "number"
  ) {
    return (
      <Card className={CLASES_TARJETA}>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-4 w-36" data-slot="skeleton" />
          <Skeleton className="h-9 w-48" data-slot="skeleton" />
          <Skeleton className="h-28 w-full" data-slot="skeleton" />
        </CardContent>
      </Card>
    );
  }

  const esPositivo = rendimientoPeriodoPct >= 0;
  const clasesTarjeta = heroe ? CLASES_TARJETA_HEROE : CLASES_TARJETA;
  const clasesPie = heroe ? CLASES_PIE_HEROE : "";

  // Calcular mínimo y máximo para escalar las alturas de las barras
  const precios = puntos.map((p) => p.precioCentavos);
  const minPrecio = Math.min(...precios);
  const maxPrecio = Math.max(...precios);
  const rango = Math.max(1, maxPrecio - minPrecio);

  return (
    <Card className={clasesTarjeta}>
      <CardHeader>
        <span className="text-xs text-muted-foreground">
          {tipo} · <span className="font-semibold">{clave}</span> · {periodo}
        </span>
        <h3 className="text-lg font-semibold">{nombre}</h3>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="monto text-3xl font-semibold">{formatearMonto(precioFinalCentavos)}</span>
          <span
            className={`monto flex items-center gap-1 text-sm font-semibold ${
              esPositivo ? "text-exito" : "text-destructive"
            }`}
          >
            {esPositivo ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
            {esPositivo ? "+" : "−"}
            {formatearPorcentaje(Math.abs(rendimientoPeriodoPct))}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Inició en <span className="monto font-medium">{formatearMonto(precioInicialCentavos)}</span>
        </p>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Gráfica de barras de evolución temporal legible en móvil y proyector */}
        <div className="rounded-xl border border-borde-sutil bg-muted/40 p-3">
          <div className="flex items-end justify-between gap-1.5 h-28 pt-2">
            {puntos.map((pt, idx) => {
              const alturaPct = Math.max(15, Math.round(((pt.precioCentavos - minPrecio) / rango) * 85 + 15));
              const esUltimo = idx === puntos.length - 1;
              return (
                <div key={pt.fecha} className="flex flex-1 flex-col items-center gap-1.5 h-full justify-end">
                  <div
                    style={{ height: `${alturaPct}%` }}
                    className={`w-full max-w-7 rounded-t transition-all ${
                      esUltimo
                        ? "bg-primary"
                        : esPositivo
                        ? "bg-chart-1"
                        : "bg-muted-foreground/50"
                    }`}
                    title={`${pt.fecha}: ${formatearMonto(pt.precioCentavos)}`}
                  />
                  <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                    {pt.fecha.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground pt-1 border-t border-borde-sutil">
            <span>Inicio: {formatearFecha(puntos[0]?.fecha)}</span>
            <span>Cierre: {formatearFecha(puntos[puntos.length - 1]?.fecha)}</span>
          </div>
        </div>

        {alAccionar ? (
          <Button
            variant="outline"
            className="min-h-12 w-full rounded-xl"
            onClick={() => alAccionar({ instrumentoId, clave, accion: "ver_detalle" })}
          >
            Ver detalle del instrumento
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
