"use client";

import { ArrowRight } from "lucide-react";
import { Cell, Pie, PieChart } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PropsComponente } from "@maya/a2ui";
import { CLASES_BOTON_PIE, formatearMonto, formatearPorcentaje, recortar, sumaDeMontos } from "../comunes";
import { EsqueletoCuerpo, EsqueletoEncabezado, EsqueletoFilas, EsqueletoPie, EsqueletoTarjeta } from "../esqueletos";
import { PieTarjeta, Tarjeta } from "../tarjeta";
import { Grafica, SEPARADOR, SERIES, TooltipMonto, formatearMontoCorto } from "../graficas";
import type { PropsDistribucionPortafolio } from "./schema";

/**
 * En qué está invertido el dinero.
 *
 * **Una dona con el total al centro y la lista al lado** (skill `diseno-banorte`,
 * "Gráficas"). La versión anterior dibujaba la distribución dos veces —una barra apilada
 * arriba y una barra roja por fila abajo— y ninguna de las dos decía más que la otra.
 * La lista lleva el monto y el peso de cada clase, así que ningún número depende de la
 * dona ni del tooltip.
 *
 * Los colores van por entidad en orden fijo: oscuro, rojo, gris, plata. Nunca rojo junto
 * a rojo claro (ver `graficas.tsx`).
 */
const COLORES = [SERIES.principal, SERIES.acento, SERIES.tercera, SERIES.resto, SERIES.tinte];

/** Debajo de esto la desviación respecto al modelo es ruido y no se anuncia. */
const DESVIACION_MINIMA = 0.05;

