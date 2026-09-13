import type { MensajeA2UI } from "@maya/a2ui";
import type { Auditoria } from "./auditar";
import type { CierreDeWidget, EventoDeTurno } from "./turno";

/**
 * Una linea del stream de `POST /api/inicio/widget`. Vive aqui y no en la ruta porque la
 * lee el cliente (`components/inicio/usar-widgets-vivos.ts`) y una ruta de Next solo
 * deberia exportar sus handlers.
 */
export type LineaDeWidget =
  | EventoDeTurno
  | { tipo: "a2ui"; mensaje: MensajeA2UI }
  | {
      tipo: "fin";
      cierre: CierreDeWidget;
      widgetId?: string;
      texto: string;
      razon: string;
      sugerencias: string[];
      tools: string[];
      ms: number;
      modelo: string;
      auditoria: Pick<Auditoria, "revisados" | "diferencias" | "datosCambiaron" | "ms"> | null;
      guardada: boolean;
      /** La tool y los parametros con que se lleno la tarjeta, para la linea de procedencia. */
      procedencia?: { tool: string; fuente: string; parametros: Record<string, unknown>; en: string };
    }
  | { tipo: "error"; mensaje: string };

/**
 * El motivo de un turno fallido, dicho para quien usa la app. El detalle (errores de schema,
 * de la tool, del proveedor) es para el log y la transparencia, no para la barra de Inicio.
 */
export function paraLaPersona(motivo: string): string {
  if (/se corto|timeout/i.test(motivo)) return "Maya tardó más de lo normal en responder. Inténtalo de nuevo.";
  if (/no esta en tu Inicio/.test(motivo)) return "Esa tarjeta ya no está en tu Inicio.";
  if (/no pude cambiar la tarjeta|no cerro el turno/.test(motivo)) {
    return "No encontré cómo cambiar la tarjeta con eso. Prueba decirlo de otra forma.";
  }
  return "Algo falló al consultar tus datos. Inténtalo de nuevo.";
}
