import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { refrescarAcciones } from "../datos/estado.js";

/**
 * Como se registra una tool en este repo. Dos clases y las dos cuentan para el
 * reto: **lectura** (devuelve datos) y **accion** (muta el estado sintetico).
 * Detalle y checklist: skill `tool-mcp`.
 *
 * Una tool nunca lanza: devuelve un error de tool para que el agente pueda
 * contarlo en pantalla en vez de romper el turno.
 */
export type ClaseDeTool = "lectura" | "accion";

export type DefinicionDeTool<E extends ZodRawShape = ZodRawShape> = {
  nombre: string;
  titulo: string;
  /** Escrita PARA EL MODELO: que hace y cuando usarla. */
  descripcion: string;
  clase: ClaseDeTool;
  entrada: E;
  manejar: (argumentos: Record<string, unknown>) => Promise<unknown> | unknown;
};

export function registrarTool(server: McpServer, tool: DefinicionDeTool): void {
  server.registerTool(
    tool.nombre,
    {
      title: tool.titulo,
      description: tool.descripcion,
      inputSchema: tool.entrada,
      annotations: {
        readOnlyHint: tool.clase === "lectura",
        // Nada se borra: una accion agrega una fila al estado y es reversible
        // con `reiniciar-estado`.
        destructiveHint: false,
        idempotentHint: tool.clase === "accion",
        openWorldHint: false,
      },
    },
    (async (argumentos: Record<string, unknown>) => {
      const inicio = Date.now();
      try {
        // Las acciones se releen aqui, no en cada consulta del dominio: `pnpm
        // reiniciar-estado` corre en otro proceso y el servidor tiene que enterarse
        // sin reiniciarse (si no, un ensayo arranca con el plan de la corrida anterior).
        await refrescarAcciones();
        const resultado = await tool.manejar(argumentos ?? {});
        console.log(JSON.stringify({ tool: tool.nombre, clase: tool.clase, ms: Date.now() - inicio, ok: true }));
        return { content: [{ type: "text" as const, text: JSON.stringify(resultado) }] };
      } catch (error) {
        const motivo = error instanceof Error ? error.message : String(error);
        console.warn(JSON.stringify({ tool: tool.nombre, ms: Date.now() - inicio, ok: false, motivo }));
        return {
          isError: true,
          content: [{ type: "text" as const, text: `La tool ${tool.nombre} fallo: ${motivo}` }],
        };
      }
    }) as never,
  );
}
