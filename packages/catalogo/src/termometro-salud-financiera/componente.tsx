"use client";

import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PropsComponente } from "@maya/a2ui";
import { CLASES_BOTON_PIE, formatearMonto, formatearPorcentaje } from "../comunes";
import { EsqueletoCuerpo, EsqueletoPie, EsqueletoTarjeta, Linea } from "../esqueletos";
import { PieTarjeta, Tarjeta } from "../tarjeta";
import { Grafica, SERIES } from "../graficas";
import type { PropsTermometroSaludFinanciera } from "./schema";

/**
 * El puntaje de salud financiera y los tres pilares que lo explican.
 *
 * **El número grande es el puntaje, dentro de un medio arco.** Es la forma que la gente
 * reconoce como "calificación" (skill `dataviz`, hero number con medidor). Los pilares
 * van debajo en tres columnas iguales, cada uno con su valor en texto y una barra medida
 * contra SU referencia —no contra 100 %, que hacía que "18 % de ahorro" pareciera casi
 * nada—. Las referencias están en `docs/algoritmos/graficas-del-catalogo.md`.
 *
 * Lo que se quitó: la caja con borde alrededor de los pilares (cuarta capa de superficie),
 * la caja rosa del hábito con su icono de chispas, y el verde y el rojo repartidos entre
 * las barras. Aquí el color solo dice una cosa: rojo = este pilar está fuera de su
 * referencia; oscuro = está bien.
 */
const REFERENCIAS = {
  /** Más del 35 % del ingreso en deudas es la señal de alarma habitual. */
  deudaMaxima: 0.35,
  /** La regla 50/30/20: al menos un 20 % del ingreso al ahorro. */
  ahorroMinimo: 0.2,
  /** Tres meses de gasto es el piso de un fondo de emergencia. */
  fondoMinimoMeses: 3,
} as const;

const ETIQUETA_CALIFICACION: Record<string, string> = { critica: "Crítica", fragil: "Frágil", estable: "Estable", sana: "Sana" };

