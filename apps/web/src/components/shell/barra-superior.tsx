"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { SelectorUsuario } from "@/components/shell/selector-usuario";
import { seccionActiva } from "@/components/shell/navegacion";
import type { UsuarioDemo } from "@/lib/usuarios";

/**
 * Barra superior. No lleva fondo propio: flota directo sobre el lienzo, que es lo que
 * pide la forma del proyecto (skill `diseno-banorte`).
 *
 * El titulo sale de `navegacion.ts`, asi que una seccion nueva trae su encabezado sin
 * tocar este archivo.
 */
export function BarraSuperior({ usuario }: { usuario: UsuarioDemo }) {
  const ruta = usePathname();
  const activa = seccionActiva(ruta);

  return (
    <header className="flex items-center gap-3 px-1 py-1 md:py-2">
      {/* El trigger del sidebar solo existe en movil: ahi el sidebar es un sheet. */}
      <SidebarTrigger className="size-11 shrink-0 md:hidden" />

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold md:text-xl">{activa?.etiqueta ?? "Maya"}</h1>
        <p className="truncate text-xs text-muted-foreground md:text-sm">{activa?.descripcion}</p>
      </div>

      {/* En escritorio el selector completo vive en el sidebar; aqui basta el avatar. */}
      <div className="shrink-0 md:hidden">
        <SelectorUsuario usuario={usuario} variante="avatar" />
      </div>
    </header>
  );
}
