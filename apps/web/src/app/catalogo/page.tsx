import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { MensajeA2UI } from "@maya/a2ui";
import { NOMBRES_DE_LAYOUT } from "@maya/a2ui";
import { CATALOGO } from "@maya/catalogo";
import { Galeria, type ComponenteDeGaleria } from "./galeria";

/**
 * `/catalogo` — la galeria del catalogo A2UI: los componentes que el agente puede
 * invocar, pintados con el renderer de verdad a partir de sus ejemplos `.jsonl`.
 *
 * Existe por dos razones, y las dos importan:
 *
 *  1. **Para el equipo**: es el banco de pruebas de los componentes. Se ven todos, con
 *     datos y en estado de carga, sin llave de modelo y sin MCP arriba. Si uno se rompe,
 *     se ve aqui antes que en la demo.
 *  2. **Para un juez**: al lado de `/catalogo/v1.json` (el catalogo legible por maquina,
 *     el `catalogId` de cada superficie) esta la misma cosa en pantalla. "Estos son
 *     nuestros componentes propios" deja de ser una afirmacion.
 *
 * NO es el producto: vive fuera del grupo de rutas `(app)`, asi que no lleva el shell ni
 * la navegacion. El producto es `/maya`.
 *
 * Server component a proposito: lee los `.jsonl` del disco (los mismos que validan las
 * pruebas del catalogo y que van al prompt del agente) y le pasa los mensajes ya
 * parseados al cliente, que es quien tiene el renderer.
 */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Catálogo A2UI — Maya",
  description: "Los componentes que el agente puede invocar, pintados con el renderer real.",
};

/** `PlanDePago` -> `plan-de-pago`, la convencion de nombres de archivo del repo. */
function kebab(nombre: string): string {
  return nombre.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

function carpetaDeEjemplos(): string {
  return join(process.cwd(), "..", "..", "packages", "catalogo", "ejemplos");
}

function leerEjemplo(nombre: string): { mensajes: MensajeA2UI[]; fuente: string } | undefined {
  const carpeta = carpetaDeEjemplos();
  const archivo = `${kebab(nombre)}.jsonl`;
  try {
    if (!readdirSync(carpeta).includes(archivo)) return undefined;
    const fuente = readFileSync(join(carpeta, archivo), "utf8");
    const mensajes = fuente
      .split("\n")
      .filter((l) => l.trim() !== "")
      .map((l) => JSON.parse(l) as MensajeA2UI);
    return { mensajes, fuente };
  } catch {
    return undefined;
  }
}

/** Las props del schema, en la forma que el modelo las lee (y que un juez puede revisar). */
function propsDelSchema(schema: z.ZodTypeAny): Array<{ nombre: string; tipo: string; requerida: boolean; descripcion?: string }> {
  const json = z.toJSONSchema(schema, { io: "input" }) as {
    properties?: Record<string, { type?: string; enum?: unknown[]; description?: string }>;
    required?: string[];
  };
  const requeridas = new Set(json.required ?? []);
  return Object.entries(json.properties ?? {}).map(([nombre, def]) => ({
    nombre,
    tipo: def.enum ? def.enum.map((v) => JSON.stringify(v)).join(" | ") : (def.type ?? "any"),
    requerida: requeridas.has(nombre),
    descripcion: def.description,
  }));
}

export default function PaginaCatalogo() {
  const componentes: ComponenteDeGaleria[] = CATALOGO.map((entrada) => {
    const ejemplo = leerEjemplo(entrada.nombre);
    return {
      nombre: entrada.nombre,
      cuandoUsarlo: entrada.cuandoUsarlo,
      acciones: entrada.acciones ?? [],
      props: propsDelSchema(entrada.schema),
      mensajes: ejemplo?.mensajes ?? [],
      fuente: ejemplo?.fuente ?? "",
    };
  });

  return <Galeria componentes={componentes} layout={[...NOMBRES_DE_LAYOUT]} urlCatalogo="/catalogo/v1.json" />;
}
