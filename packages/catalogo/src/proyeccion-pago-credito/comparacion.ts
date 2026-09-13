import type { PropsEscenarioAntes } from "./schema";

/**
 * «Antes → después» de un cambio de mensualidad, en lo que la tarjeta dice con palabras.
 *
 * Pura y aparte del componente porque es lo que se puede equivocar en silencio: con un signo
 * al revés, pagar MENOS al mes diría «Pagas $2,100 menos de intereses» cuando son más. La
 * tool solo simula abonos a capital (pagar más), pero `antes` puede traer un abono ya
 * programado y la persona pedir uno menor: ahí sí empeora, y la frase tiene que decirlo.
 *
 * `mejor` pinta el dato en `text-exito`; `peor` va en el color del texto, nunca en rojo (el
 * rojo es de la marca, no de lo negativo). Una diferencia de cero no produce línea.
 */
export type Direccion = "mejor" | "peor";

export type Comparacion = {
  plazo?: { ahora: number; antes: number; direccion: Direccion };
  intereses?: { diferenciaCentavos: number; direccion: Direccion };
};

export function compararEscenarios(antes: PropsEscenarioAntes, ahora: PropsEscenarioAntes): Comparacion | undefined {
  const comparacion: Comparacion = {};
  if (ahora.plazoRestanteMeses !== antes.plazoRestanteMeses) {
    comparacion.plazo = {
      ahora: ahora.plazoRestanteMeses,
      antes: antes.plazoRestanteMeses,
      direccion: ahora.plazoRestanteMeses < antes.plazoRestanteMeses ? "mejor" : "peor",
    };
  }
  const diferencia = antes.totalInteresesEstimadosCentavos - ahora.totalInteresesEstimadosCentavos;
  if (diferencia !== 0) {
    comparacion.intereses = { diferenciaCentavos: Math.abs(diferencia), direccion: diferencia > 0 ? "mejor" : "peor" };
  }
  // Solo cambió la mensualidad (sin efecto en plazo ni intereses): no hay nada que contar.
  return comparacion.plazo || comparacion.intereses ? comparacion : undefined;
}

/** `1 mes`, `11 meses`. */
export function meses(n: number): string {
  return n === 1 ? "1 mes" : `${n} meses`;
}
