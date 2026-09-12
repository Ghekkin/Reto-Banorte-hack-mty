import { Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { CLASES_TARJETA, formatearFecha, formatearMonto, formatearPeriodo } from "../comunes";
import type { PropsDetalleCategoria } from "./schema";

/**
 * Los movimientos de una categoria.
 *
 * Dos columnas por la misma razon que `Calendario`: el comercio y su fecha apilados a la
 * izquierda, el monto y el sello de recurrente a la derecha. A 360 px no hay scroll
 * horizontal y el monto —que es lo que se viene a leer— nunca se sale de la pantalla.
 */
export function DetalleCategoria(props: Partial<PropsDetalleCategoria>) {
  const { categoria, periodo, totalCentavos, movimientos, totalMovimientos, razon } = props;

  if (!movimientos || typeof totalCentavos !== "number") {
    return (
      <Card className={CLASES_TARJETA}>
        <CardContent className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const titulo = periodo && /^\d{4}-\d{2}$/.test(periodo) ? formatearPeriodo(periodo) : periodo;
  const faltan = (totalMovimientos ?? movimientos.length) - movimientos.length;

  return (
    <Card className={CLASES_TARJETA}>
      <CardHeader>
        <span className="text-xs text-muted-foreground">
          {categoria}
          {titulo ? ` · ${titulo}` : ""}
        </span>
        <span className="monto text-3xl font-semibold">{formatearMonto(totalCentavos)}</span>
      </CardHeader>

      <CardContent>
        {movimientos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay movimientos de {categoria} en este periodo.</p>
        ) : (
          <ScrollArea className="max-h-80">
            <Table>
              <TableBody>
                {movimientos.map((m, i) => (
                  <TableRow key={`${m.fecha}-${i}`}>
                    <TableCell className="py-3 align-middle">
                      <span className="block text-sm font-medium">{m.comercio}</span>
                      <span className="block text-xs text-muted-foreground">
                        {formatearFecha(m.fecha)}
                        {m.descripcion && m.descripcion !== m.comercio ? ` · ${m.descripcion}` : ""}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-right align-middle">
                      <span className="monto block text-sm font-semibold">{formatearMonto(m.montoCentavos)}</span>
                      {m.recurrente ? (
                        <Badge variant="secondary" className="mt-1">
                          <Repeat /> Recurrente
                        </Badge>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
        {faltan > 0 ? <p className="pt-2 text-xs text-muted-foreground">… y {faltan} movimientos más.</p> : null}
      </CardContent>

      {razon ? (
        <CardFooter>
          <p className="text-xs text-muted-foreground">¿Por qué veo esto? {razon}</p>
        </CardFooter>
      ) : null}
    </Card>
  );
}
