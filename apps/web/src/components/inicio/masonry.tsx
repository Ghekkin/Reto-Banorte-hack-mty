"use client";

import { Children, isValidElement, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTransicionDeInicio } from "@/components/inicio/transicion-inicio";
import { cn } from "@/lib/utils";

/**
 * La rejilla de Inicio: masonry de verdad, sin huecos verticales.
 *
 * **El problema.** Las tarjetas de Inicio no miden lo mismo —una conclusion 290 px, el gasto
 * por categoria con su grafica 450 px, el detalle 480 px— y hasta ahora se acomodaban en
 * filas (`grid` en la portada programada, `flex-wrap items-start` en el lienzo de Maya).
 * En una fila, la siguiente empieza debajo de la tarjeta MAS ALTA de la anterior: junto a
 * una tarjeta de 480 px, una de 290 deja 190 px de lienzo gris muertos, y con tres columnas
 * eso pasa dos veces por fila.
 *
 * **La idea.** Se hace la rejilla de filas finisimas (4 px) y cada tarjeta ocupa las filas
 * que de verdad necesita. Asi la colocacion automatica de CSS Grid, que busca el primer
 * hueco libre recorriendo fila por fila, mete la tarjeta que sigue en la columna que se
 * quedo corta —que es exactamente lo que hace un masonry— sin cambiar el orden de lectura
 * ni perder que una tarjeta ancha ocupe el doble. El algoritmo completo, con sus numeros y
 * sus limites, esta en `docs/algoritmos/masonry-del-inicio.md`.
 *
 * **Por que hay JS.** Cuantas filas ocupa una tarjeta depende de su alto, y el alto solo
 * lo sabe el navegador: `grid-template-rows: masonry` sigue sin estar en ningun navegador
 * estable, y la alternativa sin JS (`columns`) obliga a que todas las tarjetas midan lo
 * mismo de ancho —adios tarjeta ancha— y ordena de arriba a abajo por columna, asi que la
 * segunda tarjeta en importancia aparece al fondo de la primera columna.
 *
 * **Degrada bien.** Antes de que el JS mida, y si nunca corre, `medido` es `false` y esto
 * es la misma rejilla de filas de siempre con su `gap`: se ve como antes, no roto.
 */

/**
 * El alto de una fila de la rejilla.
 *
 * El hueco visible entre dos tarjetas de la misma columna es `filas * UNIDAD - alto`, o sea
 * el `gap` del sistema mas lo que sobre del redondeo: con la unidad en 4 px el hueco queda
 * entre 16 y 20 px (medido en el navegador: 17-19), y nunca por debajo del `gap`. Con 8 px
 * se iba a 20-23, que ya se nota junto a un `gap-4`; con 1 px la rejilla tendria miles de
 * filas y el layout se siente en un portatil.
 */
export const UNIDAD_FILA = 4;

/**
 * `useLayoutEffect` avisa por consola cuando corre en el servidor, y esto se pinta en el
 * servidor (Inicio es un componente de servidor) y en las pruebas con `renderToStaticMarkup`.
 * En el navegador tiene que ser el de layout: medir en `useEffect` seria despues del primer
 * pintado y se veria un salto de la rejilla de filas a la de masonry.
 */
const useEfectoDeMedicion = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Cuanto ocupa cada tarjeta a lo ancho. Lo declara quien pone la tarjeta, con
 * `data-hueco` en el hijo directo: `MasonryDeLienzo` lo traduce del tamano natural del
 * catalogo, y la portada programada lo escribe a mano.
 */
export type HuecoDeTarjeta = "normal" | "amplio" | "completa";

/**
 * **La rejilla base es de 6 columnas, no de 3.** Con 3 columnas, `amplio` tenia que ocupar
 * 2 y una portada de tres tarjetas anchas —que es la portada tipica que arma Maya— dejaba
 * la tercera columna entera vacia: medido el 2026-09-13 a 1,440 px, el contenido usaba
 * 754 de 1,139 px y sobraban 385 px de lienzo gris a la derecha.
 *
 * Con 6, `amplio` son 3 (media rejilla): dos tarjetas anchas caben lado a lado y la tercera
 * baja a la columna que se quedo corta, usando el ancho completo. Y `normal` son 2 de 6, o
 * sea tres por fila, con el mismo minimo de 18rem que fija el acomodo del lienzo.
 *
 * A partir de `@2xl` (42rem) hay dos columnas de tarjeta y `amplio` ocupa el ancho entero;
 * de `@5xl` (64rem) en adelante, tres. Por debajo de `@2xl` la rejilla es de UNA columna y
 * los `col-span` NO se aplican: en una rejilla de 1 columna, un `span 3` crea columnas
 * implicitas y la tarjeta se sale de la pantalla.
 */
