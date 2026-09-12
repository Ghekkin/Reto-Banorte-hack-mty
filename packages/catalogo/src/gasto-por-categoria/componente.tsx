"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EsqueletoBarras, EsqueletoCuerpo, EsqueletoEncabezado, EsqueletoPie, EsqueletoTarjeta } from "../esqueletos";
import type { PropsComponente } from "@maya/a2ui";
import { CLASES_FILA_TOCABLE, CLASES_TARJETA, formatearMonto, formatearPeriodo, formatearPorcentaje } from "../comunes";
import type { PropsGastoPorCategoria } from "./schema";

/**
 * El gasto del periodo, categoria por categoria.
 *
 * **Por que una lista con barras y no una grafica de Recharts** (que es lo que habia):
 * en la grafica los montos vivian en el tooltip, y un tooltip **no existe en movil**. Una
 * tarjeta financiera donde no se puede leer una sola cifra sin pasar el mouse rompe la
 * regla central del sistema ("el numero manda") justo en el dispositivo donde se va a ver.
 * Ademas el area tocable era la barra —unos pocos pixeles de alto— y de ahi sale la accion
 * `ver_categoria`.
 *
 * Asi cada fila trae su monto siempre visible, la barra da la proporcion de un vistazo, y
 * la fila completa es el boton (48 px de alto). Se lee igual a 360 px que proyectada.
 * Sigue siendo shadcn: `card`, `progress`, `skeleton`.
 */

/** Debajo de esto, la variacion es ruido y no se pinta. */
const VARIACION_MINIMA = 0.05;

export function GastoPorCategoria(props: Partial<PropsGastoPorCategoria> & Pick<PropsComponente, "alAccionar">) {
  const { periodo, totalCentavos, variacionPct, categorias, categoriaAtipica, razon, alAccionar } = props;

  if (!categorias || typeof totalCentavos !== "number") {
    return (
      <EsqueletoTarjeta etiqueta="Cargando tu gasto por categoría">
        <EsqueletoEncabezado detalle={false} />
        <EsqueletoCuerpo>
          <EsqueletoBarras barras={6} />
        </EsqueletoCuerpo>
        <EsqueletoPie lineas={2} />
      </EsqueletoTarjeta>
    );
  }

  const titulo = periodo && /^\d{4}-\d{2}$/.test(periodo) ? formatearPeriodo(periodo) : periodo;
  // La barra se mide contra la categoria mas grande, no contra el total: con seis
  // categorias todas las barras saldrian cortas y no se compararia nada.
  const mayor = categorias.reduce((max, c) => Math.max(max, c.montoCentavos), 0) || 1;

  return (
    <Card className={CLASES_TARJETA}>
      <CardHeader>
        <span className="text-xs text-muted-foreground">Gasto de {titulo}</span>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="monto text-3xl font-semibold">{formatearMonto(totalCentavos)}</span>
          {typeof variacionPct === "number" && Math.abs(variacionPct) >= VARIACION_MINIMA ? (
            <span className={`monto flex items-center gap-1 text-sm ${variacionPct > 0 ? "text-muted-foreground" : "text-exito"}`}>
              {variacionPct > 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
              {variacionPct > 0 ? "+" : "−"}
              {formatearPorcentaje(Math.abs(variacionPct))}
              <span className="text-muted-foreground">vs. el mes anterior</span>
            </span>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col">
        {categorias.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay gasto registrado en este periodo.</p>
        ) : (
          categorias.map((c) => {
            const atipica = c.nombre === categoriaAtipica;
            const proporcion = Math.max(2, Math.round((c.montoCentavos / mayor) * 100));
            const Fila = alAccionar ? "button" : "div";
            return (
              <Fila
                key={c.categoriaId ?? c.nombre}
                {...(alAccionar
                  ? {
                      type: "button" as const,
                      onClick: () => alAccionar({ categoriaId: c.categoriaId ?? c.nombre, categoria: c.nombre }),
                    }
                  : {})}
                className={`flex w-full flex-col justify-center gap-1.5 px-2 py-2 text-left ${CLASES_FILA_TOCABLE}`}
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-baseline gap-1.5">
                    <span className={`truncate text-sm ${atipica ? "font-semibold text-primary" : "font-medium"}`}>
                      {c.nombre}
                    </span>
                    {typeof c.variacionPct === "number" && Math.abs(c.variacionPct) >= VARIACION_MINIMA ? (
                      <span
                        className={`monto shrink-0 text-xs ${
                          atipica ? "text-primary" : c.variacionPct > 0 ? "text-muted-foreground" : "text-exito"
                        }`}
                      >
                        {c.variacionPct > 0 ? "+" : "−"}
                        {formatearPorcentaje(Math.abs(c.variacionPct))}
                      </span>
                    ) : null}
                  </span>
                  <span className="monto shrink-0 text-sm font-semibold">{formatearMonto(c.montoCentavos)}</span>
                </span>
                <Progress
                  value={proporcion}
                  aria-label={`${c.nombre}: ${formatearMonto(c.montoCentavos)}`}
                  className={
                    atipica
                      ? "[&_[data-slot=progress-indicator]]:bg-primary"
                      : "[&_[data-slot=progress-indicator]]:bg-chart-4"
                  }
                />
              </Fila>
            );
          })
        )}
      </CardContent>

      {razon ? (
        <CardFooter>
          <p className="text-xs text-muted-foreground">¿Por qué veo esto? {razon}</p>
        </CardFooter>
      ) : null}
    </Card>
  );
}
