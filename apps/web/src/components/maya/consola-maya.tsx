"use client";

import { useEffect, useRef } from "react";
import { IconoBanorte } from "@/components/marca/logo-banorte";
import { BarraConversacion } from "@/components/maya/barra-conversacion";
import { Lienzo, LienzoPlaceholder } from "@/components/maya/lienzo";
import { usarAgente } from "@/lib/agente/usar-agente";
import { MARCA } from "@/lib/marca";
import type { UsuarioDemo } from "@/lib/usuarios";

/** Arranque de la conversacion, adaptado a quien pregunta. */
const CHIPS_INICIALES: Record<string, string[]> = {
  usr_beto: ["Quiero pagar menos intereses", "¿En qué se me fue el dinero?", "¿Cómo estoy?"],
  usr_ana: ["¿En qué se me fue el dinero?", "Quiero empezar a ahorrar", "¿Cómo estoy?"],
  usr_carmen: ["¿Cómo va mi portafolio?", "¿En qué se me fue el dinero?", "¿Cómo estoy?"],
};

/**
 * La consola de Maya: el hilo, el lienzo y la barra de conversacion.
 *
 * Es cliente porque aqui vive el streaming: `usarAgente` lee el JSONL linea por linea y
 * aplica los mensajes A2UI conforme llegan, para que las tarjetas aparezcan mientras el
 * agente sigue trabajando.
 *
 * `intencionInicial` llega de `/maya?intencion=...`, que es como Inicio manda una
 * pregunta concreta al lienzo.
 */
export function ConsolaMaya({
  usuario,
  intencionInicial,
}: {
  usuario: UsuarioDemo;
  intencionInicial?: string;
}) {
  const agente = usarAgente(usuario.id);
  const { enviarTexto } = agente;

  // Una sola vez por intencion: sin el ref, cada render volveria a preguntar.
  const yaEnviada = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!intencionInicial || yaEnviada.current === intencionInicial) return;
    yaEnviada.current = intencionInicial;
    void enviarTexto(intencionInicial);
  }, [intencionInicial, enviarTexto]);

  const chips = agente.sugerencias.length > 0 ? agente.sugerencias : (CHIPS_INICIALES[usuario.id] ?? []);
  const hayConversacion = agente.historial.length > 0;

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      {!hayConversacion && <Saludo usuario={usuario} />}

      {hayConversacion && (
        <div className="flex flex-col gap-2">
          {agente.historial.map((mensaje, i) => (
            <Mensaje key={i} rol={mensaje.rol} texto={mensaje.texto} />
          ))}
        </div>
      )}

      <Lienzo
        superficie={agente.superficie}
        conversacionId={agente.conversacionId}
        alAccionar={agente.enviarAccion}
        alFallar={agente.reportarFallo}
        vacio={<LienzoPlaceholder />}
      />

      {agente.razon && (
        <p className="px-1 text-xs text-muted-foreground">
          <span className="font-medium">Por qué ves esto:</span> {agente.razon}
        </p>
      )}

      <BarraConversacion sugerencias={chips} ocupado={agente.ocupado} alEnviar={enviarTexto} />
    </div>
  );
}

function Saludo({ usuario }: { usuario: UsuarioDemo }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-borde-sutil bg-card p-4 shadow-sm md:p-5">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,var(--primary)_0%,var(--marca-oscuro)_100%)] text-primary-foreground">
        <IconoBanorte className="size-4" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">
          Hola, {usuario.nombre.split(" ")[0]}. Soy {MARCA.nombre}.
        </p>
        <p className="text-sm text-muted-foreground">
          Dime qué necesitas resolver y armo la pantalla para hacerlo, no un párrafo que lo
          explique.
        </p>
      </div>
    </div>
  );
}

/**
 * Una linea del hilo. Las acciones se marcan distinto a proposito: que se vea que un
 * toque en la interfaz vuelve al agente igual que un mensaje escrito es el argumento del
 * ciclo cerrado del reto.
 */
function Mensaje({ rol, texto }: { rol: "usuario" | "agente" | "accion"; texto: string }) {
  if (rol === "accion") {
    return (
      <p className="self-end rounded-full bg-tinte px-3 py-1 text-xs text-primary">
        Tocaste: {texto}
      </p>
    );
  }

  const esUsuario = rol === "usuario";
  return (
    <p
      className={
        esUsuario
          ? "max-w-[85%] self-end rounded-2xl bg-oscuro px-4 py-2 text-sm text-white"
          : "max-w-[85%] self-start rounded-2xl border border-borde-sutil bg-card px-4 py-2 text-sm shadow-sm"
      }
    >
      {texto}
    </p>
  );
}
