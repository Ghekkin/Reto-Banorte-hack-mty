"use client";

import { PiggyBank } from "lucide-react";
import { Area, AreaChart, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PropsComponente } from "@maya/a2ui";
import { formatearFecha, formatearMonto, formatearPorcentaje } from "../comunes";
import { EsqueletoCuerpo, EsqueletoEncabezado, EsqueletoPie, EsqueletoTarjeta } from "../esqueletos";
import { PieTarjeta, Tarjeta } from "../tarjeta";
import { CLASES_GRAFICA, EJE, Ficha, Grafica, Leyenda, SERIES, TooltipMonto } from "../graficas";
import type { PropsProyeccionPagoCredito } from "./schema";

/**
 * Cuánto falta para terminar de pagar un crédito, y cuánto de eso son intereses.
 *
 * Una sola gráfica: el saldo bajando pago a pago hasta cero. Los hitos que manda la tool
 * son sus puntos, y debajo van como fichas con el monto completo (en móvil no hay hover).
 * El desglose capital / intereses es una barra fina de dos segmentos, porque es la
 * respuesta a "¿cuánto pagaré de puros intereses?", y la oportunidad de ahorro es una
 * frase, no una caja de color: el rojo es de la marca y el verde ya lo lleva el monto.
 */
export function ProyeccionPagoCredito(props: Partial<PropsProyeccionPagoCredito> & Pick<PropsComponente, "alAccionar">) {
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
      <EsqueletoTarjeta heroe={heroe} etiqueta="Cargando la proyección de tu crédito">
        <EsqueletoEncabezado />
        <EsqueletoCuerpo className="flex flex-col gap-3">
          <Skeleton className={CLASES_GRAFICA} />
          <Skeleton className="h-2 w-full rounded-full" />
        </EsqueletoCuerpo>
        <EsqueletoPie heroe={heroe} boton />
      </EsqueletoTarjeta>
    );
  }

  const hitos = [...amortizacionResumen].sort((a, b) => a.numeroPago - b.numeroPago);
  // `numeroPago` puede venir contado desde que se contrató el crédito (la tool real manda
  // 23, 27, 31, 36 a quien ya lleva 22 pagos) o desde hoy (1, 6, 12, 20). "Hoy" es el pago
  // anterior al primer hito: así la curva arranca donde está la persona y no se aplasta a
  // la derecha con 22 meses de línea plana que ya pasaron.
  const hoy = Math.max(0, (hitos[0]?.numeroPago ?? 1) - 1);
  const ultimo = hitos[hitos.length - 1]!;
  const serie = [{ pago: hoy, saldo: saldoInsolutoCentavos }, ...hitos.map((h) => ({ pago: h.numeroPago, saldo: h.saldoFinalCentavos }))];
  const costoTotal = saldoInsolutoCentavos + totalInteresesEstimadosCentavos;
  const pctCapital = costoTotal > 0 ? (saldoInsolutoCentavos / costoTotal) * 100 : 100;
  const suave = heroe ? "text-primary-foreground/80" : "text-muted-foreground";
  const colores = heroe
    ? { saldo: "var(--primary-foreground)", capital: "var(--primary-foreground)", intereses: "var(--oscuro)" }
    : { saldo: SERIES.principal, capital: SERIES.principal, intereses: SERIES.acento };
  const mesesAlFinal = ultimo.numeroPago - hoy;

  return (
    <Tarjeta heroe={heroe}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <span className={`text-xs ${suave}`}>
            {alias} · {plazoRestanteMeses} {plazoRestanteMeses === 1 ? "mes restante" : "meses restantes"}
          </span>
          <Badge variant="secondary" className={`monto shrink-0 ${heroe ? "bg-white/20 text-primary-foreground" : "bg-tinte text-primary"}`}>
            {formatearPorcentaje(tasaAnualPct)} anual
          </Badge>
        </div>
        <span className="monto text-3xl font-semibold">{formatearMonto(saldoInsolutoCentavos)}</span>
        <span className={`text-sm ${suave}`}>
          de saldo · pagas <span className="monto font-medium">{formatearMonto(mensualidadCentavos)}</span> al mes
        </span>
      </CardHeader>

      {/* Una columna mientras la tarjeta es angosta; desde 48rem de TARJETA, la curva a la
          izquierda y los hitos con el desglose a la derecha, para no dejar media tarjeta vacía. */}
      <CardContent className="grid gap-3 @3xl/tarjeta:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] @3xl/tarjeta:items-center @3xl/tarjeta:gap-6">
        <Grafica config={{ saldo: { label: "Saldo", color: colores.saldo } }} etiqueta={`Saldo del crédito ${alias} pago a pago`}>
          <AreaChart data={serie} margin={{ top: 8, right: 36, bottom: 0, left: 16 }}>
            <XAxis
              dataKey="pago"
              type="number"
              domain={[hoy, "dataMax"]}
              ticks={[hoy, ultimo.numeroPago]}
              interval={0}
              tickFormatter={(p: number) => (p === hoy ? "Hoy" : `En ${mesesAlFinal} ${mesesAlFinal === 1 ? "mes" : "meses"}`)}
              {...EJE}
              tick={{ ...EJE.tick, fill: heroe ? "var(--primary-foreground)" : EJE.tick.fill }}
            />
            <YAxis hide domain={[0, "dataMax"]} />
            <TooltipMonto etiquetaDe={(p) => (Number(p) === hoy ? "Hoy" : `Después del pago ${String(p)}`)} />
            <Area
              type="monotone"
              dataKey="saldo"
              name="Saldo restante"
              stroke={colores.saldo}
              strokeWidth={2}
              fill={colores.saldo}
              fillOpacity={heroe ? 0.2 : 0.06}
              // Punto lleno, sin anillo: el anillo del color de la tarjeta sobre su propia
              // linea hacia que la curva se viera cortada en cada hito.
              dot={{ r: 3.5, fill: colores.saldo, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: colores.intereses, stroke: "var(--card)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </Grafica>

        <div className="flex flex-col gap-3">
          {/* Dos columnas en angosto, cuatro cuando la tarjeta es ancha, y otra vez dos
              cuando comparten la tarjeta con la curva. */}
          <div className="grid grid-cols-2 gap-3 @xl/tarjeta:grid-cols-4 @3xl/tarjeta:grid-cols-2">
            {hitos.slice(0, 4).map((h, i) => (
              <Ficha
                key={h.numeroPago}
                etiqueta={etiquetaDeHito(h.periodo)}
                valor={formatearMonto(h.saldoFinalCentavos)}
                detalle={`interés ${formatearMonto(h.interesCentavos)}`}
                detalleSoloEscritorio
                heroe={heroe}
                acento={i === Math.min(hitos.length, 4) - 1}
              />
            ))}
          </div>

          {/* Lo que falta pagar, partido en capital e intereses: dos segmentos, una barra. */}
          <div className={`flex flex-col gap-2 border-t pt-3 ${heroe ? "border-white/20" : "border-borde-sutil"}`}>
            <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full">
              <div className="h-full rounded-l-full" style={{ width: `${pctCapital}%`, background: colores.capital }} />
              <div className="h-full flex-1 rounded-r-full" style={{ background: colores.intereses }} />
            </div>
            <Leyenda
              heroe={heroe}
              series={[
                { nombre: `Capital ${formatearMonto(saldoInsolutoCentavos)}`, color: colores.capital },
                { nombre: `Intereses ${formatearMonto(totalInteresesEstimadosCentavos)}`, color: colores.intereses },
              ]}
            />
          </div>

          {typeof ahorroConAbonoCapitalCentavos === "number" && ahorroConAbonoCapitalCentavos > 0 ? (
            <p className="flex items-start gap-2 text-sm">
              <PiggyBank className={`mt-0.5 size-4 shrink-0 ${heroe ? "" : "text-exito"}`} aria-hidden />
              <span>
                Un abono extraordinario a capital te ahorraría hasta{" "}
                <span className={`monto font-semibold ${heroe ? "" : "text-exito"}`}>{formatearMonto(ahorroConAbonoCapitalCentavos)}</span> en intereses.
              </span>
            </p>
          ) : null}
        </div>
      </CardContent>

      {/* Sin boton: `simular_abono_capital` no lo atiende ninguna tool del MCP (ver schema.ts). */}
      <PieTarjeta razon={razon} heroe={heroe} />
    </Tarjeta>
  );
}

/** La tool a veces manda la fecha del pago (`2026-10-20`) y a veces una etiqueta ("En 6 meses"). */
function etiquetaDeHito(periodo: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(periodo) ? formatearFecha(periodo) : periodo;
}
