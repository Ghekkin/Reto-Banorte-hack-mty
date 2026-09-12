"use client";

import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import type { PropsComponente } from "@maya/a2ui";
import { formatearMonto, formatearPeriodo, formatearPorcentaje } from "../comunes";
import type { PropsGastoPorCategoria } from "./schema";

/** Dos tonos, nunca arcoiris: la atipica en rojo (`--chart-2`), el resto en plata (`--chart-4`). */
const CONFIG = {
  monto: { label: "Gasto", color: "var(--chart-4)" },
} satisfies ChartConfig;

export function GastoPorCategoria(props: Partial<PropsGastoPorCategoria> & Pick<PropsComponente, "alAccionar">) {
  const { periodo, totalCentavos, variacionPct, categorias, categoriaAtipica, razon, alAccionar } = props;

  if (!categorias || typeof totalCentavos !== "number") {
    return (
      <Card className="animar-entrada rounded-2xl border-borde-sutil shadow-sm">
        <CardContent className="flex flex-col gap-3 p-5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  const datos = categorias.map((c) => ({ ...c, monto: c.montoCentavos / 100 }));
  const titulo = periodo && /^\d{4}-\d{2}$/.test(periodo) ? formatearPeriodo(periodo) : periodo;
  const atipica = categorias.find((c) => c.nombre === categoriaAtipica);

  return (
    <Card className="animar-entrada rounded-2xl border-borde-sutil shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Gasto de {titulo}</span>
          <CardTitle className="text-3xl font-semibold tabular-nums">{formatearMonto(totalCentavos)}</CardTitle>
        </div>
        {typeof variacionPct === "number" ? (
          <span className={`flex items-center gap-1 text-sm tabular-nums ${variacionPct > 0 ? "text-primary" : "text-exito"}`}>
            {variacionPct > 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
            {variacionPct > 0 ? "+" : ""}
            {formatearPorcentaje(variacionPct)}
          </span>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-4 p-5 pt-0">
        {categorias.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay gasto registrado en este periodo.</p>
        ) : (
          <ChartContainer config={CONFIG} className="aspect-[2/1] w-full">
            <BarChart data={datos} layout="vertical" margin={{ left: 0, right: 8 }} barCategoryGap={6}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="nombre" width={120} tickLine={false} axisLine={false} className="text-xs" />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideIndicator
                    formatter={(valor) => formatearMonto(Math.round(Number(valor) * 100))}
                  />
                }
              />
              <Bar
                dataKey="monto"
                radius={6}
                className={alAccionar ? "cursor-pointer" : ""}
                onClick={(_datos: unknown, indice: number) => {
                  const c = categorias[indice];
                  if (c && alAccionar) alAccionar({ categoriaId: c.categoriaId ?? c.nombre, categoria: c.nombre });
                }}
              >
                {datos.map((c) => (
                  <Cell key={c.nombre} fill={c.nombre === categoriaAtipica ? "var(--chart-2)" : "var(--chart-4)"} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}

        {atipica ? (
          <p className="text-sm">
            <span className="font-medium text-primary">{atipica.nombre}</span> se salió de tu patrón
            {typeof atipica.variacionPct === "number" ? ` (+${formatearPorcentaje(atipica.variacionPct)})` : ""}:{" "}
            <span className="font-semibold tabular-nums">{formatearMonto(atipica.montoCentavos)}</span>.
          </p>
        ) : null}
      </CardContent>

      {razon ? (
        <CardFooter className="border-t border-borde-sutil pt-4">
          <p className="text-xs text-muted-foreground">¿Por qué veo esto? {razon}</p>
        </CardFooter>
      ) : null}
    </Card>
  );
}
