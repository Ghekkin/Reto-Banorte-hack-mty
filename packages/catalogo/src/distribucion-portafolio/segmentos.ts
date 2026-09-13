import { SERIES } from "../graficas";

/**
 * Qué color lleva cada clase del portafolio y cuántos segmentos tiene la dona.
 *
 * Solo se distinguen **4 colores** sobre cada fondo (la paleta de gráficas es oscuro / rojo /
 * gris / plata; el tinte no se ve sobre blanco, y en la tarjeta héroe el blanco solo aguanta
 * cuatro opacidades que se lean distintas). Así que con más de 4 clases, las 3 de mayor monto
 * llevan su color y el resto va junto en un segmento «Otras», con el mismo color en la dona y
 * en el cuadrito de su fila. La lista sigue mostrando cada clase con su monto y su peso: ningún
 * número se pierde, solo se agrupa el color. Ver `docs/algoritmos/graficas-del-catalogo.md`.
 *
 * Antes (issue #26) la héroe restaba 0.2 de opacidad por clase: la sexta quedaba en 0 y las
 * siguientes en alfa negativo, invisibles en la dona y en la lista.
 */
export const MAX_COLORES = 4;

const COLORES_BLANCA = [SERIES.principal, SERIES.acento, SERIES.tercera, SERIES.resto] as const;

/**
 * El blanco de la tarjeta héroe (`--primary-foreground`) a cuatro opacidades, con la misma
 * sintaxis que ya usan `TermometroSaludFinanciera` y `ComparadorAntesDespues` sobre el
 * degradado. No `color-mix()`: en un celular sin soporte el relleno cae a negro. La última (28 %)
 * sigue viéndose sobre el rojo.
 */
const COLORES_HEROE = ["var(--primary-foreground)", "rgb(255 255 255 / 0.7)", "rgb(255 255 255 / 0.48)", "rgb(255 255 255 / 0.28)"] as const;

export type ClaseParaSegmento = { nombre: string; montoCentavos: number };
export type Segmento = { nombre: string; monto: number; color: string };

export function repartirSegmentos(
  clases: readonly ClaseParaSegmento[],
  heroe: boolean,
): { segmentos: Segmento[]; colorDeClase: string[] } {
  const paleta = heroe ? COLORES_HEROE : COLORES_BLANCA;
  // Rango por monto (estable ante empates): la clase más grande lleva el primer color aunque
  // el modelo mande la lista en otro orden.
  const porMonto = clases.map((_, i) => i).sort((a, b) => clases[b]!.montoCentavos - clases[a]!.montoCentavos || a - b);
  const agrupa = clases.length > MAX_COLORES;
  const propias = agrupa ? MAX_COLORES - 1 : clases.length;

  const colorDeClase: string[] = new Array<string>(clases.length);
  const segmentos: Segmento[] = [];
  porMonto.forEach((i, rango) => {
    const clase = clases[i]!;
    if (rango < propias) {
      colorDeClase[i] = paleta[rango]!;
      segmentos.push({ nombre: clase.nombre, monto: clase.montoCentavos, color: paleta[rango]! });
    } else {
      colorDeClase[i] = paleta[MAX_COLORES - 1]!;
    }
  });

  if (agrupa) {
    const resto = porMonto.slice(propias);
    segmentos.push({
      nombre: `Otras (${resto.length} clases)`,
      monto: resto.reduce((suma, i) => suma + clases[i]!.montoCentavos, 0),
      color: paleta[MAX_COLORES - 1]!,
    });
  }
  return { segmentos, colorDeClase };
}
