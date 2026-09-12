/**
 * Lector de CSV mínimo: comillas dobles, comas dentro de comillas y `""` como
 * comilla escapada. Nada más, porque nada más generan nuestros datos
 * (`scripts/generar-datos.mjs`). Sin dependencias a proposito.
 */
export type Fila = Record<string, string>;

export function leerCSV(texto: string): Fila[] {
  const lineas = partirEnLineas(texto.replace(/^﻿/, ""));
  if (lineas.length === 0) return [];
  const encabezado = partirLinea(lineas[0]!);
  const filas: Fila[] = [];
  for (const linea of lineas.slice(1)) {
    if (linea.trim() === "") continue;
    const celdas = partirLinea(linea);
    const fila: Fila = {};
    encabezado.forEach((columna, i) => {
      fila[columna] = celdas[i] ?? "";
    });
    filas.push(fila);
  }
  return filas;
}

function partirEnLineas(texto: string): string[] {
  const lineas: string[] = [];
  let actual = "";
  let enComillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]!;
    if (c === '"') {
      enComillas = !enComillas;
      actual += c;
    } else if ((c === "\n" || c === "\r") && !enComillas) {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      lineas.push(actual);
      actual = "";
    } else {
      actual += c;
    }
  }
  if (actual !== "") lineas.push(actual);
  return lineas;
}

function partirLinea(linea: string): string[] {
  const celdas: string[] = [];
  let actual = "";
  let enComillas = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i]!;
    if (enComillas) {
      if (c === '"' && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else if (c === '"') {
        enComillas = false;
      } else {
        actual += c;
      }
    } else if (c === '"') {
      enComillas = true;
    } else if (c === ",") {
      celdas.push(actual);
      actual = "";
    } else {
      actual += c;
    }
  }
  celdas.push(actual);
  return celdas;
}

/** Los CSV no tienen tipos: estas tres conversiones se usan en todas las tools. */
export const aEntero = (v: string | undefined): number => (v === undefined || v === "" ? 0 : Number.parseInt(v, 10));
export const aDecimal = (v: string | undefined): number => (v === undefined || v === "" ? 0 : Number.parseFloat(v));
export const aBooleano = (v: string | undefined): boolean => v === "true" || v === "t" || v === "1";
