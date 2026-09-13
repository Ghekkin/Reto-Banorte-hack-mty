import { z } from "zod";
import { tool, type Tool } from "ai";
import type { MensajeA2UI } from "@maya/a2ui";
import { armarMensajes, MAX_INTENTOS_DE_PANTALLA, TOPE_DE_TARJETAS } from "@/lib/agente/pantalla";
import {
  armarConclusion,
  armarWidget,
  pedidoDeConclusion,
  pedidoDeWidget,
  raizDe,
  referenciasDe,
  type PedidoDeWidget,
  type Procedencias,
  type ReferenciaDeDato,
  type WidgetArmado,
} from "./armar";
import { listarCifras, quitarOracionesSinRespaldo, verificarCifras, type Cifra } from "./cifras";
import type { Consultor } from "./consultor";

/**
 * `pintar_widgets`: la portada de Inicio armada por fuentes.
 *
 * Es el reemplazo de `pintar_pantalla` en Inicio cuando `FEATURE_WIDGETS_VIVOS=1`. La
 * diferencia no es de forma —salen los mismos tres mensajes A2UI, validados por el mismo
 * `armarMensajes`—, es de **quien escribe los numeros**: aqui el modelo elige tarjetas,
 * fuentes y parametros, y cada cifra de cada tarjeta la pone un adaptador con lo que
 * devolvio el MCP. Las cifras de la `Conclusion` van por referencia a una tarjeta, y los
 * numeros que el modelo escriba en prosa pasan por el verificador.
 */

export const entradaPintarWidgets = z.object({
  razon: z.string().min(10).describe("Una frase en segunda persona: por que ESTA portada, con el dato que la justifica"),
  texto: z.string().min(1).describe("Una frase corta; el veredicto va en la conclusion"),
  conclusion: pedidoDeConclusion,
  widgets: z
    .array(pedidoDeWidget)
    .min(1)
    .max(TOPE_DE_TARJETAS - 1)
    .describe(`Las tarjetas debajo de la conclusion, en orden de urgencia. De 1 a ${TOPE_DE_TARJETAS - 1}`),
});
export type EntradaPintarWidgets = z.infer<typeof entradaPintarWidgets>;

export type PantallaDeWidgets = {
  mensajes: MensajeA2UI[];
  procedencias: Procedencias;
  referencias: ReferenciaDeDato[];
  texto: string;
  razon: string;
  sugerencias: string[];
  /** Cifras que el verificador quito del texto en el ultimo intento. Vacio casi siempre. */
  cifrasQuitadas: string[];
};

export type Armado<T> = ({ ok: true } & T) | { ok: false; errores: string[] };

export async function armarPantallaDeWidgets(
  entrada: EntradaPintarWidgets,
  consultor: Consultor,
  opciones: { ultimoIntento?: boolean; extras?: string[] } = {},
): Promise<Armado<PantallaDeWidgets>> {
  const errores: string[] = [];

  const ids = entrada.widgets.map((w) => w.id);
  const repetidos = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (repetidos.length) errores.push(`ids repetidos: ${[...new Set(repetidos)].join(", ")}`);
  const heroes = entrada.widgets.filter((w) => w.heroe).map((w) => w.id);
  if (heroes.length > 1) errores.push(`solo una tarjeta lleva heroe: true; la llevan ${heroes.join(", ")}`);
  if (errores.length) return { ok: false, errores };

  const armados = await Promise.all(entrada.widgets.map((w) => armarWidget(w, consultor)));
  const widgets = new Map<string, WidgetArmado>();
  for (const armado of armados) {
    if (armado.ok) widgets.set(armado.componente.id, armado);
    else errores.push(...armado.errores);
  }
  if (errores.length) return { ok: false, errores };

  const conclusion = armarConclusion(entrada.conclusion, widgets, entrada.razon);
  if (!conclusion.ok) return { ok: false, errores: conclusion.errores };

  // El texto se verifica contra TODO lo que el MCP devolvio en el turno, no solo contra lo
  // que quedo en las tarjetas: "tu ingreso es de $32,000" es cierto aunque ninguna tarjeta
  // lo pinte.
  const datos = [...consultor.consultas().map((c) => c.resultado), ...[...widgets.values()].map((w) => w.datos)];
  const textos = { titular: entrada.conclusion.titular, detalle: entrada.conclusion.detalle, texto: entrada.texto };
  const verificacion = verificarCifras(Object.values(textos), datos, opciones.extras);
  let cifrasQuitadas: Cifra[] = [];
  if (!verificacion.ok) {
    if (!opciones.ultimoIntento) {
      return {
        ok: false,
        errores: [
          `estas cifras de tu texto no salen de ningun dato del MCP: ${listarCifras(verificacion.noRespaldadas)}. ` +
            "Escribe solo cifras que esten tal cual en los datos (mismo monto, mismo redondeo), o quitalas; " +
            "para mostrar una cifra usa `conclusion.datos` con la tarjeta y el campo.",
        ],
      };
    }
    cifrasQuitadas = verificacion.noRespaldadas;
  }

  const componenteConclusion = { ...conclusion.componente };
  let texto = entrada.texto;
  if (cifrasQuitadas.length) {
    const detalle = quitarOracionesSinRespaldo(entrada.conclusion.detalle, cifrasQuitadas);
    const titular = quitarOracionesSinRespaldo(entrada.conclusion.titular, cifrasQuitadas);
    componenteConclusion.titular = titular ?? "Esto es lo que muestran tus datos de hoy.";
    if (detalle) componenteConclusion.detalle = detalle;
    else delete componenteConclusion.detalle;
    texto = quitarOracionesSinRespaldo(entrada.texto, cifrasQuitadas) ?? componenteConclusion.titular as string;
    console.warn(JSON.stringify({ widgets: "cifras-quitadas", cifras: cifrasQuitadas.map((c) => c.crudo) }));
  }

  const componentes = [raizDe(ids), componenteConclusion, ...ids.map((id) => widgets.get(id)!.componente)];
  const armado = armarMensajes({
    razon: entrada.razon,
    texto,
    componentesJson: JSON.stringify(componentes),
  });
  if (!armado.ok) return { ok: false, errores: armado.errores };

  return {
    ok: true,
    mensajes: armado.mensajes,
    procedencias: Object.fromEntries([...widgets.values()].map((w) => [w.componente.id, w.procedencia])),
    referencias: referenciasDe(entrada.conclusion),
    texto,
    razon: entrada.razon,
    sugerencias: entrada.conclusion.sugerencias?.slice(0, 3) ?? [],
    cifrasQuitadas: cifrasQuitadas.map((c) => c.crudo),
  };
}

