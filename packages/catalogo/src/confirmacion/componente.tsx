import { CheckCircle2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatearMonto } from "../comunes";
import { EsqueletoCuerpo, EsqueletoPie, EsqueletoTarjeta, Linea } from "../esqueletos";
import { PieTarjeta, Tarjeta } from "../tarjeta";
import type { PropsConfirmacion } from "./schema";

/**
 * El renderer entrega las props YA resueltas contra el data model.
 * Cero fetch, cero estado local: si algo falta, se pinta el estado vacio.
 */
export function Confirmacion(props: Partial<PropsConfirmacion>) {
  const { titulo, detalle, montoCentavos, etiquetaMonto, siguientePaso, razon, tono = "exito" } = props;

  // Estado de carga: el data model puede llegar despues que los componentes.
  if (!titulo) {
    return (
      <EsqueletoTarjeta etiqueta="Confirmando la operación">
        <CardHeader>
          <Linea tamano="base" ancho="w-48" />
        </CardHeader>
        <EsqueletoCuerpo className="flex flex-col gap-2">
          <Linea tamano="xs" ancho="w-24" />
          <Linea tamano="3xl" ancho="w-40" />
          <Linea tamano="sm" ancho="w-56" />
          <Linea tamano="sm" ancho="w-44" />
        </EsqueletoCuerpo>
        <EsqueletoPie />
      </EsqueletoTarjeta>
    );
  }

  const Icono = tono === "exito" ? CheckCircle2 : Info;

  return (
    <Tarjeta>
      <CardHeader>
        <CardTitle className="flex items-start gap-2">
          <Icono className={`animar-icono mt-0.5 size-4 shrink-0 ${tono === "exito" ? "text-exito" : "text-muted-foreground"}`} />
          {titulo}
        </CardTitle>
        {tono === "exito" ? (
          <CardAction>
            <Badge variant="secondary" className="bg-tinte text-primary">
              Listo
            </Badge>
          </CardAction>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        {etiquetaMonto ? <span className="text-xs text-muted-foreground">{etiquetaMonto}</span> : null}
        {typeof montoCentavos === "number" ? (
          <span className="cifra monto text-3xl font-semibold">{formatearMonto(montoCentavos)}</span>
        ) : null}
        {detalle ? <p className="text-sm text-muted-foreground">{detalle}</p> : null}
        {siguientePaso ? <p className="text-sm">{siguientePaso}</p> : null}
      </CardContent>

      <PieTarjeta razon={razon} />
    </Tarjeta>
  );
}
