import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { formatearFecha, formatearMonto } from "../comunes";
import type { PropsCalendario } from "./schema";

const ETIQUETA_ESTADO: Record<string, string> = {
  proximo: "Próximo",
  pendiente: "",
  pagado: "Pagado",
  aportado: "Aportado",
};

/** Una tabla corta: las primeras `maximo` filas y una linea con lo que queda. */
export function Calendario(props: Partial<PropsCalendario>) {
  const { titulo = "Tus próximos pagos", eventos, maximo = 6, totalCentavos, razon } = props;

  if (!eventos) {
    return (
      <Card className="animar-entrada rounded-2xl border-borde-sutil shadow-sm">
        <CardContent className="flex flex-col gap-2 p-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  const visibles = eventos.slice(0, maximo);
  const restantes = eventos.length - visibles.length;
  // Sin `estado: proximo` explicito, el proximo es el primero que no ha ocurrido.
  const indiceProximo = eventos.some((e) => e.estado === "proximo")
    ? -1
    : eventos.findIndex((e) => e.estado !== "pagado" && e.estado !== "aportado");

  return (
    <Card className="animar-entrada rounded-2xl border-borde-sutil shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="text-muted-foreground" /> {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        {eventos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay fechas programadas.</p>
        ) : (
          <ScrollArea className="max-h-72">
            <Table>
              <TableBody>
                {visibles.map((e, i) => {
                  const esProximo = e.estado === "proximo" || i === indiceProximo;
                  const hecho = e.estado === "pagado" || e.estado === "aportado";
                  return (
                    <TableRow key={`${e.fecha}-${i}`} className={esProximo ? "bg-tinte/60" : ""}>
                      <TableCell className="whitespace-nowrap text-sm">{formatearFecha(e.fecha)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.etiqueta ?? ""}</TableCell>
                      <TableCell className="text-right">
                        {esProximo ? (
                          <Badge className="bg-tinte text-primary" variant="secondary">
                            Próximo
                          </Badge>
                        ) : hecho ? (
                          <Badge variant="secondary">{ETIQUETA_ESTADO[e.estado ?? "pendiente"]}</Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className={`text-right tabular-nums ${hecho ? "text-muted-foreground" : "font-medium"}`}>
                        {formatearMonto(e.montoCentavos)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
        {restantes > 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            … y {restantes} {restantes === 1 ? "más" : "más"}
            {typeof totalCentavos === "number" ? `, ${formatearMonto(totalCentavos)} en total` : ""}.
          </p>
        ) : typeof totalCentavos === "number" ? (
          <p className="mt-2 text-xs text-muted-foreground">{formatearMonto(totalCentavos)} en total.</p>
        ) : null}
      </CardContent>
      {razon ? (
        <CardFooter className="border-t border-borde-sutil pt-4">
          <p className="text-xs text-muted-foreground">¿Por qué veo esto? {razon}</p>
        </CardFooter>
      ) : null}
    </Card>
  );
}
