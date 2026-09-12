import { z } from "zod";
import { IdUsuario } from "../comunes.js";
import { SalidaConsultarInversiones } from "./consultar-inversiones.js";
import { SalidaProyectarAhorro } from "./proyectar-ahorro.js";

/**
 * `analizar_ahorro` — LECTURA COMPUESTA (O4, `docs/arquitectura/orquestadores.md`).
 * El viaje de ahorro/patrimonio de Ana y Carmen en una sola llamada: junta
 * `proyectar_ahorro` (la meta activa, o `null` si no tiene una) y
 * `consultar_inversiones` (perfil y portafolio, `tienePortafolio: false` para quien no
 * invierte). Igual que `panorama_inicial`, no inventa numeros: cada campo es identico
 * al de su tool especializada.
 */
export const EntradaAnalizarAhorro = z.object({
  usuarioId: IdUsuario,
});
export type EntradaAnalizarAhorro = z.infer<typeof EntradaAnalizarAhorro>;

export const EstadoAhorro = z.enum([
  "portafolio_desviado",
  "sin_meta_activa",
  "sin_margen",
  "meta_cerca",
  "meta_en_curso",
]);
export type EstadoAhorro = z.infer<typeof EstadoAhorro>;

export const SalidaAnalizarAhorro = z.object({
  ahorro: SalidaProyectarAhorro.nullable().describe("null cuando la persona no tiene una meta activa que proyectar"),
  inversion: SalidaConsultarInversiones,
  estadoAhorro: EstadoAhorro,
  porQue: z.string().describe("El dato concreto que produjo `estadoAhorro`, para la linea '¿Por que veo esto?'"),
});
export type SalidaAnalizarAhorro = z.infer<typeof SalidaAnalizarAhorro>;
