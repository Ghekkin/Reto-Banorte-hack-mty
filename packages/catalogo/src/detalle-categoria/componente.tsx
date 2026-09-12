import { Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { formatearFecha, formatearMonto, formatearPeriodo } from "../comunes";
import type { PropsDetalleCategoria } from "./schema";

export function DetalleCategoria(props: Partial<PropsDetalleCategoria>) {
  const { categoria, periodo, totalCentavos, movimientos, totalMovimientos, razon } = props;

  if (!movimientos || typeof totalCentavos !== "number") {
    return (
      <Card className="animar-entrada rounded-2xl border-borde-sutil shadow-sm">
        <CardContent className="flex flex-col gap-2 p-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  const titulo = periodo && /^\d{4}-\d{2}$/.test(periodo) ? formatearPeriodo(periodo) : periodo;
  const faltan = (totalMovimientos ?? movimientos.length) - movimientos.length;

  return (
    <Card className="animar-entrada rounded-2xl border-borde-sutil shadow-sm">
      <CardHeader>
        <span className="text-xs text-muted-foreground">
          {categoria}
          {titulo ? ` · ${titulo}` : ""}
        </span>
        <CardTitle className="text-3xl font-semibold tabular-nums">{formatearMonto(totalCentavos)}</CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        {movimientos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay movimientos de {categoria} en este periodo.</p>
        ) : (
          <ScrollArea className="max-h-80">
            <Table>
              <TableBody>
                {movimientos.map((m, i) => (
                  <TableRow key={`${m.fecha}-${i}`}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatearFecha(m.fecha)}</TableCell>
                    <TableCell className="text-sm">
                      <span className="font-medium">{m.comercio}</span>
                      {m.descripcion && m.descripcion !== m.comercio ? (
                        <span className="block text-xs text-muted-foreground">{m.descripcion}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      {m.recurrente ? (
                        <Badge variant="secondary">
                          <Repeat /> Recurrente
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatearMonto(m.montoCentavos)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
        {faltan > 0 ? <p className="mt-2 text-xs text-muted-foreground">… y {faltan} movimientos más.</p> : null}
      </CardContent>
      {razon ? (
        <CardFooter className="border-t border-borde-sutil pt-4">
          <p className="text-xs text-muted-foreground">¿Por qué veo esto? {razon}</p>
        </CardFooter>
      ) : null}
    </Card>
  );
}
