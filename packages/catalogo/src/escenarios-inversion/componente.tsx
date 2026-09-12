"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import type { PropsComponente } from "@maya/a2ui";
import { CLASES_FILA_TOCABLE, CLASES_PIE_HEROE, CLASES_TARJETA, CLASES_TARJETA_HEROE, formatearMonto, formatearPorcentaje } from "../comunes";
import { EsqueletoCuerpo, EsqueletoEncabezado, EsqueletoPie, EsqueletoTarjeta, Linea } from "../esqueletos";
import type { PropsEscenariosInversion } from "./schema";

type TipoEscenario = "pesimista" | "esperado" | "optimista";
const ORDEN: TipoEscenario[] = ["pesimista", "esperado", "optimista"];
const TITULO: Record<TipoEscenario, string> = { pesimista: "Pesimista", esperado: "Esperado", optimista: "Optimista" };

/**
 * Qué pasaría con una inversión en el peor, el probable y el mejor caso.
 *
 * Tres opciones tocables y un número grande que cambia con la que se elige. Sin iconos
 * de escudo o llama ni colores por escenario: el nombre y la tasa ya lo dicen, y el
 * único color de la tarjeta es el de la opción elegida y el botón.
 */
export function EscenariosInversion(props: Partial<PropsEscenariosInversion> & Pick<PropsComponente, "alAccionar">) {
  const {
    montoInvertidoCentavos,
    horizonteMeses,
    escenarioPesimista,
    escenarioEsperado,
    escenarioOptimista,
    escenarioInicial = "esperado",
    heroe = false,
    razon,
    alAccionar,
  } = props;

  const [seleccionado, setSeleccionado] = useState<TipoEscenario>(escenarioInicial ?? "esperado");

  if (typeof montoInvertidoCentavos !== "number" || typeof horizonteMeses !== "number" || !escenarioPesimista || !escenarioEsperado || !escenarioOptimista) {
    return (
      <EsqueletoTarjeta heroe={heroe} etiqueta="Calculando los escenarios">
        <EsqueletoEncabezado />
        <EsqueletoCuerpo>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex min-h-12 flex-col justify-center gap-1 rounded-xl border border-borde-sutil px-3 py-2">
                <Linea tamano="xs" ancho="w-20" />
                <Linea tamano="base" ancho="w-24" />
              </div>
            ))}
          </div>
        </EsqueletoCuerpo>
        <EsqueletoPie heroe={heroe} lineas={2} boton />
      </EsqueletoTarjeta>
    );
  }

  const escenarios: Record<TipoEscenario, typeof escenarioEsperado> = {
    pesimista: escenarioPesimista,
    esperado: escenarioEsperado,
    optimista: escenarioOptimista,
  };
  const actual = escenarios[seleccionado];
  const anios = Math.round(horizonteMeses / 12);
  const suave = heroe ? "text-primary-foreground/80" : "text-muted-foreground";

  return (
    <Card className={heroe ? CLASES_TARJETA_HEROE : CLASES_TARJETA}>
      <CardHeader>
        <span className={`text-xs ${suave}`}>
          Escenario {TITULO[seleccionado].toLowerCase()} a {horizonteMeses} meses{anios >= 1 ? ` (${anios} ${anios === 1 ? "año" : "años"})` : ""} ·
          inviertes <span className="monto">{formatearMonto(montoInvertidoCentavos)}</span>
        </span>
        <span className="monto text-3xl font-semibold">{formatearMonto(actual.valorFinalCentavos)}</span>
        <span className={`text-sm ${suave}`}>
          <span className={`monto font-semibold ${heroe ? "" : "text-exito"}`}>+{formatearMonto(actual.rendimientoCentavos)}</span> ·{" "}
          <span className="monto">{formatearPorcentaje(actual.tasaAnualPct)}</span> anual
        </span>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Escenario">
          {ORDEN.map((tipo) => {
            const esc = escenarios[tipo];
            const activo = seleccionado === tipo;
            return (
              <button
                key={tipo}
                type="button"
                role="radio"
                aria-checked={activo}
                onClick={() => setSeleccionado(tipo)}
                className={`flex min-h-12 flex-row items-baseline justify-between gap-2 border px-3 py-2 text-left sm:flex-col sm:gap-0.5 ${CLASES_FILA_TOCABLE} ${
                  heroe
                    ? activo
                      ? "border-white bg-white/15"
                      : "border-white/30"
                    : activo
                      ? "border-primary bg-tinte"
                      : "border-borde-sutil"
                }`}
              >
                <span className="flex items-baseline gap-2 text-sm">
                  <span className="font-medium">{TITULO[tipo]}</span>
                  <span className={`monto text-xs ${suave}`}>{formatearPorcentaje(esc.tasaAnualPct)}</span>
                </span>
                <span className="monto text-base font-semibold">{formatearMonto(esc.valorFinalCentavos)}</span>
              </button>
            );
          })}
        </div>
        {actual.descripcion ? <p className={`text-sm ${suave}`}>{actual.descripcion}</p> : null}
      </CardContent>

      <CardFooter className={`flex flex-col items-start gap-3 ${heroe ? CLASES_PIE_HEROE : ""}`}>
        {alAccionar ? (
          <Button
            className={`min-h-12 w-full rounded-full sm:w-auto ${heroe ? "bg-white/90 text-primary hover:bg-white" : ""}`}
            size="lg"
            onClick={() =>
              alAccionar({ accion: "elegir_escenario", escenario: seleccionado, valorFinalCentavos: actual.valorFinalCentavos, tasaAnualPct: actual.tasaAnualPct })
            }
          >
            Elegir escenario {TITULO[seleccionado].toLowerCase()} <ArrowRight />
          </Button>
        ) : null}
        {razon ? <p className={`text-xs ${suave}`}>¿Por qué veo esto? {razon}</p> : null}
      </CardFooter>
    </Card>
  );
}
