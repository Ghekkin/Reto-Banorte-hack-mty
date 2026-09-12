"use client";

import { LineChart, PiggyBank, Sparkles, Wallet } from "lucide-react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { USUARIOS, type UsuarioDemo } from "@/lib/usuarios";

/**
 * Sidebar flotante: tarjeta blanca redondeada sobre el lienzo, con el selector
 * de usuario demo arriba (skill `diseno-banorte`).
 *
 * Los items del menu son contexto, no navegacion: quien decide que se ve es el
 * agente. Por eso el activo refleja la ULTIMA intencion, no una ruta.
 */
const SECCIONES = [
  { id: "deuda", etiqueta: "Mi deuda", icono: Wallet },
  { id: "gasto", etiqueta: "Mi gasto", icono: LineChart },
  { id: "ahorro", etiqueta: "Mi ahorro", icono: PiggyBank },
];

export function SidebarMaya({
  usuario,
  alCambiarUsuario,
  seccionActiva = "deuda",
}: {
  usuario: UsuarioDemo;
  alCambiarUsuario: (id: string) => void;
  seccionActiva?: string;
}) {
  return (
    <Sidebar variant="floating" collapsible="offcanvas">
      <SidebarHeader className="gap-4">
        <div className="flex items-center gap-2 px-2 pt-2">
          <Sparkles className="text-primary" />
          <span className="text-base font-semibold">Maya</span>
        </div>
        <Select value={usuario.id} onValueChange={(valor) => alCambiarUsuario(valor ?? usuario.id)}>
          <SelectTrigger className="h-auto w-full rounded-xl py-2">
            <SelectValue>
              <span className="flex items-center gap-2 text-left">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-tinte text-xs text-primary">{usuario.iniciales}</AvatarFallback>
                </Avatar>
                <span className="flex flex-col">
                  <span className="text-sm font-medium">{usuario.nombre}</span>
                  <span className="text-xs text-muted-foreground">{usuario.contexto}</span>
                </span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {USUARIOS.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>TU VIAJE</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {SECCIONES.map(({ id, etiqueta, icono: Icono }) => (
                <SidebarMenuItem key={id}>
                  <SidebarMenuButton isActive={id === seccionActiva} className="rounded-xl">
                    <Icono />
                    <span>{etiqueta}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="rounded-xl border border-borde-sutil p-3 text-xs text-muted-foreground">
          Reto Banorte · Hack Monterrey 2026
          <br />
          LLM · MCP · A2UI
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
