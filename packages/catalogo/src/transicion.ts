"use client";

import { createElement, Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { formatearMonto } from "./comunes";

/**
 * La transición de valores: cuando el agente AJUSTA una tarjeta, sus números cuentan del valor
 * viejo al nuevo y sus curvas se deslizan a su nueva forma, en vez de saltar.
 *
 * ## Por que hace falta
 *
 * Con los ajustes en vivo la tarjeta ya no se desmonta: `ajustar_pantalla` (en `/maya`) y los
 * widgets vivos (en Inicio) le cambian las props a la MISMA tarjeta. Eso quitó el parpadeo,
 * pero dejó el cambio en un solo cuadro: el total pasaba de $33,349.50 a $35,349.50 de golpe y
 * la curva del crédito aparecía ya con otra forma. El usuario lo pidió así (2026-09-13): «que
 * modifique directamente los gráficos y se vea la animación donde se editó, no que se borre y
 * se genere desde 0». Un número que cuenta dice **cuánto** cambió y **hacia dónde**; un salto
 * solo dice que algo es distinto, y hay que comparar de memoria.
 *
 * `usarCambio` (`resaltado.ts`) dice DÓNDE cambió; esto dice CÓMO. Van juntos.
 *
 * ## Por que no anima al montar
 *
 * Al montar, la tarjeta ya tiene su propia entrada (`animar-tarjeta`, la `cifra` que sube, la
 * ventana de la gráfica: `docs/como-funciona/animacion-de-widgets.md`). Contar desde cero
 * encima de eso seria doble movimiento, y ademas mentiria: "$0 → $35,349.50" no es un cambio,
 * es el dato llegando. Por la misma razón no cuenta cuando el dato llega tarde (`undefined` →
 * valor, el esqueleto que se llena) ni tras un repintado completo (valor → `undefined` → otro).
 *
 * ## Como
 *
 *  - En el render se devuelve lo que está en pantalla; el efecto arranca un
 *    `requestAnimationFrame` que interpola hasta el destino en `DURACION_TRANSICION_MS` con
 *    salida suave (ease-out cúbica: arranca rápido, que es cuando el ojo busca el cambio).
 *  - **Parte de donde va**: si llega otro valor a media animación, la nueva sale del número que
 *    se está mostrando, no del destino viejo. Sin eso, dos ajustes seguidos dan un brinco hacia
 *    atrás.
 *  - Los centavos se redondean en cada cuadro: `formatearMonto` nunca ve medio centavo.
 *  - Con "reducir movimiento" (`prefers-reduced-motion`) o con `activo: false` salta directo,
 *    en el mismo render: `activo: false` es lo que usa `SimuladorMeta` mientras la persona
 *    arrastra, porque ahí el número tiene que seguir al dedo, no ir detrás de él.
 *  - El `rAF` se cancela al desmontar y al empezar otra animación.
 *
 * ## Donde vive el conteo: `NumeroAnimado`, no la tarjeta
 *
 * Cada cuadro de la animación es un render. Si el hook vive en la tarjeta, cada cuadro vuelve a
 * pintar la tarjeta ENTERA, gráfica de Recharts incluida: medido en `/catalogo` (modo dev, el
 * servidor cargado), `ProyeccionPagoCredito` tardaba 60-480 ms por cuadro y los 600 ms de conteo
 * se veían en dos saltos. Por eso los números van en `<NumeroAnimado>`: el hook vive en ese
 * `<span>` y cada cuadro repinta solo un texto. `usarValoresAnimados` sigue disponible para
 * cuando varios valores tienen que moverse en el mismo render (un mapa: una llave nueva aparece
 * ya en su destino; una que se fue, se va).
 *
 * ## Y las curvas: la animación de Recharts, pero solo desde el primer ajuste
 *
 * Recharts ya sabe deslizar un área de su forma vieja a la nueva repintando SOLO el trazo, que es
 * lo barato. La regla de la entrada es que Recharts no anime al montar (la entrada es la ventana
 * `animar-trazo` de `Grafica`), y prenderla con "ya montado" no basta: cambiar
 * `isAnimationActive` de `false` a `true` arranca una animación en ese instante aunque los datos
 * sean los mismos. `usarYaCambio` se prende en el MISMO render en que llegan los datos nuevos, así
 * que la primera animación de Recharts es la del ajuste. Con `"auto"` Recharts respeta "reducir
 * movimiento" solo.
 */

/** Lo que tarda en contar. Lo eligió el usuario: se alcanza a leer sin volverse espera. */
export const DURACION_TRANSICION_MS = 600;

/** Lo mas que avanza la cuenta en un cuadro, aunque el cuadro haya tardado mas (ver `paso`). */
const PASO_MAXIMO_MS = 50;

export type OpcionesDeTransicion = {
  /** Default `DURACION_TRANSICION_MS`. */
  duracionMs?: number;
  /**
   * Centavos, meses: enteros en cada cuadro. `false` para posiciones de una gráfica. Con una
   * función se decide por llave, para animar montos y puntos de una curva en UN solo hook (un
   * render por cuadro y no dos). Default `true`.
   */
  redondear?: boolean | ((clave: string) => boolean);
  /** `false`: salta directo (lo que mueve la persona con un control). Default `true`. */
  activo?: boolean;
};

type Valores = Record<string, number | undefined>;

/** Ease-out cúbica. */
export function suavizar(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** El valor de una llave en el cuadro `t` (0 a 1, ya suavizado), o el destino si no hay de dónde partir. */
export function interpolar(desde: number | undefined, hasta: number | undefined, t: number, redondear: boolean): number | undefined {
  if (hasta === undefined || !Number.isFinite(hasta)) return hasta;
  if (desde === undefined || !Number.isFinite(desde) || t >= 1) return hasta;
  const valor = desde + (hasta - desde) * t;
  return redondear ? Math.round(valor) : valor;
}

function prefiereMenosMovimiento(): boolean {
  return typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

/** Solo lo que se puede interpolar: un número finito. `undefined` es "todavía no hay dato". */
function limpio(valor: number | undefined): number | undefined {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : undefined;
}

function firmaDe(valores: Valores): string {
  return Object.entries(valores)
    .map(([k, v]) => `${k}:${limpio(v) ?? "-"}`)
    .join("|");
}

export function usarValoresAnimados<T extends Valores>(destino: T, opciones: OpcionesDeTransicion = {}): T & Valores {
  const { duracionMs = DURACION_TRANSICION_MS, redondear = true, activo = true } = opciones;
  const firma = firmaDe(destino);
  /**
   * Lo que está en pantalla en este momento, cuadro a cuadro: de aquí parte la siguiente
   * animación y de aquí lee el render. Es un ref y no estado porque el efecto lo tiene que leer
   * al instante (sin esperar un render) cuando llega otro valor a media animación; el estado
   * `cuadros` solo existe para pedir el render de cada cuadro.
   */
  const enPantalla = useRef<Valores>(destino);
  const destinoRef = useRef(destino);
  destinoRef.current = destino;
  const cuadro = useRef<number | null>(null);
  const [, setCuadros] = useState(0);
  const saltar = !activo || prefiereMenosMovimiento();

  useEffect(() => {
    const hasta = destinoRef.current;
    if (cuadro.current !== null) cancelAnimationFrame(cuadro.current);
    cuadro.current = null;

    const desde = enPantalla.current;
    const hayQueContar =
      !saltar &&
      Object.keys(hasta).some((k) => {
        const a = limpio(desde[k]);
        const b = limpio(hasta[k]);
        return a !== undefined && b !== undefined && a !== b;
      });
    if (!hayQueContar) {
      // Salto directo. Si el render ya mostró el destino (montar, `activo: false`), no hace
      // falta otro; si mostró lo viejo (reducir movimiento a media animación), sí.
      const yaSeVeia = firmaDe(desde) === firmaDe(hasta);
      enPantalla.current = hasta;
      if (!yaSeVeia && !saltar) setCuadros((n) => n + 1);
      return;
    }

    // El reloj avanza con `performance.now()` y a lo mas `PASO_MAXIMO_MS` por cuadro. Medido en
    // `/catalogo`: el ajuste llega junto con un render pesado (la tarjeta, la grafica) y el primer
    // cuadro salia medio segundo tarde; contando el tiempo real, los 600 ms ya se habian ido y el
    // numero brincaba casi al final. Asi, un cuadro atorado frena la cuenta en vez de comersela.
    let transcurrido = 0;
    let anterior: number | undefined;
    const paso = () => {
      const ahora = performance.now();
      transcurrido += anterior === undefined ? 0 : Math.min(ahora - anterior, PASO_MAXIMO_MS);
      anterior = ahora;
      const t = duracionMs <= 0 ? 1 : Math.min(1, transcurrido / duracionMs);
      const e = suavizar(t);
      const siguiente: Valores = {};
      for (const k of Object.keys(hasta)) {
        const entero = typeof redondear === "function" ? redondear(k) : redondear;
        siguiente[k] = interpolar(limpio(desde[k]), limpio(hasta[k]), t >= 1 ? 1 : e, entero);
      }
      enPantalla.current = siguiente;
      setCuadros((n) => n + 1);
      cuadro.current = t < 1 ? requestAnimationFrame(paso) : null;
    };
    cuadro.current = requestAnimationFrame(paso);
    // `firma` resume `destino` por valor: un objeto nuevo con los mismos números no reanima. Y
    // `redondear` se lee del cuadro en curso: una función nueva en cada render no reanima.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firma, saltar, duracionMs]);

  useEffect(
    () => () => {
      if (cuadro.current !== null) cancelAnimationFrame(cuadro.current);
    },
    [],
  );

  if (saltar) return destino;
  // Las llaves del destino, con lo que está en pantalla; una llave nueva sale ya en su destino.
  const visto = enPantalla.current;
  const salida: Valores = {};
  for (const k of Object.keys(destino)) {
    const ahora = limpio(visto[k]);
    salida[k] = ahora === undefined || limpio(destino[k]) === undefined ? destino[k] : ahora;
  }
  return salida as T & Valores;
}

/** Un solo número. Ver `usarValoresAnimados`. */
export function usarValorAnimado(valor: number | undefined, opciones?: OpcionesDeTransicion): number | undefined {
  return usarValoresAnimados({ v: valor }, opciones).v;
}

/**
 * Un número que cuenta cuando cambia (`usarValorAnimado`), en su propio componente para que cada
 * cuadro repinte solo este texto y no la tarjeta. Va DENTRO del `<span>` que lleva las clases
 * (`monto`, `cifra`, el resaltado): no agrega elementos, así que la entrada y el resaltado siguen
 * iguales. `formato` recibe el valor del cuadro; default, pesos desde centavos.
 */
export function NumeroAnimado({
  valor,
  formato = formatearMonto,
  ...opciones
}: { valor: number; formato?: (valor: number) => ReactNode } & OpcionesDeTransicion) {
  const visto = usarValorAnimado(valor, opciones) ?? valor;
  return createElement(Fragment, null, formato(visto));
}

/**
 * `false` hasta que el valor cambia por primera vez (de un valor a otro, no al llegar el dato),
 * y `true` desde ese mismo render. Para `isAnimationActive` de Recharts: ver la cabecera.
 */
export function usarYaCambio(valor: string | number | undefined): boolean {
  const [visto, setVisto] = useState(valor);
  const [cambio, setCambio] = useState(false);
  if (!Object.is(visto, valor)) {
    setVisto(valor);
    if (!cambio && visto !== undefined && valor !== undefined) setCambio(true);
  }
  return cambio;
}

/**
 * `false` en el primer render, `true` desde que la tarjeta ya está en pantalla. Para las gráficas
 * de Recharts que anima la propia librería: `isAnimationActive={yaMontado}` deja la entrada a
 * `Grafica` (CSS `animar-trazo`) y solo anima las actualizaciones. Donde la gráfica depende de un
 * control que la persona arrastra, combínalo con "no está arrastrando".
 */
export function usarYaMontado(): boolean {
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  return montado;
}
