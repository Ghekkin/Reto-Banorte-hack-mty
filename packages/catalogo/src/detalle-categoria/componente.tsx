import { Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { formatearFecha, formatearMonto, formatearPeriodo } from "../comunes";
import { EsqueletoCuerpo, EsqueletoEncabezado, EsqueletoFilas, EsqueletoPie, EsqueletoTarjeta, Linea } from "../esqueletos";
import { PieTarjeta, Tarjeta } from "../tarjeta";
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
      <EsqueletoTarjeta etiqueta="Cargando los movimientos">
        <EsqueletoEncabezado detalle={false} />
        <EsqueletoCuerpo>
          <EsqueletoFilas filas={5} />
          <div className="pt-2">
            <Linea tamano="xs" ancho="w-36" />
          </div>
        </EsqueletoCuerpo>
        <EsqueletoPie />
      </EsqueletoTarjeta>
    );
  }

  const titulo = periodo && /^\d{4}-\d{2}$/.test(periodo) ? formatearPeriodo(periodo) : periodo;
  const faltan = (totalMovimientos ?? movimientos.length) - movimientos.length;

  return (
    <Tarjeta>
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
          // `overflow-hidden` no es decoracion: sin el, la raiz del ScrollArea no
          // recorta (su viewport es `size-full` de una caja sin limite), la tabla se
          // desborda y se pinta encima del "… y N movimientos mas" y del pie.
          <ScrollArea className="max-h-80 overflow-hidden">
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

      <PieTarjeta razon={razon} />
    </Tarjeta>
  );
}
