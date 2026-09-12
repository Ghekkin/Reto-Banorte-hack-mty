import { Skeleton } from "@/components/ui/skeleton";

/**
 * Lo que se ve mientras una seccion carga.
 *
 * Existe porque sin `loading.tsx` Next espera a que el server component termine antes de
 * pintar cualquier cosa: al tocar una pestana no pasa NADA durante 100-300 ms y se siente
 * trabado, aunque el tiempo real sea corto. Con esto el cambio de seccion es inmediato y
 * lo que tarda es el contenido, que es lo que la gente tolera.
 *
 * Los bloques tienen el tamano aproximado del contenido final (regla de la skill
 * `diseno-banorte`): un skeleton mas chico que el contenido produce un salto al llegar.
 */
export default function CargandoApp() {
  return (
    <div className="grid gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
      <Skeleton className="h-52 rounded-2xl md:col-span-2" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-56 rounded-2xl md:col-span-2" />
    </div>
  );
}
