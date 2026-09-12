"use client";

import { PiggyBank } from "lucide-react";
import { Area, AreaChart, ReferenceDot, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PropsComponente } from "@maya/a2ui";
import { formatearFecha, formatearMonto, formatearPorcentaje } from "../comunes";
import { EsqueletoCuerpo, EsqueletoEncabezado, EsqueletoPie, EsqueletoTarjeta } from "../esqueletos";
import { PieTarjeta, Tarjeta } from "../tarjeta";
import { CLASES_GRAFICA, EJE, ETIQUETA, Grafica, Leyenda, SERIES, TooltipMonto, formatearMontoCorto, formatearMontoEntero } from "../graficas";
import type { PropsProyeccionPagoCredito } from "./schema";

/**
 * Cuánto falta para terminar de pagar un crédito, y cuánto de eso son intereses.
 *
 * La gráfica tiene que explicar algo sola, sin hover: el 2026-09-12 era una línea que
 * bajaba de "Hoy" a "En 20 meses" sin un solo número encima, y el usuario lo dijo tal
 * cual ("no explican nada, están muy básicas"). Ahora:
 *
 *  - **cada hito lleva su saldo escrito sobre el punto** (`ReferenceDot` con etiqueta), y
 *    el eje Y con tres marcas da la escala: se lee "en un año debes $24.8 k" sin tocar nada;
 *  - el eje X marca cada hito en meses desde hoy, no solo los dos extremos;
 *  - debajo, por hito, **de qué se compone ese pago**: una barra capital / interés y el
 *    porcentaje que es interés. Es lo que una amortización enseña y una curva no: pagas
 *    lo mismo cada mes, pero al principio una cuarta parte es interés y al final casi nada.
 *
 * El desglose total capital / intereses sigue abajo como una barra de dos segmentos con el
 * porcentaje, porque es la respuesta a "¿cuánto pagaré de puros intereses?". La oportunidad
 * de ahorro es una frase, no una caja de color: el rojo es de la marca.
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
  const pctIntereses = Math.round(100 - pctCapital);
  const suave = heroe ? "text-primary-foreground/80" : "text-muted-foreground";
  const colores = heroe
    ? { saldo: "var(--primary-foreground)", capital: "var(--primary-foreground)", intereses: "var(--oscuro)" }
    : { saldo: SERIES.principal, capital: SERIES.principal, intereses: SERIES.acento };
  const colorEje = heroe ? "var(--primary-foreground)" : EJE.tick.fill;
  const colorEtiqueta = heroe ? "var(--primary-foreground)" : ETIQUETA.fill;
  const marcasY = [0, Math.round(saldoInsolutoCentavos / 2), saldoInsolutoCentavos];

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
          {/* `top: 22` es el hueco de las etiquetas sobre los puntos; `right` el de la última. */}
          <AreaChart data={serie} margin={{ top: 22, right: 28, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="pago"
              type="number"
              domain={[hoy, "dataMax"]}
              ticks={[hoy, ...hitos.map((h) => h.numeroPago)]}
              interval="preserveStartEnd"
              minTickGap={18}
              tickFormatter={(p: number) => etiquetaDeMeses(p - hoy)}
              {...EJE}
              tick={{ ...EJE.tick, fill: colorEje }}
            />
            {/* Tres marcas bastan para dar escala; más, en 160 px de alto, se pisan. */}
            <YAxis
              domain={[0, saldoInsolutoCentavos]}
              ticks={marcasY}
              tickFormatter={formatearMontoCorto}
              width={60}
              {...EJE}
              tick={{ ...EJE.tick, fill: colorEje }}
            />
            <TooltipMonto etiquetaDe={(p) => (Number(p) === hoy ? "Hoy" : `Después del pago ${String(p)}`)} />
            <Area
              type="monotone"
              dataKey="saldo"
              name="Saldo restante"
              stroke={colores.saldo}
              strokeWidth={2}
              fill={colores.saldo}
              fillOpacity={heroe ? 0.2 : 0.06}
              dot={false}
              activeDot={{ r: 5, fill: colores.intereses, stroke: "var(--card)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
            {/* El saldo de cada hito, escrito sobre su punto: la gráfica se lee sin hover. */}
            {hitos.map((h) => (
              <ReferenceDot
                key={h.numeroPago}
                x={h.numeroPago}
                y={h.saldoFinalCentavos}
                r={4}
                fill={colores.saldo}
                stroke="var(--card)"
                strokeWidth={2}
                label={{ value: formatearMontoCorto(h.saldoFinalCentavos), position: "top", ...ETIQUETA, fill: colorEtiqueta }}
              />
            ))}
          </AreaChart>
        </Grafica>

        <div className="flex flex-col gap-3">
          {/* Dos columnas en angosto, cuatro cuando la tarjeta es ancha, y otra vez dos
              cuando comparten la tarjeta con la curva. */}
          <div className="grid grid-cols-2 gap-3 @xl/tarjeta:grid-cols-4 @3xl/tarjeta:grid-cols-2">
            {hitos.slice(0, 4).map((h, i) => (
              <FichaDePago
                key={h.numeroPago}
                etiqueta={etiquetaDeHito(h.periodo)}
                saldoCentavos={h.saldoFinalCentavos}
                capitalCentavos={h.capitalCentavos}
                interesCentavos={h.interesCentavos}
                mensualidadCentavos={mensualidadCentavos}
                colores={colores}
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
                { nombre: `Intereses ${formatearMonto(totalInteresesEstimadosCentavos)} · ${pctIntereses} % de lo que pagarás`, color: colores.intereses },
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

/**
 * Un hito con su saldo y, debajo, de qué se compone ESE pago: capital en oscuro, interés
 * en rojo, y el porcentaje que es interés. Cuatro de estas en fila cuentan la historia
 * de una amortización mejor que cualquier curva: el pago es el mismo, el interés baja.
 */
function FichaDePago({
  etiqueta,
  saldoCentavos,
  capitalCentavos,
  interesCentavos,
  mensualidadCentavos,
  colores,
  heroe,
  acento,
}: {
  etiqueta: string;
  saldoCentavos: number;
  capitalCentavos: number;
  interesCentavos: number;
  mensualidadCentavos: number;
  colores: { capital: string; intereses: string };
  heroe: boolean;
  acento: boolean;
}) {
  // Si la tool manda capital e interés del pago, suman la mensualidad; si trae acumulados
  // o vienen a medias, la mensualidad de la cabecera es la referencia.
  const pago = capitalCentavos + interesCentavos > 0 ? capitalCentavos + interesCentavos : mensualidadCentavos;
  const pctInteres = pago > 0 ? Math.min(100, Math.round((interesCentavos / pago) * 100)) : 0;
  const suave = heroe ? "text-primary-foreground/80" : "text-muted-foreground";
  const fuerte = heroe ? "text-primary-foreground" : "text-foreground";
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className={`truncate text-xs ${suave}`}>{etiqueta}</span>
      <span className={`monto truncate text-sm ${fuerte} ${acento ? "font-semibold" : "font-medium"}`}>{formatearMonto(saldoCentavos)}</span>
      <div
        className="flex h-1.5 w-full gap-px overflow-hidden rounded-full"
        role="img"
        aria-label={`Del pago, ${pctInteres} % es interés`}
      >
        <div className="h-full rounded-l-full" style={{ width: `${100 - pctInteres}%`, background: colores.capital }} />
        <div className="h-full flex-1 rounded-r-full" style={{ background: colores.intereses }} />
      </div>
      <span className={`monto truncate text-xs ${suave}`}>
        {formatearMontoEntero(interesCentavos)} de interés · {pctInteres} %
      </span>
    </div>
  );
}

/** La tool a veces manda la fecha del pago (`2026-10-20`) y a veces una etiqueta ("En 6 meses"). */
function etiquetaDeHito(periodo: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(periodo) ? formatearFecha(periodo) : periodo;
}

/** Marca del eje X: meses desde hoy. `0` es hoy; 12 y 24 se dicen en años. */
function etiquetaDeMeses(meses: number): string {
  if (meses <= 0) return "Hoy";
  if (meses % 12 === 0) return meses === 12 ? "1 año" : `${meses / 12} años`;
  return meses === 1 ? "1 mes" : `${meses} meses`;
}
