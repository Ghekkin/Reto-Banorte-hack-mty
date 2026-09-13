import { tool, type Tool } from "ai";
import { z } from "zod";
import { detalleDeComponentes } from "./prompt";

/**
 * `ver_componentes`: el detalle del catalogo bajo demanda.
 *
 * Con `FEATURE_AGENTE_LIGERO` el system prompt solo trae el MENU del catalogo (para que
 * sirve cada componente y como se llaman sus props). Para armar la pantalla, el modelo pide
 * aqui las props exactas y un ejemplo real de las 1-3 tarjetas que eligio, en el mismo paso
 * que sus tools de datos. Es una tool del host, no del MCP: no toca datos de nadie.
 */
export const VER_COMPONENTES = "ver_componentes";

export const entradaVerComponentes = z.object({
  nombres: z
    .array(z.string())
    .min(1)
    .max(6)
    .describe('Los componentes del catalogo que vas a pintar, con su nombre exacto: ["PlanDePago", "ResumenTarjeta"]'),
});

export function herramientaVerComponentes(): Tool {
  return tool({
    description:
      "Props exactas y un ejemplo real de los componentes del catalogo que vas a usar. Llamala ANTES de " +
      "`pintar_pantalla`, en el mismo paso que tus tools de datos, solo con las tarjetas que elegiste " +
      "(`Conclusion` ya la tienes completa).",
    inputSchema: entradaVerComponentes,
    execute: ({ nombres }: z.infer<typeof entradaVerComponentes>) => detalleDeComponentes(nombres),
  });
}

/**
 * Las tools de mutacion que el modelo no necesita ver: toda accion que cambia estado entra
 * por `ejecutar_decision`, que las despacha del lado del MCP y devuelve la lectura posterior.
 * Son ~1,200 tokens de definiciones en cada peticion.
 */
export const MUTACIONES_DIRECTAS = [
  "aplicar_plan_pago",
  "crear_apartado",
  "cancelar_suscripcion",
  "crear_tope_gasto",
  "rebalancear_portafolio",
] as const;
