"use client";

import { Fragment, createElement, type ReactNode } from "react";
import { arbol, type Nodo } from "./arbol";
import { resolver } from "./bindings";
import { emitirAccion } from "./acciones";
import { obtener } from "./registro";
import { propsDe, type Accion, type EstadoSuperficie } from "./tipos";

/**
 * Pinta una superficie. Recorre el arbol, busca cada nombre en el registro y le
 * pasa las props YA resueltas contra el data model.
 *
 * No hace fetch ni guarda estado propio: cuando el usuario toca algo, llama
 * `alAccionar` y espera la UI nueva del agente.
 */
export function Superficie({
  superficie,
  conversacionId,
  alAccionar,
}: {
  superficie: EstadoSuperficie | undefined;
  conversacionId: string;
  alAccionar: (accion: Accion) => void;
}): ReactNode {
  if (!superficie) return null;
  const raiz = arbol(superficie, (m) => console.warn(`[a2ui] ${m}`));
  if (!raiz) return null;
  return <>{pintar(raiz)}</>;

  function pintar(nodo: Nodo): ReactNode {
    const { componente, item, clave } = nodo;
    const Componente = obtener(componente.component);
    if (!Componente) return <Desconocido key={clave} nombre={componente.component} />;

    const props = resolver(propsDe(componente), superficie!.dataModel, item);
    const hijos = nodo.hijos.map((h) => <Fragment key={h.clave}>{pintar(h)}</Fragment>);

    const manejador = componente.action
      ? (contextoExtra?: Record<string, unknown>) => {
          const accion = emitirAccion({
            componente,
            surfaceId: superficie!.id,
            dataModel: superficie!.dataModel,
            item,
            conversacionId,
            contextoExtra,
          });
          if (accion) alAccionar(accion);
        }
      : undefined;

    return createElement(
      Componente,
      { ...props, key: clave, alAccionar: manejador },
      hijos.length ? hijos : undefined,
    );
  }
}

/** Visible a proposito: un nombre fuera del catalogo no puede pasar desapercibido. */
function Desconocido({ nombre }: { nombre: string }): ReactNode {
  if (process.env.NODE_ENV !== "production") {
    console.error(`[a2ui] componente fuera del catalogo: ${nombre}`);
  }
  return (
    <div className="rounded-2xl border border-dashed border-destructive p-4 text-sm text-destructive">
      Componente desconocido: <code>{nombre}</code>
    </div>
  );
}
