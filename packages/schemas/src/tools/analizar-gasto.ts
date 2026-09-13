import { z } from "zod";
import { Centavos, IdUsuario } from "../comunes.js";
import { SalidaCompararPeriodos } from "./comparar-periodos.js";
import { SalidaDetectarFugas } from "./detectar-fugas.js";

/**
 * `analizar_gasto` — LECTURA COMPUESTA (O4, `docs/arquitectura/orquestadores.md`).
 * El viaje de gasto de Ana en una sola llamada: junta `comparar_periodos` (categoria
 * por categoria, la atipica) y `detectar_fugas` (suscripciones y recurrentes sin
 * registrar), y agrega el estatus en vivo de los topes de gasto que la persona ya
 * tenga fijados.
 *
 * No inventa un numero nuevo: `gasto` y `fugas` son identicos a lo que devuelven sus
 * tools especializadas (mismo contrato que `panorama_inicial`). Lo unico que agrega es
 * `patronGasto`, una clasificacion sobre umbrales fijos para que el modelo no tenga
 * que leer las dos respuestas y decidir el mismo diagnostico cada vez.
 */
export const EntradaAnalizarGasto = z.object({
  usuarioId: IdUsuario,
  periodo: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "usa AAAA-MM")
    .optional()
    .describe("Mes a analizar (AAAA-MM). Default: el ultimo mes cerrado"),
});
export type EntradaAnalizarGasto = z.infer<typeof EntradaAnalizarGasto>;

export const PatronGasto = z.enum(["tope_excedido", "fuga_detectada", "gasto_atipico", "gasto_estable"]);
export type PatronGasto = z.infer<typeof PatronGasto>;

export const SalidaAnalizarGasto = z.object({
  gasto: SalidaCompararPeriodos,
  fugas: SalidaDetectarFugas,
  topesExcedidos: z.array(
    z.object({
      categoriaId: z.string(),
      categoria: z.string(),
      montoLimiteCentavos: Centavos,
      gastadoActualCentavos: Centavos,
      pctUsado: z.number(),
    }),
  ),
  patronGasto: PatronGasto,
  porQue: z.string().describe("El dato concreto que produjo `patronGasto`, para la linea '¿Por que veo esto?'"),
});
export type SalidaAnalizarGasto = z.infer<typeof SalidaAnalizarGasto>;
