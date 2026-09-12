import { CheckCircle2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CLASES_TARJETA, formatearMonto } from "../comunes";
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
      <Card className={CLASES_TARJETA}>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-48" />
        </CardContent>
      </Card>
    );
  }

  const Icono = tono === "exito" ? CheckCircle2 : Info;

  return (
    <Card className={CLASES_TARJETA}>
      <CardHeader>
        <CardTitle className="flex items-start gap-2">
          <Icono className={`mt-0.5 size-4 shrink-0 ${tono === "exito" ? "text-exito" : "text-muted-foreground"}`} />
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
          <span className="monto text-3xl font-semibold">{formatearMonto(montoCentavos)}</span>
        ) : null}
        {detalle ? <p className="text-sm text-muted-foreground">{detalle}</p> : null}
        {siguientePaso ? <p className="text-sm">{siguientePaso}</p> : null}
      </CardContent>

      {razon ? (
        <CardFooter>
          <p className="text-xs text-muted-foreground">¿Por qué veo esto? {razon}</p>
        </CardFooter>
      ) : null}
    </Card>
  );
}
