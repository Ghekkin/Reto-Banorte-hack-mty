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
  aportacionCentavos: Centavos.describe(
    "La aportacion inicial del slider (la sugerida por proyectar_ahorro). TIENE que caer entre " +
      "`aportacionMinimaCentavos` y `aportacionMaximaCentavos`: fuera de ahi es un valor que el " +
      "propio slider no puede representar",
  ),
  aportacionMinimaCentavos: Centavos.default(50000).describe("Piso del slider"),
  aportacionMaximaCentavos: Centavos.describe("Tope del slider: la capacidad mensual de la persona"),
  frecuencia: Frecuencia.default("mensual"),
  fechaInicio: z.string().optional().describe("AAAA-MM-DD desde donde se cuenta; default: hoy"),
  etiquetaBoton: z.string().default("Crear apartado"),
  heroe: Heroe,
})
  // Las tres props se validan JUNTAS porque por separado las tres son validas: el error
  // esta en la relacion. El 2026-09-12 salio a pantalla una aportacion de $477 con piso de
  // $500 y tope de $6,629, y nada lo noto. El componente ademas acota, asi que la pantalla
  // no se rompe; esto existe para que el modelo se entere.
  .refine((p) => p.aportacionMinimaCentavos < p.aportacionMaximaCentavos, {
    message: "`aportacionMinimaCentavos` tiene que ser menor que `aportacionMaximaCentavos`",
  })
  .refine(
    (p) =>
      p.aportacionCentavos >= p.aportacionMinimaCentavos && p.aportacionCentavos <= p.aportacionMaximaCentavos,
    {
      message:
        "`aportacionCentavos` cae fuera del rango del slider: tiene que estar entre " +
        "`aportacionMinimaCentavos` y `aportacionMaximaCentavos`",
    },
  );

export type PropsSimuladorMeta = z.infer<typeof schemaSimuladorMeta>;

export const entradaSimuladorMeta = {
  nombre: "SimuladorMeta",
  cuandoUsarlo:
    "La persona no tiene deuda de TARJETA (o ya la resolvio) y le sobra dinero al mes: ya llamaste proyectar_ahorro. Puede tener un credito a plazo al corriente; en ese caso va junto a ProyeccionPagoCredito, no en su lugar. Deja que mueva la aportacion y vea cuando llega; el boton dispara crear_apartado con { nombre, montoObjetivoCentavos, aportacionCentavos, frecuencia }.",
  schema: schemaSimuladorMeta,
  acciones: ["crear_apartado"],
};
