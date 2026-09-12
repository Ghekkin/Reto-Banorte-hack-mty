import { z } from "zod";
import { Centavos, Frecuencia, Heroe, PropsBase } from "../comunes";

/**
 * `MetaActiva` — un apartado que ya existe: cuanto lleva, cuanto falta y cuando cae el
 * siguiente cargo. Sale de `crear_apartado.meta` o de `proyectar_ahorro` con una meta.
 */
export const schemaMetaActiva = PropsBase.extend({
  heroe: Heroe,
  nombre: z.string().describe("'Fondo de emergencia'"),
  metaCentavos: Centavos.describe("El objetivo"),
  acumuladoCentavos: Centavos.describe("Lo que lleva"),
  aportacionCentavos: Centavos.optional().describe("Cuanto se aparta cada periodo"),
  frecuencia: Frecuencia.optional(),
  proximoCargoFecha: z.string().optional().describe("AAAA-MM-DD del siguiente apartado automatico"),
  fechaObjetivo: z.string().optional().describe("AAAA-MM-DD estimada para llegar"),
});

export type PropsMetaActiva = z.infer<typeof schemaMetaActiva>;

export const entradaMetaActiva = {
  nombre: "MetaActiva",
  cuandoUsarlo:
    "Ya existe un apartado (acabas de llamar crear_apartado, o la persona pregunta como va su meta): el avance, la aportacion y cuando cae el siguiente cargo. Si acabas de crearlo, va junto a la Confirmacion.",
  schema: schemaMetaActiva,
  acciones: [] as string[],
};
