"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Filter, Search, SlidersHorizontal, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatearFecha, formatearMonto } from "@/lib/dinero";
import type { Movimiento } from "@/lib/datos/consultas";
import { cn } from "@/lib/utils";

export type PeriodoMovimientos = {
  id: string;
  titulo: string;
  movimientos: Movimiento[];
  totalCargosCentavos: number;
  totalAbonosCentavos: number;
};

/**
 * Agrupa movimientos cronológicamente por periodos humanos:
 * Hoy, Ayer, Esta semana, Este mes, y a partir de ahí por meses (ej. "Agosto 2026").
 */
export function agruparPorPeriodos(
  movimientos: Movimiento[],
  fechaReferencia = new Date(),
): PeriodoMovimientos[] {
  if (movimientos.length === 0) return [];

  // Usar la fecha del movimiento más reciente si es posterior a fechaReferencia
  // para que los datos de prueba o demo siempre queden en su periodo correcto.
  let base = fechaReferencia;
  const primerMov = movimientos[0]?.fecha;
  if (primerMov) {
    const [y, m, d] = primerMov.split("-").map(Number);
    if (y && m && d) {
      const fechaPrimer = new Date(y, m - 1, d);
      if (fechaPrimer > base) {
        base = fechaPrimer;
      }
    }
  }

  const anioBase = base.getFullYear();
  const mesBase = base.getMonth();
  const diaBase = base.getDate();

  const pad = (n: number) => String(n).padStart(2, "0");
  const hoyStr = `${anioBase}-${pad(mesBase + 1)}-${pad(diaBase)}`;

  const ayerDate = new Date(anioBase, mesBase, diaBase - 1);
  const ayerStr = `${ayerDate.getFullYear()}-${pad(ayerDate.getMonth() + 1)}-${pad(ayerDate.getDate())}`;

  // Lunes de la semana actual
  const diaSemana = base.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  const diasDesdeLunes = diaSemana === 0 ? 6 : diaSemana - 1;
  const lunesDate = new Date(anioBase, mesBase, diaBase - diasDesdeLunes);
  const lunesStr = `${lunesDate.getFullYear()}-${pad(lunesDate.getMonth() + 1)}-${pad(lunesDate.getDate())}`;

  // Inicio de mes
  const inicioMesStr = `${anioBase}-${pad(mesBase + 1)}-01`;

  const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  const mapaGrupos = new Map<string, { titulo: string; movimientos: Movimiento[] }>();

  for (const mov of movimientos) {
    let idGrupo = "";
    let titulo = "";

    if (mov.fecha === hoyStr) {
      idGrupo = "hoy";
      titulo = "Hoy";
    } else if (mov.fecha === ayerStr) {
      idGrupo = "ayer";
      titulo = "Ayer";
    } else if (mov.fecha >= lunesStr && mov.fecha < ayerStr) {
      idGrupo = "esta_semana";
      titulo = "Esta semana";
    } else if (mov.fecha >= inicioMesStr && mov.fecha < lunesStr) {
      idGrupo = "este_mes";
      titulo = "Este mes";
    } else {
      const [y, mStr] = mov.fecha.split("-");
      idGrupo = `${y}-${mStr}`;
      const mIndex = parseInt(mStr ?? "1", 10) - 1;
      titulo = `${MESES[mIndex] ?? mStr} ${y}`;
    }

    if (!mapaGrupos.has(idGrupo)) {
      mapaGrupos.set(idGrupo, { titulo, movimientos: [] });
    }
    mapaGrupos.get(idGrupo)!.movimientos.push(mov);
  }

  return Array.from(mapaGrupos.entries()).map(([id, g]) => {
    let totalCargosCentavos = 0;
    let totalAbonosCentavos = 0;
    for (const m of g.movimientos) {
      if (m.tipo === "abono") totalAbonosCentavos += m.montoCentavos;
      else totalCargosCentavos += m.montoCentavos;
    }
    return {
      id,
      titulo: g.titulo,
      movimientos: g.movimientos,
      totalCargosCentavos,
      totalAbonosCentavos,
    };
  });
}

