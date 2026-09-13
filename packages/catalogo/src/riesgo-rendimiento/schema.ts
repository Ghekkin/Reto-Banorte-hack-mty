import { z } from "zod";
import { Ancho, Centavos, Heroe, PropsBase } from "../comunes";

/**
 * `RiesgoRendimiento` — Matriz comparativa de opciones de inversión ubicadas por su
 * relación riesgo vs. rendimiento anual esperado, destacando la mejor opción según el perfil.
 * Proviene de `consultar_catalogo_inversiones`.
 */
export const InstrumentoRiesgoRendimiento = z.object({
  id: z.string().describe("ID del instrumento en Banorte (ej. 'inst_cetes_28', 'inst_pagare_91')"),
  clave: z.string().describe("Clave de pizarra (ej. 'CETES28', 'PAGARE91', 'NTREFE')"),
  nombre: z.string().describe("Nombre comercial del producto"),
  tipo: z.string().describe("Tipo de instrumento (ej. 'Deuda gubernamental', 'Pagaré bancario', 'Renta variable')"),
  riesgo: z.number().int().min(1).max(5).describe("Nivel de riesgo del 1 (muy conservador) al 5 (agresivo)"),
  rendimientoAnualEsperado: z.number().describe("Rendimiento anual estimado como fracción (ej. 0.11 = 11.0%)"),
  volatilidadAnual: z.number().optional().describe("Desviación estándar anualizada (volatilidad estimada)"),
  recomendado: z.boolean().default(false).describe("true si se ajusta óptimamente al perfil del inversionista"),
});

export const schemaRiesgoRendimiento = PropsBase.extend({
  ancho: Ancho.default("amplio"),
  heroe: Heroe,
  perfilInversionista: z.string().describe("Perfil del cliente: 'Conservador', 'Moderado' o 'Crecimiento'"),
  toleranciaRiesgoMax: z.number().int().min(1).max(5).describe("Nivel máximo de riesgo recomendado para su perfil"),
  montoReferenciaCentavos: Centavos.describe("Monto base de inversión para comparar ganancias estimadas"),
  instrumentos: z.array(InstrumentoRiesgoRendimiento).min(2).describe("Lista de instrumentos a contrastar"),
  instrumentoSeleccionadoId: z.string().optional().describe("ID del instrumento seleccionado por defecto"),
});

export type PropsRiesgoRendimiento = z.infer<typeof schemaRiesgoRendimiento>;

export const entradaRiesgoRendimiento = {
  nombre: "RiesgoRendimiento",
  cuandoUsarlo:
    "La persona busca alternativas de inversión y quiere comparar el rendimiento que obtendría asumiendo más o menos riesgo. Ordena los productos de menor a mayor riesgo. Dispara elegir_instrumento.",
  schema: schemaRiesgoRendimiento,
  acciones: ["elegir_instrumento"],
};
