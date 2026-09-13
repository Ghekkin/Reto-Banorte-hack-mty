"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader } from "@/components/ui/card";
import type { PropsComponente } from "@maya/a2ui";
import { formatearMonto, formatearPorcentaje } from "../comunes";
import { EsqueletoCuerpo, EsqueletoEncabezado, EsqueletoPie, EsqueletoTarjeta, Linea } from "../esqueletos";
import { PieTarjeta, Tarjeta } from "../tarjeta";
import type { PropsSugerenciasInversion } from "./schema";

const ETIQUETAS_ESTADO = {
  deuda_prioritaria: "Atención a Pasivos",
  requiere_fondo_emergencia: "Construyendo Colchón",
  listo_para_invertir: "Listo para Invertir",
};

const ETIQUETAS_PERFIL = {
  conservador: "Perfil Conservador",
  moderado: "Perfil Moderado",
  agresivo: "Perfil Agresivo",
  sin_perfil: "Sin Perfil",
};

export function SugerenciasInversion(
  props: Partial<PropsSugerenciasInversion> & Pick<PropsComponente, "alAccionar">,
) {
  const {
    estadoFinanciero,
    perfilInversionista = "conservador",
    capacidadMensualCentavos,
    montoRecomendadoCentavos,
    motivo,
    sugerencias,
    siguientePaso,
    heroe = false,
    razon,
    alAccionar,
  } = props;

  if (
    !estadoFinanciero ||
    typeof capacidadMensualCentavos !== "number" ||
    typeof montoRecomendadoCentavos !== "number" ||
    !sugerencias ||
    sugerencias.length === 0
  ) {
    return (
      <EsqueletoTarjeta heroe={heroe} etiqueta="Cargando alternativas de inversión">
        <EsqueletoEncabezado />
        <EsqueletoCuerpo className="flex flex-col gap-3">
          <Linea tamano="base" ancho="w-3/4" />
          <Linea tamano="sm" ancho="w-full" />
          <Linea tamano="sm" ancho="w-1/2" />
        </EsqueletoCuerpo>
        <EsqueletoPie heroe={heroe} />
      </EsqueletoTarjeta>
    );
  }

  const esDeudaPrioritaria = estadoFinanciero === "deuda_prioritaria";

  return (
    <Tarjeta heroe={heroe}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
            {esDeudaPrioritaria ? (
              <AlertTriangle className="size-4 text-primary" />
            ) : (
              <TrendingUp className="size-4 text-primary" />
            )}
            Alternativas de Inversión Banorte
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="text-[11px] font-normal border-primary/20 text-primary">
              {ETIQUETAS_ESTADO[estadoFinanciero]}
            </Badge>
            <Badge variant="secondary" className="text-[11px] font-normal">
              {ETIQUETAS_PERFIL[perfilInversionista]}
            </Badge>
          </div>
        </div>

        <div className="mt-2 flex items-baseline justify-between flex-wrap gap-2">
          <div>
            <span className="text-xs text-muted-foreground block">Monto sugerido para destinar</span>
            <span className="cifra monto block text-xl @md/tarjeta:text-2xl font-bold tracking-tight text-foreground">
              {formatearMonto(montoRecomendadoCentavos)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground block">Capacidad mensual estimada</span>
            <span className="monto text-sm font-semibold text-foreground">
              {formatearMonto(capacidadMensualCentavos)} / mes
            </span>
          </div>
        </div>

        {motivo ? (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{motivo}</p>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="animar-filas flex flex-col gap-2">
          {sugerencias.map((sug) => {
            const esRec = sug.recomendado;
            const esAdvertencia = sug.tipo === "advertencia";

            return (
              <div
                key={sug.id}
                className={`rounded-xl border p-3 flex flex-col gap-2 transition-colors ${
                  esRec
                    ? "border-primary/40 bg-primary/5"
                    : esAdvertencia
                      ? "border-destructive/30 bg-destructive/5"
                      : "border-borde-sutil bg-card"
                }`}
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{sug.titulo}</span>
                    {sug.badge ? (
                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-medium px-1.5 py-0.5 ${
                          esRec ? "bg-primary text-primary-foreground" : ""
                        }`}
                      >
                        {sug.badge}
                      </Badge>
                    ) : null}
                  </div>

                  {typeof sug.rendimientoEstimadoAnualPct === "number" ? (
                    <div className="flex items-center gap-1 text-xs font-semibold text-primary shrink-0">
                      <span>Rend. estimado:</span>
                      <span className="font-bold">
                        {formatearPorcentaje(sug.rendimientoEstimadoAnualPct)} anual
                      </span>
                    </div>
                  ) : null}
                </div>

                <p className="text-xs text-foreground/85 leading-relaxed">{sug.descripcion}</p>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    {sug.plazoMinimo ? <span>Plazo mín: {sug.plazoMinimo}</span> : null}
                    {sug.nivelRiesgo ? (
                      <span className="capitalize">Riesgo: {sug.nivelRiesgo.replace("_", " ")}</span>
                    ) : null}
                  </div>

                  {alAccionar ? (
                    <Button
                      variant={esRec ? "default" : "outline"}
                      size="sm"
                      className="min-h-12 px-3 rounded-lg text-xs"
                      onClick={() => {
                        if (esAdvertencia) {
                          alAccionar({ accion: "simular_plan" });
                        } else if (sug.tipo === "meta") {
                          alAccionar({
                            accion: "simular_meta",
                            meta: sug.titulo,
                            montoObjetivoCentavos: montoRecomendadoCentavos,
                          });
                        } else if (sug.tipo === "estrategia") {
                          alAccionar({ accion: "orden_rebalanceo" });
                        } else {
                          alAccionar({
                            accion: "preguntar",
                            texto: `Quiero invertir en ${sug.titulo}`,
                          });
                        }
                      }}
                    >
                      {esAdvertencia ? "Ver plan de pago" : "Elegir opción"}
                      <ArrowRight className="size-3 ml-1" />
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {siguientePaso ? (
          <div className="rounded-lg bg-muted/40 p-2.5 text-xs text-foreground/90 flex items-center gap-2">
            <CheckCircle2 className="size-3.5 text-primary shrink-0" />
            <span>
              <strong>Próximo paso:</strong> {siguientePaso}
            </span>
          </div>
        ) : null}
      </CardContent>

      <PieTarjeta razon={razon} heroe={heroe} />
    </Tarjeta>
  );
}
