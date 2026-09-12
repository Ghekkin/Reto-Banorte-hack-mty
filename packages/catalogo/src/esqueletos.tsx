import type { ReactNode } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CLASES_PIE_HEROE, CLASES_TARJETA, CLASES_TARJETA_HEROE } from "./comunes";

/**
 * Los estados de carga del catálogo, con la forma y el TAMAÑO de la tarjeta final.
 *
 * El sistema de diseño lo pide ("skeleton del tamaño final del contenido") y había una
 * razón medida para arreglarlo: el 2026-09-12 los esqueletos median entre el 30 % y el
 * 60 % de su tarjeta real, así que al llegar los datos cada tarjeta saltaba a 2-3 veces
 * su altura y la rejilla bento entera se reacomodaba delante de la persona.
 *
 * Dos decisiones que hacen que las alturas coincidan por construcción y no a ojo:
 *
 *  - Se usan los MISMOS contenedores de la tarjeta real (`CardHeader`, `CardContent`,
 *    `CardFooter`), con su padding y sus gaps, en vez de divs sueltos.
 *  - Cada `Linea` ocupa la caja de línea exacta del texto que reemplaza (una línea
 *    `text-sm` mide 20 px, una `text-3xl` 36 px) y el bloque gris va centrado dentro.
 *    Así tres líneas de esqueleto miden lo mismo que tres líneas de texto.
 *
 * Y una de producto: si la tarjeta viene como `heroe`, el esqueleto ya aparece con el
 * degradado. `heroe` es una prop literal, no depende del data model, así que se conoce
 * antes que los datos; mostrar la tarjeta blanca y luego volverla roja era un parpadeo.
 */

type Tamano = "xs" | "sm" | "base" | "xl" | "3xl";

/** La altura de la caja de línea de cada tamaño de texto de Tailwind. */
const CAJA: Record<Tamano, string> = { xs: "h-4", sm: "h-5", base: "h-6", xl: "h-7", "3xl": "h-9" };
/** El bloque gris dentro de esa caja: la altura aproximada de las letras. */
const BLOQUE: Record<Tamano, string> = { xs: "h-2.5", sm: "h-3", base: "h-3.5", xl: "h-5", "3xl": "h-7" };

/** Sobre el degradado el gris de `bg-muted` no se ve: los bloques pasan a blanco translúcido. */
const TONO_HEROE = "[&_[data-slot=skeleton]]:bg-white/20";

/** Una línea de texto que todavía no llega. */
export function Linea({ tamano = "sm", ancho = "w-full" }: { tamano?: Tamano; ancho?: string }) {
  return (
    <div className={`flex ${CAJA[tamano]} items-center`}>
      <Skeleton className={`${BLOQUE[tamano]} ${ancho}`} />
    </div>
  );
}

/**
 * La tarjeta que envuelve el esqueleto. `aria-busy` y la etiqueta hacen que un lector de
 * pantalla anuncie qué se está cargando en vez de leer bloques vacíos.
 */
export function EsqueletoTarjeta({
  heroe = false,
  etiqueta,
  children,
}: {
  heroe?: boolean;
  /** Qué se está cargando, en palabras: "Cargando tu plan de pagos". */
  etiqueta: string;
  children: ReactNode;
}) {
  return (
    <Card
      aria-busy="true"
      aria-label={etiqueta}
      className={heroe ? `${CLASES_TARJETA_HEROE} ${TONO_HEROE}` : CLASES_TARJETA}
    >
      {children}
    </Card>
  );
}

/**
 * El encabezado de la anatomía de tarjeta: etiqueta chica, el dato grande y, si la
 * tarjeta la tiene, una línea de detalle debajo.
 */
export function EsqueletoEncabezado({ detalle = true }: { detalle?: boolean }) {
  return (
    <CardHeader>
      <Linea tamano="xs" ancho="w-32" />
      <Linea tamano="3xl" ancho="w-44" />
      {detalle ? <Linea tamano="sm" ancho="w-36" /> : null}
    </CardHeader>
  );
}

/** Una etiqueta con su valor a la derecha, y una barra debajo (uso del límite, avance). */
export function EsqueletoBarra({ etiqueta = true }: { etiqueta?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      {etiqueta ? (
        <div className="flex justify-between">
          <Linea tamano="xs" ancho="w-20" />
          <Linea tamano="xs" ancho="w-16" />
        </div>
      ) : null}
      <Skeleton className="h-1 w-full" />
    </div>
  );
}

/**
 * Las filas de una tabla (`Calendario`, `DetalleCategoria`): dos líneas a la izquierda,
 * un monto a la derecha, separadas por el borde de fila. Mismo `py-3` que `TableCell`.
 */
export function EsqueletoFilas({ filas }: { filas: number }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 border-b border-borde-sutil py-3 last:border-0">
          <div className="flex flex-col">
            <Linea tamano="sm" ancho="w-28" />
            <Linea tamano="xs" ancho="w-20" />
          </div>
          <Linea tamano="sm" ancho="w-16" />
        </div>
      ))}
    </div>
  );
}

/**
 * Opciones elegibles con borde (`PlanDePago`): el círculo del radio, dos líneas a la
 * izquierda y el monto a la derecha. Mismos `px-3 py-2` y borde que la fila real.
 */
export function EsqueletoOpciones({ opciones }: { opciones: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: opciones }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-borde-sutil px-3 py-2">
          <Skeleton className="size-4 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col">
            <Linea tamano="sm" ancho="w-20" />
            <Linea tamano="xs" ancho="w-16" />
          </div>
          <div className="flex flex-col items-end">
            <Linea tamano="sm" ancho="w-16" />
            <Linea tamano="xs" ancho="w-10" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Categorías con su barra (`GastoPorCategoria`): nombre y monto, y la barra debajo. */
export function EsqueletoBarras({ barras }: { barras: number }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: barras }, (_, i) => (
        <div key={i} className="flex flex-col gap-1.5 py-2">
          <div className="flex justify-between">
            <Linea tamano="sm" ancho={i % 2 ? "w-24" : "w-32"} />
            <Linea tamano="sm" ancho="w-16" />
          </div>
          {/* Anchos decrecientes: la forma de la grafica ordenada que va a llegar. */}
          <Skeleton className={`h-1.5 ${["w-full", "w-4/5", "w-2/3", "w-3/5", "w-1/2", "w-2/5"][i % 6]}`} />
        </div>
      ))}
    </div>
  );
}

/** El pie de toda tarjeta del catálogo: la línea "¿Por qué veo esto?", y el botón si hay acción. */
export function EsqueletoPie({
  heroe = false,
  lineas = 2,
  boton = false,
}: {
  heroe?: boolean;
  lineas?: number;
  boton?: boolean;
}) {
  const anchos = ["w-11/12", "w-4/5", "w-3/5", "w-2/3"];
  return (
    <CardFooter className={`flex flex-col items-start gap-3 ${heroe ? CLASES_PIE_HEROE : ""}`}>
      {boton ? <Skeleton className="min-h-12 w-40 rounded-full" /> : null}
      <div className="flex w-full flex-col">
        {Array.from({ length: lineas }, (_, i) => (
          <Linea key={i} tamano="xs" ancho={anchos[i % anchos.length]} />
        ))}
      </div>
    </CardFooter>
  );
}

export { CardContent as EsqueletoCuerpo };
