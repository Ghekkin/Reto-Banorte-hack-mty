"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatearFecha, formatearMonto } from "@/lib/dinero";
import type { Movimiento } from "@/lib/datos/consultas";

/**
 * Lista de movimientos con buscador y filtro por categoria.
 *
 * Es cliente porque filtrar tiene que sentirse instantaneo: con 2 265 filas ya cargadas,
 * ir al servidor por cada letra seria peor experiencia y mas codigo.
 *
 * Base UI: `ToggleGroup` no lleva `type`, y su `value` es siempre un arreglo.
 */
export function ListaMovimientos({
  movimientos,
  categorias,
}: {
  movimientos: Movimiento[];
  categorias: { id: string; nombre: string }[];
}) {
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState<string[]>([]);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const filtro = categoria[0];
    return movimientos.filter((movimiento) => {
      if (filtro && movimiento.categoriaId !== filtro) return false;
      if (!texto) return true;
      return (
        movimiento.descripcion.toLowerCase().includes(texto) ||
        movimiento.categoria.toLowerCase().includes(texto)
      );
    });
  }, [movimientos, busqueda, categoria]);

  return (
    <div className="flex min-w-0 flex-col gap-3 md:gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por comercio o categoría"
          aria-label="Buscar movimientos"
          className="h-11 rounded-2xl bg-card pl-9"
        />
      </div>

      {/* `min-w-0` es obligatorio: sin el, el `w-max` del ToggleGroup se vuelve el
          min-content del flex y estira el layout entero fuera de la pantalla. */}
      <div className="-mx-1 min-w-0 overflow-x-auto px-1 pb-1">
        <ToggleGroup
          value={categoria}
          onValueChange={(valor) => setCategoria(valor as string[])}
          spacing={2}
          className="w-max"
        >
          {categorias.map((c) => (
            <ToggleGroupItem
              key={c.id}
              value={c.id}
              className="min-h-11 whitespace-nowrap rounded-full px-3 text-xs sm:min-h-9"
            >
              {c.nombre}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <p className="px-1 text-xs text-muted-foreground">
        {filtrados.length} de {movimientos.length} movimientos
      </p>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 md:p-5">
          {filtrados.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nada coincide con lo que buscas.
            </p>
          ) : (
            filtrados.slice(0, 100).map((movimiento) => (
              <div key={movimiento.id} className="flex items-baseline justify-between gap-3">
                <div className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm">{movimiento.descripcion}</span>
                    {movimiento.esAtipico && (
                      <Badge className="shrink-0 bg-tinte text-[10px] text-primary">inusual</Badge>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {movimiento.categoria} · {formatearFecha(movimiento.fecha)}
                  </span>
                </div>
                <span
                  className={`monto shrink-0 text-sm font-medium ${
                    movimiento.tipo === "abono" ? "text-exito" : "text-foreground"
                  }`}
                >
                  {movimiento.tipo === "abono" ? "+" : "−"}
                  {formatearMonto(movimiento.montoCentavos)}
                </span>
              </div>
            ))
          )}

          {filtrados.length > 100 && (
            <p className="pt-2 text-center text-xs text-muted-foreground">
              Se muestran los 100 más recientes. Filtra para acotar.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
