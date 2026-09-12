"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconoBanorte } from "@/components/marca/logo-banorte";
import { BarraConversacion } from "@/components/maya/barra-conversacion";
import { Lienzo } from "@/components/maya/lienzo";
import { ProgresoMaya } from "@/components/maya/progreso-maya";
import type { AccionEntrante } from "@/lib/agente/tipos";
import { usarAgente } from "@/lib/agente/usar-agente";
import { MARCA } from "@/lib/marca";
import { vozHabilitada } from "@/lib/voz/flag";
import { usarConversacionVoz, type HerramientasVoz } from "@/lib/voz/usar-conversacion-voz";
import type { UsuarioDemo } from "@/lib/usuarios";

/** Arranque de la conversación, adaptado a quien pregunta. */
const CHIPS_INICIALES: Record<string, string[]> = {
  usr_beto: ["Quiero pagar menos intereses", "¿En qué se me fue el dinero?", "¿Cómo estoy?"],
  usr_ana: ["¿En qué se me fue el dinero?", "Quiero empezar a ahorrar", "¿Cómo estoy?"],
  usr_carmen: ["¿Cómo estoy?", "¿En qué se me fue el dinero?", "¿Cómo va mi portafolio?"],
};

/**
 * La consola de Maya: contenedor centrado, hilo de conversación, lienzo A2UI y barra de entrada.
 *
 * En el estado inicial, la barra de entrada con texto y voz se ubica al centro de la pantalla.
 * Una vez iniciada la conversación, realiza una transición fluida posicionándose al fondo.
 */
