import { z } from "zod";
import { ID_RAIZ, type Componente } from "@maya/a2ui";
import { CATALOGO } from "@maya/catalogo";
import { revisarProps } from "@/lib/agente/pantalla";
import { formatearMonto, formatearPorcentaje } from "@/lib/dinero";
import type { Consultor } from "./consultor";
import { fuente, fuentesDe, IDS_DE_FUENTES, type DefinicionDeFuente } from "./fuentes";

/**
 * De un pedido del modelo a un componente A2UI con datos del MCP.
 *
 * El pedido dice QUE tarjeta, con que fuente y que parametros; nunca trae cifras. Aqui:
 * se valida la fuente y los parametros, se consulta el MCP por el consultor, el adaptador
 * convierte la salida en props, se agregan las variantes de vista, y el componente
 * completo se valida contra el schema del catalogo. Si algo falla, los errores regresan
 * al modelo como resultado de la tool, igual que en `pintar_pantalla`.
 */

/** De donde salio cada widget. Se guarda con la portada y es lo que audita el auditor. */
export type Procedencia = {
  widgetId: string;
  fuente: string;
  componente: string;
  tool: string;
  parametros: Record<string, unknown>;
  variantes: Record<string, unknown>;
  /** Los argumentos con los que se llamo la tool, `usuarioId` incluido. */
  argumentos: Record<string, unknown>;
  /** sha256 del resultado del MCP. */
  huella: string;
  /** ISO 8601 de la consulta al MCP. */
  en: string;
};

export type Procedencias = Record<string, Procedencia>;

/**
 * Un objeto de parametros o variantes, como TEXTO JSON.
 *
 * No es un objeto nativo por lo medido el 2026-09-13 con los dos Gemini: con
 * `string | record` `gemini-3.8-flash` no contestaba en 30 s y `gemini-3.5-flash-lite`
 * mandaba `{}` (un record no tiene llaves que describirle). Como texto, los dos mandan
 * `"{\"periodo\":\"2026-07\"}"` a la primera. `parsearObjeto` acepta tambien un objeto
 * por si otro proveedor lo manda asi.
 */
export const ObjetoFlexible = z.string();

export const pedidoDeWidget = z.object({
  id: z
    .string()
    .describe('Id corto y estable de la tarjeta, en minusculas: "tarjeta", "gasto", "portafolio"'),
  fuente: z.enum(IDS_DE_FUENTES).describe("De donde salen los datos: una de las fuentes listadas"),
  parametros: ObjetoFlexible.optional().describe(
    'Texto JSON con los parametros de la fuente, p. ej. {"periodo":"2026-07"}. Omitelo si no hacen falta. NUNCA pongas aqui cifras de resultado',
  ),
  variantes: ObjetoFlexible.optional().describe('Texto JSON con las variantes de vista de la fuente, p. ej. {"orden":"variacion"}. Omitelo si no hacen falta'),
  heroe: z.boolean().optional().describe("true en UNA sola tarjeta: la mas urgente"),
  razon: z.string().min(10).describe("Una frase en segunda persona: por que ESTA tarjeta"),
});
export type PedidoDeWidget = z.infer<typeof pedidoDeWidget>;

export type WidgetArmado = {
  componente: Componente;
  procedencia: Procedencia;
  /** Solo las props que puso el adaptador: las cifras del MCP. */
  datos: Record<string, unknown>;
};

export type Resultado<T> = ({ ok: true } & T) | { ok: false; errores: string[] };

const ID_VALIDO = /^[a-z][a-z0-9_-]{1,30}$/;
const IDS_RESERVADOS = new Set([ID_RAIZ, "conclusion"]);

export function parsearObjeto(valor: unknown, campo: string, errores: string[]): Record<string, unknown> {
  if (valor === undefined || valor === null || valor === "") return {};
  let objeto: unknown = valor;
  if (typeof valor === "string") {
    try {
      objeto = JSON.parse(valor) as unknown;
    } catch (error) {
      errores.push(`${campo} no es JSON valido (${error instanceof Error ? error.message : String(error)})`);
      return {};
    }
  }
  if (typeof objeto !== "object" || objeto === null || Array.isArray(objeto)) {
    errores.push(`${campo} tiene que ser un objeto`);
    return {};
  }
  return objeto as Record<string, unknown>;
}

