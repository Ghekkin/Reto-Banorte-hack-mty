"use client";

import { Component, Fragment, createElement, useEffect, useRef, type ErrorInfo, type ReactNode } from "react";
import { arbol, type Nodo } from "./arbol";
import { resolver } from "./bindings";
import { emitirAccion } from "./acciones";
import { nombres, obtener } from "./registro";
import { propsDe, type Accion, type EstadoSuperficie, type Tema } from "./tipos";

/**
 * Lo que la spec llama `VALIDATION_FAILED` en `client_to_server.json`: la interfaz le
 * dice al agente que lo que mando no se puede pintar.
 */
export type FalloDeRender = {
  code: "VALIDATION_FAILED";
  surfaceId: string;
  /** JSON Pointer dentro de la superficie: `/<id del componente>/component`. */
  path: string;
  message: string;
};

/**
 * Una pieza de primer nivel de la superficie, ya pintada, para que quien la aloje decida
 * donde ponerla (ver `disponer`).
 */
export type PiezaDeRaiz = {
  /** El id del componente en la superficie. */
  id: string;
  /** Unica aunque el id se repita por una plantilla: sirve de `key`. */
  clave: string;
  /** El nombre en el catalogo: `ResumenTarjeta`, `Text`, `Row`… */
  componente: string;
  /** La prop `ancho` ya resuelta contra el data model, si el agente la puso. */
  ancho?: "normal" | "amplio";
  nodo: ReactNode;
};

/** Los contenedores cuyo acomodo se le puede delegar a quien aloja la superficie. */
const CONTENEDORES = new Set(["Column", "Row"]);

/**
 * Pinta una superficie. Recorre el arbol, busca cada nombre en el registro y le
 * pasa las props YA resueltas contra el data model.
 *
 * No hace fetch ni guarda estado propio: cuando el usuario toca algo, llama
 * `alAccionar` y espera la UI nueva del agente.
 *
 * Tres llaves de la spec las resuelve el renderer y no los componentes, porque son de
 * todos y nadie deberia tener que acordarse de ellas al escribir el suyo:
 *  - `ancho` -> `data-ancho`, que es lo que la rejilla bento lee para dar dos columnas;
 *  - `weight` -> `flex-grow` dentro de un Row o Column (asi se arma una rejilla en A2UI);
 *  - `accessibility` -> `aria-label` / `aria-description`.
 */
export function Superficie({
  superficie,
  conversacionId,
  alAccionar,
  alFallar,
  disponer,
}: {
  superficie: EstadoSuperficie | undefined;
  conversacionId: string;
  alAccionar: (accion: Accion) => void;
  /**
   * Un componente que el registro no conoce. La spec tiene canal de vuelta para esto
   * (`client_to_server.json`, `VALIDATION_FAILED`): quien reciba esto puede devolverselo
   * al agente para que se corrija. Si nadie escucha, se pinta el aviso y ya.
   *
   * Se llama **despues** del render, nunca durante: si quien escucha hace `setState`, un
   * aviso en fase de render lo ciclaria. Y el mismo fallo se avisa UNA vez por vida del
   * componente, para que un reintento que vuelve a fallar igual no se vuelva un bucle
   * entre la interfaz y el agente.
   */
  alFallar?: (error: FalloDeRender) => void;
  /**
   * Quien aloja la superficie decide COMO se acomodan sus piezas de primer nivel.
   *
   * El agente no sabe en que pantalla se va a ver lo que construye: arma un `Column` con
   * sus tarjetas, y un `Column` apila. En un celular eso es justo lo correcto; en un lienzo
   * de 1,000 px deja las tarjetas una encima de otra con media pantalla vacia. Con esta
   * prop, si la raiz es un `Column` o un `Row`, sus hijos se entregan ya pintados y quien
   * aloja la superficie los reparte (el lienzo de Maya los pone en filas segun su ancho).
   * Si la raiz es un componente suelto, llega como unica pieza.
   *
   * Sin la prop, la raiz se pinta tal cual, como siempre.
   */
  disponer?: (piezas: PiezaDeRaiz[]) => ReactNode;
}): ReactNode {
  /* Se llena durante el render y se vacia en el efecto. Mutar un ref al pintar no
     dispara renders ni sale del proceso: el efecto de verdad vive en el useEffect. */
  const pendientes = useRef<FalloDeRender[]>([]);
  const avisados = useRef<Set<string>>(new Set());
  pendientes.current = [];

  useEffect(() => {
    // Un registro vacio no es "falta un componente": es que nadie lo lleno. Sin este
    // aviso, el sintoma son 12 mensajes distintos de "no esta en el catalogo" y ninguno
    // dice donde esta el problema. Paso, y costo una tarde.
    if (pendientes.current.length > 0 && nombres().size === 0) {
      console.error(
        "[a2ui] el registro esta VACIO: ningun componente se puede pintar. " +
          "El modulo que renderiza <Superficie> tiene que llamar registrarLayout() y registrarCatalogo() " +
          "(en apps/web: `registrarComponentes()` de @/lib/registrar-componentes).",
      );
    }
    if (!alFallar) return;
    for (const fallo of pendientes.current) {
      const clave = `${fallo.surfaceId}|${fallo.path}|${fallo.message}`;
      if (avisados.current.has(clave)) continue;
      avisados.current.add(clave);
      alFallar(fallo);
    }
  });

  if (!superficie) return null;
  const raiz = arbol(superficie, (m) => console.warn(`[a2ui] ${m}`));
  if (!raiz) return null;

  if (disponer) {
    const delegable = CONTENEDORES.has(raiz.componente.component) && raiz.hijos.length > 0;
    const nodos = delegable ? raiz.hijos : [raiz];
    return (
      <>
        {disponer(
          nodos.map((nodo) => ({
            id: nodo.componente.id,
            clave: nodo.clave,
            componente: nodo.componente.component,
            ancho: anchoDe(resolver(propsDe(nodo.componente), superficie.dataModel, nodo.item)),
            nodo: pintar(nodo),
          })),
        )}
      </>
    );
  }

  return <>{pintar(raiz)}</>;

  function pintar(nodo: Nodo): ReactNode {
    const { componente, item, clave } = nodo;
    const Componente = obtener(componente.component);
    if (!Componente) {
      pendientes.current.push({
        code: "VALIDATION_FAILED",
        surfaceId: superficie!.id,
        path: `/${componente.id}/component`,
        message: `El componente "${componente.component}" no esta en el catalogo de esta superficie.`,
      });
      return <Desconocido key={clave} nombre={componente.component} />;
    }

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

    const pintado = (
      <FronteraDeError key={clave} nombre={componente.component} id={componente.id}>
        {createElement(Componente, { ...props, alAccionar: manejador }, hijos.length ? hijos : undefined)}
      </FronteraDeError>
    );

    return envolver(pintado, componente.id, props, componente.weight, componente.accessibility, clave);
  }
}

