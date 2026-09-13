/**
 * El verificador de cifras: que cada numero que el modelo escribe en PROSA (el titular,
 * el detalle, la nota de un widget) salga de lo que el MCP devolvio en ese turno.
 *
 * Las tarjetas ya no llevan cifras del modelo (`fuentes.ts`), pero el texto si: "tu
 * portafolio se desvio 6.7 %" lo redacta el modelo. Aqui se extraen esas cifras y se
 * buscan entre las hojas numericas de los resultados de las tools y de las props
 * adaptadas. Algoritmo, tolerancias y limites: `docs/algoritmos/verificacion-de-cifras.md`.
 *
 * No entiende el sentido de la frase: "debes $3,546" pasa si 354600 aparece en los datos,
 * aunque ese monto fuera de otra cosa. Lo que si garantiza es que ningun numero inventado,
 * mal redondeado o mal convertido de centavos llegue a la pantalla.
 */

export type TipoDeCifra = "monto" | "porcentaje" | "puntaje" | "numero";

export type Cifra = {
  /** Como aparece en el texto: "$3,546", "6.7 %", "39/100". */
  crudo: string;
  valor: number;
  tipo: TipoDeCifra;
  /** Cuantos decimales mostro el texto; define la tolerancia de redondeo. */
  decimales: number;
};

const MESES = "enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre";

/**
 * Un numero con separador de miles opcional (`3,546.50`, `3546`, `0.5`), con sus
 * decoraciones: `$` o `MXN` antes, `%`, `/100`, `mil`, `millones` o `pesos` despues.
 */
const PATRON = new RegExp(
  String.raw`(?<signo>\$\s?|MXN\s?)?(?<num>\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)` +
    String.raw`(?<sufijo>\s?%|\s?por\s?ciento|\/100|\s?millones?(?:\s+de\s+pesos)?|\s?mil(?:\s+pesos)?|\s?pesos|\s?MXN)?` +
    String.raw`(?<fecha>\s+de\s+(?:${MESES}))?`,
  "giu",
);

export function extraerCifras(texto: string): Cifra[] {
  const cifras: Cifra[] = [];
  for (const m of texto.matchAll(PATRON)) {
    const g = m.groups ?? {};
    if (g.fecha) continue; // "12 de octubre": un dia del mes, no una cifra
    const num = g.num!;
    const base = Number(num.replace(/,/g, ""));
    if (!Number.isFinite(base)) continue;
    const decimales = num.includes(".") ? num.split(".")[1]!.length : 0;
    const sufijo = (g.sufijo ?? "").trim().toLowerCase();

    if (sufijo === "%" || sufijo.startsWith("por")) {
      cifras.push({ crudo: m[0].trim(), valor: base, tipo: "porcentaje", decimales });
    } else if (sufijo === "/100") {
      cifras.push({ crudo: m[0].trim(), valor: base, tipo: "puntaje", decimales });
    } else if (sufijo.startsWith("millon")) {
      cifras.push({ crudo: m[0].trim(), valor: base * 1_000_000, tipo: "monto", decimales: decimales - 6 });
    } else if (sufijo.startsWith("mil")) {
      cifras.push({ crudo: m[0].trim(), valor: base * 1_000, tipo: "monto", decimales: decimales - 3 });
    } else if (g.signo || sufijo === "pesos" || sufijo === "mxn") {
      cifras.push({ crudo: m[0].trim(), valor: base, tipo: "monto", decimales });
    } else {
      cifras.push({ crudo: m[0].trim(), valor: base, tipo: "numero", decimales });
    }
  }
  return cifras;
}

/** Todas las hojas numericas de un valor, a cualquier profundidad. */
export function hojasNumericas(valor: unknown, salida: number[] = []): number[] {
  if (typeof valor === "number" && Number.isFinite(valor)) salida.push(valor);
  else if (Array.isArray(valor)) for (const v of valor) hojasNumericas(v, salida);
  else if (typeof valor === "object" && valor !== null) for (const v of Object.values(valor)) hojasNumericas(v, salida);
  return salida;
}