function erroresDeZod(error: z.ZodError, prefijo: string): string[] {
  return error.issues.map((i) => {
    if (i.code === "unrecognized_keys") return `${prefijo}: no acepta ${i.keys.join(", ")}`;
    return `${prefijo}${i.path.length ? "." + i.path.join(".") : ""}: ${i.message}`;
  });
}

/** Si el componente declara `heroe` en su schema. */
function aceptaHeroe(componente: string): boolean {
  const entrada = CATALOGO.find((c) => c.nombre === componente);
  const shape = (entrada?.schema as unknown as { shape?: Record<string, unknown> } | undefined)?.shape;
  return Boolean(shape && "heroe" in shape);
}

/**
 * Arma un widget. `idFijo` es para `modificar_widget`/`reemplazar_widget`: el id ya existe
 * en pantalla y no se valida como nuevo.
 */
export async function armarWidget(
  pedido: {
    id: string;
    fuente: string;
    parametros?: unknown;
    variantes?: unknown;
    heroe?: boolean;
    razon: string;
  },
  consultor: Consultor,
  opciones: { idFijo?: boolean } = {},
): Promise<Resultado<WidgetArmado>> {
  const errores: string[] = [];
  const donde = `widget "${pedido.id}"`;

  if (!opciones.idFijo && (!ID_VALIDO.test(pedido.id) || IDS_RESERVADOS.has(pedido.id))) {
    errores.push(`${donde}: el id tiene que ser corto, en minusculas y no puede ser "root" ni "conclusion"`);
  }
  const definicion = fuente(pedido.fuente);
  if (!definicion) {
    return { ok: false, errores: [`${donde}: no existe la fuente "${pedido.fuente}". Las que hay: ${IDS_DE_FUENTES.join(", ")}`] };
  }

  const crudosParametros = parsearObjeto(pedido.parametros, `${donde}.parametros`, errores);
  const crudasVariantes = parsearObjeto(pedido.variantes, `${donde}.variantes`, errores);
  const parametros = definicion.parametros.safeParse(crudosParametros);
  if (!parametros.success) errores.push(...erroresDeZod(parametros.error, `${donde}.parametros (${definicion.id})`));
  const variantes = definicion.variantes.safeParse(crudasVariantes);
  if (!variantes.success) errores.push(...erroresDeZod(variantes.error, `${donde}.variantes (${definicion.id})`));
  if (errores.length || !parametros.success || !variantes.success) return { ok: false, errores };

  let resueltos = parametros.data;
  if (definicion.resolver) {
    const r = await definicion.resolver(parametros.data, (tool, args) => consultor.consultar(tool, args));
    if (!r.ok) return { ok: false, errores: [`${donde}: ${r.motivo}`] };
    resueltos = r.parametros;
  }
  const argumentos = definicion.argumentos(resueltos);
  const consulta = await consultor.consultar(definicion.tool, argumentos);
  if (!consulta.ok) {
    return { ok: false, errores: [`${donde}: la tool ${definicion.tool} fallo: ${mensajeDeError(consulta.resultado)}`] };
  }

  const adaptado = definicion.adaptar(consulta.resultado, resueltos);
  if (!adaptado.ok) {
    return { ok: false, errores: [`${donde}: ${definicion.id} no aplica a esta persona (${adaptado.motivo}). Elige otra fuente`] };
  }

  const vista = variantes.data as Record<string, unknown>;
  const problemaDeVista = definicion.revisarVariantes?.(adaptado.props, vista);
  if (problemaDeVista) return { ok: false, errores: [`${donde}: ${problemaDeVista}`] };

  const componente: Componente = {
    id: pedido.id,
    component: definicion.componente,
    ...adaptado.props,
    ...vista,
    razon: pedido.razon,
    ...(pedido.heroe && aceptaHeroe(definicion.componente) ? { heroe: true } : {}),
  };

  const deProps = revisarProps(componente);
  if (deProps.length) {
    // Un adaptador que produce props invalidas es un bug de este archivo, no del modelo:
    // se reporta con todo el detalle para que se note en el log.
    console.warn(JSON.stringify({ widgets: "adaptador-invalido", fuente: definicion.id, errores: deProps }));
    return { ok: false, errores: deProps.map((e) => `${donde}: ${e}`) };
  }

  return {
    ok: true,
    componente,
    datos: adaptado.props,
    procedencia: {
      widgetId: pedido.id,
      fuente: definicion.id,
      componente: definicion.componente,
      tool: definicion.tool,
      parametros: resueltos,
      variantes: vista,
      argumentos: consulta.argumentos,
      huella: consulta.huella,
      en: consulta.en,
    },
  };
}

