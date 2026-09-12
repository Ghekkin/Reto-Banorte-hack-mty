import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * `GET /catalogo/v1.json` — el `catalogId` que va en cada `createSurface`.
 *
 * Lo consumen el agente (para no inventar componentes) y cualquiera que quiera
 * ver de que esta hecha la interfaz: un juez puede abrir esta URL (ADR 0008).
 * El archivo lo genera `pnpm --filter @maya/catalogo generar`.
 */
export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    const ruta = join(process.cwd(), "..", "..", "packages", "catalogo", "catalogo.json");
    const json = await readFile(ruta, "utf8");
    return new Response(conLaUrlDeVerdad(json), {
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "catalogo.json no existe todavia: corre `pnpm --filter @maya/catalogo generar`" },
      { status: 503 },
    );
  }
}

/**
 * El archivo se genera con la URL de desarrollo (`URL_CATALOGO` no existe al generar en
 * CI), pero lo que un juez abre es la URL publicada: ahi es donde `catalogId` tiene que
 * coincidir con el que el agente manda en cada `createSurface`.
 */
function conLaUrlDeVerdad(json: string): string {
  const url = process.env.URL_CATALOGO;
  if (!url) return json;
  const catalogo = JSON.parse(json) as Record<string, unknown>;
  catalogo.$id = url;
  catalogo.catalogId = url;
  return JSON.stringify(catalogo, null, 2) + "\n";
}
