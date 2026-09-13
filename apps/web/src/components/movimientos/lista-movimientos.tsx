"use client";

import { useMemo, useState } from "react";
import { ListFilter, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { IconoCategoria } from "@/components/movimientos/icono-categoria";
import { formatearFechaCorta, formatearMonto } from "@/lib/dinero";
import { agruparPorPeriodo, totalizar } from "@/lib/periodos";
import type { Movimiento } from "@/lib/datos/consultas";

/** Los dos periodos donde la fecha del renglon sobra: el encabezado ya la dijo. */
const PERIODOS_SIN_FECHA = new Set(["hoy", "ayer"]);

/**
 * Lista de movimientos: buscador, multiselector de categorias y la lista partida por
 * periodo ("Hoy", "Ayer", "Esta semana", "Mes pasado"...).
 *
 * Es cliente porque filtrar tiene que sentirse instantaneo: con los movimientos ya
 * cargados, ir al servidor por cada letra seria peor experiencia y mas codigo.
 *
 * Tres decisiones que se ven en la pantalla:
 *
 * 1. **El resumen arriba.** La pregunta de esta seccion no es "que compre el jueves",
 *    es "cuanto se me fue". Las dos cifras responden eso y se recalculan con el filtro,
 *    asi que tambien contestan "cuanto se me fue en restaurantes".
 * 2. **Multiselector en menu, no fila de chips.** Con 18 categorias la fila de chips era
 *    scroll horizontal de dos pantallas y solo dejaba elegir una; el menu ocupa una
 *    linea, permite varias y dice cuantas hay activas sin abrirse.
 * 3. **Encabezados de periodo pegados (`sticky`).** Al bajar 300 renglones se pierde el
 *    contexto de en que mes vas; el encabezado flota sobre el lienzo y lo recuerda, con
 *    el neto de ese periodo a la derecha.
 *
 * Base UI (no Radix): el trigger del menu se compone con `render`, no con `asChild`, y
 * los `CheckboxItem` no cierran el menu al hacer clic, que es justo lo que se necesita
 * para marcar tres categorias seguidas.
 */
export function ListaMovimientos({
  movimientos,
  categorias,
  total,
  hoy,
}: {
  movimientos: Movimiento[];
  categorias: { id: string; nombre: string }[];
  /** Cuantos tiene en total, para decir la verdad sobre lo que se esta mostrando. */
  total: number;
  /**
   * El "hoy" del dominio ("AAAA-MM-DD"), calculado en el servidor en la zona de la demo.
   * No se calcula aqui: el servidor corre en otra zona y el HTML no coincidiria.
   */
  hoy: string;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [seleccionadas, setSeleccionadas] = useState<string[]>([]);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const activas = new Set(seleccionadas);
    return movimientos.filter((movimiento) => {
      if (activas.size > 0 && !activas.has(movimiento.categoriaId)) return false;
      if (!texto) return true;
      return (
        movimiento.descripcion.toLowerCase().includes(texto) ||
        movimiento.categoria.toLowerCase().includes(texto)
      );
    });
  }, [movimientos, busqueda, seleccionadas]);

  const { gastadoCentavos, recibidoCentavos } = useMemo(() => totalizar(filtrados), [filtrados]);
  const grupos = useMemo(() => agruparPorPeriodo(filtrados, hoy), [filtrados, hoy]);

  const hayFiltro = seleccionadas.length > 0 || busqueda.trim().length > 0;
  const etiquetaFiltro =
    seleccionadas.length === 0
      ? "Todas las categorías"
      : seleccionadas.length === 1
        ? (categorias.find((c) => c.id === seleccionadas[0])?.nombre ?? "1 categoría")
        : `${seleccionadas.length} categorías`;

  function alternar(id: string, marcada: boolean) {
    setSeleccionadas((previas) =>
      marcada ? [...previas, id] : previas.filter((otra) => otra !== id),
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-3 md:gap-4">
      {/* El numero de la pantalla. Se mueve con el filtro: es la respuesta a "cuanto
          llevo gastado en esto".

          Apilado hasta `sm`: en una pantalla de 360 px dos montos de `text-3xl` en dos
          columnas no caben, y la salida no es encogerlos (el monto es lo mas grande de
          su tarjeta) ni truncarlos (un monto cortado es un monto que miente). */}
      <Card>
        <CardContent className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-2 sm:gap-4 md:px-5">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">
              {hayFiltro ? "Gastado (filtrado)" : "Gastado"}
            </span>
            <span className="monto text-3xl leading-none font-semibold">
              {formatearMonto(gastadoCentavos)}
            </span>
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Recibido</span>
            <span className="monto text-3xl leading-none font-semibold text-exito">
              {formatearMonto(recibidoCentavos)}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por comercio o categoría"
            aria-label="Buscar movimientos"
            className="h-11 rounded-2xl bg-card pl-9"
          />
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  className="h-11 min-w-0 flex-1 justify-start gap-2 rounded-2xl bg-card px-3 md:flex-none"
                />
              }
            >
              <ListFilter className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm">{etiquetaFiltro}</span>
              {seleccionadas.length > 0 && (
                <Badge className="ml-auto shrink-0 bg-tinte text-primary tabular-nums">
                  {seleccionadas.length}
                </Badge>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {/* Base UI exige que un `GroupLabel` viva dentro de un `Group`: sin el, el
                  menu revienta con "MenuGroupContext is missing" al abrirse. */}
              <DropdownMenuGroup>
                <DropdownMenuLabel>Filtrar por categoría</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {categorias.map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.id}
                    checked={seleccionadas.includes(c.id)}
                    onCheckedChange={(marcada) => alternar(c.id, marcada)}
                    className="min-h-11 sm:min-h-9"
                  >
                    {c.nombre}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {seleccionadas.length > 0 && (
            <Button
              variant="ghost"
              onClick={() => setSeleccionadas([])}
              className="size-11 shrink-0 rounded-2xl"
              aria-label="Quitar el filtro de categorías"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <p className="px-1 text-xs text-muted-foreground">
        {filtrados.length} de {movimientos.length} movimientos
        {total > movimientos.length && ` · los ${movimientos.length} más recientes de ${total}`}
      </p>

      {grupos.length === 0 ? (
        <Card>
          <CardContent className="px-4 md:px-5">
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nada coincide con lo que buscas.
            </p>
          </CardContent>
        </Card>
      ) : (
        // La `key` cambia al tocar el filtro de categorias, asi que React remonta la
        // lista y la entrada en cascada se vuelve a reproducir: es la senal de que la
        // lista cambio. NO va la busqueda en la key, o la animacion se relanzaria en
        // cada letra y el resultado parpadearia mientras escribes.
        <div key={seleccionadas.join(",") || "todas"} className="animar-lista flex flex-col gap-3 md:gap-4">
          {grupos.map((grupo) => (
            <section key={grupo.clave} className="flex min-w-0 flex-col gap-2">
              {/* Flota sobre el lienzo, no dentro de la tarjeta: asi el `sticky` no pelea
                  con el borde redondeado ni tapa el primer renglon. Va pegado a `top-0`
                  y no a `top-2` porque con cualquier hueco se ve pasar una franja de
                  contenido por encima del encabezado. Sin margen negativo: sangrar 4 px
                  hacia el padding del lienzo abria una barra horizontal a 360 px. */}
              <header className="sticky top-0 z-10 flex items-baseline justify-between gap-3 rounded-b-xl bg-lienzo/95 px-2 py-2 backdrop-blur-sm">
                <h2 className="truncate text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {grupo.etiqueta}
                </h2>
                <span
                  className={`monto shrink-0 text-xs font-medium ${
                    grupo.netoCentavos >= 0 ? "text-exito" : "text-muted-foreground"
                  }`}
                >
                  {grupo.netoCentavos >= 0 ? "+" : "−"}
                  {formatearMonto(Math.abs(grupo.netoCentavos))}
                </span>
              </header>

              <Card>
                <CardContent className="px-4 md:px-5">
                  <ul className="divide-y divide-borde-sutil">
                    {grupo.movimientos.map((movimiento) => (
                      <li
                        key={movimiento.id}
                        className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        <IconoCategoria
                          icono={movimiento.icono}
                          categoria={movimiento.categoria}
                          abono={movimiento.tipo === "abono"}
                        />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-sm">{movimiento.descripcion}</span>
                            {movimiento.esAtipico && (
                              <Badge className="shrink-0 bg-tinte text-[10px] text-primary">
                                inusual
                              </Badge>
                            )}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {movimiento.categoria}
                            {!PERIODOS_SIN_FECHA.has(grupo.clave) &&
                              ` · ${formatearFechaCorta(movimiento.fecha)}`}
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
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