function mensajeDeError(resultado: unknown): string {
  if (typeof resultado === "object" && resultado !== null && "error" in resultado) {
    return String((resultado as { error: unknown }).error);
  }
  return "error sin detalle";
}

// --- Conclusion ------------------------------------------------------------------------

export const datoDeConclusion = z.object({
  etiqueta: z.string().min(1).describe("Que es: 'Saldo de tu tarjeta', 'Gasto de agosto'"),
  widget: z.string().describe("El id de la tarjeta de donde sale la cifra"),
  campo: z
    .string()
    .describe('La prop de esa tarjeta: "saldoCentavos", "totalCentavos", "puntajeSalud", "desviacionModeloPct"'),
  tono: z.string().optional().describe("neutro, bueno o alerta"),
});

export const pedidoDeConclusion = z.object({
  saludo: z.string().optional().describe("«Hola, <primer nombre>»"),
  titular: z.string().min(10).describe("LA frase, una oracion en segunda persona con el veredicto"),
  detalle: z.string().optional().describe("De una a tres frases con el porque y la recomendacion"),
  datos: z
    .array(datoDeConclusion)
    .max(3)
    .optional()
    .describe("Hasta 3 cifras de apoyo, POR REFERENCIA a una tarjeta: el servidor pone el valor"),
  sugerencias: z.array(z.string()).max(3).optional().describe("3 preguntas de seguimiento"),
});
export type PedidoDeConclusion = z.infer<typeof pedidoDeConclusion>;

const TONOS = new Set(["neutro", "bueno", "alerta"]);

/**
 * El valor de una prop por ruta con puntos (`opciones.0.mensualidadCentavos`), para que
 * una cifra de apoyo pueda apuntar dentro de una lista.
 */
export function leerCampo(props: Record<string, unknown>, campo: string): unknown {
  let actual: unknown = props;
  for (const parte of campo.split(".")) {
    if (Array.isArray(actual)) actual = actual[Number(parte)];
    else if (typeof actual === "object" && actual !== null) actual = (actual as Record<string, unknown>)[parte];
    else return undefined;
  }
  return actual;
}

/**
 * Como se escribe una cifra segun el nombre de su campo. Es la convencion de todo el
 * sistema: `…Centavos` son centavos, `…Pct` y los ratios son fracciones.
 */
export function formatearCampo(campo: string, valor: unknown): string | undefined {
  const hoja = campo.split(".").at(-1)!;
  if (typeof valor === "string") return valor;
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  if (typeof valor !== "number" || !Number.isFinite(valor)) return undefined;
  if (/Centavos$/.test(hoja)) return formatearMonto(valor);
  if (/Pct$/.test(hoja) || ["cat", "pctDelIngreso", "usoDelLimite", "ratioDeudaIngreso"].includes(hoja)) {
    return formatearPorcentaje(valor);
  }
  if (hoja === "puntajeSalud") return `${valor}/100`;
  if (/Meses$/.test(hoja)) return `${valor} ${valor === 1 ? "mes" : "meses"}`;
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(valor);
}

