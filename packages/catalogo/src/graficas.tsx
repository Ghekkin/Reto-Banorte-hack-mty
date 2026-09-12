"use client";

import type { ReactNode } from "react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatearMonto } from "./comunes";

/**
 * Lo que toda gráfica del catálogo comparte (skill `diseno-banorte`, sección "Gráficas",
 * y la skill `dataviz`). Se concentra aquí para que las seis gráficas del catálogo se
 * lean como UNA sola familia y no como seis decisiones distintas.
 *
 * Reglas que este módulo hace cumplir por construcción:
 *
 *  - **Los colores son tokens** (`var(--chart-N)`): cero hex en el SVG. La prueba
 *    `render.spec.tsx` truena si Recharts pinta un `fill="#…"`, así que TODO trazo,
 *    relleno y texto de eje se declara explícito; los valores por omisión de Recharts
 *    (`#3182bd`, `#ccc`, `#666`) nunca llegan al HTML.
 *  - **El número nunca vive solo en el tooltip.** Cada gráfica va acompañada del monto
 *    en texto (encabezado, etiquetas directas o fichas): en móvil no hay hover. El
 *    tooltip existe, pero es un extra para escritorio.
 *  - **Una sola escala por gráfica.** Nunca dos ejes Y.
 *  - **Series adyacentes distinguibles.** La paleta de marca es oscuro / rojo / rojo
 *    claro / plata; el validador de la skill `dataviz` mide ΔE 6.5 entre el rojo y el
 *    rojo claro (no se distinguen ni con visión normal), así que las series se asignan
 *    en el orden oscuro → rojo → gris → plata (`SERIES`), nunca rojo junto a rojo claro.
 *  - **Los ejes son recesivos**: sin línea de eje, sin marcas, texto `text-xs` en gris.
 *    La cuadrícula se omite: en una tarjeta de 300 px de ancho solo estorba.
 *  - **Altura fija, no proporción.** `aspect-video` de shadcn da 170 px de alto a 300 px
 *    de ancho y 400 px a 720: la tarjeta amplia se volvía el doble de alta que sus
 *    vecinas. 160 px en una tarjeta angosta y 192 px desde 28rem de TARJETA (no de pantalla).
 */

/** Los colores de serie en el orden en que se asignan. Fijos por entidad, nunca rotan. */
export const SERIES = {
  /** Oscuro: lo bueno, lo que es de la persona (aportado, capital). */
  principal: "var(--chart-1)",
  /** Rojo: lo que duele o lo que se quiere resaltar (intereses, rendimiento). */
  acento: "var(--chart-2)",
  /** Gris: tercera serie. */
  tercera: "var(--muted-foreground)",
  /** Plata: resto, fondos de barra. */
  resto: "var(--chart-4)",
  /** Tinte: el relleno bajo una curva de una sola serie. */
  tinte: "var(--chart-5)",
} as const;

/** El color con el que se separan segmentos vecinos (donas, barras apiladas): el de la tarjeta. */
export const SEPARADOR = "var(--card)";

/** Alto de la gráfica: 160 px en una tarjeta angosta, 192 px cuando la tarjeta mide 28rem o más. */
export const CLASES_GRAFICA = "aspect-auto h-40 w-full @md/tarjeta:h-48";

/**
 * `$24,800.00` es demasiado para una marca de eje: `$24.8 k`. Solo para ejes y etiquetas
 * directas dentro del SVG; el monto completo sigue en texto en la misma tarjeta.
 */
export function formatearMontoCorto(centavos: number): string {
  // A mano y no con `notation: "compact"`: el ICU de Node escribe "$86.0 k" y el de
  // Chrome "$86 k", y esa diferencia era un error de hidratación en cada ficha.
  // Sin espacio antes de la unidad: en una marca de eje, Recharts parte el texto en los
  // espacios cuando no cabe en el ancho del eje, y "$55.8 k" salia en dos renglones.
  const pesos = Math.abs(centavos) / 100;
  const signo = centavos < 0 ? "−" : "";
  const numero = (v: number) => new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(v);
  if (pesos >= 1_000_000) return `${signo}$${numero(pesos / 1_000_000)}M`;
  if (pesos >= 1_000) return `${signo}$${numero(pesos / 1_000)}k`;
  return `${signo}$${new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 }).format(pesos)}`;
}

/** `$1,114` sin centavos: para una etiqueta directa dentro del SVG, donde el espacio es poco. */
export function formatearMontoEntero(centavos: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(centavos / 100);
}

/** `2026-06-20` -> `20 jun`, para un eje de fechas. */
export function formatearFechaCorta(iso: string): string {
  const [anio, mes, dia] = iso.split("-").map(Number);
  if (!anio || !mes || !dia) return iso;
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" }).format(new Date(anio, mes - 1, dia)).replace(".", "");
}

