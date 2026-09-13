"use client";

import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { Area, AreaChart, ReferenceDot, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PropsComponente } from "@maya/a2ui";
import { CLASES_BOTON_PIE, formatearMonto, formatearPorcentaje } from "../comunes";
import { EsqueletoCuerpo, EsqueletoEncabezado, EsqueletoPie, EsqueletoTarjeta } from "../esqueletos";
import { PieTarjeta, Tarjeta } from "../tarjeta";
import { CLASES_GRAFICA, EJE, ETIQUETA, Grafica, SERIES, TooltipMonto, formatearFechaCorta, formatearMontoEntero } from "../graficas";
import type { PropsRendimientoHistorico } from "./schema";

/**
 * Cómo le ha ido a un instrumento en el tiempo.
 *
 * **Es una curva, no barras.** La versión anterior pintaba barras cuya altura empezaba
 * en el precio mínimo de la serie: entre $1,000 y $1,114 (+11 %) la última barra salía
 * cinco veces más alta que la primera. Una barra dice "cuánto" desde cero; lo que aquí
 * importa es el CAMBIO, y eso lo dice una línea (skill `dataviz`, "change over time").
 *
 * El número sigue mandando: el precio de cierre es el dato grande del encabezado, el
 * punto final lleva su etiqueta directa dentro de la gráfica y el eje muestra fechas
 * legibles (`20 jun`, no `06-20`). Nada vive solo en el tooltip.
 */
export function RendimientoHistorico(props: Partial<PropsRendimientoHistorico> & Pick<PropsComponente, "alAccionar">) {
  const {
    instrumentoId,
    nombre,
    clave,
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
      <EsqueletoTarjeta heroe={heroe} etiqueta="Cargando el rendimiento del instrumento">
        <EsqueletoEncabezado />
        <EsqueletoCuerpo>
          <Skeleton className={CLASES_GRAFICA} />
        </EsqueletoCuerpo>
        <EsqueletoPie heroe={heroe} boton />
      </EsqueletoTarjeta>
    );
  }

  const positivo = rendimientoPeriodoPct >= 0;
  const suave = heroe ? "text-primary-foreground/80" : "text-muted-foreground";
  const datos = puntos.map((p) => ({ fecha: p.fecha, precio: p.precioCentavos }));
  const ultimo = datos[datos.length - 1]!;
  const precios = datos.map((d) => d.precio);
  // Aire arriba y abajo de la curva para que no toque los bordes de la caja.
  const margen = Math.max(1, Math.round((Math.max(...precios) - Math.min(...precios)) * 0.25));
  const dominio: [number, number] = [Math.min(...precios) - margen, Math.max(...precios) + margen];
  const colorLinea = heroe ? "var(--primary-foreground)" : SERIES.principal;
  const colorPunto = heroe ? "var(--primary-foreground)" : SERIES.acento;

  return (
    <Tarjeta heroe={heroe}>
      <CardHeader>
        <span className={`text-xs ${suave}`}>
          {nombre}
          {clave ? ` · ${clave}` : ""}
        </span>
        <span className="cifra monto text-3xl font-semibold">{formatearMonto(precioFinalCentavos)}</span>
        <span className={`flex flex-wrap items-center gap-x-1.5 text-sm ${suave}`}>
          <span className={`monto flex items-center gap-1 font-semibold ${heroe ? "" : positivo ? "text-exito" : "text-foreground"}`}>
            {positivo ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
            {positivo ? "+" : "−"}
            {formatearPorcentaje(Math.abs(rendimientoPeriodoPct))}
          </span>
          {periodo ? <span>en {periodo.toLowerCase()}</span> : null}
          <span>
            · inició en <span className="monto">{formatearMonto(precioInicialCentavos)}</span>
          </span>
        </span>
      </CardHeader>

      <CardContent>
        <Grafica config={{ precio: { label: "Precio", color: colorLinea } }} etiqueta={`Precio de ${clave ?? nombre} en ${periodo}`}>
          <AreaChart data={datos} margin={{ top: 20, right: 60, bottom: 0, left: 8 }}>
            <XAxis
              dataKey="fecha"
              tickFormatter={formatearFechaCorta}
              interval="preserveStartEnd"
              minTickGap={24}
              {...EJE}
              tick={{ ...EJE.tick, fill: heroe ? "var(--primary-foreground)" : EJE.tick.fill }}
            />
            {/* Dos marcas: el piso y el techo del periodo. Con ellas la curva tiene escala
                (regla 7 de `docs/algoritmos/graficas-del-catalogo.md`); sin ellas, una
                variación de $114 se veía igual que una de $11,400. */}
            <YAxis
              dataKey="precio"
              domain={dominio}
              ticks={[Math.min(...precios), Math.max(...precios)]}
              // Entero y no corto: un precio de $1,000 a $1,114 en formato corto es "$1k" y "$1.1k".
              tickFormatter={formatearMontoEntero}
              width={60}
              {...EJE}
              tick={{ ...EJE.tick, fill: heroe ? "var(--primary-foreground)" : EJE.tick.fill }}
            />
            <TooltipMonto etiquetaDe={(v) => formatearFechaCorta(String(v))} />
            <Area
              type="monotone"
              dataKey="precio"
              name="Precio"
              stroke={colorLinea}
              strokeWidth={2}
              fill={colorLinea}
              fillOpacity={heroe ? 0.15 : 0.06}
              dot={false}
              activeDot={{ r: 5, fill: colorPunto, stroke: "var(--card)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
            {/* El cierre, con su valor al lado: es el punto que la persona vino a ver. */}
            <ReferenceDot
              x={ultimo.fecha}
              y={ultimo.precio}
              r={5}
              fill={colorPunto}
              stroke="var(--card)"
              strokeWidth={2}
              label={{ value: formatearMontoEntero(ultimo.precio), position: "right", ...ETIQUETA, fill: heroe ? "var(--primary-foreground)" : ETIQUETA.fill }}
            />
          </AreaChart>
        </Grafica>
      </CardContent>

      <PieTarjeta razon={razon} heroe={heroe}>
        {alAccionar ? (
          <Button
            variant="outline"
            className={`${CLASES_BOTON_PIE} ${heroe ? "border-white/40 bg-transparent text-primary-foreground hover:bg-white/10" : ""}`}
            size="lg"
            onClick={() => alAccionar({ instrumentoId, clave, accion: "ver_detalle" })}
          >
            Ver detalle del instrumento <ArrowRight />
          </Button>
        ) : null}
      </PieTarjeta>
    </Tarjeta>
  );
}
