import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatearFecha, formatearMonto, formatearPorcentaje } from "../comunes";
import type { PropsResumenTarjeta } from "./schema";

/**
 * Tres estados: cargando (skeleton), la tarjeta con deuda (uso del limite, pago minimo,
 * mora) y la tarjeta con plan activo (saldo en cero, mensualidad fija). Como heroe lleva
 * el degradado de marca y texto blanco; como tarjeta normal, blanca (skill `diseno-banorte`).
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
      <Card className="animar-entrada rounded-2xl border-borde-sutil shadow-sm">
        <CardContent className="flex flex-col gap-3 p-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-1 w-full" />
        </CardContent>
      </Card>
    );
  }

  const uso = limiteCentavos > 0 ? Math.min(1, saldoCentavos / limiteCentavos) : 0;
  const enHeroe = heroe;
  const textoSuave = enHeroe ? "text-primary-foreground/80" : "text-muted-foreground";
  const clasesTarjeta = enHeroe
    ? "animar-entrada rounded-2xl border-0 bg-[linear-gradient(135deg,var(--primary)_0%,var(--marca-oscuro)_100%)] text-primary-foreground shadow-sm"
    : "animar-entrada rounded-2xl border-borde-sutil shadow-sm";

  return (
    <Card className={clasesTarjeta}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex flex-col">
          <span className={`text-xs ${textoSuave}`}>{planActivo ? "Saldo diferido de tu tarjeta" : "Saldo de tu tarjeta"}</span>
          <span className={`text-sm ${textoSuave}`}>{mascara}</span>
        </div>
        {planActivo ? (
          <Badge className={enHeroe ? "bg-white/90 text-primary" : "bg-tinte text-primary"} variant="secondary">
            <CheckCircle2 /> Plan activo
          </Badge>
        ) : diasMora > 0 ? (
          <Badge className={enHeroe ? "bg-oscuro text-white" : "bg-oscuro text-white"} variant="secondary">
            <AlertTriangle /> {diasMora} {diasMora === 1 ? "día" : "días"} de atraso
          </Badge>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-3 p-5 pt-0">
        <span className="text-3xl font-semibold tabular-nums">{formatearMonto(saldoCentavos)}</span>

        {planActivo ? (
          <p className="text-sm">
            Ahora pagas <span className="font-semibold tabular-nums">{formatearMonto(mensualidadCentavos ?? 0)}</span> fijos
            al mes{fechaLimitePago ? `, el próximo el ${formatearFecha(fechaLimitePago)}` : ""}.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <div className={`flex justify-between text-xs ${textoSuave}`}>
                <span>Uso del límite</span>
                <span className="tabular-nums">
                  {formatearPorcentaje(uso)} de {formatearMonto(limiteCentavos)}
                </span>
              </div>
              <Progress value={Math.round(uso * 100)} className={enHeroe ? "[&_[data-slot=progress-track]]:bg-white/30 [&_[data-slot=progress-indicator]]:bg-white" : ""} />
            </div>
            {typeof pagoMinimoCentavos === "number" ? (
              <p className="text-sm">
                Pago mínimo <span className="font-semibold tabular-nums">{formatearMonto(pagoMinimoCentavos)}</span>
                {fechaLimitePago ? ` antes del ${formatearFecha(fechaLimitePago)}` : ""}.
              </p>
            ) : null}
          </>
        )}
      </CardContent>

      {razon ? (
        <CardFooter className={`border-t pt-4 ${enHeroe ? "border-white/20" : "border-borde-sutil"}`}>
          <p className={`text-xs ${textoSuave}`}>¿Por qué veo esto? {razon}</p>
        </CardFooter>
      ) : null}
    </Card>
  );
}