export function ConsolaMaya({
  usuario,
  intencionInicial,
  accionInicial,
  vozAuto,
}: {
  usuario: UsuarioDemo;
  intencionInicial?: string;
  /** Un boton ya tocado en el Inicio que armo Maya: se ejecuta aqui, como cualquier toque. */
  accionInicial?: AccionEntrante;
  /** `?voz=1`: llega desde el boton de voz de Inicio, arranca la sesion sola. */
  vozAuto?: boolean;
}) {
  const agente = usarAgente(usuario.id);
  const { enviarTexto, enviarAccion } = agente;

  // Una sola vez por intención: evita que cada render vuelva a disparar la pregunta
  const yaEnviada = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!intencionInicial || yaEnviada.current === intencionInicial) return;
    yaEnviada.current = intencionInicial;
    void enviarTexto(intencionInicial);
  }, [intencionInicial, enviarTexto]);

  // Igual para la accion: una vez, y se quita de la URL para que recargar no la repita.
  const yaDisparada = useRef(false);
  useEffect(() => {
    if (!accionInicial || yaDisparada.current) return;
    yaDisparada.current = true;
    window.history.replaceState(null, "", "/maya");
    void enviarAccion(accionInicial);
  }, [accionInicial, enviarAccion]);

  /**
   * El puente de voz (ElevenLabs, premio lateral, docs/como-funciona/premio-elevenlabs.md).
   *
   * El agente de voz no improvisa la respuesta financiera: llama la client tool
   * `consultar_maya` (asi debe llamarse en su consola), que aqui ES `enviarTexto` — el
   * MISMO turno que si la persona hubiera escrito, con la misma pantalla y los mismos
   * datos. Lo que `enviarTexto` devuelve es lo que ElevenLabs lee en voz alta.
   *
   * `enviarTextoRef` evita una tool congelada en el `historial` del momento en que
   * empezo la sesion: `enviarTexto` cambia de identidad en cada turno (crece
   * `historial`), pero la tool que ElevenLabs guardo al conectar es siempre la MISMA
   * funcion. El ref hace que esa funcion fija siempre llame a la version mas nueva.
   */
  const enviarTextoRef = useRef(enviarTexto);
  enviarTextoRef.current = enviarTexto;

  const herramientasVoz = useMemo<HerramientasVoz>(
    () => ({
      consultar_maya: async ({ pregunta }: { pregunta?: string }) => {
        if (!pregunta || !pregunta.trim()) return "No entendí bien la pregunta, ¿la repites?";
        return enviarTextoRef.current(pregunta);
      },
    }),
    [],
  );

  const [avisoVoz, setAvisoVoz] = useState<string>();
  const { estado: estadoVoz, iniciar: iniciarVoz, detener: detenerVoz } = usarConversacionVoz({
    onFallback: (motivo) => {
      console.warn(`[voz] ${motivo}`);
      setAvisoVoz("No se pudo conectar la voz. Sigue escribiéndole a Maya.");
    },
  });

  const alAlternarVoz = useCallback(() => {
    if (estadoVoz === "activa" || estadoVoz === "conectando") {
      void detenerVoz();
      return;
    }
    setAvisoVoz(undefined);
    void iniciarVoz(herramientasVoz);
  }, [estadoVoz, iniciarVoz, detenerVoz, herramientasVoz]);

  // El atajo de voz de Inicio (`?voz=1`): un solo intento, como intencionInicial. Si el
  // navegador bloqueo el permiso de microfono por venir de una navegacion (no un click
  // directo), `onFallback` avisa y la persona toca el boton ella misma.
  const vozYaIntentada = useRef(false);
  useEffect(() => {
    if (!vozAuto || vozYaIntentada.current) return;
    vozYaIntentada.current = true;
    window.history.replaceState(null, "", "/maya");
    void iniciarVoz(herramientasVoz);
  }, [vozAuto, iniciarVoz, herramientasVoz]);

  // Salir de /maya con el microfono abierto no puede dejar el websocket ni el
  // microfono prendidos en segundo plano.
  useEffect(() => () => void detenerVoz(), [detenerVoz]);

  const chips = agente.sugerencias.length > 0 ? agente.sugerencias : (CHIPS_INICIALES[usuario.id] ?? []);
  const hayConversacion = agente.hilo.length > 0 || agente.ocupado;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col min-h-[calc(100svh-9rem)] justify-between transition-all duration-500 ease-out">
      {!hayConversacion ? (
        /* Estado Inicial: Input centrado en pantalla con voz y bienvenida */
        <div className="flex flex-1 flex-col items-center justify-center py-8 md:py-20 text-center animate-entrada">
          <div className="flex flex-col items-center gap-2.5 mb-5">
            <span className="grid size-12 sm:size-14 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--primary)_0%,var(--marca-oscuro)_100%)] text-primary-foreground shadow-md transition-transform hover:scale-105">
              <IconoBanorte className="size-6 sm:size-7" />
            </span>
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl md:text-3xl">
              Hola, {usuario.nombre.split(" ")[0]}
            </h1>
            <p className="max-w-xs sm:max-w-md text-xs sm:text-sm text-muted-foreground">
              Dime qué necesitas resolver y armo la pantalla financiera para hacerlo en tiempo real.
            </p>
          </div>

          {avisoVoz && <p className="mb-2 max-w-xs border-l-2 border-oscuro pl-2 text-left text-xs text-muted-foreground">{avisoVoz}</p>}

          <BarraConversacion
            sugerencias={chips}
            ocupado={agente.ocupado}
            alEnviar={enviarTexto}
            enCentro={true}
            estadoVoz={vozHabilitada() ? estadoVoz : undefined}
            alAlternarVoz={vozHabilitada() ? alAlternarVoz : undefined}
          />
        </div>
      ) : (
        /* Estado Activo: Hilo conversacional centrado e input anclado al fondo */
        <div className="flex flex-1 flex-col gap-2.5 pb-4 md:gap-3.5">
          {agente.hilo.map((entrada, i) =>
            entrada.tipo === "mensaje" ? (
              <Mensaje key={i} rol={entrada.rol} texto={entrada.texto} />
            ) : (
              <div key={i} className="flex flex-col gap-2.5 md:gap-3.5">
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

          {/* Turno en curso */}
          {(agente.ocupado || agente.superficieViva) && (
            <ProgresoMaya transparencia={agente.transparencia} ocupado={agente.ocupado} />
          )}

          {agente.superficieViva && (
            <Lienzo
              superficie={agente.superficieViva}
              conversacionId={agente.conversacionId}
              alAccionar={agente.enviarAccion}
              alFallar={agente.reportarFallo}
            />
          )}

          {/* Sugerencias al fondo del chat (scrolleables en el hilo, NO tapando en la barra fija) */}
          {chips.length > 0 && !agente.ocupado && (
            <div className="mt-1 flex flex-wrap gap-1.5 pt-1">
              {chips.map((sugerencia) => (
                <button
                  key={sugerencia}
                  type="button"
                  onClick={() => enviarTexto(sugerencia)}
                  className="rounded-full border border-borde-sutil bg-card/90 px-2.5 py-1 text-[11px] font-normal text-muted-foreground shadow-2xs transition-all hover:border-primary/40 hover:bg-tinte hover:text-primary active:scale-95 sm:px-3 sm:py-1.5 sm:text-xs"
                >
                  {sugerencia}
                </button>
              ))}
            </div>
          )}

          {avisoVoz && <p className="mb-1 border-l-2 border-oscuro pl-2 text-xs text-muted-foreground">{avisoVoz}</p>}

          <BarraConversacion
            ocupado={agente.ocupado}
            alEnviar={enviarTexto}
            enCentro={false}
            estadoVoz={vozHabilitada() ? estadoVoz : undefined}
            alAlternarVoz={vozHabilitada() ? alAlternarVoz : undefined}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Una línea del hilo de mensajes.
 */
function Mensaje({ rol, texto }: { rol: "usuario" | "agente" | "accion"; texto: string }) {
  if (rol === "accion") {
    return (
      <p className="self-end rounded-full bg-tinte px-2.5 py-0.5 text-[10px] sm:text-xs font-medium text-primary shadow-xs">
        Tocaste: {texto}
      </p>
    );
  }

  const esUsuario = rol === "usuario";
  return (
    <p
      className={
        esUsuario
          ? "max-w-[85%] self-end rounded-2xl bg-oscuro px-3.5 py-2 text-xs sm:text-sm text-white shadow-xs leading-relaxed"
          : "max-w-[85%] self-start rounded-2xl border border-borde-sutil bg-card px-3.5 py-2 text-xs sm:text-sm text-foreground shadow-xs leading-relaxed"
      }
    >
      {texto}
    </p>
  );
}
