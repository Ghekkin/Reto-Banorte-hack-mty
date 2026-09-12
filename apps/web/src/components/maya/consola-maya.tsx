"use client";

import { useEffect, useRef } from "react";
import { IconoBanorte } from "@/components/marca/logo-banorte";
import { BarraConversacion } from "@/components/maya/barra-conversacion";
import { Lienzo, LienzoPlaceholder } from "@/components/maya/lienzo";
import { ProgresoMaya } from "@/components/maya/progreso-maya";
import { usarAgente } from "@/lib/agente/usar-agente";
import { MARCA } from "@/lib/marca";
import type { UsuarioDemo } from "@/lib/usuarios";

/** Arranque de la conversacion, adaptado a quien pregunta. */
const CHIPS_INICIALES: Record<string, string[]> = {
  usr_beto: ["Quiero pagar menos intereses", "¿En qué se me fue el dinero?", "¿Cómo estoy?"],
  usr_ana: ["¿En qué se me fue el dinero?", "Quiero empezar a ahorrar", "¿Cómo estoy?"],
  // Carmen NO trae "¿cómo va mi portafolio?": el catálogo no tiene componente de
  // portafolio y el agente terminaba metiendo su valor de mercado en `MetaActiva`, que es
  // para metas de ahorro. Su portafolio se ve en Productos → Inversiones, que es una
  // pantalla programada. Ver ADR 0004, enmienda del 2026-09-12 (tarde).
  usr_carmen: ["¿Cómo estoy?", "¿En qué se me fue el dinero?", "Quiero apartar dinero cada mes"],
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
  const hayConversacion = agente.hilo.length > 0;

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      {!hayConversacion && <Saludo usuario={usuario} />}

      {/* El hilo completo, en orden: lo que se dijo y lo que Maya construyó. Las
          pantallas de turnos anteriores se quedan aquí con su tira de transparencia, que
          es lo que hace que la conversación se pueda leer hacia arriba y tenga sentido:
          una frase suelta sin su tarjeta no dice nada. */}
      {agente.hilo.map((entrada, i) =>
        entrada.tipo === "mensaje" ? (
          <Mensaje key={i} rol={entrada.rol} texto={entrada.texto} />
        ) : (
          <div key={i} className="flex flex-col gap-3 md:gap-4">
            <ProgresoMaya transparencia={entrada.transparencia} ocupado={false} />
            <Lienzo
              superficie={entrada.superficie}
              conversacionId={agente.conversacionId}
              alAccionar={agente.enviarAccion}
              alFallar={agente.reportarFallo}
            />
          </div>
        ),
      )}

      {/* El turno en curso: la tira viva y la pantalla que se está armando. Al cerrar el
          turno esta misma superficie pasa a ser la última entrada del hilo, así que no se
          pinta dos veces (`superficieViva` la compara por referencia). */}
      {(agente.ocupado || agente.superficieViva) && (
        <ProgresoMaya transparencia={agente.transparencia} ocupado={agente.ocupado} />
      )}

      <Lienzo
        superficie={agente.superficieViva}
        conversacionId={agente.conversacionId}
        alAccionar={agente.enviarAccion}
        alFallar={agente.reportarFallo}
        vacio={hayConversacion ? undefined : <LienzoPlaceholder />}
      />

      {/* La razón NO se pinta aquí: cada tarjeta del catálogo ya trae la suya al pie
          ("¿Por qué veo esto? …"), junto al dato que la justifica. Tener las dos daba dos
          respuestas distintas a la misma pregunta en la misma pantalla. */}

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
