/**
 * La forma de una fila y las tres conversiones que usa todo el dominio.
 *
 * Las filas llegan como texto aunque vengan de Postgres (ver `postgres.ts`): asi el
 * dominio no tiene que saber de donde salieron los datos, y un `int` de la base y un
 * `int` de un volcado se leen igual.
 */
export type Fila = Record<string, string>;

export const aEntero = (v: string | undefined): number => (v === undefined || v === "" ? 0 : Number.parseInt(v, 10));
export const aDecimal = (v: string | undefined): number => (v === undefined || v === "" ? 0 : Number.parseFloat(v));
export const aBooleano = (v: string | undefined): boolean => v === "true" || v === "t" || v === "1";
