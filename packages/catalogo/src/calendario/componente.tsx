import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { CLASES_TARJETA, formatearFecha, formatearMonto } from "../comunes";
import type { PropsCalendario } from "./schema";

const HECHO = new Set(["pagado", "aportado"]);
const ETIQUETA_HECHO: Record<string, string> = { pagado: "Pagado", aportado: "Aportado" };

/**
 * El calendario de pagos o aportaciones.
 *
 * **Dos columnas, no cuatro.** La version anterior tenia fecha, etiqueta, estado y monto en
 * cuatro celdas: a 360 px eso obliga a scroll horizontal, que es justo lo que el sistema
 * prohibe. Ahora la fecha y su etiqueta van apiladas en la celda izquierda y el monto con
 * su estado en la derecha: la misma tabla (`table` de shadcn) se lee igual en un celular y
 * proyectada, sin un diseno distinto por tamano.
 */
export function Calendario(props: Partial<PropsCalendario>) {
  const { titulo = "Tus próximos pagos", eventos, maximo = 6, totalCentavos, razon } = props;

  if (!eventos) {
    return (
      <Card className={CLASES_TARJETA}>
        <CardContent className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const visibles = eventos.slice(0, maximo);
  const restantes = eventos.length - visibles.length;
  // Sin `estado: proximo` explicito, el proximo es el primero que no ha ocurrido.
  const indiceProximo = eventos.some((e) => e.estado === "proximo")
    ? -1
    : eventos.findIndex((e) => !HECHO.has(e.estado ?? "pendiente"));

  return (
    <Card className={CLASES_TARJETA}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" /> {titulo}
        </CardTitle>
      </CardHeader>

      <CardContent>
        {eventos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay fechas programadas.</p>
        ) : (
          <ScrollArea className="max-h-72">
            <Table>
              <TableBody>
                {visibles.map((e, i) => {
                  const esProximo = e.estado === "proximo" || i === indiceProximo;
                  const hecho = HECHO.has(e.estado ?? "pendiente");
                  return (
                    <TableRow key={`${e.fecha}-${i}`} className={esProximo ? "bg-tinte/60" : ""}>
                      <TableCell className="py-3 align-middle">
                        <span className="block text-sm font-medium">{formatearFecha(e.fecha)}</span>
                        {e.etiqueta ? <span className="block text-xs text-muted-foreground">{e.etiqueta}</span> : null}
                      </TableCell>
                      <TableCell className="py-3 text-right align-middle">
                        <span className={`monto block text-sm ${hecho ? "text-muted-foreground" : "font-semibold"}`}>
                          {formatearMonto(e.montoCentavos)}
                        </span>
                        {esProximo ? (
                          <Badge variant="secondary" className="mt-1 bg-tinte text-primary">
                            Próximo
                          </Badge>
                        ) : hecho ? (
                          <Badge variant="secondary" className="mt-1">
                            {ETIQUETA_HECHO[e.estado ?? ""] ?? "Hecho"}
                          </Badge>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        {restantes > 0 ? (
          <p className="pt-2 text-xs text-muted-foreground">
            … y {restantes} más
            {typeof totalCentavos === "number" ? (
              <>
                , <span className="monto">{formatearMonto(totalCentavos)}</span> en total
              </>
            ) : null}
            .
          </p>
        ) : typeof totalCentavos === "number" ? (
          <p className="pt-2 text-xs text-muted-foreground">
            <span className="monto">{formatearMonto(totalCentavos)}</span> en total.
          </p>
        ) : null}
      </CardContent>

      {razon ? (
        <CardFooter>
          <p className="text-xs text-muted-foreground">¿Por qué veo esto? {razon}</p>
        </CardFooter>
      ) : null}
    </Card>
  );
}
