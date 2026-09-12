import { Skeleton } from "@/components/ui/skeleton";

/**
 * El esqueleto de Productos, con la forma de lo que va a llegar: la tarjeta con el
 * plastico y su detalle (ancha), y despues cuentas, creditos e inversiones.
 *
 * Los altos son los medidos en el navegador (Beto, 2026-09-12): 475 px el heroe en movil y
 * 247 en escritorio; entre 240 y 268 el resto. Un skeleton mas chico que el contenido
 * produce un salto al llegar los datos (skill `diseno-banorte`).
 */
export default function CargandoProductos() {
  return (
    <div className="grid gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
      <Skeleton className="h-[30rem] rounded-2xl sm:h-64 md:col-span-2" />
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-[17rem] rounded-2xl" />
      <Skeleton className="h-[17rem] rounded-2xl" />
      <Skeleton className="h-[17rem] rounded-2xl" />
    </div>
  );
}
