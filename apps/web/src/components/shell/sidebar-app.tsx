"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { LogoBanorte } from "@/components/marca/logo-banorte";
import { SelectorUsuario } from "@/components/shell/selector-usuario";
import { SECCIONES, seccionActiva } from "@/components/shell/navegacion";
import { MARCA } from "@/lib/marca";
import type { UsuarioDemo } from "@/lib/usuarios";
import { cn } from "@/lib/utils";

/**
 * Sidebar de escritorio: tarjeta blanca flotante sobre el lienzo (skill
 * `diseno-banorte`). En movil no se usa: ahi navega la barra de pestanas.
 *
 * Todos los items salen de `navegacion.ts`; este componente no sabe cuantas secciones
 * hay ni como se llaman.
 */
export function SidebarApp({ usuario }: { usuario: UsuarioDemo }) {
  const ruta = usePathname();
  const activa = seccionActiva(ruta);

  const banco = SECCIONES.filter((s) => s.grupo === "banco");
  const maya = SECCIONES.filter((s) => s.grupo === "maya");
  const mas = SECCIONES.filter((s) => s.grupo === "mas");

  return (
    <Sidebar variant="floating" collapsible="offcanvas">
      <SidebarHeader className="gap-3">
        <Link
          href="/maya"
          aria-label={`${MARCA.nombre} — ${MARCA.tagline}`}
          className="flex flex-col gap-1.5 px-2 pt-1"
        >
          {/* El logotipo manda la identidad; se dimensiona por altura porque es 8:1. */}
          <LogoBanorte className="h-6 w-auto text-primary" />
          <span className="text-xs text-muted-foreground">{MARCA.tagline}</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <GrupoSidebar etiqueta="TU BANCO" secciones={banco} activa={activa?.href} />
        <GrupoSidebar etiqueta="ASISTENTE" secciones={maya} activa={activa?.href} />
        <GrupoSidebar etiqueta="MÁS" secciones={mas} activa={activa?.href} />
      </SidebarContent>

      <SidebarFooter>
        <SelectorUsuario usuario={usuario} />
      </SidebarFooter>
    </Sidebar>
  );
}

function GrupoSidebar({
  etiqueta,
  secciones,
  activa,
}: {
  etiqueta: string;
  secciones: typeof SECCIONES;
  activa: string | undefined;
}) {
  if (secciones.length === 0) return null;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{etiqueta}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {secciones.map((seccion) => {
            const Icono = seccion.icono;
            const esActiva = seccion.href === activa;
            return (
              <SidebarMenuItem key={seccion.href}>
                <SidebarMenuButton
                  // Base UI: `render`, no `asChild`.
                  render={<Link href={seccion.href} />}
                  isActive={esActiva}
                  tooltip={seccion.etiqueta}
                  className={cn(
                    "rounded-xl",
                    // Maya se ve distinta incluso inactiva: es el diferenciador del
                    // producto, no una seccion mas del menu.
                    seccion.destacada && !esActiva && "text-primary",
                    // El texto va con el MISMO variant que usa el sidebar
                    // (`data-active:text-sidebar-accent-foreground`). Con
                    // `text-primary-foreground` a secas pierde por especificidad y queda
                    // rojo sobre el degradado rojo: el item se ve vacio.
                    seccion.destacada &&
                      esActiva &&
                      "bg-[linear-gradient(135deg,var(--primary)_0%,var(--marca-oscuro)_100%)] data-active:text-primary-foreground hover:text-primary-foreground",
                  )}
                >
                  <Icono />
                  <span>{seccion.etiqueta}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
