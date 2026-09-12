"use client";

import { AlertCircle, ArrowRight, CheckCircle2, HelpCircle, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader } from "@/components/ui/card";
import type { PropsComponente } from "@maya/a2ui";
import { formatearMonto } from "../comunes";
import { EsqueletoCuerpo, EsqueletoEncabezado, EsqueletoPie, EsqueletoTarjeta, Linea } from "../esqueletos";
import { PieTarjeta, Tarjeta } from "../tarjeta";
import type { PropsAvisoConsultaNoValida } from "./schema";

const ICONOS_POR_TIPO = {
  deuda_prioritaria: ShieldAlert,
  producto_no_aplica: CheckCircle2,
  fuera_de_alcance: AlertCircle,
  sin_datos_suficientes: HelpCircle,
};

const ETIQUETAS_POR_TIPO = {
  deuda_prioritaria: "Prioridad Financiera",
  producto_no_aplica: "Situación al Corriente",
  fuera_de_alcance: "Fuera de Catálogo Regulado",
  sin_datos_suficientes: "Información Adicional",
};

export function AvisoConsultaNoValida(
  props: Partial<PropsAvisoConsultaNoValida> & Pick<PropsComponente, "alAccionar">,
) {
  const {
    titulo,
    explicacion,
    tipoInvalidez = "fuera_de_alcance",
    datoClave,
    montoReferenciaCentavos = 0,
    etiquetaMonto = "Monto de referencia",
    alternativasSugeridas,
    accionSugerida,
    heroe = false,
    razon,
    alAccionar,
  } = props;

  if (!titulo || !explicacion || !alternativasSugeridas || alternativasSugeridas.length === 0) {
    return (
      <EsqueletoTarjeta heroe={heroe} etiqueta="Cargando orientación">
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

  const Icono = ICONOS_POR_TIPO[tipoInvalidez] ?? HelpCircle;

  return (
    <Tarjeta heroe={heroe}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
            <Icono className="size-4 text-primary" /> Orientación Financiera Banorte
          </span>
          <Badge variant="outline" className="text-[11px] font-normal border-primary/20 text-primary">
            {ETIQUETAS_POR_TIPO[tipoInvalidez]}
          </Badge>
        </div>
        <h3 className="text-base @md/tarjeta:text-lg font-semibold tracking-tight text-foreground mt-1">
          {titulo}
        </h3>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Componente propio para el aviso (sin alertas default del sistema y sin degradados morado-azul) */}
        <div className="rounded-xl border border-primary/15 bg-primary/5 p-3.5 flex flex-col gap-2">
          <p className="text-sm text-foreground leading-relaxed">{explicacion}</p>

          <div className="flex items-center justify-between pt-2 border-t border-primary/10 flex-wrap gap-2">
            {datoClave ? (
              <span className="text-xs font-semibold text-primary">{datoClave}</span>
            ) : null}
            <div className="text-right ml-auto">
              <span className="text-[11px] text-muted-foreground block">{etiquetaMonto}</span>
              <span className="monto text-sm font-semibold text-foreground">
                {formatearMonto(montoReferenciaCentavos)}
              </span>
            </div>
          </div>
        </div>

        {/* Accion sugerida principal si existe */}
        {accionSugerida && alAccionar ? (
          <div className="flex items-center justify-end">
            <Button
              size="sm"
              className="min-h-12 px-4 rounded-xl text-xs font-medium"
              onClick={() =>
                alAccionar({
                  accion: accionSugerida.nombre,
                  ...accionSugerida.context,
                })
              }
            >
              {accionSugerida.etiqueta}
              <ArrowRight className="size-3.5 ml-1.5" />
            </Button>
          </div>
        ) : null}

        {/* Opciones alternativas viables */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Alternativas recomendadas para ti:
          </span>
          <div className="flex flex-col gap-1.5">
            {alternativasSugeridas.map((alt, i) => (
              <button
                key={i}
                type="button"
                className="text-left text-xs min-h-12 text-foreground/90 hover:text-primary transition-colors bg-card hover:bg-muted/50 border border-borde-sutil rounded-lg p-2.5 flex items-center justify-between group"
                onClick={() =>
                  alAccionar
                    ? alAccionar({
                        accion: "preguntar",
                        texto: alt,
                      })
                    : undefined
                }
              >
                <span>{alt}</span>
                <ArrowRight className="size-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-2" />
              </button>
            ))}
          </div>
        </div>
      </CardContent>

      <PieTarjeta razon={razon} heroe={heroe} />
    </Tarjeta>
  );
}
