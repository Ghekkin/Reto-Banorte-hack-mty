"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { EsqueletoBarra, EsqueletoCuerpo, EsqueletoEncabezado, EsqueletoPie, EsqueletoTarjeta, Linea } from "../esqueletos";
import { PieTarjeta, Tarjeta } from "../tarjeta";
import type { PropsComponente } from "@maya/a2ui";
import { CLASES_BOTON_PIE, formatearFecha, formatearMonto, formatearPorcentaje, hoyISO, sumarMeses } from "../comunes";
import { usarEstadoSeguido } from "../estado";
import { clasesResaltado, usarCambio } from "../resaltado";
import { NumeroAnimado } from "../transicion";
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
 * ver y lo que cambia al arrastrar.
 *
 * La aportacion la sigue `usarEstadoSeguido`: si el agente la parchea con
 * `ajustar_pantalla`, el slider se mueve; sin eso se quedaria en el valor con el que monto
 * (ver `estado.ts`). El objetivo queda como contexto arriba.
 *
 * **Cuando el agente la ajusta, los montos cuentan** (`transicion.ts`) y se iluminan un momento
 * (`usarCambio`): la meta, lo que llevas, la aportación y el tope. **Lo que mueve la persona no
 * cuenta**: mientras la aportación es la suya y no la del agente, la transición va apagada
 * (`activo: false`) y el número sigue al dedo; interpolar ahí lo haría ir detrás del slider.
 * Si el agente cambia la aportación después de que la persona la movió, cuenta desde donde la
 * dejó la persona.
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
  const [aportacion, setAportacion] = usarEstadoSeguido(aportacionCentavos ?? 0);
  // Antes del esqueleto: los hooks no pueden depender de que ya lleguen los datos.
  const cambioMeta = usarCambio(metaCentavos);
  const cambioAportacion = usarCambio(aportacionCentavos);
  const cambioTope = usarCambio(aportacionMaximaCentavos);

  if (
    typeof metaCentavos !== "number" ||
    typeof aportacionCentavos !== "number" ||
    typeof aportacionMaximaCentavos !== "number"
  ) {
    return (
      <EsqueletoTarjeta heroe={heroe} etiqueta="Preparando tu simulador de ahorro">
        <EsqueletoEncabezado />
        <EsqueletoCuerpo className="flex flex-col gap-3">
          <EsqueletoBarra />
          <div className="flex items-baseline justify-between">
            <Linea tamano="sm" ancho="w-32" />
            <Linea tamano="xl" ancho="w-24" />
          </div>
          <div className="py-3">
            <Skeleton className="h-1 w-full" />
          </div>
          <div className="flex justify-between">
            <Linea tamano="xs" ancho="w-14" />
            <Linea tamano="xs" ancho="w-16" />
          </div>
        </EsqueletoCuerpo>
        <EsqueletoPie heroe={heroe} boton />
      </EsqueletoTarjeta>
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
    <Tarjeta heroe={heroe}>
      <CardHeader>
        <span className={`text-xs ${suave}`}>
          {nombre} · <span className={`monto ${clasesResaltado(cambioMeta, heroe)}`}><NumeroAnimado valor={metaCentavos} /></span>
          {saldoInicialCentavos > 0 ? (
            <>
              {" "}
              · llevas <span className="monto"><NumeroAnimado valor={saldoInicialCentavos} /></span>
            </>
          ) : null}
        </span>
        {meses > 0 && fecha ? (
          <>
            <span className="cifra monto text-3xl font-semibold">{formatearFecha(fecha, true)}</span>
            <span className={`text-sm ${suave}`}>
              llegas en {meses} {meses === 1 ? "mes" : "meses"}
            </span>
          </>
        ) : (
          <span className={`text-sm ${suave}`}>Mueve la aportación para ver cuándo llegas.</span>
        )}
      </CardHeader>

      {/* Desde 42rem de TARJETA, lo que ya llevas a la izquierda y el slider a la derecha. */}
      <CardContent className="grid gap-3 @2xl/tarjeta:grid-cols-2 @2xl/tarjeta:items-center @2xl/tarjeta:gap-6 @2xl/tarjeta:[&>*:only-child]:col-span-2">
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
              // Al ajustarse, la barra llega junto con los números: la `transition` de shadcn, a 600 ms.
              className={`[&_[data-slot=progress-indicator]]:duration-600 [&_[data-slot=progress-indicator]]:ease-out motion-reduce:[&_[data-slot=progress-indicator]]:transition-none ${
                heroe ? "[&_[data-slot=progress-track]]:bg-white/30 [&_[data-slot=progress-indicator]]:bg-white" : ""
              }`}
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="text-sm">Aportación {frecuencia === "quincenal" ? "quincenal" : "mensual"}</span>
            <span className={`monto text-xl font-semibold ${clasesResaltado(cambioAportacion, heroe)}`}>
              {/* Solo cuenta cuando la que se ve es la del agente (ver la cabecera). */}
              <NumeroAnimado valor={aportacion} activo={aportacion === aportacionCentavos} />
            </span>
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
            <span className={`monto ${clasesResaltado(cambioTope, heroe)}`}><NumeroAnimado valor={aportacionMaximaCentavos} /></span>
          </div>
        </div>
      </CardContent>

      <PieTarjeta razon={razon} heroe={heroe}>
        <Button
          // El boton del heroe es el claro del sistema de diseno (`bg-white/90 text-primary`):
          // sigue siendo LA accion de la pantalla, pero sin desaparecer en el degradado.
          className={`${CLASES_BOTON_PIE} ${heroe ? "bg-white/90 text-primary hover:bg-white" : ""}`}
          size="lg"
          disabled={!alAccionar || aportacion <= 0}
          onClick={() =>
            alAccionar?.({ nombre, montoObjetivoCentavos: metaCentavos, aportacionCentavos: aportacion, frecuencia })
          }
        >
          {etiquetaBoton} <ArrowRight />
        </Button>
      </PieTarjeta>
    </Tarjeta>
  );
}
