"use client";

import { ArrowRight } from "lucide-react";
import { Area, AreaChart, ReferenceDot, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import type { PropsComponente } from "@maya/a2ui";
import { CLASES_BOTON_PIE, formatearMonto, formatearPorcentaje } from "../comunes";
import { usarEstadoSeguido } from "../estado";
import { EsqueletoCuerpo, EsqueletoEncabezado, EsqueletoPie, EsqueletoTarjeta, Linea } from "../esqueletos";
import { PieTarjeta, Tarjeta } from "../tarjeta";
import { CLASES_GRAFICA, EJE, ETIQUETA, Ficha, Grafica, Leyenda, SERIES, TooltipMonto, formatearMontoCorto } from "../graficas";
import type { PropsProyeccionCrecimiento } from "./schema";

const PASO_APORTACION = 50000; // $500.00
const APORTACION_MINIMA = 10000; // $100.00

/**
 * Cuánto crece el dinero si se invierte mes con mes.
 *
 * **La gráfica es el componente.** Antes había una barra apilada (aportado / rendimiento)
 * más una lista de hitos; ninguna de las dos mostraba lo único que una proyección tiene
 * que mostrar: la curva que se separa de la línea recta de las aportaciones. Luego fue un
 * área apilada con lo aportado en oscuro macizo y el rendimiento como una franja roja
 * encima, y tampoco explicaba nada: una montaña negra con un filo rojo, sin un número
 * (feedback del usuario, 2026-09-12). Ahora la lectura es **la separación**: la línea
 * recta de lo aportado (oscura, sin relleno) y encima la curva de lo que vale con
 * rendimiento (roja); la franja entre las dos ES el rendimiento. Cada hito lleva su valor
 * escrito sobre el punto, el cierre dice cuánto puso de su bolsillo, y el eje Y da la
 * escala. Los hitos van también como fichas con el monto completo, y el slider los mueve
 * a todos a la vez.
 *
 * **Un solo origen para todos los números.** La versión anterior recalculaba el total al
 * mover el slider pero dejaba los hitos con los valores del agente, así que el encabezado
 * decía $195,827 y la fila "Año 3" $189,456. Aquí todo sale de la misma serie simulada,
 * calibrada para que en la aportación inicial coincida con lo que dijo la tool
 * (`docs/algoritmos/proyeccion-de-crecimiento.md`).
 */
export function ProyeccionCrecimiento(props: Partial<PropsProyeccionCrecimiento> & Pick<PropsComponente, "alAccionar">) {
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

  // La sigue el agente: un `ajustar_pantalla` sobre la aportacion mueve el slider (estado.ts).
  const [aportacion, setAportacion] = usarEstadoSeguido(aportacionMensualCentavos ?? 0);

  if (
    typeof capitalInicialCentavos !== "number" ||
    typeof aportacionMensualCentavos !== "number" ||
    typeof plazoMeses !== "number" ||
    typeof tasaAnualEstimadaPct !== "number" ||
    typeof totalAportadoCentavos !== "number" ||
    typeof valorFinalEstimadoCentavos !== "number"
  ) {
    return (
      <EsqueletoTarjeta heroe={heroe} etiqueta="Preparando tu proyección de inversión">
        <EsqueletoEncabezado />
        <EsqueletoCuerpo className="flex flex-col gap-3">
          <Skeleton className={CLASES_GRAFICA} />
          <div className="flex items-baseline justify-between">
            <Linea tamano="sm" ancho="w-32" />
            <Linea tamano="xl" ancho="w-24" />
          </div>
          <div className="py-3">
            <Skeleton className="h-1 w-full" />
          </div>
        </EsqueletoCuerpo>
        <EsqueletoPie heroe={heroe} boton />
      </EsqueletoTarjeta>
    );
  }

  const serie = simular({
    capitalInicialCentavos,
    aportacionCentavos: aportacion,
    plazoMeses,
    tasaAnual: tasaAnualEstimadaPct,
    calibracion: calibrar({
      capitalInicialCentavos,
      aportacionCentavos: aportacionMensualCentavos,
      plazoMeses,
      tasaAnual: tasaAnualEstimadaPct,
      rendimientoEsperado: rendimientoEstimadoCentavos ?? valorFinalEstimadoCentavos - totalAportadoCentavos,
    }),
  });
  const final = serie[serie.length - 1]!;
  const anios = Math.round(plazoMeses / 12);
  const suave = heroe ? "text-primary-foreground/80" : "text-muted-foreground";
  const colores = heroe
    ? { aportado: "var(--primary-foreground)", rendimiento: "var(--oscuro)" }
    : { aportado: SERIES.principal, rendimiento: SERIES.acento };
  const mesesConHito = new Set((hitos ?? []).map((h) => h.mes));
  const maximoSlider = Math.max(aportacionMensualCentavos * 4, 2000000);
  const colorEje = heroe ? "var(--primary-foreground)" : EJE.tick.fill;
  const colorEtiqueta = heroe ? "var(--primary-foreground)" : ETIQUETA.fill;
  const marcasY = [0, Math.round(final.total / 2), final.total];
  /** Los hitos sobre la serie simulada, con el último siempre en el cierre. */
  const puntosDeHito = [...mesesConHito]
    .filter((m) => m > 0 && m < plazoMeses)
    .map((m) => serie[m] ?? final)
    .concat([final]);

  return (
    <Tarjeta heroe={heroe}>
      <CardHeader>
        <span className={`text-xs ${suave}`}>
          En {plazoMeses} meses{anios >= 1 ? ` (${anios} ${anios === 1 ? "año" : "años"})` : ""} · {formatearPorcentaje(tasaAnualEstimadaPct)} anual estimado
        </span>
        <span className="monto text-3xl font-semibold">{formatearMonto(final.total)}</span>
        <span className={`text-sm ${suave}`}>
          <span className={`monto font-semibold ${heroe ? "" : "text-exito"}`}>+{formatearMonto(final.rendimiento)}</span> de rendimiento sobre{" "}
          <span className="monto">{formatearMonto(final.aportado)}</span> aportados
        </span>
      </CardHeader>

      {/* Una columna mientras la tarjeta es angosta; desde 48rem de TARJETA, la curva a la
          izquierda y los hitos con el slider a la derecha. */}
      <CardContent className="grid gap-3 @3xl/tarjeta:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] @3xl/tarjeta:items-center @3xl/tarjeta:gap-6">
        <div className="flex min-w-0 flex-col gap-3">
          <Grafica
            config={{ aportado: { label: "Aportado", color: colores.aportado }, rendimiento: { label: "Rendimiento", color: colores.rendimiento } }}
            etiqueta={`Crecimiento proyectado a ${plazoMeses} meses`}
          >
            {/* `top: 22` es el hueco de las etiquetas sobre los puntos; `right` el de la última. */}
            <AreaChart data={serie} margin={{ top: 22, right: 30, bottom: 0, left: 0 }} stackOffset="none">
              <XAxis
                dataKey="mes"
                type="number"
                domain={[0, plazoMeses]}
                ticks={mesesConHito.size > 0 ? [0, ...mesesConHito] : undefined}
                interval="preserveStartEnd"
                minTickGap={18}
                tickFormatter={(m: number) => etiquetaDeMes(m, hitos)}
                {...EJE}
                tick={{ ...EJE.tick, fill: colorEje }}
              />
              {/* Tres marcas dan la escala; el tope es el cierre, que cambia con el slider. */}
              <YAxis
                domain={[0, final.total]}
                ticks={marcasY}
                tickFormatter={formatearMontoCorto}
                width={60}
                {...EJE}
                tick={{ ...EJE.tick, fill: colorEje }}
              />
              <TooltipMonto etiquetaDe={(m) => etiquetaDeMes(Number(m), hitos)} />
              {/* Lo aportado: una línea recta casi sin relleno. Es la referencia, no la figura. */}
              <Area
                type="monotone"
                dataKey="aportado"
                name="Aportado"
                stackId="1"
                stroke={colores.aportado}
                strokeWidth={2}
                fill={colores.aportado}
                fillOpacity={heroe ? 0.12 : 0.05}
                dot={false}
                isAnimationActive={false}
              />
              {/* El rendimiento, apilado encima: la franja entre las dos líneas. */}
              <Area
                type="monotone"
                dataKey="rendimiento"
                name="Rendimiento"
                stackId="1"
                stroke={colores.rendimiento}
                strokeWidth={2}
                fill={colores.rendimiento}
                fillOpacity={heroe ? 0.55 : 0.3}
                dot={false}
                isAnimationActive={false}
              />
              {/* El valor de cada hito, escrito sobre su punto en la curva de arriba. */}
              {puntosDeHito.map((punto) => (
                <ReferenceDot
                  key={punto.mes}
                  x={punto.mes}
                  y={punto.total}
                  r={4}
                  fill={colores.rendimiento}
                  stroke="var(--card)"
                  strokeWidth={2}
                  label={{ value: formatearMontoCorto(punto.total), position: "top", ...ETIQUETA, fill: colorEtiqueta }}
                />
              ))}
              {/* Y al cierre, cuánto puso de su bolsillo: la distancia hasta el punto de arriba es la
                  ganancia. La etiqueta va DEBAJO del punto y termina en él (anclada al final), para
                  no pisar la del hito anterior ni salirse por la derecha. En una tarjeta angosta
                  (< 28rem) no cabe sin cruzar la línea: se oculta, y el dato sigue en el encabezado. */}
              <ReferenceDot
                x={plazoMeses}
                y={final.aportado}
                r={4}
                fill={colores.aportado}
                stroke="var(--card)"
                strokeWidth={2}
                label={(props: { viewBox?: { x?: number; y?: number } }) => (
                  <text
                    className="hidden @md/tarjeta:block"
                    x={(props.viewBox?.x ?? 0) + 2}
                    y={(props.viewBox?.y ?? 0) + 30}
                    textAnchor="end"
                    fill={colorEtiqueta}
                    fontSize={ETIQUETA.fontSize}
                    fontWeight={500}
                  >
                    {formatearMontoCorto(final.aportado)} aportados
                  </text>
                )}
              />
            </AreaChart>
          </Grafica>
          <Leyenda
            heroe={heroe}
            series={[
              { nombre: "Aportado", color: colores.aportado },
              { nombre: "Rendimiento", color: colores.rendimiento },
            ]}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          {hitos && hitos.length > 0 ? (
            <div className={`grid gap-3 border-t pt-3 @3xl/tarjeta:border-t-0 @3xl/tarjeta:pt-0 ${heroe ? "border-white/20" : "border-borde-sutil"}`} style={{ gridTemplateColumns: `repeat(${Math.min(hitos.length, 4)}, minmax(0, 1fr))` }}>
              {hitos.slice(0, 4).map((h, i) => {
                const punto = serie[Math.min(h.mes, plazoMeses)] ?? final;
                return (
                  <Ficha
                    key={h.mes}
                    etiqueta={h.etiqueta}
                    valor={formatearMonto(punto.total)}
                    detalle={`${formatearMontoCorto(punto.aportado)} aportados`}
                    detalleSoloEscritorio
                    heroe={heroe}
                    acento={i === Math.min(hitos.length, 4) - 1}
                  />
                );
              })}
            </div>
          ) : null}

          <div className="flex flex-wrap items-baseline justify-between gap-x-3 pt-1">
            <span className="text-sm">Aportación mensual</span>
            <span className="monto text-xl font-semibold">{formatearMonto(aportacion)}</span>
        </div>
        {/* `py-3` le da al slider los 48 px de alto tocable sin engordar la barra. */}
        <Slider
          value={[aportacion]}
          min={APORTACION_MINIMA}
          max={maximoSlider}
          step={PASO_APORTACION}
          onValueChange={(valor) => setAportacion(Array.isArray(valor) ? (valor[0] ?? aportacion) : valor)}
          aria-label="Aportación mensual"
          className={
            heroe
              ? "py-3 [&_[data-slot=slider-track]]:bg-white/30 [&_[data-slot=slider-range]]:bg-white [&_[data-slot=slider-thumb]]:border-white [&_[data-slot=slider-thumb]]:ring-white/40"
              : "py-3"
          }
        />
        <div className={`flex justify-between text-xs ${suave}`}>
          <span className="monto">{formatearMonto(APORTACION_MINIMA)}</span>
          <span className="monto">{formatearMonto(maximoSlider)}</span>
        </div>
        </div>
      </CardContent>

      <PieTarjeta razon={razon} heroe={heroe}>
        {alAccionar ? (
          <Button
            className={`${CLASES_BOTON_PIE} ${heroe ? "bg-white/90 text-primary hover:bg-white" : ""}`}
            size="lg"
            onClick={() =>
              alAccionar({ accion: "elegir_plan_inversion", aportacionMensualCentavos: aportacion, valorFinalEstimadoCentavos: final.total })
            }
          >
            Invertir con este plan <ArrowRight />
          </Button>
        ) : null}
      </PieTarjeta>
    </Tarjeta>
  );
}

type Punto = { mes: number; aportado: number; rendimiento: number; total: number };

/**
 * Interés compuesto mensual con la aportación al inicio de cada mes. `calibracion`
 * escala el rendimiento para que, con la aportación original, el cierre coincida con el
 * que mandó la tool: la tool es la fuente de verdad y el componente solo interpola.
 */
function simular({
  capitalInicialCentavos,
  aportacionCentavos,
  plazoMeses,
  tasaAnual,
  calibracion,
}: {
  capitalInicialCentavos: number;
  aportacionCentavos: number;
  plazoMeses: number;
  tasaAnual: number;
  calibracion: number;
}): Punto[] {
  const r = tasaAnual / 12;
  const puntos: Punto[] = [{ mes: 0, aportado: capitalInicialCentavos, rendimiento: 0, total: capitalInicialCentavos }];
  let saldo = capitalInicialCentavos;
  for (let m = 1; m <= plazoMeses; m++) {
    saldo = (saldo + aportacionCentavos) * (1 + r);
    const aportado = capitalInicialCentavos + aportacionCentavos * m;
    const rendimiento = Math.max(0, Math.round((saldo - aportado) * calibracion));
    puntos.push({ mes: m, aportado, rendimiento, total: aportado + rendimiento });
  }
  return puntos;
}

/** El factor que hace que la simulación con la aportación original cierre donde dijo la tool. */
function calibrar({
  capitalInicialCentavos,
  aportacionCentavos,
  plazoMeses,
  tasaAnual,
  rendimientoEsperado,
}: {
  capitalInicialCentavos: number;
  aportacionCentavos: number;
  plazoMeses: number;
  tasaAnual: number;
  rendimientoEsperado: number;
}): number {
  const base = simular({ capitalInicialCentavos, aportacionCentavos, plazoMeses, tasaAnual, calibracion: 1 });
  const simulado = base[base.length - 1]!.rendimiento;
  if (simulado <= 0 || rendimientoEsperado <= 0) return 1;
  const factor = rendimientoEsperado / simulado;
  // Fuera de este rango la tool usa otra convención y no vale la pena imitarla.
  return factor > 0.5 && factor < 2 ? factor : 1;
}

/** `Año 1` si el agente puso un hito en ese mes; si no, `Mes 12`. */
function etiquetaDeMes(mes: number, hitos: PropsProyeccionCrecimiento["hitos"] | undefined): string {
  const hito = hitos?.find((h) => h.mes === mes);
  if (hito) return hito.etiqueta.replace(/\s*\(.*\)\s*$/, "");
  if (mes === 0) return "Hoy";
  return `Mes ${mes}`;
}
