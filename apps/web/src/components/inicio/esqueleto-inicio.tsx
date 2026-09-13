"use client";

import { IconoBanorte } from "@/components/marca/logo-banorte";
import { Masonry } from "@/components/inicio/masonry";
import { Skeleton } from "@/components/ui/skeleton";
import { MARCA } from "@/lib/marca";

/**
 * Lo que ocupa el lugar de las tarjetas mientras Maya arma la pantalla nueva.
 *
 * Aparece cuando la cascada de salida termino (fase `esperando`, ver `transicion-inicio`)
 * y vive los ~8 s que tarda el turno. Sin esto la pantalla se queda vacia: la persona
 * escribio, todo se desvanecio y despues hay lienzo gris y una barra con un spinner de
 * 36 px, que se lee como que la app se rompio.
 *
 * **Tiene la forma de lo que viene**, no tres barras genericas: cuatro bloques de media
 * rejilla, que es lo que arma Maya en la practica (sus portadas son tarjetas anchas). Los
 * cuatro son `amplio` a proposito: mezclar anchos aqui dejaba una columna huerfana de
 * 193 px durante los ~8 s de la carga (medido el 2026-09-13), y un hueco que solo existe
 * mientras carga se lee como que la pantalla se acomodo mal.
 *
 * Los altos son distintos entre si para que se vea que la rejilla es masonry desde la
 * carga, y del tamano del contenido final: un esqueleto mas chico produce un salto cuando
 * llega (misma regla de los esqueletos del catalogo, skill `diseno-banorte`).
 *
 * La linea de estado va **arriba** y con el icono de la marca porque es la unica pieza que
 * explica por que la pantalla esta en obra. `role="status"` + `aria-busy` para que un
 * lector de pantalla lo anuncie una vez y no lea los bloques vacios.
 */
export function EsqueletoInicio() {
  return (
    <div className="flex flex-col gap-3 md:gap-4" aria-busy="true">
      <p
        role="status"
        className="animar-entrada flex items-center gap-2 rounded-2xl border border-borde-sutil bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm"
      >
        <span className="grid size-7 shrink-0 animate-pulse place-items-center rounded-lg bg-[linear-gradient(135deg,var(--primary)_0%,var(--marca-oscuro)_100%)] text-primary-foreground">
          <IconoBanorte className="size-3.5" />
        </span>
        <span>{MARCA.nombre} está armando tu pantalla con tus datos…</span>
      </p>

      <Masonry>
        <div data-hueco="amplio">
          <Skeleton className="h-44 rounded-2xl" />
        </div>
        <div data-hueco="amplio">
          <Skeleton className="h-60 rounded-2xl" />
        </div>
        <div data-hueco="amplio">
          <Skeleton className="h-52 rounded-2xl" />
        </div>
        <div data-hueco="amplio">
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </Masonry>
    </div>
  );
}
