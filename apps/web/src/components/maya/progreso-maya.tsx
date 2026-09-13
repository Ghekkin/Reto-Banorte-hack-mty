"use client";

import { useEffect, useState } from "react";
import { Check, CircleAlert } from "lucide-react";
import { IconoBanorte } from "@/components/marca/logo-banorte";
import { Spinner } from "@/components/ui/spinner";
import type { LineaStream } from "@/lib/agente/tipos";
import { pasosDelTurno, type PasoEnVivo } from "@/lib/pasos-de-maya";

/**
 * Lo que Maya va haciendo mientras el turno corre, paso por paso y en tiempo real.
 *
 * **Por que existe.** Un turno tarda de 3 a 15 s. Hasta el 2026-09-13 esto era una sola
 * leyenda que cambiaba entre «Consultando tus datos» y «Armando tu pantalla», y el usuario lo
 * vio «muy tieso»: no se notaba que Maya estuviera trabajando. Ahora cada herramienta que el
 * agente de verdad usa entra como un renglón («Revisando tus créditos», «Calculando tu
 * crédito pagando $6,000.00 al mes») con su spinner, y se palomea al terminar.
 *
 * **De donde sale.** De las lineas del stream que `usarAgente` guarda en `transparencia`
 * (`pasosDelTurno`, `lib/pasos-de-maya.ts`). No se simula nada: el renglon aparece cuando el
 * servidor pidio la herramienta y se palomea cuando respondio.
 *
 * **Sin texto tecnico.** Ni nombres de tools, ni pasos del modelo, ni milisegundos. Solo se ve
 * mientras Maya trabaja y desaparece al terminar: la pantalla que llega es la respuesta.
 */

/** Pasado esto sin terminar, se avisa que sigue trabajando: el silencio se lee como error. */
const AVISO_DE_ESPERA_MS = 8_000;

export function ProgresoMaya({ transparencia, ocupado }: { transparencia: LineaStream[]; ocupado: boolean }) {
  // Fuera de un turno no se monta nada: asi cada turno arranca el panel (y su reloj) desde cero.
  return ocupado ? <PanelDeProgreso transparencia={transparencia} /> : null;
}

function PanelDeProgreso({ transparencia }: { transparencia: LineaStream[] }) {
  // true cuando lleva `AVISO_DE_ESPERA_MS` montado: el turno sigue sin terminar.
  const [tardando, setTardando] = useState(false);
  useEffect(() => {
    const temporizador = setTimeout(() => setTardando(true), AVISO_DE_ESPERA_MS);
    return () => clearTimeout(temporizador);
  }, []);

  const pasos = pasosDelTurno(transparencia);
  const actual = [...pasos].reverse().find((p) => p.estado === "en-curso");

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={actual ? `${actual.texto}…` : "Maya está trabajando"}
      className="animar-entrada flex w-full max-w-md flex-col gap-3 self-start rounded-2xl border border-borde-sutil bg-card p-4 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <IconoBanorte className="size-3.5" aria-hidden />
        </span>
        <span className="text-sm font-medium">Maya está trabajando en tu respuesta</span>
      </div>

      <ol className="flex flex-col gap-2">
        {pasos.map((paso) => (
          <Renglon key={paso.id} paso={paso} />
        ))}
      </ol>

      {tardando ? (
        <p className="animar-entrada text-sm text-muted-foreground">Sigo en eso; con tus datos completos tarda unos segundos más.</p>
      ) : null}
    </div>
  );
}

function Renglon({ paso }: { paso: PasoEnVivo }) {
  const enCurso = paso.estado === "en-curso";
  return (
    <li className="animar-entrada flex min-h-6 items-center gap-2.5 text-sm">
      <span className="flex size-5 shrink-0 items-center justify-center" aria-hidden>
        {enCurso ? (
          <Spinner className="size-4 text-primary" />
        ) : paso.estado === "listo" ? (
          <span className="flex size-4 items-center justify-center rounded-full bg-exito text-white">
            <Check className="size-3" strokeWidth={3} />
          </span>
        ) : (
          <CircleAlert className="size-4 text-muted-foreground" />
        )}
      </span>
      <span className={enCurso ? "font-medium text-foreground" : "text-muted-foreground"}>
        {paso.texto}
        {enCurso ? "…" : paso.estado === "fallo" ? " (no respondió, sigo con lo demás)" : ""}
      </span>
    </li>
  );
}
