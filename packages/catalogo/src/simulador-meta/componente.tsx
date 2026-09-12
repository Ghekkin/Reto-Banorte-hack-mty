"use client";

import { useState } from "react";
import { ArrowRight, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import type { PropsComponente } from "@maya/a2ui";
import { formatearFecha, formatearMonto, hoyISO, sumarMeses } from "../comunes";
import type { PropsSimuladorMeta } from "./schema";

/**
 * El slider mueve la aportacion y la fecha se recalcula AQUI, sin ir al agente: es
 * aritmetica de division (faltante entre aportacion por mes, sin rendimiento, la misma
 * regla de `proyectar_ahorro`). Ir al agente por cada tick del slider seria un turno por
 * pixel. Lo que si va al agente es la confirmacion, con la aportacion elegida.
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

  if (typeof metaCentavos !== "number" || typeof aportacionCentavos !== "number" || typeof aportacionMaximaCentavos !== "number") {
    return (
      <Card className="animar-entrada rounded-2xl border-borde-sutil shadow-sm">
        <CardContent className="flex flex-col gap-3 p-5">
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
  // El slider trabaja en pesos enteros: el paso de un centavo no significa nada para nadie.
  const paso = 10000;
  const minimo = Math.min(aportacionMinimaCentavos, aportacionMaximaCentavos);

  return (
    <Card className="animar-entrada rounded-2xl border-borde-sutil shadow-sm">
      <CardHeader>
        <span className="text-xs text-muted-foreground">{nombre}</span>
        <CardTitle className="flex items-center gap-2 text-3xl font-semibold tabular-nums">
          <PiggyBank className="size-6 text-muted-foreground" /> {formatearMonto(metaCentavos)}
        </CardTitle>
        {saldoInicialCentavos > 0 ? (
          <p className="text-sm text-muted-foreground">
            Ya llevas <span className="tabular-nums">{formatearMonto(saldoInicialCentavos)}</span>.
          </p>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-4 p-5 pt-0">
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-sm">Aportación {frecuencia === "quincenal" ? "quincenal" : "mensual"}</span>
            <span className="text-xl font-semibold tabular-nums">{formatearMonto(aportacion)}</span>
          </div>
          <Slider
            value={[aportacion]}
            min={minimo}
            max={aportacionMaximaCentavos}
            step={paso}
            onValueChange={(valor) => setAportacion(Array.isArray(valor) ? (valor[0] ?? aportacion) : valor)}
            aria-label="Aportación"
          />
          <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
            <span>{formatearMonto(minimo)}</span>
            <span>{formatearMonto(aportacionMaximaCentavos)}</span>
          </div>
        </div>

        <div className="rounded-xl bg-muted p-3 text-sm">
          {meses > 0 && fecha ? (
            <>
              Llegas en <span className="font-semibold">{meses} {meses === 1 ? "mes" : "meses"}</span>: el{" "}
              <span className="font-semibold">{formatearFecha(fecha, true)}</span>.
            </>
          ) : (
            "Mueve la aportación para ver cuándo llegas."
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col items-start gap-3 border-t border-borde-sutil pt-4">
        <Button
          className="rounded-full"
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
