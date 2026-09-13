"use client";

import { usePathname } from "next/navigation";
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
      {/* Sin trigger del sidebar en movil (2026-09-13): ahi la navegacion es la barra de abajo
          (Inicio, Productos, Maya, Movimientos, Mas) y el sheet lateral repetia lo mismo. El
          usuario lo vio «de relleno» en el celular, que es donde el jurado ve la demo. La persona
          se cambia con el avatar de la derecha. */}
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
