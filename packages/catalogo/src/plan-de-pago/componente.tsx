"use client";

import { useState } from "react";
import { ArrowRight, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { EsqueletoCuerpo, EsqueletoEncabezado, EsqueletoOpciones, EsqueletoPie, EsqueletoTarjeta } from "../esqueletos";
import type { PropsComponente } from "@maya/a2ui";
import { CLASES_FILA_TOCABLE, CLASES_TARJETA, formatearMonto, formatearPorcentaje } from "../comunes";
import type { PropsPlanDePago } from "./schema";

/**
 * Las opciones de reestructura y el boton que APLICA.
 *
 * **El numero grande es el ahorro del plazo elegido**, no la mensualidad: es el dato que
 * decide la conversacion ("te ahorras $132,065 frente a pagar el minimo") y cambia al
 * mover la seleccion, asi que la tarjeta responde al toque sin ir al agente.
 *
 * La seleccion del plazo vive aqui (estado de interfaz, no dato de negocio): ir al agente
 * por cada clic en un radio seria un turno completo por toque. Lo que si viaja es la
 * confirmacion, con el plazo elegido en el `contextoExtra` de la accion.
 *
 * Cada opcion es un `<label>` de 48 px con su radio: a 360 px el nombre se recorta y el
 * monto nunca se sale, porque va en su propia columna con `shrink-0`.
 */
export function PlanDePago(props: Partial<PropsPlanDePago> & Pick<PropsComponente, "alAccionar">) {
  const { opciones, plazoElegido, tarjetaId, etiquetaBoton = "Aplicar plan", razon, alAccionar } = props;
  const recomendado = opciones?.find((o) => o.recomendado)?.plazoMeses;
  const [seleccion, setSeleccion] = useState<number | undefined>(
    plazoElegido ?? recomendado ?? opciones?.[0]?.plazoMeses,
  );

  if (!opciones) {
    return (
      <EsqueletoTarjeta etiqueta="Cargando las opciones de tu plan de pagos">
        <EsqueletoEncabezado />
        <EsqueletoCuerpo className="flex flex-col gap-3">
          <EsqueletoOpciones opciones={4} />
        </EsqueletoCuerpo>
        <EsqueletoPie lineas={3} boton />
      </EsqueletoTarjeta>
    );
  }

  if (opciones.length === 0) {
    return (
      <Card className={CLASES_TARJETA}>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No hay planes que cotizar para esta tarjeta. Pregúntame por otra opción.
          </p>
        </CardContent>
      </Card>
    );
  }

  const elegida = opciones.find((o) => o.plazoMeses === seleccion) ?? opciones[0]!;

  return (
    <Card className={CLASES_TARJETA}>
      <CardHeader>
        <span className="text-xs text-muted-foreground">Te ahorras con este plan</span>
        <span className="monto text-3xl font-semibold">{formatearMonto(elegida.ahorroCentavos)}</span>
        <span className="text-sm text-muted-foreground">
          frente a seguir pagando el mínimo, en {elegida.plazoMeses} meses
        </span>
      </CardHeader>

      <CardContent>
        <RadioGroup
          value={String(seleccion ?? "")}
          onValueChange={(valor) => setSeleccion(Number(valor))}
          aria-label="Plazo del plan de pago"
          className="gap-2"
        >
          {opciones.map((o) => {
            const activa = o.plazoMeses === seleccion;
            return (
              <label
                key={o.plazoMeses}
                className={`flex cursor-pointer items-center gap-3 border px-3 py-2 ${CLASES_FILA_TOCABLE} ${
                  activa ? "border-primary bg-tinte" : "border-borde-sutil"
                }`}
              >
                <RadioGroupItem value={String(o.plazoMeses)} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {/* Sin `whitespace-nowrap`, el badge "Recomendado" le robaba el ancho
                        y la opcion recomendada —justo la que se quiere leer— se partia en
                        "18 / meses", con la fila 12 px mas alta que las otras. */}
                    <span className="whitespace-nowrap">{o.plazoMeses} meses</span>
                    {o.recomendado ? (
                      <Badge variant="secondary" className="bg-tinte text-primary">
                        <Star /> Recomendado
                      </Badge>
                    ) : null}
                  </span>
                  <span className="monto text-xs text-muted-foreground">CAT {formatearPorcentaje(o.cat)}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end">
                  <span className="monto text-sm font-semibold">{formatearMonto(o.mensualidadCentavos)}</span>
                  <span className="text-xs text-muted-foreground">al mes</span>
                </span>
              </label>
            );
          })}
        </RadioGroup>
      </CardContent>

      <CardFooter className="flex flex-col items-start gap-3">
        <Button
          className="min-h-12 w-full rounded-full sm:w-auto"
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
