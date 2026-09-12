import { Target } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CLASES_PIE_HEROE,
  CLASES_TARJETA,
  CLASES_TARJETA_HEROE,
  formatearFecha,
  formatearMonto,
  formatearPorcentaje,
} from "../comunes";
import type { PropsMetaActiva } from "./schema";

/** Un apartado que ya existe: cuanto lleva, cuanto aporta y cuando cae el siguiente cargo. */
export function MetaActiva(props: Partial<PropsMetaActiva>) {
  const {
    heroe = false,
    nombre,
    metaCentavos,
    acumuladoCentavos,
    aportacionCentavos,
    frecuencia,
    proximoCargoFecha,
    fechaObjetivo,
    razon,
  } = props;

  if (typeof metaCentavos !== "number" || typeof acumuladoCentavos !== "number") {
    return (
      <Card className={CLASES_TARJETA}>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-1 w-full" />
        </CardContent>
      </Card>
    );
  }

  const avance = metaCentavos > 0 ? Math.min(1, acumuladoCentavos / metaCentavos) : 0;
  const suave = heroe ? "text-primary-foreground/80" : "text-muted-foreground";

  return (
    <Card className={heroe ? CLASES_TARJETA_HEROE : CLASES_TARJETA}>
      <CardHeader>
        <span className={`flex items-center gap-2 text-xs ${suave}`}>
          <Target className="size-4 shrink-0" /> {nombre}
        </span>
        <span className="monto text-3xl font-semibold">{formatearMonto(acumuladoCentavos)}</span>
        <span className={`text-sm ${suave}`}>
          de <span className="monto">{formatearMonto(metaCentavos)}</span>
        </span>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <div className={`flex justify-between text-xs ${suave}`}>
            <span>Avance</span>
            <span className="monto">{formatearPorcentaje(avance)}</span>
          </div>
          <Progress
            value={Math.round(avance * 100)}
            aria-label={`Avance: ${formatearPorcentaje(avance)}`}
            className={
              heroe ? "[&_[data-slot=progress-track]]:bg-white/30 [&_[data-slot=progress-indicator]]:bg-white" : ""
            }
          />
        </div>
        {typeof aportacionCentavos === "number" ? (
          <p className="text-sm">
            Apartas <span className="monto font-semibold">{formatearMonto(aportacionCentavos)}</span>
            {frecuencia === "quincenal" ? " cada quincena" : " al mes"}
            {proximoCargoFecha ? `; el siguiente, el ${formatearFecha(proximoCargoFecha)}` : ""}.
          </p>
        ) : proximoCargoFecha ? (
          <p className="text-sm">Siguiente apartado: {formatearFecha(proximoCargoFecha)}.</p>
        ) : null}
        {fechaObjetivo ? <p className={`text-xs ${suave}`}>Llegas el {formatearFecha(fechaObjetivo, true)}.</p> : null}
      </CardContent>

      {razon ? (
        <CardFooter className={heroe ? CLASES_PIE_HEROE : ""}>
          <p className={`text-xs ${suave}`}>¿Por qué veo esto? {razon}</p>
        </CardFooter>
      ) : null}
    </Card>
  );
}
