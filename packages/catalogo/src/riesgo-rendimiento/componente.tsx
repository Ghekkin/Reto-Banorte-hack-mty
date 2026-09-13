"use client";

import { ArrowRight, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { PropsComponente } from "@maya/a2ui";
import { CLASES_BOTON_PIE, CLASES_FILA_TOCABLE, formatearMonto, formatearPorcentaje } from "../comunes";
import { usarEstadoSeguido } from "../estado";
import { EsqueletoCuerpo, EsqueletoEncabezado, EsqueletoOpciones, EsqueletoPie, EsqueletoTarjeta } from "../esqueletos";
import { PieTarjeta, Tarjeta } from "../tarjeta";
import type { PropsRiesgoRendimiento } from "./schema";

const ETIQUETAS_RIESGO = ["", "muy bajo", "bajo", "moderado", "alto", "muy alto"];

/**
 * Opciones de inversión ordenadas por riesgo, y la que va con el perfil.
 *
 * **Mismo patrón que `PlanDePago`**: un grupo de radios donde cada opción es un `<label>`
 * de 48 px, el número grande del encabezado cambia con la selección y el botón envía la
 * elegida. Quien ya eligió un plazo sabe elegir un fondo.
 *
 * El riesgo se lee en cinco puntos, no en un cuadrito con "1 / Riesgo" en 8 px: cinco
 * puntos se comparan de un vistazo entre filas y se ven proyectados. Una opción que supera
 * la tolerancia del perfil lo dice en palabras ("supera tu perfil"), en el color de
 * advertencia del sistema.
 */
export function RiesgoRendimiento(props: Partial<PropsRiesgoRendimiento> & Pick<PropsComponente, "alAccionar">) {
  const {
    perfilInversionista,
    toleranciaRiesgoMax = 3,
    montoReferenciaCentavos,
    instrumentos,
    instrumentoSeleccionadoId,
    heroe = false,
    razon,
    alAccionar,
  } = props;

  // `instrumentoSeleccionadoId` es el selector de variante: el agente lo parchea con
  // `ajustar_pantalla` y la ficha cambia sin repintar la tarjeta (estado.ts).
  const [seleccionadoId, setSeleccionadoId] = usarEstadoSeguido<string>(
    instrumentoSeleccionadoId ?? instrumentos?.find((i) => i.recomendado)?.id ?? instrumentos?.[0]?.id ?? "",
  );

  if (!perfilInversionista || typeof montoReferenciaCentavos !== "number" || !instrumentos || instrumentos.length === 0) {
    return (
      <EsqueletoTarjeta heroe={heroe} etiqueta="Comparando opciones de inversión">
        <EsqueletoEncabezado />
        <EsqueletoCuerpo>
          <EsqueletoOpciones opciones={4} />
        </EsqueletoCuerpo>
        <EsqueletoPie heroe={heroe} boton />
      </EsqueletoTarjeta>
    );
  }

  const seleccionado = instrumentos.find((i) => i.id === seleccionadoId) ?? instrumentos[0]!;
  const gananciaAnual = Math.round(montoReferenciaCentavos * seleccionado.rendimientoAnualEsperado);
  const suave = heroe ? "text-primary-foreground/80" : "text-muted-foreground";

  return (
    <Tarjeta heroe={heroe}>
      <CardHeader>
        <span className={`text-xs ${suave}`}>
          Perfil {perfilInversionista.toLowerCase()} · tolera riesgo hasta {toleranciaRiesgoMax} de 5
        </span>
        <span className="cifra monto text-3xl font-semibold">{formatearPorcentaje(seleccionado.rendimientoAnualEsperado)}</span>
        <span className={`text-sm ${suave}`}>
          anual estimado con {seleccionado.nombre} ·{" "}
          <span className={`monto font-semibold ${heroe ? "" : "text-exito"}`}>+{formatearMonto(gananciaAnual)}</span> al año sobre{" "}
          <span className="monto">{formatearMonto(montoReferenciaCentavos)}</span>
        </span>
      </CardHeader>

      <CardContent>
        <RadioGroup value={seleccionadoId} onValueChange={(v) => setSeleccionadoId(String(v))} aria-label="Instrumento de inversión" className="animar-filas gap-2 @3xl/tarjeta:grid-cols-2">
          {instrumentos.map((inst) => {
            const activa = inst.id === seleccionadoId;
            const supera = inst.riesgo > toleranciaRiesgoMax;
            return (
              <label
                key={inst.id}
                className={`flex cursor-pointer items-center gap-3 border px-3 py-2 ${CLASES_FILA_TOCABLE} ${
                  heroe
                    ? activa
                      ? "border-white bg-white/15"
                      : "border-white/30"
                    : activa
                      ? "border-primary bg-tinte"
                      : "border-borde-sutil"
                }`}
              >
                <RadioGroupItem value={inst.id} className={heroe ? "border-white data-checked:bg-white [&_span]:bg-primary" : ""} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-medium">
                    <span className="truncate">{inst.nombre}</span>
                    {inst.recomendado ? (
                      <Badge variant="secondary" className={heroe ? "bg-white/20 text-primary-foreground" : "bg-tinte text-primary"}>
                        <Star /> Sugerido
                      </Badge>
                    ) : null}
                  </span>
                  <span className={`flex flex-wrap items-center gap-x-2 text-xs ${suave}`}>
                    <PuntosDeRiesgo nivel={inst.riesgo} supera={supera} heroe={heroe} />
                    <span>
                      riesgo {ETIQUETAS_RIESGO[inst.riesgo]}
                      {supera ? <span className={heroe ? " font-medium" : " font-medium text-advertencia"}> · supera tu perfil</span> : null}
                    </span>
                    <span className="hidden @md/tarjeta:inline">· {inst.clave}</span>
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end">
                  <span className="monto text-sm font-semibold">{formatearPorcentaje(inst.rendimientoAnualEsperado)}</span>
                  <span className={`text-xs ${suave}`}>anual</span>
                </span>
              </label>
            );
          })}
        </RadioGroup>
      </CardContent>

      <PieTarjeta razon={razon} heroe={heroe}>
        {alAccionar ? (
          <Button
            className={`${CLASES_BOTON_PIE} ${heroe ? "bg-white/90 text-primary hover:bg-white" : ""}`}
            size="lg"
            onClick={() =>
              alAccionar({
                accion: "elegir_instrumento",
                instrumentoId: seleccionado.id,
                clave: seleccionado.clave,
                rendimientoAnualEsperado: seleccionado.rendimientoAnualEsperado,
              })
            }
          >
            Invertir en {seleccionado.clave} <ArrowRight />
          </Button>
        ) : null}
      </PieTarjeta>
    </Tarjeta>
  );
}

/** Cinco puntos; los llenos son el nivel. Sobre el perfil, en el color de advertencia. */
function PuntosDeRiesgo({ nivel, supera, heroe }: { nivel: number; supera: boolean; heroe: boolean }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`Riesgo ${nivel} de 5`} role="img">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`size-1.5 rounded-full ${
            n <= nivel ? (heroe ? "bg-white" : supera ? "bg-advertencia" : "bg-foreground") : heroe ? "bg-white/30" : "bg-chart-4"
          }`}
        />
      ))}
    </span>
  );
}
