import { z } from "zod";
import { Ancho, Centavos, Heroe, PropsBase } from "../comunes";

/**
 * `RendimientoHistorico` — Muestra el comportamiento histórico de precios y rendimiento
 * de un instrumento o fondo de inversión en el tiempo (semanal / mensual).
 * Sale de `consultar_historico_inversion`.
 */
export const PuntoHistorico = z.object({
  fecha: z.string().describe("Fecha del punto histórico en formato ISO (AAAA-MM-DD)"),
  precioCentavos: Centavos.describe("Precio o valor liquidativo en centavos en esa fecha"),
  variacionPct: z.number().optional().describe("Variación respecto al punto previo como fracción (ej. 0.012 = +1.2%)"),
});

export const schemaRendimientoHistorico = PropsBase.extend({
  ancho: Ancho.default("amplio"),
  heroe: Heroe,
  instrumentoId: z.string().describe("Identificador único del instrumento (ej: inst_cetes_28)"),
  nombre: z.string().describe("Nombre descriptivo del fondo o instrumento"),
  clave: z.string().describe("Clave de pizarra o símbolo (ej: CETES28, BNTR-RV)"),
  tipo: z.string().describe("Tipo de activo: 'Deuda gubernamental', 'Renta variable', etc."),
  periodo: z.string().describe("Etiqueta del horizonte temporal (ej. 'Últimas 12 semanas')"),
  precioInicialCentavos: Centavos.describe("Precio al inicio del periodo evaluado"),
  precioFinalCentavos: Centavos.describe("Precio o valor liquidativo al cierre del periodo"),
  rendimientoPeriodoPct: z.number().describe("Rendimiento acumulado en el periodo como fracción (ej: 0.114 = +11.4%)"),
  puntos: z.array(PuntoHistorico).min(2).describe("Serie cronológica de puntos de precio"),
});

export type PropsRendimientoHistorico = z.infer<typeof schemaRendimientoHistorico>;

export const entradaRendimientoHistorico = {
  nombre: "RendimientoHistorico",
  cuandoUsarlo:
    "La persona pregunta cómo le ha ido a un instrumento específico, cuánto ha ganado CETES o una acción en las últimas semanas. Ya llamaste a consultar_historico_inversion: pasa los puntos de precio y el rendimiento acumulado. Tocar la acción emite ver_detalle_instrumento.",
  schema: schemaRendimientoHistorico,
  acciones: ["ver_detalle_instrumento"],
};
