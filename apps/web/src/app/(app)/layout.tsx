import type { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { BarraPestanas } from "@/components/shell/barra-pestanas";
import { BarraSuperior } from "@/components/shell/barra-superior";
import { SidebarApp } from "@/components/shell/sidebar-app";
import { usuarioActivo } from "@/lib/usuario-activo";

/**
 * El shell de la app. Es un componente de SERVIDOR: lee la cookie del usuario activo y
 * la pasa hacia abajo, para que las pantallas que leen datos no tengan que ser de
 * cliente.
 *
 * Una sola estructura para los dos tamanos, como pide la skill `diseno-banorte`
 * (movil primero, escritorio es lo mismo con mas aire):
 *   - < 768 px: el sidebar es un sheet que abre el trigger; navega la barra de pestanas.
 *   - >= 768 px: el sidebar flota permanente y la barra de pestanas no existe.
 *
 * El `pb-24` de movil es el hueco de la barra de pestanas: sin el, la ultima tarjeta
 * queda debajo y no se puede leer.
 */
export default async function LayoutApp({ children }: { children: ReactNode }) {
  const usuario = await usuarioActivo();

  return (
    <SidebarProvider>
      <SidebarApp usuario={usuario} />
      {/* SidebarInset ya es un <main>: el contenido va en divs, no en otro <main>.
          `min-w-0` es lo que impide que un hijo ancho (el filtro con scroll propio de
          Movimientos) empuje el contenedor y desborde la pantalla 256 px. */}
      <SidebarInset className="min-w-0 bg-lienzo">
        <div className="flex min-h-svh min-w-0 flex-col gap-3 p-3 pb-24 md:gap-4 md:p-4 md:pb-4">
          <BarraSuperior usuario={usuario} />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </SidebarInset>
      <BarraPestanas />
    </SidebarProvider>
  );
}