/** Media unidad del ultimo decimal mostrado, y un pelo mas por el punto flotante. */
function tolerancia(decimales: number): number {
  return 0.5 * 10 ** -decimales + 1e-9;
}

/**
 * Si la cifra sale de alguna hoja. Cada tipo mira sus propias conversiones:
 *
 *  - monto: la hoja en centavos / 100 (todo monto del sistema viaja en centavos);
 *  - porcentaje: la hoja como fraccion * 100 (todo porcentaje del sistema es fraccion);
 *  - puntaje (`39/100`): la hoja entera tal cual;
 *  - numero suelto: la hoja tal cual, o conteos chicos (<= 12), o un año.
 */
export function cifraRespaldada(cifra: Cifra, hojas: readonly number[]): boolean {
  const tol = tolerancia(Math.max(0, cifra.decimales));
  switch (cifra.tipo) {
    case "monto":
      return hojas.some((h) => Math.abs(Math.abs(h) / 100 - cifra.valor) <= Math.max(tol, cifra.decimales < 0 ? 0.5 * 10 ** -cifra.decimales : 0));
    case "porcentaje":
      return hojas.some((h) => Math.abs(h) <= 10 && Math.abs(Math.abs(h) * 100 - cifra.valor) <= tol);
    case "puntaje":
      return hojas.some((h) => Math.abs(h - cifra.valor) <= tol);
    case "numero":
      if (cifra.decimales === 0 && cifra.valor <= 12) return true;
      if (cifra.decimales === 0 && cifra.valor >= 1990 && cifra.valor <= 2100) return true;
      return hojas.some((h) => Math.abs(Math.abs(h) - cifra.valor) <= tol);
  }
}

export type Verificacion = { ok: true } | { ok: false; noRespaldadas: Cifra[] };

/**
 * Revisa uno o varios textos contra los datos del turno. `extras` son textos que tambien
 * cuentan como fuente —la pregunta de la persona: si ella escribio "24 meses", el modelo
 * puede repetirlo—.
 */
export function verificarCifras(textos: readonly (string | undefined)[], datos: readonly unknown[], extras: readonly string[] = []): Verificacion {
  const hojas = hojasNumericas(datos);
  const deLaPersona = extras.flatMap(extraerCifras);
  const noRespaldadas: Cifra[] = [];
  for (const texto of textos) {
    if (!texto) continue;
    for (const cifra of extraerCifras(texto)) {
      if (deLaPersona.some((p) => p.valor === cifra.valor)) continue;
      if (!cifraRespaldada(cifra, hojas)) noRespaldadas.push(cifra);
    }
  }
  return noRespaldadas.length ? { ok: false, noRespaldadas } : { ok: true };
}

/**
 * La red del ultimo intento: quita las oraciones que traen una cifra sin respaldo. Mejor
 * un detalle mas corto que un numero falso. Devuelve `undefined` si no queda nada.
 */
export function quitarOracionesSinRespaldo(texto: string | undefined, noRespaldadas: readonly Cifra[]): string | undefined {
  if (!texto) return texto;
  const crudos = new Set(noRespaldadas.map((c) => c.crudo));
  // Se parte en el espacio que sigue a un punto: el punto decimal de "$3,193.35" no lleva
  // espacio detras y no corta la oracion.
  const oraciones = texto.trim().split(/(?<=[.!?])\s+/);
  const quedan = oraciones.filter((o) => !extraerCifras(o).some((c) => crudos.has(c.crudo)));
  const resultado = quedan.join(" ").trim();
  return resultado.length ? resultado : undefined;
}

/** Para el mensaje de error al modelo: "$2,954,065", "12.5 %". */
export function listarCifras(cifras: readonly Cifra[]): string {
  return [...new Set(cifras.map((c) => `"${c.crudo}"`))].join(", ");
}
