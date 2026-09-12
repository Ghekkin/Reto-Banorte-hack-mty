"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import type { PropsComponente } from "@maya/a2ui";
import {
  CLASES_PIE_HEROE,
  CLASES_TARJETA,
  CLASES_TARJETA_HEROE,
  formatearFecha,
  formatearMonto,
  formatearPorcentaje,
  hoyISO,
  sumarMeses,
} from "../comunes";
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
    heroe = false,
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
  const avance = metaCentavos > 0 ? Math.min(1, saldoInicialCentavos / metaCentavos) : 0;
  /** Sobre el degradado, el gris de siempre no se lee: el texto secundario va en blanco al 80 %. */
  const suave = heroe ? "text-primary-foreground/80" : "text-muted-foreground";

  return (
    <Card className={heroe ? CLASES_TARJETA_HEROE : CLASES_TARJETA}>
      <CardHeader>
        <span className={`text-xs ${suave}`}>
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
            <span className={`text-sm ${suave}`}>
              llegas en {meses} {meses === 1 ? "mes" : "meses"}
            </span>
          </>
        ) : (
          <span className={`text-sm ${suave}`}>Mueve la aportación para ver cuándo llegas.</span>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {/* Lo que ya lleva ahorrado, en barra y no solo en texto: es el dato que motiva
            ("ya vas a la mitad") y era lo unico del componente que no se veia de un
            vistazo. Mismo patron que `MetaActiva`, a proposito: son la misma meta antes
            y despues de crearla. */}
        {saldoInicialCentavos > 0 ? (
          <div className="flex flex-col gap-1.5">
            <div className={`flex justify-between text-xs ${suave}`}>
              <span>Ya llevas</span>
              <span className="monto">{formatearPorcentaje(avance)}</span>
            </div>
            <Progress
              value={Math.round(avance * 100)}
              aria-label={`Avance: ${formatearPorcentaje(avance)}`}
              className={
                heroe ? "[&_[data-slot=progress-track]]:bg-white/30 [&_[data-slot=progress-indicator]]:bg-white" : ""
              }
            />
          </div>
        ) : null}

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
          // En el heroe los controles van en blanco: el slider rojo de siempre seria rojo
          // sobre rojo y la persona no veria cuanto esta moviendo.
          className={
            heroe
              ? "py-3 [&_[data-slot=slider-track]]:bg-white/30 [&_[data-slot=slider-range]]:bg-white [&_[data-slot=slider-thumb]]:border-white [&_[data-slot=slider-thumb]]:ring-white/40"
              : "py-3"
          }
        />
        <div className={`flex justify-between text-xs ${suave}`}>
          <span className="monto">{formatearMonto(minimo)}</span>
          <span className="monto">{formatearMonto(aportacionMaximaCentavos)}</span>
        </div>
      </CardContent>

      <CardFooter className={`flex flex-col items-start gap-3 ${heroe ? CLASES_PIE_HEROE : ""}`}>
        <Button
          // El boton del heroe es el claro del sistema de diseno (`bg-white/90 text-primary`):
          // sigue siendo LA accion de la pantalla, pero sin desaparecer en el degradado.
          className={`min-h-12 w-full rounded-full sm:w-auto ${heroe ? "bg-white/90 text-primary hover:bg-white" : ""}`}
          size="lg"
          disabled={!alAccionar || aportacion <= 0}
          onClick={() =>
            alAccionar?.({ nombre, montoObjetivoCentavos: metaCentavos, aportacionCentavos: aportacion, frecuencia })
          }
        >
          {etiquetaBoton} <ArrowRight />
        </Button>
        {razon ? <p className={`text-xs ${suave}`}>¿Por qué veo esto? {razon}</p> : null}
      </CardFooter>
    </Card>
  );
}
