"use client";

import { useState } from "react";
import { ArrowRight, CalendarCheck, PiggyBank, TriangleAlert } from "lucide-react";
import { Area, AreaChart, ReferenceDot, XAxis, YAxis } from "recharts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PropsComponente } from "@maya/a2ui";
import { CLASES_BOTON_PIE, formatearFecha, formatearMonto, formatearPeriodo, formatearPorcentaje } from "../comunes";
import { EsqueletoCuerpo, EsqueletoEncabezado, EsqueletoPie, EsqueletoTarjeta } from "../esqueletos";
import { PieTarjeta, Tarjeta } from "../tarjeta";
import { CLASES_GRAFICA, EJE, ETIQUETA, Grafica, Leyenda, SERIES, TooltipMonto, formatearMontoCorto, formatearMontoEntero } from "../graficas";
import { clasesResaltado, usarCambio } from "../resaltado";
import { DURACION_TRANSICION_MS, NumeroAnimado, usarYaCambio } from "../transicion";
import { compararEscenarios, meses, type Comparacion } from "./comparacion";
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
 *
 * **Se ajusta en su lugar desde el chat** (2026-09-13). «¿Y si pago $6,000 al mes?» no pinta
 * otra tarjeta: el agente parchea ESTA con el escenario de `simular_pago_credito` y la
 * tarjeta no se remonta, solo cambian sus props. Para que el cambio se vea:
 *
 *  - mensualidad, meses e intereses se **resaltan un momento** al cambiar (`usarCambio`,
 *    `resaltado.ts`); nunca al montar ni cuando llega el dato;
 *  - con `antes`, una **línea de diferencia** en palabras: «Terminas en 11 meses (antes 15)»,
 *    «Pagas $3,470.21 menos de intereses». Si empeora (pagar menos que un abono ya
 *    programado) dice «más» y no va en verde (`comparacion.ts`). Nada de curva fantasma:
 *    dos curvas en 160 px no se leen, dos frases sí;
 *  - si la mensualidad pasa la del contrato, cuánto de ella va a capital;
 *  - el `aviso` de la tool (posible pero rebasa su capacidad de pago), en ámbar.
 *
 * **El botón «Programar este pago» solo existe mientras hay algo que programar**: una
 * simulación en pantalla (`antes` con otra mensualidad) y todavía sin programar. Dispara
 * `programar_abono_capital` con `{ creditoId, mensualidadCentavos }`; al volver, el agente
 * parchea `programado: true` y la tarjeta muestra el badge «Abono programado» con los
 * números ya aplicados. Sin slider ni campo: el monto se pide por chat.
 *
 * **Y el cambio se ve moverse** (`transicion.ts`): al ajustarse, los montos cuentan del valor
 * viejo al nuevo (`NumeroAnimado`), el área de la curva se desliza a su forma nueva con la
 * animación de Recharts (prendida desde el primer ajuste, nunca al montar: `usarYaCambio`) y las
 * barras capital / interés pasan a su nuevo ancho con `transition` de CSS.
 *
 * Los puntos con su saldo escrito se ocultan mientras el área viaja y reaparecen en su lugar:
 * Recharts no anima un `ReferenceDot`, y una etiqueta de "$20.4k" ya en su sitio nuevo mientras
 * la curva sigue en el viejo se lee como un error. La otra forma —interpolar los datos y repintar
 * la gráfica completa en cada cuadro— se probó y se descartó: 60-480 ms por cuadro en `/catalogo`.
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
    fechaLiquidacion,
    antes,
    mensualidadContratoCentavos,
    programado = false,
    aviso,
    etiquetaBoton = "Programar este pago",
    heroe = false,
    razon,
    alAccionar,
  } = props;

  // Antes del esqueleto: los hooks no pueden depender de que ya lleguen los datos.
  const cambioMensualidad = usarCambio(mensualidadCentavos);
  const cambioPlazo = usarCambio(plazoRestanteMeses);
  const cambioIntereses = usarCambio(totalInteresesEstimadosCentavos);

  // La curva anima (Recharts) solo a partir del primer ajuste de sus datos; y mientras viaja, sus
  // puntos esperan (ver la cabecera).
  const firmaCurva = amortizacionResumen
    ? `${saldoInsolutoCentavos}|${amortizacionResumen.map((h) => `${h.numeroPago}:${h.saldoFinalCentavos}`).join(",")}`
    : undefined;
  const curvaAjustada = usarYaCambio(firmaCurva);
  const [curvaViajando, setCurvaViajando] = useState(false);

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
        {/* Sin botón: la primera vez que se pinta nunca hay simulación que programar. */}
        <EsqueletoPie heroe={heroe} />
      </EsqueletoTarjeta>
    );
  }

  const hitos = [...amortizacionResumen].sort((a, b) => a.numeroPago - b.numeroPago);
  // `numeroPago` puede venir contado desde que se contrató el crédito (la tool real manda
  // 23, 27, 31, 36 a quien ya lleva 22 pagos) o desde hoy (1, 6, 12, 20). "Hoy" es el pago
  // anterior al primer hito: así la curva arranca donde está la persona y no se aplasta a
  // la derecha con 22 meses de línea plana que ya pasaron.
  const hoy = Math.max(0, (hitos[0]?.numeroPago ?? 1) - 1);
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

  const ahora = { mensualidadCentavos, plazoRestanteMeses, totalInteresesEstimadosCentavos };
  const comparacion = antes ? compararEscenarios(antes, ahora) : undefined;
  const aCapitalCentavos =
    typeof mensualidadContratoCentavos === "number" && mensualidadCentavos > mensualidadContratoCentavos
      ? mensualidadCentavos - mensualidadContratoCentavos
      : 0;
  const puedeProgramar = Boolean(antes) && antes!.mensualidadCentavos !== mensualidadCentavos && !programado;

  return (
    <Tarjeta heroe={heroe}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <span className={`text-xs ${suave}`}>
            {alias} ·{" "}
            <span className={`monto ${clasesResaltado(cambioPlazo, heroe)}`}>
              <NumeroAnimado valor={plazoRestanteMeses} formato={(m) => `${m} ${m === 1 ? "mes restante" : "meses restantes"}`} />
            </span>
          </span>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {programado ? (
              <Badge variant="secondary" className={heroe ? "bg-white/20 text-primary-foreground" : "bg-exito/10 text-exito"}>
                <CalendarCheck aria-hidden /> Abono programado
              </Badge>
            ) : null}
            <Badge variant="secondary" className={`monto ${heroe ? "bg-white/20 text-primary-foreground" : "bg-tinte text-primary"}`}>
              {formatearPorcentaje(tasaAnualPct)} anual
            </Badge>
          </div>
        </div>
        <span className="cifra monto text-3xl font-semibold">
          <NumeroAnimado valor={saldoInsolutoCentavos} />
        </span>
        <span className={`text-sm ${suave}`}>
          de saldo · pagas{" "}
          <span className={`monto font-medium ${clasesResaltado(cambioMensualidad, heroe)}`}><NumeroAnimado valor={mensualidadCentavos} />
          </span> al
          mes
        </span>
        {aCapitalCentavos > 0 ? (
          <span className={`monto text-xs ${suave}`}>
            <NumeroAnimado valor={mensualidadContratoCentavos!} /> del contrato + <NumeroAnimado valor={aCapitalCentavos} /> a capital
          </span>
        ) : null}
      </CardHeader>

      {comparacion || aviso ? (
        <CardContent className="flex flex-col gap-3">
          {comparacion ? (
            <LineasDeCambio comparacion={comparacion} fechaLiquidacion={fechaLiquidacion} heroe={heroe} />
          ) : null}
          {aviso ? (
            <Alert
              className={`rounded-xl px-3 py-2 ${
                heroe ? "border-white/30 bg-white/10 text-primary-foreground" : "border-advertencia/30 bg-advertencia/5 text-advertencia"
              }`}
            >
              <TriangleAlert aria-hidden />
              <AlertDescription className={heroe ? "text-primary-foreground" : "text-advertencia"}>{aviso}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      ) : null}

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
              ticks={serie.map((p) => p.pago)}
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
              // Nunca al montar (la entrada es de `Grafica`); desde el primer ajuste, el área se
              // desliza a su forma nueva. `"auto"` respeta "reducir movimiento".
              isAnimationActive={curvaAjustada ? "auto" : false}
              animationDuration={DURACION_TRANSICION_MS}
              animationEasing="ease-out"
              onAnimationStart={() => setCurvaViajando(true)}
              onAnimationEnd={() => setCurvaViajando(false)}
            />
            {/* El saldo de cada hito, escrito sobre su punto: la gráfica se lee sin hover. */}
            {/* `key` por posición y no por `numeroPago`: un ajuste cambia los números de pago
                (36 → 31) y con esa llave el punto se desmontaría y volvería a entrar. */}
            {hitos.map((h, i) => (
              <ReferenceDot
                key={i}
                x={h.numeroPago}
                y={h.saldoFinalCentavos}
                r={4}
                fill={colores.saldo}
                stroke="var(--card)"
                strokeWidth={2}
                className={`motion-safe:transition-opacity motion-safe:duration-200 ${curvaViajando ? "opacity-0" : "opacity-100"}`}
                label={{ value: formatearMontoCorto(h.saldoFinalCentavos), position: "top", ...ETIQUETA, fill: colorEtiqueta }}
              />
            ))}
          </AreaChart>
        </Grafica>

        <div className="flex flex-col gap-3">
          {/* Dos columnas en angosto, cuatro cuando la tarjeta es ancha, y otra vez dos
              cuando comparten la tarjeta con la curva. */}
          <div className="animar-filas grid grid-cols-2 gap-3 @xl/tarjeta:grid-cols-4 @3xl/tarjeta:grid-cols-2">
            {/* `key` por posición: al ajustarse, la ficha se queda y sus montos cuentan; con
                `numeroPago` se desmontaba y volvía a entrar como si fuera otra. */}
            {hitos.slice(0, 4).map((h, i) => (
              <FichaDePago
                key={i}
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
            <div className="animar-barra flex h-2 w-full gap-0.5 overflow-hidden rounded-full">
              <div
                className={`h-full rounded-l-full ${CLASES_DESLIZAR_ANCHO}`}
                style={{ width: `${pctCapital}%`, background: colores.capital }}
              />
              <div className="h-full flex-1 rounded-r-full" style={{ background: colores.intereses }} />
            </div>
            <Leyenda
              heroe={heroe}
              series={[
                {
                  nombre: (
                    <span>
                      Capital{" "}
                      <span className="monto">
                        <NumeroAnimado valor={saldoInsolutoCentavos} />
                      </span>
                    </span>
                  ),
                  color: colores.capital,
                },
                {
                  nombre: (
                    <span>
                      Intereses{" "}
                      <span className={`monto ${clasesResaltado(cambioIntereses, heroe)}`}>
                        <NumeroAnimado valor={totalInteresesEstimadosCentavos} />
                      </span>{" "}
                      · <NumeroAnimado valor={pctIntereses} formato={(p) => `${p} %`} /> de lo que pagarás
                    </span>
                  ),
                  color: colores.intereses,
                },
              ]}
            />
          </div>

          {/* Lo viejo: una frase de ahorro si la tool la mandaba. Con una comparación en pantalla
              sobra (y podría contradecirla), así que solo sale sin `antes`. */}
          {!antes && typeof ahorroConAbonoCapitalCentavos === "number" && ahorroConAbonoCapitalCentavos > 0 ? (
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

      <PieTarjeta razon={razon} heroe={heroe}>
        {puedeProgramar ? (
          <Button
            // En la heroe, el botón claro del sistema: sigue siendo LA acción sin perderse en el degradado.
            className={`${CLASES_BOTON_PIE} ${heroe ? "bg-white/90 text-primary hover:bg-white" : ""}`}
            size="lg"
            disabled={!alAccionar}
            onClick={() => alAccionar?.({ ...(creditoId ? { creditoId } : {}), mensualidadCentavos })}
          >
            {etiquetaBoton} <ArrowRight />
          </Button>
        ) : null}
      </PieTarjeta>
    </Tarjeta>
  );
}

/**
 * La diferencia contra `antes`, en frases. El número que cambió va en negritas; en verde
 * solo si mejora. Una línea por dato: a 390 px caben sin partirse.
 */
function LineasDeCambio({
  comparacion,
  fechaLiquidacion,
  heroe,
}: {
  comparacion: Comparacion;
  fechaLiquidacion?: string;
  heroe: boolean;
}) {
  const { plazo, intereses } = comparacion;
  const tono = (mejor: boolean) => (heroe ? "" : mejor ? "text-exito" : "text-foreground");
  const suave = heroe ? "text-primary-foreground/80" : "text-muted-foreground";
  const mes = fechaLiquidacion && /^\d{4}-\d{2}/.test(fechaLiquidacion) ? formatearPeriodo(fechaLiquidacion.slice(0, 7)) : undefined;
  return (
    <ul className="flex flex-col gap-1 text-sm" aria-label="Qué cambia">
      {plazo ? (
        <li>
          {/* «(antes 20)» pegado al número que compara; la fecha al final, que es la que se puede partir. */}
          Terminas en{" "}
          <span className={`monto font-semibold ${tono(plazo.direccion === "mejor")}`}>
            <NumeroAnimado valor={plazo.ahora} formato={meses} />
          </span>{" "}
          <span className={`monto ${suave}`}>(antes {plazo.antes})</span>
          {mes ? `, en ${mes}` : ""}
        </li>
      ) : null}
      {intereses ? (
        <li>
          Pagas{" "}
          <span className={`monto font-semibold ${tono(intereses.direccion === "mejor")}`}>
            <NumeroAnimado valor={intereses.diferenciaCentavos} /> {intereses.direccion === "mejor" ? "menos" : "más"}
          </span>{" "}
          de intereses
        </li>
      ) : null}
    </ul>
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
      <span className={`monto truncate text-sm ${fuerte} ${acento ? "font-semibold" : "font-medium"}`}><NumeroAnimado valor={saldoCentavos} />
      </span>
      <div
        className="animar-barra flex h-1.5 w-full gap-px overflow-hidden rounded-full"
        role="img"
        aria-label={`Del pago, ${pctInteres} % es interés`}
      >
        <div className={`h-full rounded-l-full ${CLASES_DESLIZAR_ANCHO}`} style={{ width: `${100 - pctInteres}%`, background: colores.capital }} />
        <div className="h-full flex-1 rounded-r-full" style={{ background: colores.intereses }} />
      </div>
      <span className={`monto truncate text-xs ${suave}`}>
        <NumeroAnimado valor={interesCentavos} formato={formatearMontoEntero} /> de interés ·{" "}
        <NumeroAnimado valor={pctInteres} formato={(p) => `${p} %`} />
      </span>
    </div>
  );
}

/**
 * El segmento de una barra hecha con divs se desliza a su nuevo ancho cuando la tarjeta se
 * ajusta. Va en el SEGMENTO, no en `.animar-barra` (el contenedor que escala al entrar), y sin
 * `animation`: la entrada y el ajuste no se pisan. Con "reducir movimiento", salta.
 */
const CLASES_DESLIZAR_ANCHO = "motion-safe:transition-[width] motion-safe:duration-600 motion-safe:ease-out";

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
