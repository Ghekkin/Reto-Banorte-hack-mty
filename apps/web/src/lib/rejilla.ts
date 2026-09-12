import { anchoNatural } from "@maya/catalogo";

/**
 * Como se acomodan las tarjetas que construye el agente. El algoritmo completo, con sus
 * numeros y por que, esta en `docs/algoritmos/acomodo-del-lienzo.md`.
 *
 * La idea: **filas que se llenan solas**. Cada tarjeta pide un ancho minimo segun su
 * tamano natural y crece para llenar la fila; si en la fila ya no cabe, baja a la
 * siguiente. Con eso dos tarjetas quedan lado a lado en cuanto hay espacio para las dos, y
 * apiladas a lo ancho cuando no lo hay (un celular), sin breakpoints de pantalla: todo se
 * mide contra el ancho del LIENZO, asi que funciona igual en el chat que en un dashboard.
 */

/** compacta: 18rem y crece 1 · amplia: 26rem y crece 2 · completa: la fila entera. */
export type TamanoDePieza = "compacta" | "amplia" | "completa";

/** De layout que no son tarjetas: van solos en su fila. */
const DE_FILA_COMPLETA = new Set(["Text", "Divider", "Row"]);

export function tamanoDePieza(componente: string, anchoDelAgente?: "normal" | "amplio"): TamanoDePieza {
  if (DE_FILA_COMPLETA.has(componente)) return "completa";
  // Un Column anidado agrupa tarjetas en vertical: se le da el espacio de una amplia.
  if (componente === "Column") return "amplia";
  const ancho = anchoNatural(componente) ?? anchoDelAgente;
  return ancho === "amplio" ? "amplia" : "compacta";
}

/*
 * Las clases van completas y literales: Tailwind solo genera CSS para lo que encuentra
 * escrito tal cual en el codigo, y una clase armada con plantilla no avisa, no se ve.
 *
 * `min-w-[min(100%,18rem)]`: nunca mas angosta que 18rem, salvo que el lienzo entero sea
 * mas angosto (un celular), y entonces todo el ancho. `flex-[1_1_18rem]`: parte de 18rem,
 * crece para llenar la fila.
 *
 * Por que 26rem para las amplias y no menos: por debajo de ~416 px una grafica con sus
 * fichas se ve como en un celular, y es mejor que baje a su propia fila a lo ancho —donde
 * `@3xl/tarjeta` la pone en dos paneles— que quedar apretada junto a otra.
 */
const EN_FILA: Record<Exclude<TamanoDePieza, "completa">, string> = {
  compacta: "grid min-w-[min(100%,18rem)] flex-[1_1_18rem]",
  amplia: "grid min-w-[min(100%,26rem)] flex-[2_1_26rem]",
};

/** Con cuatro tarjetas o mas, de dos en dos: "tres y una sola abajo" se ve cojo. */
const EN_PAREJAS: Record<Exclude<TamanoDePieza, "completa">, string> = {
  compacta: "grid min-w-[min(100%,18rem)] flex-[1_1_calc(50%-0.5rem)]",
  amplia: "grid min-w-[min(100%,26rem)] flex-[1_1_calc(50%-0.5rem)]",
};

const FILA_COMPLETA = "grid basis-full";

/**
 * Las clases de una pieza. `tarjetas` es cuantas piezas de la pantalla son tarjetas (no
 * cuentan `Text`, `Divider` ni `Row`).
 */
export function clasesDePieza(tamano: TamanoDePieza, tarjetas: number): string {
  if (tamano === "completa" || tarjetas <= 1) return FILA_COMPLETA;
  return tarjetas >= 4 ? EN_PAREJAS[tamano] : EN_FILA[tamano];
}

/**
 * El contenedor de la rejilla: fila flexible que salta de linea, con la separacion del sistema.
 *
 * `items-start` y no `items-stretch`: cada tarjeta mide lo que su contenido. Estirarlas al
 * alto de la fila se probo y se vio peor: "Tu plan quedó activo" (230 px de contenido)
 * junto al calendario (510 px) quedaba con 280 px de blanco adentro, y un hueco dentro de
 * una tarjeta se lee como algo roto; el gris del lienzo debajo de una tarjeta corta, no.
 */
export const CLASES_REJILLA = "flex flex-wrap items-start gap-3 @2xl/lienzo:gap-4";
