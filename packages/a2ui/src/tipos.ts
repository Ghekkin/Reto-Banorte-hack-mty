/**
 * Tipos de A2UI v0.9.1, del lado que nos toca. Derivados de los JSON Schema
 * oficiales que viven en `spec/` (ADR 0008). Si un tipo de aqui no cuadra con el
 * schema, manda el schema.
 */

export const VERSION_A2UI = "v0.9.1" as const;

/** Una prop puede ser un valor literal o un enlace al data model. */
export type Binding = { path: string };
export type Valor = unknown;
export type Props = Record<string, Valor>;

export function esBinding(v: unknown): v is Binding {
  return typeof v === "object" && v !== null && "path" in v && typeof (v as Binding).path === "string";
}

/**
 * Una accion declarada por un componente. La spec admite `event` (va al agente) y
 * `functionCall` (local). Nosotros solo emitimos `event`: quien decide es el agente.
 */
export type Action = {
  event: { name: string; context?: Record<string, Valor> };
};

/** Hijos: lista fija de ids, o plantilla que repite un componente por cada item. */
export type ListaHijos = string[] | { componentId: string; path: string };

/**
 * Un componente de `updateComponents`, tal como lo define la spec
 * (`catalogs/basic/catalog.json` -> `anyComponent`): las props van PLANAS junto a
 * `id` y `component`, no anidadas. Las reservadas son solo estas cinco.
 */
export type Componente = {
  id: string;
  /** Nombre en el catalogo: `PlanDePago`, `Column`, … */
  component: string;
  children?: ListaHijos;
  /** Hijo unico (Button, Card…). */
  child?: string;
  action?: Action;
  [prop: string]: unknown;
};

/** El id que la spec exige para la raiz del arbol de una superficie. */
export const ID_RAIZ = "root";

const RESERVADAS = new Set(["id", "component", "children", "child", "action", "weight", "accessibility"]);

/** Lo que queda cuando se quitan las llaves reservadas: las props del componente. */
export function propsDe(componente: Componente): Props {
  const props: Props = {};
  for (const [k, v] of Object.entries(componente)) {
    if (!RESERVADAS.has(k)) props[k] = v;
  }
  return props;
}

/** Los ids de hijos declarados como lista fija; la plantilla se resuelve en `arbol`. */
export function hijosFijos(componente: Componente): string[] {
  if (componente.child) return [componente.child];
  const c = componente.children;
  if (Array.isArray(c)) return c;
  return [];
}

/* --- Los cuatro mensajes agente -> cliente --- */

export type MensajeCrearSuperficie = {
  version: typeof VERSION_A2UI;
  createSurface: { surfaceId: string; catalogId: string };
};
export type MensajeActualizarComponentes = {
  version: typeof VERSION_A2UI;
  updateComponents: { surfaceId: string; components: Componente[] };
};
export type MensajeActualizarDatos = {
  version: typeof VERSION_A2UI;
  updateDataModel: { surfaceId: string; path: string; value: Valor };
};
export type MensajeBorrarSuperficie = {
  version: typeof VERSION_A2UI;
  deleteSurface: { surfaceId: string };
};

export type MensajeA2UI =
  | MensajeCrearSuperficie
  | MensajeActualizarComponentes
  | MensajeActualizarDatos
  | MensajeBorrarSuperficie;

/* --- El mensaje cliente -> agente --- */

export type Accion = {
  name: string;
  surfaceId: string;
  sourceComponentId: string;
  timestamp: string;
  context: Record<string, unknown>;
};

/* --- El estado que mantiene el renderer --- */

export type EstadoSuperficie = {
  id: string;
  catalogId: string;
  /** lista plana, por id */
  componentes: Map<string, Componente>;
  /** el componente que nadie tiene como hijo */
  raiz?: string;
  dataModel: Record<string, unknown>;
};

export type Estado = Map<string, EstadoSuperficie>;

export function estadoVacio(): Estado {
  return new Map();
}