export function TermometroSaludFinanciera(props: Partial<PropsTermometroSaludFinanciera> & Pick<PropsComponente, "alAccionar">) {
  const {
    puntajeSalud,
    calificacion,
    cambioVsMesAnterior,
    ratioDeudaIngresoPct,
    tasaAhorroPct,
    mesesFondoEmergencia,
    montoAhorradoCentavos,
    habito,
    heroe = false,
    razon,
    alAccionar,
  } = props;

  if (
    typeof puntajeSalud !== "number" ||
    !calificacion ||
    typeof ratioDeudaIngresoPct !== "number" ||
    typeof tasaAhorroPct !== "number" ||
    typeof montoAhorradoCentavos !== "number"
  ) {
    return (
      <EsqueletoTarjeta heroe={heroe} etiqueta="Calculando tu salud financiera">
        <CardHeader>
          <Linea tamano="xs" ancho="w-32" />
        </CardHeader>
        <EsqueletoCuerpo className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-4 @md/tarjeta:flex-row @md/tarjeta:gap-6">
            <Skeleton className="h-24 w-44 rounded-t-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Linea tamano="sm" ancho="w-40" />
              <Linea tamano="sm" ancho="w-32" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Linea tamano="xs" ancho="w-20" />
                <Linea tamano="xl" ancho="w-14" />
                <Skeleton className="h-1.5 w-full" />
              </div>
            ))}
          </div>
        </EsqueletoCuerpo>
        <EsqueletoPie heroe={heroe} boton />
      </EsqueletoTarjeta>
    );
  }

  const bien = calificacion === "sana" || calificacion === "estable";
  const suave = heroe ? "text-primary-foreground/80" : "text-muted-foreground";
  const colorArco = heroe ? "var(--primary-foreground)" : bien ? SERIES.principal : SERIES.acento;
  const colorFondo = heroe ? "rgb(255 255 255 / 0.25)" : "var(--muted)";

  const pilares = [
    {
      nombre: "Endeudamiento",
      valor: formatearPorcentaje(ratioDeudaIngresoPct),
      avance: ratioDeudaIngresoPct / REFERENCIAS.deudaMaxima,
      fuera: ratioDeudaIngresoPct > REFERENCIAS.deudaMaxima,
      referencia: `máx. ${formatearPorcentaje(REFERENCIAS.deudaMaxima)} del ingreso`,
    },
    {
      nombre: "Ahorro mensual",
      valor: formatearPorcentaje(tasaAhorroPct),
      avance: tasaAhorroPct / REFERENCIAS.ahorroMinimo,
      fuera: tasaAhorroPct < REFERENCIAS.ahorroMinimo,
      referencia: `meta ${formatearPorcentaje(REFERENCIAS.ahorroMinimo)} del ingreso`,
    },
    ...(typeof mesesFondoEmergencia === "number"
      ? [
          {
            nombre: "Fondo de emergencia",
            valor: `${new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(mesesFondoEmergencia)} meses`,
            avance: mesesFondoEmergencia / REFERENCIAS.fondoMinimoMeses,
            fuera: mesesFondoEmergencia < REFERENCIAS.fondoMinimoMeses,
            referencia: `meta ${REFERENCIAS.fondoMinimoMeses} meses de gasto`,
          },
        ]
      : []),
  ];

  return (
    <Tarjeta heroe={heroe}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <span className={`text-xs ${suave}`}>Salud financiera</span>
          <Badge
            variant="secondary"
            className={`shrink-0 ${heroe ? "bg-white/20 text-primary-foreground" : bien ? "bg-exito/10 text-exito" : "bg-tinte text-primary"}`}
          >
            {ETIQUETA_CALIFICACION[calificacion] ?? calificacion}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-3 @md/tarjeta:flex-row @md/tarjeta:gap-6">
          {/* El medio arco: el puntaje sobre 100, con el número adentro. Recharts limita el
              radio a la mitad del lado menor, así que la gráfica es un cuadrado de 192 px y
              la caja recorta la mitad de abajo. */}
          <div className="relative h-24 w-48 shrink-0 overflow-hidden">
            <Grafica config={{ valor: { label: "Puntaje", color: colorArco } }} className="h-48 w-48" etiqueta={`Puntaje ${puntajeSalud} de 100`}>
              <RadialBarChart
                data={[{ valor: puntajeSalud }]}
                startAngle={180}
                endAngle={0}
                innerRadius="82%"
                outerRadius="100%"
                cx="50%"
                cy="50%"
                margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
                <RadialBar dataKey="valor" fill={colorArco} background={{ fill: colorFondo }} cornerRadius={8} isAnimationActive={false} />
              </RadialBarChart>
            </Grafica>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-baseline justify-center gap-1">
              <span className="monto-heroe text-4xl font-semibold leading-none">{puntajeSalud}</span>
              <span className={`text-sm ${suave}`}>/ 100</span>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-2 text-center @md/tarjeta:text-left">
            {typeof cambioVsMesAnterior === "number" && cambioVsMesAnterior !== 0 ? (
              <span className={`monto flex items-center justify-center gap-1 text-sm font-semibold @md/tarjeta:justify-start ${heroe ? "" : cambioVsMesAnterior > 0 ? "text-exito" : "text-foreground"}`}>
                {cambioVsMesAnterior > 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                {cambioVsMesAnterior > 0 ? "+" : "−"}
                {Math.abs(cambioVsMesAnterior)} puntos vs. el mes anterior
              </span>
            ) : (
              <span className={`text-sm ${suave}`}>Igual que el mes anterior</span>
            )}
            <span className={`text-sm ${suave}`}>
              Ahorro líquido <span className="monto font-medium">{formatearMonto(montoAhorradoCentavos)}</span>
            </span>
          </div>
        </div>

        {/* A 360 px tres columnas recortan "Fondo de emergencia"; en móvil cada pilar es
            una fila con su valor a la derecha, y en escritorio son tres columnas. */}
        <div className={`grid grid-cols-1 gap-3 border-t pt-3 @md/tarjeta:grid-cols-3 ${heroe ? "border-white/20" : "border-borde-sutil"}`}>
          {pilares.map((p) => (
            <div key={p.nombre} className="flex min-w-0 flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2 @md/tarjeta:flex-col @md/tarjeta:items-start @md/tarjeta:gap-0">
                <span className={`truncate text-xs ${suave}`}>{p.nombre}</span>
                <span className="monto text-lg font-semibold leading-tight">{p.valor}</span>
              </div>
              <div className={`h-1.5 w-full overflow-hidden rounded-full ${heroe ? "bg-white/25" : "bg-muted"}`}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, Math.round(p.avance * 100))}%`,
                    background: heroe ? "var(--primary-foreground)" : p.fuera ? SERIES.acento : SERIES.principal,
                  }}
                />
              </div>
              <span className={`truncate text-xs ${suave}`}>{p.referencia}</span>
            </div>
          ))}
        </div>

        {habito ? <p className="text-sm">{habito}</p> : null}
      </CardContent>

      <PieTarjeta razon={razon} heroe={heroe}>
        {alAccionar ? (
          <Button
            className={`${CLASES_BOTON_PIE} ${heroe ? "bg-white/90 text-primary hover:bg-white" : ""}`}
            size="lg"
            onClick={() => alAccionar({ accion: "mejorar_salud_financiera", puntajeSalud, calificacion })}
          >
            Mejorar mi salud financiera <ArrowRight />
          </Button>
        ) : null}
      </PieTarjeta>
    </Tarjeta>
  );
}
