"use client";

import { useEffect, useState } from "react";

/**
 * «Esto acaba de cambiar»: resaltar un número un momento cuando el agente lo parchea.
 *
 * ## Por que hace falta
 *
 * Con el ciclo live (`ajustar_pantalla`) la tarjeta ya no se vuelve a pintar: el agente
 * parchea sus props y la MISMA tarjeta re-renderiza, sin esqueleto y sin la entrada de
 * `animar-tarjeta`. Es lo correcto —nada parpadea, nada se pierde—, pero tiene un costo: la
 * persona escribe «¿y si pago $6,000 al mes?», el plazo pasa de 15 a 11 meses, y si no
 * estaba mirando justo ese número **no se entera de qué cambió**. Un cambio que no se ve es,
 * para quien lo pidió, un cambio que no pasó.
 *
 * El primer caso es `ProyeccionPagoCredito` (mensualidad, meses, intereses); lo van a usar
 * `GastoPorCategoria`, `SimuladorMeta` y `PlanDePago` en cuanto sus parches lleguen.
 *
 * ## Que cuenta como cambio
 *
 * Solo pasar de un valor a OTRO valor. No resalta:
 *
 *  - **al montar**: una tarjeta recién pintada ya entra con su propia animación; resaltar
 *    ademas cada número seria ruido (y todo resaltado es no resaltar nada);
 *  - **cuando llega el dato** (`undefined` → valor): es el esqueleto que se llena porque el
 *    data model llegó después que los componentes, no un ajuste;
 *  - **cuando el dato se va** (valor → `undefined`): un repintado que pasa por el esqueleto.
 *
 * Compara con `Object.is`, así que se usa con primitivos (centavos, meses, un id). Un
 * arreglo resuelto del data model puede ser otra referencia en cada render y resaltaría
 * siempre.
 *
 * ## Por que se ajusta en el render y el apagado va en un efecto
 *
 * Igual que `usarEstadoSeguido` (`estado.ts`): detectar el cambio se hace DURANTE el render,
 * con el setter, para que el primer frame con el número nuevo ya salga resaltado (con
 * `useEffect` se pintaría un frame sin resaltar y luego el resaltado: se ve como un
 * parpadeo). Apagarlo sí es un efecto, porque es un temporizador, y se limpia al desmontar o
 * si el valor vuelve a cambiar antes de tiempo (el contador `vuelta` reinicia la cuenta: dos
 * parches seguidos dejan el resaltado encendido 1.5 s desde el último).
 *
 * ## Movimiento reducido
 *
 * El tinte es información ("este cambió") y no mueve nada, así que aparece para todos. Lo
 * que es movimiento es el desvanecido de entrada y salida: va con `motion-safe:`, y quien
 * pidió movimiento reducido ve el tinte encenderse y apagarse sin transición. La línea
 * «antes → después» de la tarjeta dice lo mismo en palabras, para quien no lo vio.
 */

/** Cuánto dura encendido. Suficiente para que el ojo llegue desde el chat a la tarjeta. */
export const DURACION_RESALTADO_MS = 1500;

export function usarCambio<T>(valor: T, duracionMs: number = DURACION_RESALTADO_MS): boolean {
  const [visto, setVisto] = useState(valor);
  const [activo, setActivo] = useState(false);
  const [vuelta, setVuelta] = useState(0);

  if (!Object.is(visto, valor)) {
    setVisto(valor);
    if (cuentaComoCambio(visto, valor)) {
      setActivo(true);
      setVuelta((v) => v + 1);
    }
  }

  useEffect(() => {
    if (!activo) return;
    const temporizador = setTimeout(() => setActivo(false), duracionMs);
    return () => clearTimeout(temporizador);
  }, [activo, vuelta, duracionMs]);

  return activo;
}

/** La decisión, pura: ¿pasar de `antes` a `ahora` merece resaltarse? */
export function cuentaComoCambio(antes: unknown, ahora: unknown): boolean {
  if (Object.is(antes, ahora)) return false;
  if (antes === undefined || antes === null) return false;
  if (ahora === undefined || ahora === null) return false;
  return true;
}

/**
 * Las clases del número resaltado. `-mx-1 px-1` le da aire al tinte sin mover el texto de
 * su lugar. Sobre el degradado de la heroe el tinte rosa no se ve: va blanco translúcido.
 */
export function clasesResaltado(activo: boolean, heroe = false): string {
  const base = "-mx-1 rounded-md px-1 motion-safe:transition-colors motion-safe:duration-200 motion-safe:ease-out";
  if (!activo) return base;
  return `${base} ${heroe ? "bg-white/25" : "bg-tinte"}`;
}

/**
 * El mismo tinte para un BLOQUE que ya trae su padding y su radio (una fila de lista), en vez
 * de un número suelto: sin `-mx-1 px-1 rounded-md`, que pelearían con los de la fila.
 */
export function clasesResaltadoBloque(activo: boolean, heroe = false): string {
  const base = "motion-safe:transition-colors motion-safe:duration-200 motion-safe:ease-out";
  if (!activo) return base;
  return `${base} ${heroe ? "bg-white/25" : "bg-tinte"}`;
}