const CLASES_DE_HUECO: Record<HuecoDeTarjeta, string> = {
  normal: "@2xl/rejilla:col-span-3 @5xl/rejilla:col-span-2",
  amplio: "@2xl/rejilla:col-span-6 @5xl/rejilla:col-span-3",
  completa: "@2xl/rejilla:col-span-6",
};

/** Lo que declara el hijo. Cualquier otra cosa cuenta como `normal`. */
function huecoDe(celda: React.ReactNode): HuecoDeTarjeta {
  if (!isValidElement<Record<string, unknown>>(celda)) return "normal";
  const declarado = celda.props["data-hueco"];
  return declarado === "amplio" || declarado === "completa" ? declarado : "normal";
}

/**
 * **Todas las tarjetas de una pantalla comparten ancho, y lo fija la que mas necesita.**
 *
 * Es la regla que evita el unico defecto visible que le queda a un masonry de anchos
 * mixtos: con columnas de ancho fijo, una tarjeta de 3 columnas junto a una de 2 suma 5 de
 * 6 y deja una **franja gris vertical** que atraviesa la pantalla entera. Medido el
 * 2026-09-13 a 1,440 px con la portada programada (heroe amplio + "Tus cuentas" normal):
 * el contenido usaba 946 de 1,139 px y sobraban 193 px, exactamente una columna mas su
 * hueco. Un `flex` crece para llenar la fila; una rejilla de spans fijos no puede.
 *
 * Con anchos uniformes la fila SIEMPRE cierra (3+3 o 2+2+2) y lo unico que sobra es el
 * borde inferior irregular, que es el aspecto normal de un masonry y no se lee como roto.
 *
 * El precio: una tarjeta compacta en una pantalla que trae una grafica se pinta a 561 px en
 * vez de 369. No es un problema: por dentro cada tarjeta se acomoda contra su propio ancho
 * (`@container/tarjeta`), asi que usa el espacio en vez de estirarse vacia.
 */
function anchoComun(huecos: HuecoDeTarjeta[]): HuecoDeTarjeta {
  return huecos.some((h) => h === "amplio") ? "amplio" : "normal";
}

/**
 * `true` solo en el render de HIDRATACION: la rejilla que la persona esta viendo la pinto el
 * servidor. En un montaje del cliente (navegar a Inicio, una portada nueva) es `false`.
 * Es el patron de `useSyncExternalStore` con dos instantaneas: React usa la del servidor
 * mientras hidrata y la del cliente en todo lo demas.
 */
const sinSuscripcion = () => () => {};
function usarEsHidratacion(): boolean {
  return useSyncExternalStore(
    sinSuscripcion,
    () => false,
    () => true,
  );
}