/**
 * La envoltura solo aparece cuando hay algo que poner en ella: un componente sin
 * `ancho`, `weight` ni `accessibility` se pinta tal cual, como antes.
 *
 * `grid` en el div y no `block`: asi el componente sigue estirandose al alto de su fila
 * en la rejilla bento, igual que cuando era el hijo directo.
 */
/** `ancho` solo cuenta si es uno de los dos valores del catalogo. */
function anchoDe(props: Record<string, unknown>): "normal" | "amplio" | undefined {
  return props.ancho === "amplio" || props.ancho === "normal" ? props.ancho : undefined;
}

function envolver(
  pintado: ReactNode,
  id: string,
  props: Record<string, unknown>,
  weight: unknown,
  accessibility: unknown,
  clave: string,
): ReactNode {
  const ancho = anchoDe(props);
  const peso = typeof weight === "number" && Number.isFinite(weight) ? weight : undefined;
  const a11y = (accessibility ?? {}) as { label?: unknown; description?: unknown };
  const etiqueta = typeof a11y.label === "string" ? a11y.label : undefined;
  const descripcion = typeof a11y.description === "string" ? a11y.description : undefined;

  if (ancho === undefined && peso === undefined && !etiqueta && !descripcion) return pintado;

  return (
    <div
      key={clave}
      className="grid"
      data-ancho={ancho}
      data-componente={id}
      style={peso === undefined ? undefined : { flexGrow: peso, flexBasis: 0, minWidth: 0 }}
      role={etiqueta || descripcion ? "group" : undefined}
      aria-label={etiqueta}
      aria-description={descripcion}
    >
      {pintado}
    </div>
  );
}

/**
 * Una frontera de error por componente: si uno truena al pintar (una prop con la forma
 * equivocada, un `undefined` donde iba un arreglo), se cae SOLO esa tarjeta y el resto
 * de la pantalla sigue en pie. Sin esto, un componente roto tumbaba la superficie entera
 * —y con ella la barra de conversacion— en plena demo.
 *
 * Es una clase porque React solo permite atrapar errores de render asi.
 */
class FronteraDeError extends Component<{ nombre: string; id: string; children: ReactNode }, { error?: Error }> {
  override state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (process.env.NODE_ENV !== "production") {
      console.error(`[a2ui] ${this.props.nombre} (${this.props.id}) trono al pintar:`, error, info.componentStack);
    }
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="rounded-2xl border border-oscuro p-4 text-sm">
          <p className="font-medium">Esta tarjeta no se pudo mostrar.</p>
          <p className="text-muted-foreground">
            <code>{this.props.nombre}</code>: {this.state.error.message}
          </p>
        </div>
      );
    }
    return this.props.children;
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

/**
 * El tema de la superficie como variables CSS, para que la shell lo aplique donde
 * quiera sin que el renderer se meta con el layout. `primaryColor` es el unico que
 * mapeamos: los otros dos campos de la spec son texto e icono del agente.
 */
export function variablesDelTema(tema: Tema | undefined): Record<string, string> | undefined {
  if (!tema?.primaryColor || !/^#[0-9a-fA-F]{6}$/.test(tema.primaryColor)) return undefined;
  return { "--primary": tema.primaryColor };
}