export function DistribucionPortafolio(props: Partial<PropsDistribucionPortafolio> & Pick<PropsComponente, "alAccionar">) {
  const { valorTotalCentavos, aportadoCentavos, rendimientoTotalPct, desviacionModeloPct, clases, orden = "peso", limite, heroe = false, razon, alAccionar } = props;

  if (typeof valorTotalCentavos !== "number" || typeof rendimientoTotalPct !== "number" || !clases || clases.length === 0) {
    return (
      <EsqueletoTarjeta heroe={heroe} etiqueta="Cargando la distribución de tu portafolio">
        <EsqueletoEncabezado />
        <EsqueletoCuerpo className="flex flex-col gap-4 @lg/tarjeta:flex-row @lg/tarjeta:items-center">
          <Skeleton className="mx-auto size-40 shrink-0 rounded-full" />
          <div className="flex-1">
            <EsqueletoFilas filas={4} />
          </div>
        </EsqueletoCuerpo>
        <EsqueletoPie heroe={heroe} boton />
      </EsqueletoTarjeta>
    );
  }

  const suave = heroe ? "text-primary-foreground/80" : "text-muted-foreground";
  const positivo = rendimientoTotalPct >= 0;
  const datos = clases.map((c, i) => ({ nombre: c.nombre, monto: c.montoCentavos, color: heroe ? `rgb(255 255 255 / ${1 - i * 0.2})` : COLORES[i % COLORES.length]! }));
  // El color se ata a la CLASE, no a su posicion: la lista de al lado se puede reordenar o
  // recortar (`orden`, `limite`) y la dona sigue pintando el portafolio completo con los
  // mismos colores. La dona nunca se recorta —un pedazo de dona no suma 100 %—, solo la lista.
  const colorDe = new Map(clases.map((c, i) => [c.claseId, datos[i]!.color]));
  const { visibles, fuera } = recortar(ordenar(clases, orden), limite);
  const montoFuera = sumaDeMontos(fuera);
  const config = Object.fromEntries(datos.map((d) => [d.nombre, { label: d.nombre, color: d.color }]));

  return (
    <Tarjeta heroe={heroe}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <span className={`text-xs ${suave}`}>
            Tu portafolio · {clases.length} {clases.length === 1 ? "clase de activo" : "clases de activo"}
          </span>
          {typeof desviacionModeloPct === "number" && desviacionModeloPct >= DESVIACION_MINIMA ? (
            <Badge variant="secondary" className={`monto shrink-0 ${heroe ? "bg-white/20 text-primary-foreground" : "bg-tinte text-primary"}`}>
              {formatearPorcentaje(desviacionModeloPct)} fuera del modelo
            </Badge>
          ) : null}
        </div>
        <span className="monto text-3xl font-semibold">{formatearMonto(valorTotalCentavos)}</span>
        <span className={`text-sm ${suave}`}>
          <span className={`monto font-semibold ${heroe ? "" : positivo ? "text-exito" : "text-foreground"}`}>
            {positivo ? "+" : "−"}
            {formatearPorcentaje(Math.abs(rendimientoTotalPct))}
          </span>{" "}
          de rendimiento
          {typeof aportadoCentavos === "number" ? (
            <>
              {" "}
              sobre <span className="monto">{formatearMonto(aportadoCentavos)}</span> aportados
            </>
          ) : null}
        </span>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 @lg/tarjeta:flex-row @lg/tarjeta:items-center @lg/tarjeta:gap-6">
        <div className="relative mx-auto size-40 shrink-0">
          <Grafica config={config} className="size-40 h-40" etiqueta={`Distribución del portafolio en ${clases.length} clases`}>
            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <TooltipMonto />
              <Pie
                data={datos}
                dataKey="monto"
                nameKey="nombre"
                innerRadius="72%"
                outerRadius="100%"
                paddingAngle={2}
                stroke={SEPARADOR}
                strokeWidth={2}
                startAngle={90}
                endAngle={-270}
                isAnimationActive={false}
              >
                {datos.map((d) => (
                  <Cell key={d.nombre} fill={d.color} />
                ))}
              </Pie>
            </PieChart>
          </Grafica>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-xs ${suave}`}>total</span>
            <span className="monto text-lg font-semibold">{formatearMontoCorto(valorTotalCentavos)}</span>
          </div>
        </div>

        <ul className="flex min-w-0 flex-1 flex-col">
          {visibles.map((c) => {
            const desviada = typeof c.pesoObjetivoPct === "number" && Math.abs(c.pesoPct - c.pesoObjetivoPct) >= 0.03;
            return (
              <li
                key={c.claseId}
                className={`flex items-center gap-3 border-b py-2 last:border-0 ${heroe ? "border-white/20" : "border-borde-sutil"}`}
              >
                <span className="size-2.5 shrink-0 rounded-[2px]" style={{ background: colorDe.get(c.claseId) }} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.nombre}</span>
                <span className="flex shrink-0 flex-col items-end">
                  <span className="monto text-sm font-semibold">{formatearMonto(c.montoCentavos)}</span>
                  <span className={`monto text-xs ${suave}`}>
                    {formatearPorcentaje(c.pesoPct)}
                    {typeof c.pesoObjetivoPct === "number" ? (
                      <>
                        {" "}
                        · <span className={desviada && !heroe ? "text-foreground" : ""}>objetivo {formatearPorcentaje(c.pesoObjetivoPct)}</span>
                      </>
                    ) : null}
                  </span>
                </span>
              </li>
            );
          })}
          {fuera.length > 0 ? (
            <li className={`flex items-center justify-between py-2 text-sm ${suave}`}>
              <span>
                y {fuera.length} {fuera.length === 1 ? "clase mas" : "clases mas"}
              </span>
              <span className="monto">{formatearMonto(montoFuera)}</span>
            </li>
          ) : null}
        </ul>
      </CardContent>

      <PieTarjeta razon={razon} heroe={heroe}>
        {alAccionar ? (
          <Button
            className={`${CLASES_BOTON_PIE} ${heroe ? "bg-white/90 text-primary hover:bg-white" : ""}`}
            size="lg"
            onClick={() => alAccionar({ accion: "rebalancear_portafolio", valorTotalCentavos })}
          >
            Rebalancear al modelo <ArrowRight />
          </Button>
        ) : null}
      </PieTarjeta>
    </Tarjeta>
  );
}

/**
 * El orden de la lista de clases.
 *
 * `desviacion` pone primero las que mas se salieron del modelo objetivo, que es la lectura
 * que lleva al rebalanceo. Una clase SIN `pesoObjetivoPct` no tiene desviacion que medir y
 * se va al final: no es lo mismo "no se desvio" que "no hay modelo con que compararla".
 */
function ordenar(
  clases: NonNullable<PropsDistribucionPortafolio["clases"]>,
  orden: NonNullable<PropsDistribucionPortafolio["orden"]>,
): NonNullable<PropsDistribucionPortafolio["clases"]> {
  const copia = [...clases];
  if (orden === "nombre") return copia.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  if (orden === "desviacion") {
    const desviacion = (c: (typeof copia)[number]) =>
      typeof c.pesoObjetivoPct === "number" ? Math.abs(c.pesoPct - c.pesoObjetivoPct) : null;
    return copia.sort((a, b) => {
      const da = desviacion(a);
      const db = desviacion(b);
      if (da === null) return db === null ? 0 : 1;
      if (db === null) return -1;
      return db - da;
    });
  }
  return copia.sort((a, b) => b.pesoPct - a.pesoPct);
}