export type CierreDePortada = {
  herramientas: Record<string, Tool>;
  resultado: () => PantallaDeWidgets | undefined;
  cerrado: () => boolean;
  intentosFallidos: () => number;
};

/** La tool de cierre de la portada, con sus reintentos contados. */
/**
 * Deja la portada con EXACTAMENTE las fuentes que decidio el codigo para esta cuenta
 * (`lib/inicio/widgets-por-cuenta.ts`), en ese orden y con la primera de heroe.
 *
 * Lo que el modelo mando para esas fuentes (id, parametros, variantes, razon) se respeta; una
 * fuente que no pidio se agrega con el id por defecto; una que pidio y no toca, se quita. Y las
 * cifras de la conclusion que citaban una tarjeta quitada se descartan, en vez de rechazar la
 * portada entera: es la misma causa del issue #34 (la conclusion cita `salud` sin pintarla).
 */
export function forzarFuentes(
  entrada: EntradaPintarWidgets,
  eleccion: { fuentes: readonly string[]; ids: readonly string[] },
): EntradaPintarWidgets {
  const widgets = eleccion.fuentes.map((fuente, i) => {
    const delModelo = entrada.widgets.find((w) => w.fuente === fuente);
    const base = delModelo ?? { id: eleccion.ids[i] ?? fuente, fuente: fuente as PedidoDeWidget["fuente"], razon: entrada.razon };
    return { ...base, heroe: i === 0 };
  });
  const ids = new Set(widgets.map((w) => w.id));
  const citaPorFuente = new Map(entrada.widgets.map((w) => [w.id, widgets.find((x) => x.fuente === w.fuente)?.id]));
  const datos = entrada.conclusion.datos
    ?.map((d) => (ids.has(d.widget) ? d : citaPorFuente.get(d.widget) ? { ...d, widget: citaPorFuente.get(d.widget)! } : undefined))
    .filter((d): d is NonNullable<typeof d> => d !== undefined);
  return { ...entrada, widgets, conclusion: { ...entrada.conclusion, ...(datos ? { datos } : {}) } };
}

export function crearCierreDePortada(
  consultor: Consultor,
  extras: string[] = [],
  eleccion?: { fuentes: readonly string[]; ids: readonly string[] },
): CierreDePortada {
  let resultado: PantallaDeWidgets | undefined;
  let fallidos = 0;

  const herramientas: Record<string, Tool> = {
    pintar_widgets: tool({
      description:
        "Entrega la portada: la conclusion y las tarjetas, cada una con su FUENTE de datos. El servidor consulta " +
        "el MCP y llena las cifras de cada tarjeta; tu no escribes ningun monto. Si algo viene mal, te devuelvo " +
        "los errores y la vuelves a llamar corregida.",
      inputSchema: entradaPintarWidgets,
      execute: async (pedida: EntradaPintarWidgets) => {
        const entrada = eleccion ? forzarFuentes(pedida, eleccion) : pedida;
        const armado = await armarPantallaDeWidgets(entrada, consultor, {
          ultimoIntento: fallidos >= MAX_INTENTOS_DE_PANTALLA - 1,
          extras,
        });
        if (!armado.ok) {
          fallidos++;
          return { ok: false, errores: armado.errores };
        }
        resultado = armado;
        return { ok: true, tarjetas: Object.keys(armado.procedencias).length + 1 };
      },
    }),
  };

  return {
    herramientas,
    resultado: () => resultado,
    cerrado: () => resultado !== undefined,
    intentosFallidos: () => fallidos,
  };
}
