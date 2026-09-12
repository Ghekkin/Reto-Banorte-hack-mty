import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { CATALOGO } from "../src/index";

/**
 * Genera `catalogo.json` desde los schemas: la fuente unica del catalogo.
 *
 * Lo consumen dos:
 *  - el agente, para su structured output (no puede inventar componentes);
 *  - `apps/web`, que lo sirve en `/catalogo/v1.json` — el `catalogId` de cada
 *    `createSurface`. Un juez puede abrir esa URL (ADR 0008, punto 4).
 *
 * Se corre con `pnpm --filter @maya/catalogo generar` y NO se edita a mano.
 */
const catalogo = {
  version: "v1",
  a2uiVersion: "v0.9.1",
  nombre: "Catalogo Maya — componentes financieros",
  generadoPor: "pnpm --filter @maya/catalogo generar",
  componentes: CATALOGO.map((entrada) => ({
    nombre: entrada.nombre,
    cuandoUsarlo: entrada.cuandoUsarlo,
    acciones: entrada.acciones ?? [],
    props: z.toJSONSchema(entrada.schema, { io: "input" }),
  })),
};

const destino = resolve(import.meta.dirname, "../catalogo.json");
writeFileSync(destino, JSON.stringify(catalogo, null, 2) + "\n");
console.log(`catalogo.json con ${catalogo.componentes.length} componente(s) -> ${destino}`);
