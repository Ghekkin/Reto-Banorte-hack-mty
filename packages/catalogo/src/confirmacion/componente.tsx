import { CheckCircle2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatearMonto } from "../comunes";
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
      <Card className="animar-entrada rounded-2xl border-borde-sutil shadow-sm">
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  const Icono = tono === "exito" ? CheckCircle2 : Info;

  return (
    <Card className="animar-entrada rounded-2xl border-borde-sutil shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icono className={tono === "exito" ? "text-exito" : "text-muted-foreground"} />
          {titulo}
        </CardTitle>
        {tono === "exito" ? (
          <Badge className="bg-tinte text-primary" variant="secondary">
            Listo
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-2 p-5 pt-0">
        {etiquetaMonto ? <span className="text-xs text-muted-foreground">{etiquetaMonto}</span> : null}
        {typeof montoCentavos === "number" ? (
          <span className="text-3xl font-semibold tabular-nums">{formatearMonto(montoCentavos)}</span>
        ) : null}
        {detalle ? <p className="text-sm text-muted-foreground">{detalle}</p> : null}
        {siguientePaso ? <p className="text-sm">{siguientePaso}</p> : null}
      </CardContent>
      {razon ? (
        <CardFooter className="border-t border-borde-sutil pt-4">
          <p className="text-xs text-muted-foreground">¿Por qué veo esto? {razon}</p>
        </CardFooter>
      ) : null}
    </Card>
  );
}