/**
 * Lista de movimientos con:
 * 1. Selector múltiple de categorías (MultiSelect con buen estilo, búsqueda y acciones rápidas).
 * 2. Agrupación cronológica por periodos: Hoy, Ayer, Esta semana, Este mes y por meses.
 */
export function ListaMovimientos({
  movimientos,
  categorias,
  total,
}: {
  movimientos: Movimiento[];
  categorias: { id: string; nombre: string }[];
  /** Cuantos tiene en total, para decir la verdad sobre lo que se esta mostrando. */
  total: number;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<string[]>([]);
  const [busquedaCat, setBusquedaCat] = useState("");

  // Conteo de movimientos por categoría para dar contexto cuantitativo
  const conteoPorCategoria = useMemo(() => {
    const conteo: Record<string, number> = {};
    for (const m of movimientos) {
      conteo[m.categoriaId] = (conteo[m.categoriaId] || 0) + 1;
    }
    return conteo;
  }, [movimientos]);

  // Alternar selección de una categoría
  function alternarCategoria(id: string) {
    setCategoriasSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function seleccionarTodas() {
    setCategoriasSeleccionadas(categorias.map((c) => c.id));
  }

  function limpiarCategorias() {
    setCategoriasSeleccionadas([]);
  }

  // Filtrado de categorías dentro del buscador del popover
  const categoriasFiltradas = useMemo(() => {
    const q = busquedaCat.trim().toLowerCase();
    if (!q) return categorias;
    return categorias.filter((c) => c.nombre.toLowerCase().includes(q));
  }, [categorias, busquedaCat]);

  // Movimientos filtrados por texto y por el conjunto de categorías seleccionadas
  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const filtroActivo = categoriasSeleccionadas.length > 0;
    const idsValidos = new Set(categoriasSeleccionadas);

    return movimientos.filter((movimiento) => {
      if (filtroActivo && !idsValidos.has(movimiento.categoriaId)) return false;
      if (!texto) return true;
      return (
        movimiento.descripcion.toLowerCase().includes(texto) ||
        movimiento.categoria.toLowerCase().includes(texto)
      );
    });
  }, [movimientos, busqueda, categoriasSeleccionadas]);

  // Agrupación en periodos de tiempo
  const gruposPeriodos = useMemo(() => {
    return agruparPorPeriodos(filtrados.slice(0, 150));
  }, [filtrados]);

  // Top 5 categorías más frecuentes para acceso rápido
  const categoriasFrecuentes = useMemo(() => {
    return [...categorias]
      .sort((a, b) => (conteoPorCategoria[b.id] ?? 0) - (conteoPorCategoria[a.id] ?? 0))
      .slice(0, 5);
  }, [categorias, conteoPorCategoria]);

  const hayFiltroActivo = categoriasSeleccionadas.length > 0;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* Barra de herramientas: Buscador y MultiSelect de categorías */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {/* Input de búsqueda */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por comercio o categoría..."
            aria-label="Buscar movimientos"
            className="h-11 rounded-2xl border-borde-sutil bg-card pl-9 text-xs sm:text-sm focus-visible:ring-primary/20"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              aria-label="Borrar búsqueda"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* MultiSelect de categorías */}
        <Popover>
          <PopoverTrigger
            className={cn(
              "inline-flex h-11 shrink-0 items-center justify-between gap-2 rounded-2xl border px-3.5 text-xs font-medium transition-all shadow-xs outline-hidden sm:min-w-[190px]",
              hayFiltroActivo
                ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
                : "border-borde-sutil bg-card text-foreground hover:bg-muted/60",
            )}
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-3.5 text-primary" />
              <span className="truncate">
                {categoriasSeleccionadas.length === 0
                  ? "Todas las categorías"
                  : categoriasSeleccionadas.length === 1
                    ? categorias.find((c) => c.id === categoriasSeleccionadas[0])?.nombre ?? "1 categoría"
                    : `${categoriasSeleccionadas.length} categorías`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {hayFiltroActivo && (
                <Badge className="size-5 rounded-full p-0 flex items-center justify-center bg-primary text-[10px] text-primary-foreground font-semibold">
                  {categoriasSeleccionadas.length}
                </Badge>
              )}
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </div>
          </PopoverTrigger>

          <PopoverContent
            align="end"
            sideOffset={6}
            className="w-80 rounded-2xl border border-borde-sutil bg-card p-3 shadow-xl backdrop-blur-md"
          >
            <div className="flex flex-col gap-2.5">
              {/* Encabezado y acciones */}
              <div className="flex items-center justify-between border-b border-borde-sutil/60 pb-2">
                <span className="text-xs font-semibold text-foreground">Filtrar categorías</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={seleccionarTodas}
                    className="text-[11px] font-medium text-primary hover:underline"
                  >
                    Todas
                  </button>
                  <span className="text-muted-foreground/40">·</span>
                  <button
                    type="button"
                    onClick={limpiarCategorias}
                    className="text-[11px] font-medium text-muted-foreground hover:text-foreground hover:underline"
                  >
                    Limpiar
                  </button>
                </div>
              </div>

              {/* Buscador dentro del menú */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={busquedaCat}
                  onChange={(e) => setBusquedaCat(e.target.value)}
                  placeholder="Buscar categoría..."
                  className="h-8 rounded-xl border-borde-sutil bg-muted/40 pl-8 text-xs shadow-none focus-visible:ring-1 focus-visible:ring-primary/20"
                />
              </div>

              {/* Lista scrolleable de categorías */}
              <div className="flex max-h-56 flex-col gap-1 overflow-y-auto pr-1">
                {categoriasFiltradas.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    No hay categorías que coincidan.
                  </p>
                ) : (
                  categoriasFiltradas.map((c) => {
                    const activa = categoriasSeleccionadas.includes(c.id);
                    const cantidad = conteoPorCategoria[c.id] ?? 0;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => alternarCategoria(c.id)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs transition-colors",
                          activa
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-foreground hover:bg-muted/60",
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={cn(
                              "grid size-4 shrink-0 place-items-center rounded-md border transition-colors",
                              activa
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-borde-sutil bg-background",
                            )}
                          >
                            {activa && <Check className="size-3 stroke-[3]" />}
                          </span>
                          <span className="truncate">{c.nombre}</span>
                        </div>
                        <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                          {cantidad}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Pie con resumen de selección */}
              <div className="flex items-center justify-between border-t border-borde-sutil/60 pt-2 text-[11px] text-muted-foreground">
                <span>
                  {categoriasSeleccionadas.length === 0
                    ? "Mostrando todas"
                    : `${categoriasSeleccionadas.length} de ${categorias.length} seleccionadas`}
                </span>
                {hayFiltroActivo && (
                  <button
                    type="button"
                    onClick={limpiarCategorias}
                    className="font-medium text-primary hover:underline"
                  >
                    Restablecer
                  </button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Píldoras de filtros activos y accesos rápidos */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Píldoras activas seleccionadas */}
        {categoriasSeleccionadas.map((catId) => {
          const cat = categorias.find((c) => c.id === catId);
          if (!cat) return null;
          return (
            <button
              key={catId}
              type="button"
              onClick={() => alternarCategoria(catId)}
              className="group inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary shadow-2xs transition-all hover:bg-primary/20 active:scale-95"
            >
              <span>{cat.nombre}</span>
              <X className="size-3 text-primary/70 transition-colors group-hover:text-primary" />
            </button>
          );
        })}

        {/* Accesos rápidos sugeridos cuando no hay filtro activo */}
        {!hayFiltroActivo && (
          <div className="-mx-1 flex min-w-0 items-center gap-1.5 overflow-x-auto px-1 py-0.5 no-scrollbar">
            <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
              Frecuentes:
            </span>
            {categoriasFrecuentes.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => alternarCategoria(c.id)}
                className="shrink-0 rounded-full border border-borde-sutil bg-card/80 px-2.5 py-0.5 text-[11px] text-muted-foreground transition-all hover:border-primary/40 hover:bg-tinte hover:text-primary active:scale-95"
              >
                {c.nombre}
              </button>
            ))}
          </div>
        )}

        {hayFiltroActivo && (
          <button
            type="button"
            onClick={limpiarCategorias}
            className="text-[11px] font-medium text-muted-foreground hover:text-primary hover:underline ml-1"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Resumen del listado */}
      <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
        <span>
          {filtrados.length} de {movimientos.length} movimientos
          {total > movimientos.length && ` · los ${movimientos.length} más recientes de ${total}`}
        </span>
        {hayFiltroActivo && (
          <span className="font-medium text-primary">Filtro de categorías activo</span>
        )}
      </div>

      {/* Lista agrupada por periodos de tiempo */}
      {gruposPeriodos.length === 0 ? (
        <Card className="border border-borde-sutil bg-card shadow-xs">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Filter className="size-8 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">
              Ningún movimiento coincide con tu búsqueda
            </p>
            <p className="text-xs text-muted-foreground">
              Prueba cambiando las categorías seleccionadas o el término de búsqueda.
            </p>
            {(busqueda || hayFiltroActivo) && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 rounded-full text-xs"
                onClick={() => {
                  setBusqueda("");
                  setCategoriasSeleccionadas([]);
                }}
              >
                Restablecer todos los filtros
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {gruposPeriodos.map((grupo) => (
            <section key={grupo.id} className="flex flex-col gap-1.5">
              {/* Encabezado del periodo */}
              <div className="flex items-baseline justify-between px-1">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {grupo.titulo}
                  </h2>
                  <span className="text-[11px] text-muted-foreground/70">
                    ({grupo.movimientos.length})
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium">
                  {grupo.totalCargosCentavos > 0 && (
                    <span className="text-muted-foreground">
                      −{formatearMonto(grupo.totalCargosCentavos)}
                    </span>
                  )}
                  {grupo.totalAbonosCentavos > 0 && (
                    <span className="text-exito">
                      +{formatearMonto(grupo.totalAbonosCentavos)}
                    </span>
                  )}
                </div>
              </div>

              {/* Tarjeta con los movimientos de ese periodo */}
              <Card className="overflow-hidden border border-borde-sutil bg-card shadow-xs">
                <CardContent className="divide-y divide-borde-sutil/60 p-0">
                  {grupo.movimientos.map((movimiento) => (
                    <div
                      key={movimiento.id}
                      className="flex items-baseline justify-between gap-3 p-3.5 transition-colors hover:bg-muted/20 sm:px-4"
                    >
                      <div className="flex min-w-0 flex-col">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground">
                            {movimiento.descripcion}
                          </span>
                          {movimiento.esAtipico && (
                            <Badge className="shrink-0 bg-tinte text-[10px] text-primary">
                              inusual
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {movimiento.categoria} · {formatearFecha(movimiento.fecha)}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "monto shrink-0 text-sm font-semibold",
                          movimiento.tipo === "abono" ? "text-exito" : "text-foreground",
                        )}
                      >
                        {movimiento.tipo === "abono" ? "+" : "−"}
                        {formatearMonto(movimiento.montoCentavos)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
          ))}

          {filtrados.length > 150 && (
            <p className="pt-2 text-center text-xs text-muted-foreground">
              Se muestran los 150 más recientes. Filtra para acotar el periodo o categorías.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
