import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  CLASES_PIE_HEROE,
  CLASES_TARJETA,
  CLASES_TARJETA_HEROE,
  formatearFecha,
  formatearMonto,
  formatearPorcentaje,
} from "../comunes";
import { EsqueletoBarra, EsqueletoCuerpo, EsqueletoEncabezado, EsqueletoPie, EsqueletoTarjeta, Linea } from "../esqueletos";
import type { PropsResumenTarjeta } from "./schema";

/**
 * La situacion de la tarjeta en una cifra. Tres estados: cargando, con deuda (uso del
 * limite, pago minimo, mora) y con plan activo (saldo en cero y una mensualidad fija).
 *
 * Como heroe lleva el degradado de marca; como tarjeta normal, blanca. El badge va en
 * `CardAction`, que es el hueco que `CardHeader` reserva para el: asi no compite con el
 * texto a 360 px.
 */
export function ResumenTarjeta(props: Partial<PropsResumenTarjeta>) {
  const {
    heroe = false,
    mascara,
    saldoCentavos,
    limiteCentavos,
    pagoMinimoCentavos,
    fechaLimitePago,
    diasMora = 0,
    planActivo = false,
    mensualidadCentavos,
    razon,
  } = props;

  if (typeof saldoCentavos !== "number" || typeof limiteCentavos !== "number") {
    return (
      <EsqueletoTarjeta heroe={heroe} etiqueta="Cargando el resumen de tu tarjeta">
        <EsqueletoEncabezado />
        <EsqueletoCuerpo className="flex flex-col gap-3">
          <EsqueletoBarra />
          <Linea tamano="sm" ancho="w-56" />
        </EsqueletoCuerpo>
        <EsqueletoPie heroe={heroe} lineas={3} />
      </EsqueletoTarjeta>
    );
  }

  const uso = limiteCentavos > 0 ? Math.min(1, saldoCentavos / limiteCentavos) : 0;
  const suave = heroe ? "text-primary-foreground/80" : "text-muted-foreground";

  return (
    <Card className={heroe ? CLASES_TARJETA_HEROE : CLASES_TARJETA}>
      <CardHeader>
        <span className={`text-xs ${suave}`}>{planActivo ? "Saldo diferido de tu tarjeta" : "Saldo de tu tarjeta"}</span>
        <span className="monto text-3xl font-semibold">{formatearMonto(saldoCentavos)}</span>
        <span className={`text-sm ${suave}`}>{mascara}</span>
        <CardAction>
          {planActivo ? (
            <Badge variant="secondary" className={heroe ? "bg-white/90 text-primary" : "bg-tinte text-primary"}>
              <CheckCircle2 /> Plan activo
            </Badge>
          ) : diasMora > 0 ? (
            <Badge variant="secondary" className="bg-oscuro text-white">
              <AlertTriangle /> {diasMora} {diasMora === 1 ? "día" : "días"}
            </Badge>
          ) : null}
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {planActivo ? (
          <p className="text-sm">
            Ahora pagas <span className="monto font-semibold">{formatearMonto(mensualidadCentavos ?? 0)}</span> fijos al
            mes{fechaLimitePago ? `, el próximo el ${formatearFecha(fechaLimitePago)}` : ""}.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <div className={`flex flex-wrap justify-between gap-x-3 text-xs ${suave}`}>
                <span>Uso del límite</span>
                <span className="monto">
                  {formatearPorcentaje(uso)} de {formatearMonto(limiteCentavos)}
                </span>
              </div>
              <Progress
                value={Math.round(uso * 100)}
                aria-label={`Uso del límite: ${formatearPorcentaje(uso)}`}
                className={
                  heroe
                    ? "[&_[data-slot=progress-track]]:bg-white/30 [&_[data-slot=progress-indicator]]:bg-white"
                    : ""
                }
              />
            </div>
            {typeof pagoMinimoCentavos === "number" && pagoMinimoCentavos > 0 ? (
              <p className="text-sm">
                Pago mínimo <span className="monto font-semibold">{formatearMonto(pagoMinimoCentavos)}</span>
                {fechaLimitePago ? ` antes del ${formatearFecha(fechaLimitePago)}` : ""}.
              </p>
            ) : null}
          </>
        )}
      </CardContent>

      {razon ? (
        <CardFooter className={heroe ? CLASES_PIE_HEROE : ""}>
          <p className={`text-xs ${suave}`}>¿Por qué veo esto? {razon}</p>
        </CardFooter>
      ) : null}
    </Card>
  );
}
