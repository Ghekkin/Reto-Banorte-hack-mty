"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PESTANAS, seccionActiva } from "@/components/shell/navegacion";
import { cn } from "@/lib/utils";

/**
 * Barra de pestanas de movil: cuatro secciones y Maya elevada al centro.
 *
 * El patron es la bottom app bar de Material con FAB anclado. Resuelve una tension
 * real: se quiere navegacion de app bancaria, pero el asistente es el corazon del
 * producto y no puede ser "una pestana mas". Elevada al centro, Maya es lo primero que
 * el pulgar encuentra y lo primero que se ve en el proyector.
 *
 * Medidas de la skill `diseno-banorte`: toda zona tocable >= 48 px, y
 * `env(safe-area-inset-bottom)` para que la barra no quede bajo la barra gestual del
 * iPhone.
 */
export function BarraPestanas() {
  const ruta = usePathname();
  const activa = seccionActiva(ruta);

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-borde-sutil bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex items-stretch justify-around">
        {PESTANAS.map((seccion) => {
          const Icono = seccion.icono;
          const esActiva = seccion.href === activa?.href;

          // Maya: circulo elevado con el degradado de marca. Sobresale de la barra.
          if (seccion.destacada) {
            return (
              <li key={seccion.href} className="relative w-16 shrink-0">
                <Link
                  href={seccion.href}
                  aria-label={seccion.etiqueta}
                  aria-current={esActiva ? "page" : undefined}
                  className={cn(
                    "absolute -top-5 left-1/2 grid size-14 -translate-x-1/2 place-items-center rounded-full",
                    "bg-[linear-gradient(135deg,var(--primary)_0%,var(--marca-oscuro)_100%)]",
                    "text-primary-foreground shadow-md transition-transform duration-150 ease-out",
                    "active:scale-95",
                    esActiva && "ring-2 ring-primary/30 ring-offset-2 ring-offset-card",
                  )}
                >
                  <Icono className="size-6" />
                </Link>
                <span className="pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[11px] font-medium text-primary">
                  {seccion.etiqueta}
                </span>
              </li>
            );
          }

          return (
            <li key={seccion.href} className="flex-1">
              <Link
                href={seccion.href}
                aria-current={esActiva ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2",
                  // State layer de Material en vez de ripple: 8% al tocar.
                  "transition-colors duration-150 active:bg-current/8",
                  esActiva ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icono className="size-5" />
                <span className="w-full truncate text-center text-[11px] font-medium leading-none tracking-tight">
                  {seccion.etiqueta}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
