import { z } from "zod";
import { Centavos, IdUsuario } from "../comunes.js";

/**
 * `consultar_perfil` — lectura. La plantilla de la que salen las demas:
 * entrada minima, salida con lo que el agente necesita para DECIDIR la interfaz.
 * Dueno del dato: rol `mcp` (tabla `banorte.usuarios`).
 */
export const EntradaConsultarPerfil = z.object({
  usuarioId: IdUsuario,
});
export type EntradaConsultarPerfil = z.infer<typeof EntradaConsultarPerfil>;

export const SalidaConsultarPerfil = z.object({
  id: IdUsuario,
  nombre: z.string(),
  edad: z.number().int(),
  ocupacion: z.string(),
  ingresoMensualCentavos: Centavos,
  ciudad: z.string(),
  segmento: z.enum(["nomina", "patrimonial", "pyme"]),
});
export type SalidaConsultarPerfil = z.infer<typeof SalidaConsultarPerfil>;
