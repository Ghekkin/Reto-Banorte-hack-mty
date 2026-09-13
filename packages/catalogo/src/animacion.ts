"use client";

import { useEffect, type RefObject } from "react";

/**
 * Las tarjetas que montan fuera de la pantalla esperan a verse para animar.
 *
 * **Por que.** La coreografia de un widget (`.animar-tarjeta` en `apps/web/src/app/globals.css`
 * y `docs/como-funciona/animacion-de-widgets.md`) es CSS y arranca al montar. En un celular el
 * lienzo es de una columna y casi todas las tarjetas quedan abajo del pliegue: sin esto, la
 * grafica de la tercera tarjeta se dibujaba donde nadie la veia y, al bajar, ya estaba quieta.
 *
 * **Como.** Dos `IntersectionObserver`, cada uno compartido por todas las tarjetas. El primero
 * (`vigia`, sin margen) solo contesta una vez, al montar, si la tarjeta se ve:
 *
 *  - **Se ve, aunque sea una orilla**: no se toca nada y anima como siempre. Sin margen a
 *    proposito: con el -10 % del segundo observador, una tarjeta que el servidor ya habia
 *    pintado en la franja de abajo de la pantalla se escondia al hidratar (visto en video en
 *    Inicio, 2026-09-13: la tercera tarjeta desaparecia detras de la barra de conversacion).
 *  - **No se ve**: `data-reinicio` le quita las animaciones dos fotogramas y `data-en-espera`
 *    las deja en pausa en su primer fotograma, que es invisible. El reinicio hace falta porque
 *    Inicio llega pintado desde el servidor: cuando React hidrata, las tarjetas de abajo ya
 *    animaron (o van a medias) sin que nadie las viera. Son dos `requestAnimationFrame` y no
 *    uno porque el callback de `requestAnimationFrame` corre ANTES del recalculo de estilo de
 *    su fotograma: con uno solo, el atributo se ponia y se quitaba sin que el navegador lo
 *    viera y las animaciones no volvian a empezar.
 *  - **Asoma** (un 10 % dentro de la pantalla, segun el segundo observador, `entrada`): se
 *    quita la pausa. Si asoman varias en el mismo aviso conservan la cascada entre ellas
 *    (`--orden` 0, 1, 2…).
 *
 * **Sin lecturas forzadas.** La primera version medía cada tarjeta con `getBoundingClientRect`
 * en un efecto de layout y forzaba un reflow por tarjeta para reiniciarla. En Inicio eso cae
 * justo durante la hidratacion, que en produccion ya trae cuadros de 130-240 ms: con diez
 * tarjetas eran diez recalculos de estilo y layout seguidos. El aviso del observador llega
 * despues del layout que el navegador iba a hacer de todos modos, y todas las escrituras de un
 * aviso caen en el mismo fotograma.
 *
 * Cero estado de React: son atributos sobre el DOM, asi que nada se vuelve a renderizar. Sin
 * `IntersectionObserver` (las pruebas en jsdom) o con "reducir movimiento" no hace nada.
 */

/** Cuanto tiene que asomar la tarjeta, contado desde abajo de la pantalla. */
const MARGEN_DE_ENTRADA = "0px 0px -10% 0px";
/** El mismo tope de cascada que `.animar-lista` en `globals.css`. */
const ORDEN_MAXIMO = 4;

let vigia: IntersectionObserver | undefined;
let entrada: IntersectionObserver | undefined;

function enOrdenDeLectura(a: Element, b: Element): number {
  return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}

/** El primer aviso de cada tarjeta: ¿se ve algo de ella? */
function alMontar(avisos: IntersectionObserverEntry[]): void {
  const aReiniciar: HTMLElement[] = [];
  for (const aviso of avisos) {
    const tarjeta = aviso.target as HTMLElement;
    vigia?.unobserve(tarjeta);
    if (aviso.isIntersecting) continue; // se ve: anima como siempre
    tarjeta.setAttribute("data-reinicio", "");
    tarjeta.setAttribute("data-en-espera", "");
    aReiniciar.push(tarjeta);
    entrada?.observe(tarjeta);
  }
  if (aReiniciar.length === 0) return;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      for (const tarjeta of aReiniciar) tarjeta.removeAttribute("data-reinicio");
    }),
  );
}

/** Las que esperaban y ya asoman lo suficiente: se liberan, en cascada entre ellas. */
function alAsomar(avisos: IntersectionObserverEntry[]): void {
  const aLiberar = avisos.filter((a) => a.isIntersecting).map((a) => a.target as HTMLElement);
  aLiberar.sort(enOrdenDeLectura).forEach((tarjeta, i) => {
    entrada?.unobserve(tarjeta);
    tarjeta.style.setProperty("--orden", String(Math.min(i, ORDEN_MAXIMO)));
    tarjeta.removeAttribute("data-reinicio");
    tarjeta.removeAttribute("data-en-espera");
  });
}

export function usarEntradaAlVerse(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const tarjeta = ref.current;
    if (!tarjeta || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;

    vigia ??= new IntersectionObserver(alMontar);
    entrada ??= new IntersectionObserver(alAsomar, { rootMargin: MARGEN_DE_ENTRADA });
    const [v, e] = [vigia, entrada];
    v.observe(tarjeta);
    return () => {
      v.unobserve(tarjeta);
      e.unobserve(tarjeta);
    };
  }, [ref]);
}