/** Los props de un eje recesivo: sin línea, sin marcas, texto chico en gris. */
export const EJE = {
  axisLine: false,
  tickLine: false,
  tick: { fill: "var(--muted-foreground)", fontSize: 12 },
  tickMargin: 8,
} as const;

/** Los props de una etiqueta directa dentro del SVG. */
export const ETIQUETA = { fill: "var(--foreground)", fontSize: 12, fontWeight: 600 } as const;

/** El cursor del tooltip sobre una curva: una línea fina del color del borde. */
export const CURSOR = { stroke: "var(--border)", strokeWidth: 1 } as const;

/**
 * El contenedor de shadcn con la configuración del catálogo. `config` da nombre y color
 * a cada serie para el tooltip; `children` es la gráfica de Recharts.
 */
export function Grafica({
  config,
  children,
  className = "",
  etiqueta,
}: {
  config: ChartConfig;
  children: React.ComponentProps<typeof ChartContainer>["children"];
  className?: string;
  /** Qué muestra la gráfica, para lectores de pantalla. */
  etiqueta: string;
}) {
  // Con un tamaño propio (dona, medidor) no se hereda `@md/tarjeta:h-48`: tailwind-merge no lo
  // quita porque lleva variante, y el contenedor crecía a 192 px en escritorio.
  const tamano = className ? `aspect-auto ${className}` : CLASES_GRAFICA;
  return (
    <ChartContainer config={config} className={tamano} role="img" aria-label={etiqueta}>
      {children}
    </ChartContainer>
  );
}

/** El tooltip del catálogo: montos en pesos, etiqueta de la serie, sin fuente monoespaciada. */
export function TooltipMonto({ etiquetaDe }: { etiquetaDe?: (valor: unknown) => ReactNode }) {
  return (
    <ChartTooltip
      cursor={CURSOR}
      content={
        <ChartTooltipContent
          className="rounded-xl border-borde-sutil shadow-md [&_.font-mono]:font-sans"
          labelFormatter={etiquetaDe ? (v) => etiquetaDe(v) : undefined}
          formatter={(valor, nombre, item) => (
            <span className="flex w-full items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2.5 shrink-0 rounded-[2px]" style={{ background: item.color }} />
                {String(nombre)}
              </span>
              <span className="monto font-medium text-foreground">{formatearMonto(Number(valor))}</span>
            </span>
          )}
        />
      }
    />
  );
}

/** La leyenda de una gráfica de dos o más series: siempre presente, texto en gris. */
export function Leyenda({
  series,
  heroe = false,
}: {
  series: Array<{ nombre: string; color: string }>;
  /** Sobre el degradado de marca el gris no se lee: el texto va en blanco al 80 %. */
  heroe?: boolean;
}) {
  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1 text-xs ${heroe ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
      {series.map((s) => (
        <li key={s.nombre} className="flex items-center gap-1.5">
          <span className="size-2.5 shrink-0 rounded-[2px]" style={{ background: s.color }} aria-hidden />
          {s.nombre}
        </li>
      ))}
    </ul>
  );
}

/**
 * Una ficha de dato: etiqueta chica arriba, valor abajo. Es la "stat tile" de la skill
 * `dataviz` y la anatomía de tarjeta del sistema en miniatura. Se usa en fila para
 * los hitos de una proyección: los valores quedan siempre visibles, sin tooltip.
 */
export function Ficha({
  etiqueta,
  valor,
  detalle,
  acento = false,
  detalleSoloEscritorio = false,
  heroe = false,
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
  /** Marca la ficha que importa (la meta, el cierre) con más peso. */
  acento?: boolean;
  /** El detalle es secundario: si la TARJETA mide menos de 24rem, no cabe y se oculta. */
  detalleSoloEscritorio?: boolean;
  /**
   * Sobre el degradado de marca: etiqueta en blanco al 80 % y valor en blanco. Sin esto, en
   * la tarjeta heroe las fichas salian en gris y negro sobre rojo, casi ilegibles (visto en
   * vivo el 2026-09-12, cuando el agente marco como heroe el credito de Ana).
   */
  heroe?: boolean;
}) {
  const suave = heroe ? "text-primary-foreground/80" : "text-muted-foreground";
  const fuerte = heroe ? "text-primary-foreground" : "text-foreground";
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className={`truncate text-xs ${suave}`}>{etiqueta}</span>
      <span className={`monto truncate text-sm ${fuerte} ${acento ? "font-semibold" : "font-medium"}`}>{valor}</span>
      {detalle ? (
        <span className={`monto truncate text-xs ${suave} ${detalleSoloEscritorio ? "hidden @sm/tarjeta:block" : ""}`}>{detalle}</span>
      ) : null}
    </div>
  );
}
