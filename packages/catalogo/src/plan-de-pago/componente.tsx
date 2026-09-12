"use client";

import { useState } from "react";
import { ArrowRight, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import type { PropsComponente } from "@maya/a2ui";
import { formatearMonto, formatearPorcentaje } from "../comunes";
import type { PropsPlanDePago } from "./schema";

/**
 * La seleccion del plazo vive en el componente (estado de interfaz, no dato de negocio):
 * ir al agente por cada clic en un radio seria un turno completo por toque. Lo que si
 * va al agente es la confirmacion: el boton dispara la accion declarada con el plazo
 * elegido como `contextoExtra`, y el agente llama la tool.
 */
export function PlanDePago(props: Partial<PropsPlanDePago> & Pick<PropsComponente, "alAccionar">) {
  const { opciones, plazoElegido, tarjetaId, etiquetaBoton = "Aplicar plan", razon, alAccionar } = props;
  const recomendado = opciones?.find((o) => o.recomendado)?.plazoMeses;
  const [seleccion, setSeleccion] = useState<number | undefined>(plazoElegido ?? recomendado ?? opciones?.[0]?.plazoMeses);

  if (!opciones) {
    return (
      <Card className="animar-entrada rounded-2xl border-borde-sutil shadow-sm">
        <CardContent className="flex flex-col gap-3 p-5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (opciones.length === 0) {
    return (
      <Card className="animar-entrada rounded-2xl border-borde-sutil shadow-sm">
        <CardContent className="p-5 text-sm text-muted-foreground">
          No hay planes que cotizar para esta tarjeta. Pregúntame por otra opción.
        </CardContent>
      </Card>
    );
  }

  const elegida = opciones.find((o) => o.plazoMeses === seleccion) ?? opciones[0]!;

  return (
    <Card className="animar-entrada rounded-2xl border-borde-sutil shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Elige tu plazo</CardTitle>
        <p className="text-sm text-muted-foreground">
          Con {elegida.plazoMeses} meses te ahorras{" "}
          <span className="font-semibold tabular-nums text-foreground">{formatearMonto(elegida.ahorroCentavos)}</span> frente a
          pagar el mínimo.
        </p>
      </CardHeader>

      <CardContent className="p-5 pt-0">
        <RadioGroup
          value={String(seleccion ?? "")}
          onValueChange={(valor) => setSeleccion(Number(valor))}
          aria-label="Plazo del plan de pago"
        >
          {opciones.map((o) => {
            const activa = o.plazoMeses === seleccion;
            return (
              <label
                key={o.plazoMeses}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                  activa ? "border-primary bg-tinte" : "border-borde-sutil hover:bg-muted"
                }`}
              >
                <RadioGroupItem value={String(o.plazoMeses)} />
                <div className="flex flex-1 flex-col">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {o.plazoMeses} meses
                    {o.recomendado ? (
                      <Badge className="bg-tinte text-primary" variant="secondary">
                        <Star /> Recomendado
                      </Badge>
                    ) : null}
                  </span>
                  <span className="text-xs text-muted-foreground">CAT {formatearPorcentaje(o.cat)}</span>
                </div>
                <span className="text-base font-semibold tabular-nums">{formatearMonto(o.mensualidadCentavos)}</span>
                <span className="text-xs text-muted-foreground">/mes</span>
              </label>
            );
          })}
        </RadioGroup>
      </CardContent>

      <CardFooter className="flex flex-col items-start gap-3 border-t border-borde-sutil pt-4">
        <Button
          className="rounded-full"
          size="lg"
          disabled={!alAccionar}
          onClick={() => alAccionar?.({ plazoMeses: elegida.plazoMeses, ...(tarjetaId ? { tarjetaId } : {}) })}
        >
          {etiquetaBoton} <ArrowRight />
        </Button>
        {razon ? <p className="text-xs text-muted-foreground">¿Por qué veo esto? {razon}</p> : null}
      </CardFooter>
    </Card>
  );
}
