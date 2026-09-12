import { z } from "zod";
import { Centavos, Frecuencia, Heroe, PropsBase } from "../comunes";

/**
 * `SimuladorMeta` — la respuesta adaptativa para quien no tiene deuda: mueve cuanto
 * aporta y ve cuando llega. El boton APLICA: dispara `crear_apartado` (la segunda
 * accion real de la demo). Los numeros iniciales salen de `proyectar_ahorro`.
 *
 * Acepta `heroe` porque para quien no tiene deuda ES la tarjeta principal: en la pantalla
 * de Ana (la prueba de adaptabilidad) no hay saldo que resumir, hay una meta. El modelo
 * se lo ponia igual —13 componentes del catalogo lo aceptan— y el turno gastaba un paso
 * en reintentar (issue #14).
 */
export const schemaSimuladorMeta = PropsBase.extend({
  nombre: z.string().default("Tu meta").describe("Como se llama la meta: 'Fondo de emergencia'"),
  metaCentavos: Centavos.describe("A cuanto quiere llegar"),
  saldoInicialCentavos: Centavos.default(0).describe("Lo que ya lleva ahorrado para esta meta"),
  aportacionCentavos: Centavos.describe("La aportacion inicial del slider (la sugerida por proyectar_ahorro)"),
  aportacionMinimaCentavos: Centavos.default(50000).describe("Piso del slider"),
  aportacionMaximaCentavos: Centavos.describe("Tope del slider: la capacidad mensual de la persona"),
  frecuencia: Frecuencia.default("mensual"),
  fechaInicio: z.string().optional().describe("AAAA-MM-DD desde donde se cuenta; default: hoy"),
  etiquetaBoton: z.string().default("Crear apartado"),
  heroe: Heroe,
});

export type PropsSimuladorMeta = z.infer<typeof schemaSimuladorMeta>;

export const entradaSimuladorMeta = {
  nombre: "SimuladorMeta",
  cuandoUsarlo:
    "La persona no tiene deuda (o ya la resolvio) y quiere ahorrar: ya llamaste proyectar_ahorro. Deja que mueva la aportacion y vea cuando llega; el boton dispara crear_apartado con { nombre, montoObjetivoCentavos, aportacionCentavos, frecuencia }.",
  schema: schemaSimuladorMeta,
  acciones: ["crear_apartado"],
};
