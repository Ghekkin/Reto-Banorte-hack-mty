import { Target } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatearFecha, formatearMonto, formatearPorcentaje } from "../comunes";
import type { PropsMetaActiva } from "./schema";

export function MetaActiva(props: Partial<PropsMetaActiva>) {
  const { heroe = false, nombre, metaCentavos, acumuladoCentavos, aportacionCentavos, frecuencia, proximoCargoFecha, fechaObjetivo, razon } = props;

  if (typeof metaCentavos !== "number" || typeof acumuladoCentavos !== "number") {
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

  const avance = metaCentavos > 0 ? Math.min(1, acumuladoCentavos / metaCentavos) : 0;
  const textoSuave = heroe ? "text-primary-foreground/80" : "text-muted-foreground";
  const clasesTarjeta = heroe
    ? "animar-entrada rounded-2xl border-0 bg-[linear-gradient(135deg,var(--primary)_0%,var(--marca-oscuro)_100%)] text-primary-foreground shadow-sm"
    : "animar-entrada rounded-2xl border-borde-sutil shadow-sm";

  return (
    <Card className={clasesTarjeta}>
      <CardHeader>
        <span className={`flex items-center gap-2 text-xs ${textoSuave}`}>
          <Target className="size-4" /> {nombre}
        </span>
        <span className="text-3xl font-semibold tabular-nums">{formatearMonto(acumuladoCentavos)}</span>
        <span className={`text-sm ${textoSuave}`}>de {formatearMonto(metaCentavos)}</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 p-5 pt-0">
        <div className="flex flex-col gap-1">
          <div className={`flex justify-between text-xs ${textoSuave}`}>
            <span>Avance</span>
            <span className="tabular-nums">{formatearPorcentaje(avance)}</span>
          </div>
          <Progress value={Math.round(avance * 100)} className={heroe ? "[&_[data-slot=progress-track]]:bg-white/30 [&_[data-slot=progress-indicator]]:bg-white" : ""} />
        </div>
        {typeof aportacionCentavos === "number" ? (
          <p className="text-sm">
            Apartas <span className="font-semibold tabular-nums">{formatearMonto(aportacionCentavos)}</span>
            {frecuencia === "quincenal" ? " cada quincena" : " al mes"}
            {proximoCargoFecha ? `; el siguiente, el ${formatearFecha(proximoCargoFecha)}` : ""}.
          </p>
        ) : proximoCargoFecha ? (
          <p className="text-sm">Siguiente apartado: {formatearFecha(proximoCargoFecha)}.</p>
        ) : null}
        {fechaObjetivo ? <p className={`text-xs ${textoSuave}`}>Llegas el {formatearFecha(fechaObjetivo, true)}.</p> : null}
      </CardContent>
      {razon ? (
        <CardFooter className={`border-t pt-4 ${heroe ? "border-white/20" : "border-borde-sutil"}`}>
          <p className={`text-xs ${textoSuave}`}>¿Por qué veo esto? {razon}</p>
        </CardFooter>
      ) : null}
    </Card>
  );
}
