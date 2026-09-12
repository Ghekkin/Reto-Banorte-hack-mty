"use client";

import type { ReactNode } from "react";
import { registrarVarios, type PropsComponente } from "../registro";
import { NOMBRES_DE_LAYOUT } from "./nombres";

/**
 * Los cuatro de layout del catalogo basico de A2UI, con nuestros tokens.
 * Son deliberadamente tontos: toda la opinion visual vive en `packages/catalogo`.
 */

/** Tailwind v4 no ve las clases armadas con plantillas: la separacion es un enum. */
const SEPARACION = { chica: "gap-2", normal: "gap-4", amplia: "gap-6" } as const;
type Separacion = keyof typeof SEPARACION;

export function Column({ children, separacion = "normal" }: PropsComponente & { separacion?: Separacion }): ReactNode {
  return <div className={`flex flex-col ${SEPARACION[separacion] ?? SEPARACION.normal}`}>{children}</div>;
}

export function Row({ children, separacion = "normal" }: PropsComponente & { separacion?: Separacion }): ReactNode {
  return (
    <div className={`flex flex-row flex-wrap items-center ${SEPARACION[separacion] ?? SEPARACION.normal}`}>
      {children}
    </div>
  );
}

export function Text({ texto, tono = "normal" }: PropsComponente & { texto?: string; tono?: string }): ReactNode {
  const clase = tono === "suave" ? "text-sm text-muted-foreground" : "text-sm text-foreground";
  return <p className={clase}>{texto ?? ""}</p>;
}

export function Divider(): ReactNode {
  return <hr className="border-borde-sutil" />;
}

/**
 * Se registran al importar el modulo. `apps/web` lo importa una vez. El mapa se arma
 * desde `NOMBRES_DE_LAYOUT` para que la lista que ve el agente y la que se registra de
 * verdad no puedan separarse.
 */
export function registrarLayout(): void {
  const componentes = { Column, Row, Text, Divider };
  registrarVarios(Object.fromEntries(NOMBRES_DE_LAYOUT.map((n) => [n, componentes[n]])));
}

export { NOMBRES_DE_LAYOUT };