function pideMenosMovimiento(): boolean {
  return typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

/** Donde esta cada tarjeta ahora mismo (el div que se mide, no la celda). */
function posicionesDe(raiz: HTMLElement): Map<HTMLElement, DOMRect> {
  const posiciones = new Map<HTMLElement, DOMRect>();
  for (const celda of Array.from(raiz.children)) {
    const contenido = celda.firstElementChild;
    if (contenido instanceof HTMLElement) posiciones.set(contenido, contenido.getBoundingClientRect());
  }
  return posiciones;
}

/**
 * Las tarjetas se DESLIZAN a su lugar de masonry en vez de brincar.
 *
 * **El problema** (medido en https://ghekkinxmaya.tech el 2026-09-13, 1,440 px): el servidor
 * pinta la rejilla de filas (`sin-medir`) y la persona la ve; React hidrata despues, mide, y
 * las tarjetas cambian de lugar de golpe (la del gasto saltaba de la columna izquierda a la
 * derecha entre la captura de 500 ms y la de 1,500 ms). Con la hidratacion trayendo cuadros de
 * 130-240 ms, eso se sentia como que la pantalla "se traba".
 *
 * **La tecnica** es FLIP: se anota donde estaba cada tarjeta antes de medir (`posicionesDe`),
 * se mide, y en el mismo commit —antes de pintar— cada tarjeta que se movio vuelve
 * visualmente a su lugar viejo con un `transform`; en el siguiente estilo se quita, y una
 * transicion de `transform` (compuesta en la GPU, sin layout) la lleva al nuevo. Se aplica al
 * div que se mide y no a la celda, porque la celda ya anima su entrada (`animar-lista`) y
 * una animacion CSS le gana a un estilo en linea.
 *
 * Solo en la primera medicion y solo si venia del servidor: en un montaje del cliente la
 * medicion corre antes del primer pintado y no hay nada que la persona haya visto moverse.
 */
function deslizarAlMedir(antes: Map<HTMLElement, DOMRect>): void {
  const movidas: Array<[HTMLElement, number, number]> = [];
  // Primero todas las lecturas, despues todas las escrituras: intercalarlas forzaria un
  // recalculo por tarjeta.
  for (const [tarjeta, caja] of antes) {
    if (!tarjeta.isConnected) continue;
    const ahora = tarjeta.getBoundingClientRect();
    const dx = caja.left - ahora.left;
    const dy = caja.top - ahora.top;
    // Menos de 3 px es el redondeo de pasar de filas con `gap` a filas de 4 px: no se ve.
    if (Math.abs(dx) >= 3 || Math.abs(dy) >= 3) movidas.push([tarjeta, dx, dy]);
  }
  if (movidas.length === 0) return;
  for (const [tarjeta, dx, dy] of movidas) tarjeta.style.transform = `translate(${dx}px, ${dy}px)`;
  void movidas[0]![0].offsetWidth; // fija el punto de partida antes de poner la transicion
  for (const [tarjeta] of movidas) {
    tarjeta.style.transition = "transform var(--widget-entrada) var(--motion-enfatizada)";
    tarjeta.style.transform = "";
    tarjeta.addEventListener("transitionend", () => (tarjeta.style.transition = ""), { once: true });
  }
}

export function Masonry({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [medido, setMedido] = useState(false);
  const { saliendo } = useTransicionDeInicio();
  // Ver `deslizarAlMedir`: solo se desliza lo que la persona ya vio pintado por el servidor.
  // Se congela el valor del primer render: despues de hidratar el hook ya dice `false`.
  const esHidratacion = usarEsHidratacion();
  const [vieneDelServidor] = useState(esHidratacion);
  const primeraMedicion = useRef(true);
  const posicionesAntes = useRef<Map<HTMLElement, DOMRect> | null>(null);

  const celdas = Children.toArray(children);
  const huecos = celdas.map(huecoDe);
  const comun = anchoComun(huecos);
  // Si cambian las tarjetas hay que volver a observar los nodos nuevos. La cuenta no
  // basta: una portada nueva puede traer las mismas 3 tarjetas y otros nodos.
  const firma = celdas.map((celda) => (isValidElement(celda) ? String(celda.key) : "")).join("|");

  useEfectoDeMedicion(() => {
    const raiz = contenedor.current;
    if (!raiz) return;

    const medir = () => {
      // El hueco vertical sale del horizontal: es el mismo `gap` del sistema, y asi
      // cambia solo cuando cambia el breakpoint sin que aqui haya numeros repetidos.
      const hueco = Number.parseFloat(getComputedStyle(raiz).columnGap) || 0;

      let algunaMedida = false;
      for (const celda of Array.from(raiz.children) as HTMLElement[]) {
        const contenido = celda.firstElementChild as HTMLElement | null;
        if (!contenido) continue;
        const alto = contenido.getBoundingClientRect().height;

        // Una tarjeta que decidio no pintarse (`ListaTarjetas` devuelve `null` para quien no
        // tiene credito) deja una celda vacia. Sin esto se queda ocupando una fila de 4 px
        // en su columna y empuja a la siguiente tarjeta: un hueco invisible, de los que
        // cuestan media hora en encontrar. Se distingue de "todavia sin layout" por el
        // texto: una tarjeta real siempre trae algo escrito.
        const vacia = alto === 0 && contenido.textContent === "";
        celda.style.display = vacia ? "none" : "";
        if (alto === 0) continue; // vacia, o aun sin layout: la siguiente medicion la agarra

        const filas = Math.max(1, Math.ceil((alto + hueco) / UNIDAD_FILA));
        const valor = `span ${filas}`;
        // Solo si cambio: escribir el mismo valor dispara al ResizeObserver otra vez.
        if (celda.style.gridRowEnd !== valor) celda.style.gridRowEnd = valor;
        algunaMedida = true;
      }

      // Solo se pasa a modo masonry si de verdad se midio algo. Si no (jsdom, o el nodo
      // todavia sin layout), quitar el `row-gap` dejaria las tarjetas pegadas o encimadas.
      if (algunaMedida) setMedido(true);
    };

    if (primeraMedicion.current) {
      primeraMedicion.current = false;
      if (vieneDelServidor && !pideMenosMovimiento()) posicionesAntes.current = posicionesDe(raiz);
    }

    medir();

    // Un solo observador para el contenedor (cambio de ancho, cambio de columnas) y para
    // el contenido de cada celda (una grafica de Recharts que llega tarde, una fuente que
    // termina de cargar, una tarjeta que se despliega).
    //
    // La medicion NO corre dentro del callback del observador: se aplaza al siguiente
    // fotograma. Medir y escribir estilos dentro del callback es lo que produce el
    // `ResizeObserver loop completed with undelivered notifications` de la consola (se vio
    // el 2026-09-13 tras cada rebuild de Fast Refresh): el navegador entrega
    // notificaciones, nosotros cambiamos tamanos, y quedan notificaciones sin entregar en
    // el mismo ciclo. Con `requestAnimationFrame` las escrituras caen fuera de la entrega y
    // varios cambios seguidos se juntan en una sola medicion.
    let pendiente = 0;
    const observador = new ResizeObserver(() => {
      if (pendiente) return;
      pendiente = requestAnimationFrame(() => {
        pendiente = 0;
        medir();
      });
    });
    observador.observe(raiz);
    for (const celda of Array.from(raiz.children)) {
      if (celda.firstElementChild) observador.observe(celda.firstElementChild);
    }
    return () => {
      observador.disconnect();
      if (pendiente) cancelAnimationFrame(pendiente);
    };
  }, [firma]);

  // Corre en el mismo commit en que `medido` pasa a `true`, antes de que el navegador pinte.
  useEfectoDeMedicion(() => {
    const antes = posicionesAntes.current;
    if (!medido || !antes) return;
    posicionesAntes.current = null;
    deslizarAlMedir(antes);
  }, [medido]);

  return (
    // El contenedor de consulta. Existe para que las columnas se decidan contra el ancho de
    // la REJILLA y no de la pantalla, que es la misma regla del lienzo de Maya: con la
    // sidebar de 16rem puesta, la pantalla en `md` (768 px) deja un area de contenido de
    // ~490 px, y dos columnas ahi miden 235 px cada una —por debajo del minimo de 18rem que
    // fija el acomodo del lienzo—. Con `@2xl/rejilla` (42rem) la segunda columna aparece
    // cuando de verdad caben dos tarjetas.
    <div className="@container/rejilla">
      <div
        ref={contenedor}
        data-masonry={medido ? "medido" : "sin-medir"}
        className={cn(
          "grid grid-cols-1 gap-3 @2xl/rejilla:grid-cols-6 @2xl/rejilla:gap-4",
          // Nunca las dos a la vez: las dos escriben el shorthand `animation` con la misma
          // especificidad y quien gana dependeria del orden del CSS emitido (globals.css).
          saliendo ? "animar-salida-lista" : "animar-lista",
          className,
        )}
        style={medido ? { gridAutoRows: `${UNIDAD_FILA}px`, rowGap: 0 } : undefined}
      >
        {celdas.map((celda, i) => (
          <div
            key={isValidElement(celda) && celda.key ? celda.key : i}
            data-celda=""
            data-hueco={huecos[i] === "completa" ? "completa" : comun}
            // `min-w-0` para que una tabla ancha no estire su columna.
            className={cn("min-w-0", CLASES_DE_HUECO[huecos[i] === "completa" ? "completa" : comun])}
          >
            {/* El div que se mide. Tiene que existir: si midieramos la celda leeriamos el
                alto que le acabamos de imponer con `grid-row-end` y el observador entraria
                en bucle. */}
            <div data-medida="">{celda}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
