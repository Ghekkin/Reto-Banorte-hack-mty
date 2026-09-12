"use client";

import { useEffect, useState } from "react";
import { registrarLayout } from "@maya/a2ui/layout";
import { registrarCatalogo } from "@maya/catalogo";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { BarraConversacion } from "@/components/shell/barra-conversacion";
import { Lienzo } from "@/components/shell/lienzo";
import { SidebarMaya } from "@/components/shell/sidebar-maya";
import { usarAgente } from "@/components/shell/usar-agente";
import { USUARIOS, USUARIO_POR_DEFECTO } from "@/lib/usuarios";
import { Sparkles } from "lucide-react";

/**
 * La pantalla del producto: lienzo gris con piezas flotantes y la barra de
 * conversacion siempre visible (skill `diseno-banorte`).
 *
 * El lienzo esta vacio a proposito: lo que aparece ahi lo construye el agente.
 *
 * PENDIENTE (rol `web`): el panel de transparencia (las lineas `tool` y `a2ui`
 * del stream ya llegan en `transparencia`), los badges LLM · MCP · A2UI y el
 * hilo de la conversacion.
 */

// Registrar el catalogo es lo que hace que el renderer sepa pintar: si no, todo
// componente sale como "desconocido".
registrarLayout();
registrarCatalogo();

const SUGERENCIAS_INICIALES = [
  "Quiero pagar menos intereses de mi tarjeta",
  "¿En qué se me va el dinero?",
  "Quiero empezar a ahorrar",
];

export default function Pagina() {
  const [usuarioId, setUsuarioId] = useState(USUARIO_POR_DEFECTO.id);
  const usuario = USUARIOS.find((u) => u.id === usuarioId) ?? USUARIO_POR_DEFECTO;
  const agente = usarAgente(usuarioId);

  // Cambiar de usuario: conversacion nueva y superficie borrada (contrato).
  useEffect(() => {
    agente.reiniciar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioId]);

  return (
    <SidebarProvider className="bg-lienzo p-3 md:p-4">
      <SidebarMaya usuario={usuario} alCambiarUsuario={setUsuarioId} />
      <SidebarInset className="flex flex-col gap-4 bg-transparent">
        <header className="flex items-center gap-3">
          <SidebarTrigger className="md:hidden" />
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold">Hola, {usuario.nombre.split(" ")[0]}</h1>
            <p className="text-sm text-muted-foreground">
              Dime qué necesitas resolver y armo la pantalla para eso.
            </p>
          </div>
        </header>

        <main className="flex-1">
          <Lienzo
            superficie={agente.superficie}
            conversacionId={agente.conversacionId}
            alAccionar={agente.enviarAccion}
            vacio={
              <div className="md:col-span-2 xl:col-span-3">
                <Empty className="rounded-2xl border border-borde-sutil bg-card shadow-sm">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Sparkles />
                    </EmptyMedia>
                    <EmptyTitle>Todavía no hay nada que mostrar</EmptyTitle>
                    <EmptyDescription>
                      Escribe abajo lo que necesitas. La pantalla se arma con tu respuesta.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            }
          />
          {agente.razon ? (
            <p className="mt-4 text-xs text-muted-foreground">¿Por qué veo esto? {agente.razon}</p>
          ) : null}
        </main>

        <BarraConversacion
          sugerencias={agente.sugerencias.length ? agente.sugerencias : SUGERENCIAS_INICIALES}
          ocupado={agente.ocupado}
          alEnviar={agente.enviarTexto}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
