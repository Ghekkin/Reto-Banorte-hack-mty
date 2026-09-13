import { z } from "zod";
import { Ancho, Centavos, Heroe, PropsBase } from "../comunes";

/**
 * `AlertaFugas` — Detecta cargos recurrentes y suscripciones sin uso reciente
 * ("fugas de dinero"), cuantifica el ahorro anual y permite su cancelación con 1 clic.
 * Procede de `detectar_fugas` y activa `cancelar_suscripcion`.
 */
export const ElementoFuga = z.object({
  id: z.string().describe("ID de la suscripción (ej. 'sus_ana_gym')"),
  concepto: z.string().describe("Nombre del servicio o membresía"),
  comercio: z.string().describe("Comercio que emite el cargo"),
  montoCentavos: Centavos.describe("Costo por periodo de facturación"),
  sinUsoReciente: z.boolean().describe("true si lleva más de 2 meses sin actividad registrada"),
  periodicidad: z.string().describe("mensual | anual | bimestral"),
  mesesSinUso: z.number().int().optional().describe("Meses transcurridos sin uso"),
});

export const schemaAlertaFugas = PropsBase.extend({
  ancho: Ancho.default("amplio"),
  heroe: Heroe,
  totalMensualCentavos: Centavos.describe("Gasto total mensual en suscripciones detectadas"),
  totalAnualCentavos: Centavos.describe("Impacto anual total en el bolsillo"),
  pctDelIngreso: z.number().describe("Porcentaje del ingreso mensual que representan"),
  fugas: z.array(ElementoFuga).min(1).describe("Lista de servicios y cargos recurrentes analizados"),
});

export type PropsAlertaFugas = z.infer<typeof schemaAlertaFugas>;

export const entradaAlertaFugas = {
  nombre: "AlertaFugas",
  cuandoUsarlo:
    "La persona pregunta '¿En qué estoy gastando de más?', '¿Tengo cargos fantasma?' o el agente detecta membresías sin uso para recortar gasto. Dispara cancelar_suscripcion.",
  schema: schemaAlertaFugas,
  acciones: ["cancelar_suscripcion"],
};
