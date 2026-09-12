"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import type { PropsComponente } from "@maya/a2ui";
import { CLASES_TARJETA, formatearFecha, formatearMonto, hoyISO, sumarMeses } from "../comunes";
import type { PropsSimuladorMeta } from "./schema";

/** El slider trabaja en pesos: el paso de un centavo no significa nada para nadie. */
const PASO_CENTAVOS = 10000;

/**
 * El simulador de meta: mueve la aportacion y la fecha se recalcula AQUI, sin ir al
 * agente. Es una division (faltante entre aportacion por mes, sin rendimiento: la misma
 * regla de `docs/algoritmos/proyeccion-de-ahorro.md`); ir al agente por cada tick del
 * slider seria un turno por pixel. El numero autoritativo vuelve de la tool despues de la
 * accion.
 *
 * **El numero grande es la fecha a la que llegas**, porque es lo que la persona viene a
 * ver y lo que cambia al arrastrar. El objetivo queda como contexto arriba.
 */
export function SimuladorMeta(props: Partial<PropsSimuladorMeta> & Pick<PropsComponente, "alAccionar">) {
  const {
    nombre = "Tu meta",
    metaCentavos,
    saldoInicialCentavos = 0,
    aportacionCentavos,
    aportacionMinimaCentavos = 50000,
    aportacionMaximaCentavos,
    frecuencia = "mensual",
    fechaInicio,
    etiquetaBoton = "Crear apartado",
    razon,
    alAccionar,
  } = props;
  const [aportacion, setAportacion] = useState(aportacionCentavos ?? 0);

  if (
    typeof metaCentavos !== "number" ||
    typeof aportacionCentavos !== "number" ||
    typeof aportacionMaximaCentavos !== "number"
  ) {
    return (
      <Card className={CLASES_TARJETA}>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>
    );
  }

  const faltante = Math.max(0, metaCentavos - saldoInicialCentavos);
  const porMes = frecuencia === "quincenal" ? aportacion * 2 : aportacion;
  const meses = porMes > 0 ? Math.max(1, Math.ceil(faltante / porMes)) : 0;
  const fecha = meses > 0 ? sumarMeses(fechaInicio ?? hoyISO(), meses) : undefined;
  const minimo = Math.min(aportacionMinimaCentavos, aportacionMaximaCentavos);

  return (
    <Card className={CLASES_TARJETA}>
      <CardHeader>
        <span className="text-xs text-muted-foreground">
          {nombre} · <span className="monto">{formatearMonto(metaCentavos)}</span>
          {saldoInicialCentavos > 0 ? (
            <>
              {" "}
              · llevas <span className="monto">{formatearMonto(saldoInicialCentavos)}</span>
            </>
          ) : null}
        </span>
        {meses > 0 && fecha ? (
          <>
            <span className="monto text-3xl font-semibold">{formatearFecha(fecha, true)}</span>
            <span className="text-sm text-muted-foreground">
              llegas en {meses} {meses === 1 ? "mes" : "meses"}
            </span>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">Mueve la aportación para ver cuándo llegas.</span>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="text-sm">Aportación {frecuencia === "quincenal" ? "quincenal" : "mensual"}</span>
          <span className="monto text-xl font-semibold">{formatearMonto(aportacion)}</span>
        </div>
        {/* `py-3` le da al slider los 48 px de alto tocable sin engordar la barra. */}
        <Slider
          value={[aportacion]}
          min={minimo}
          max={aportacionMaximaCentavos}
          step={PASO_CENTAVOS}
          onValueChange={(valor) => setAportacion(Array.isArray(valor) ? (valor[0] ?? aportacion) : valor)}
          aria-label="Aportación"
          className="py-3"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="monto">{formatearMonto(minimo)}</span>
          <span className="monto">{formatearMonto(aportacionMaximaCentavos)}</span>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col items-start gap-3">
        <Button
          className="min-h-12 w-full rounded-full sm:w-auto"
          size="lg"
          disabled={!alAccionar || aportacion <= 0}
          onClick={() =>
            alAccionar?.({ nombre, montoObjetivoCentavos: metaCentavos, aportacionCentavos: aportacion, frecuencia })
          }
        >
          {etiquetaBoton} <ArrowRight />
        </Button>
        {razon ? <p className="text-xs text-muted-foreground">¿Por qué veo esto? {razon}</p> : null}
      </CardFooter>
    </Card>
  );
}
