import { Target } from "lucide-react";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatearFecha, formatearMonto, formatearPorcentaje } from "../comunes";
import { EsqueletoBarra, EsqueletoCuerpo, EsqueletoEncabezado, EsqueletoPie, EsqueletoTarjeta, Linea } from "../esqueletos";
import { PieTarjeta, Tarjeta } from "../tarjeta";
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
      <EsqueletoTarjeta heroe={heroe} etiqueta="Cargando el avance de tu meta">
        <EsqueletoEncabezado />
        <EsqueletoCuerpo className="flex flex-col gap-3">
          <EsqueletoBarra />
          <div className="flex flex-col">
            <Linea tamano="sm" ancho="w-11/12" />
            <Linea tamano="sm" ancho="w-24" />
          </div>
          <Linea tamano="xs" ancho="w-40" />
        </EsqueletoCuerpo>
        <EsqueletoPie heroe={heroe} />
      </EsqueletoTarjeta>
    );
  }

  const avance = metaCentavos > 0 ? Math.min(1, acumuladoCentavos / metaCentavos) : 0;
  const suave = heroe ? "text-primary-foreground/80" : "text-muted-foreground";

  return (
    <Tarjeta heroe={heroe}>
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

      <PieTarjeta razon={razon} heroe={heroe} />
    </Tarjeta>
  );
}