/** Los campos de una tarjeta que sirven como cifra de apoyo, para el mensaje de error. */
function camposCitables(props: Record<string, unknown>): string[] {
  return Object.entries(props)
    .filter(([, v]) => typeof v === "number" || typeof v === "string")
    .map(([k]) => k)
    .filter((k) => !["razon", "ancho", "id", "component"].includes(k));
}

export function armarConclusion(
  pedido: PedidoDeConclusion,
  widgets: ReadonlyMap<string, WidgetArmado>,
  razon: string,
): Resultado<{ componente: Componente }> {
  const errores: string[] = [];
  const datos: Array<{ etiqueta: string; valor: string; tono: string }> = [];

  for (const [i, dato] of (pedido.datos ?? []).entries()) {
    const widget = widgets.get(dato.widget);
    if (!widget) {
      errores.push(`conclusion.datos[${i}]: no hay una tarjeta "${dato.widget}"; las que hay: ${[...widgets.keys()].join(", ")}`);
      continue;
    }
    const valor = formatearCampo(dato.campo, leerCampo(widget.componente, dato.campo));
    if (valor === undefined) {
      errores.push(
        `conclusion.datos[${i}]: la tarjeta "${dato.widget}" no tiene una cifra en "${dato.campo}"; ` +
          `las que tiene: ${camposCitables(widget.componente).join(", ")}`,
      );
      continue;
    }
    datos.push({ etiqueta: dato.etiqueta, valor, tono: TONOS.has(dato.tono ?? "") ? dato.tono! : "neutro" });
  }
  if (errores.length) return { ok: false, errores };

  const componente: Componente = {
    id: "conclusion",
    component: "Conclusion",
    ...(pedido.saludo ? { saludo: pedido.saludo } : {}),
    titular: pedido.titular,
    ...(pedido.detalle ? { detalle: pedido.detalle } : {}),
    ...(datos.length ? { datos } : {}),
    ...(pedido.sugerencias?.length ? { sugerencias: pedido.sugerencias.slice(0, 3) } : {}),
    razon,
  };
  return { ok: true, componente };
}

/**
 * Las referencias de las cifras de apoyo, guardadas junto a la portada: cuando una tarjeta
 * cambia, sus cifras en la `Conclusion` se rehacen con el valor nuevo (`recalcularConclusion`).
 */
export type ReferenciaDeDato = { etiqueta: string; widget: string; campo: string; tono: string };

export function referenciasDe(pedido: PedidoDeConclusion): ReferenciaDeDato[] {
  return (pedido.datos ?? []).map((d) => ({
    etiqueta: d.etiqueta,
    widget: d.widget,
    campo: d.campo,
    tono: TONOS.has(d.tono ?? "") ? d.tono! : "neutro",
  }));
}

/**
 * La `Conclusion` con sus cifras rehechas contra los componentes de hoy. Una referencia a
 * un campo que ya no existe (la tarjeta cambio de componente) se cae en vez de mostrar un
 * valor viejo.
 */
export function recalcularConclusion(
  conclusion: Componente,
  referencias: readonly ReferenciaDeDato[],
  componentes: ReadonlyMap<string, Componente>,
): Componente {
  if (referencias.length === 0) return conclusion;
  const datos = referencias.flatMap((r) => {
    const widget = componentes.get(r.widget);
    const valor = widget ? formatearCampo(r.campo, leerCampo(widget, r.campo)) : undefined;
    return valor === undefined ? [] : [{ etiqueta: r.etiqueta, valor, tono: r.tono }];
  });
  const { datos: _viejos, ...resto } = conclusion;
  return datos.length ? { ...resto, datos } : resto;
}

/** La raiz de una pantalla de widgets: la conclusion y las tarjetas, en orden. */
export function raizDe(ids: readonly string[]): Componente {
  return { id: ID_RAIZ, component: "Column", children: ["conclusion", ...ids] };
}

/** Las fuentes alternas de una tarjeta ya pintada: las que llenan el mismo componente. */
export function fuentesAlternas(definicion: DefinicionDeFuente): string[] {
  return fuentesDe(definicion.componente).map((f) => f.id);
}
