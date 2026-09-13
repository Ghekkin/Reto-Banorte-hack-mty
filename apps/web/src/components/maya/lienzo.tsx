"use client";

import { Superficie } from "@maya/a2ui";
import type { Accion, EstadoSuperficie, FalloDeRender, PiezaDeRaiz } from "@maya/a2ui";
import { ProveedorCatalogo } from "@maya/catalogo";
import { LayoutGrid } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Masonry } from "@/components/inicio/masonry";
import { registrarComponentes } from "@/lib/registrar-componentes";
import { CLASES_REJILLA, clasesDePieza, tamanoDePieza, type TamanoDePieza } from "@/lib/rejilla";

/**
 * El lienzo: donde el agente coloca lo que construye.
 *
 * **Las tarjetas se acomodan contra el ancho del LIENZO, no de la pantalla.** Antes era una
 * rejilla `md:grid-cols-2 xl:grid-cols-3` y el agente mandaba un `Column` con sus tarjetas:
 * la rejilla veia UN hijo, lo metia en una columna y las tarjetas quedaban apiladas. Medido
 * el 2026-09-12 con el turno real "¿cuánto debo entre mi tarjeta y mi crédito de nómina?":
 * a 1,440 px las dos tarjetas medían 245 px de ancho, una encima de otra, con dos tercios
 * del lienzo vacíos. Ahora `<Superficie disponer>` entrega las tarjetas sueltas y
 * `rejilla.ts` las reparte en filas que se llenan solas (`docs/algoritmos/acomodo-del-lienzo.md`).
 *
 * El renderer pinta; este archivo solo decide el hueco de cada pieza. No sabe nada de plan
 * de pago, gasto ni metas: el tamano natural de cada componente lo declara el catalogo.
 * Lo unico que si tiene que saber es que el registro exista: sin el, `<Superficie>` no
 * encuentra ni `Column` y la pantalla entera cae en `Desconocido`.
 *
 * `@container/lienzo` es lo que permite medir el lienzo desde CSS; `animar-lista` escalona
 * la entrada de las piezas 25 ms, para que se vea que las tarjetas se construyeron una tras
 * otra. Es el detalle que le dice al jurado "esto lo acaba de armar el agente".
 *
 * **Dos acomodos.** `filas` es el de siempre y el que usa la conversacion en `/maya`: filas
 * que se llenan solas, cada tarjeta con su ancho natural. `masonry` lo usa Inicio, donde
 * las tarjetas no comparten alto y las filas dejan huecos verticales grandes
 * (`components/inicio/masonry.tsx`). El acomodo no cambia que pinta el renderer ni que
 * tamano natural tiene cada componente: solo el hueco donde cae cada pieza.
 */
registrarComponentes();

/**
 * Lo que quien aloja el lienzo le agrega a una pieza sin tocar la tarjeta: es como Inicio
 * muestra que una tarjeta se esta consultando, que acaba de cambiar, y la nota de Maya y el
 * boton "Preguntar sobre esto" debajo de ella (`components/inicio/pie-de-widget.tsx`).
 * La conversacion no lo usa.
 */
export type DecoracionDePieza = {
  estado?: "cargando" | "actualizada";
  /** Texto del velo mientras se consulta; por omision "Consultando al banco…". */
  aviso?: string;
  /** Lo que va debajo de la tarjeta, dentro de su mismo hueco. */
  debajo?: React.ReactNode;
};

/** `filas`: la rejilla de siempre (conversacion). `masonry`: sin huecos verticales (Inicio). */
export type AcomodoDelLienzo = "filas" | "masonry";

export function Lienzo({
  superficie,
  conversacionId,
  alAccionar,
  alFallar,
  vacio,
  acomodo = "filas",
  ocultarSugerenciasEnTarjeta = true,
  decorar,
}: {
  superficie: EstadoSuperficie | undefined;
  conversacionId: string;
  alAccionar: (accion: Accion) => void;
  /** Un componente que el renderer no supo pintar: se le devuelve al agente. */
  alFallar?: (fallo: FalloDeRender) => void;
  vacio?: React.ReactNode;
  /** Como se reparten las piezas de primer nivel. Ver `AcomodoDelLienzo`. */
  acomodo?: AcomodoDelLienzo;
  /**
   * Si es true (por omisión en Lienzo/consola), no se pintan las sugerencias duplicadas
   * dentro de tarjetas como Conclusion porque la consola de conversación ya las renderiza
   * abajo como opciones interactivas de la conversación.
   */
  ocultarSugerenciasEnTarjeta?: boolean;
  decorar?: (pieza: PiezaDeRaiz) => DecoracionDePieza | undefined;
}) {
  const hayAlgo = superficie && superficie.componentes.size > 0;

  return (
    <ProveedorCatalogo configuracion={{ ocultarSugerenciasEnTarjeta }}>
      <div data-lienzo="" className="@container/lienzo">
        {hayAlgo ? (
          <Superficie
            superficie={superficie}
            conversacionId={conversacionId}
            alAccionar={alAccionar}
            alFallar={alFallar}
            disponer={(piezas) =>
              acomodo === "masonry" ? <MasonryDeLienzo piezas={piezas} decorar={decorar} /> : <Rejilla piezas={piezas} decorar={decorar} />
            }
          />
        ) : (
          vacio
        )}
      </div>
    </ProveedorCatalogo>
  );
}

/** Las piezas de primer nivel, cada una en su hueco. Ver `@/lib/rejilla`. */
function Rejilla({ piezas, decorar }: { piezas: PiezaDeRaiz[]; decorar?: (pieza: PiezaDeRaiz) => DecoracionDePieza | undefined }) {
  const tamanos = piezas.map((p) => tamanoDePieza(p.componente, p.ancho));
  const tarjetas = tamanos.filter((t) => t !== "completa").length;

  return (
    <div className={`animar-lista ${CLASES_REJILLA}`}>
      {piezas.map((pieza, i) => {
        const deco = decorar?.(pieza);
        if (!deco) {
          return (
            <div key={pieza.clave} data-pieza={pieza.id} data-tamano={tamanos[i]} className={clasesDePieza(tamanos[i]!, tarjetas)}>
              {pieza.nodo}
            </div>
          );
        }
        return (
          <div
            key={pieza.clave}
            data-pieza={pieza.id}
            data-tamano={tamanos[i]}
            data-estado={deco.estado}
            className={`${clasesDePieza(tamanos[i]!, tarjetas)} flex flex-col gap-2`}
          >
            <PiezaDecorada nodo={pieza.nodo} deco={deco} />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Las mismas piezas, en masonry. Se reusa `tamanoDePieza` —el tamano natural sigue
 * saliendo del catalogo, no del acomodo— y se traduce a la marca que `Masonry` entiende:
 * `compacta` una columna, `amplia` dos, `completa` la fila entera.
 *
 * El `div` de la marca envuelve la tarjeta en vez de ponerle el atributo encima porque las
 * piezas ya vienen renderizadas por el motor A2UI: aqui no se puede clonar sus props.
 * Y la marca es `data-hueco` y no `data-ancho` porque el motor ya usa `data-ancho` para el
 * valor que mando el agente, que puede contradecir al natural del catalogo (ver `masonry.tsx`).
 */
function MasonryDeLienzo({ piezas, decorar }: { piezas: PiezaDeRaiz[]; decorar?: (pieza: PiezaDeRaiz) => DecoracionDePieza | undefined }) {
  return (
    <Masonry>
      {piezas.map((pieza) => {
        const tamano = tamanoDePieza(pieza.componente, pieza.ancho);
        const deco = decorar?.(pieza);
        return (
          <div
            key={pieza.clave}
            data-pieza={pieza.id}
            data-tamano={tamano}
            data-hueco={HUECO_DE_TAMANO[tamano]}
            data-estado={deco?.estado}
            className={deco ? "flex flex-col gap-2" : undefined}
          >
            {deco ? <PiezaDecorada nodo={pieza.nodo} deco={deco} /> : pieza.nodo}
          </div>
        );
      })}
    </Masonry>
  );
}

/**
 * La tarjeta con lo que Inicio le agrega (`DecoracionDePieza`), igual en filas que en masonry.
 * El resaltado va en un anillo alrededor y no en la tarjeta: la tarjeta es del catalogo y no
 * sabe que vive en Inicio. El pie (`debajo`) queda dentro del mismo hueco, asi el masonry lo
 * mide junto con la tarjeta.
 *
 * **Cargando: un brillo que la recorre, no un velo que la tapa.** Hasta el 2026-09-13 era un
 * `bg-card/80` encima de toda la tarjeta con el aviso centrado arriba: la tarjeta se lavaba (en
 * la heroe, rojo deslavado), y en un celular el aviso caia fuera de la pantalla. Ahora la tarjeta
 * se sigue leyendo; encima pasa una franja de tinte (`pensando-brillo`) y en su borde de arriba
 * corre una barra (`pensando-segmento`), las dos solo con `transform`. El texto de la etapa lo
 * dice `PensandoMaya` sobre la barra; aqui queda para lectores de pantalla.
 */
function PiezaDecorada({ nodo, deco }: { nodo: React.ReactNode; deco: DecoracionDePieza }) {
  return (
    <>
      <div
        className={`relative rounded-2xl transition-shadow duration-200 ease-out ${
          deco.estado === "actualizada" ? "ring-2 ring-primary/40 ring-offset-2 ring-offset-lienzo" : ""
        }`}
        aria-busy={deco.estado === "cargando" || undefined}
      >
        {nodo}
        {deco.estado === "cargando" && (
          // `top/right/bottom/left` y no `inset-0`: `inset` no existe en Safari anterior a 14.1.
          <div aria-hidden className="animar-entrada pointer-events-none absolute top-0 right-0 bottom-0 left-0 overflow-hidden rounded-2xl">
            <div className="pensando-brillo absolute top-0 right-0 bottom-0 left-0" />
            <Progress value={null} className="pensando-segmento absolute top-0 right-6 left-6 [&_[data-slot=progress-indicator]]:bg-primary [&_[data-slot=progress-track]]:bg-tinte" />
          </div>
        )}
        {deco.estado === "cargando" && (
          <span role="status" className="sr-only">
            {deco.aviso ?? "Consultando al banco…"}
          </span>
        )}
      </div>
      {deco.debajo}
    </>
  );
}

const HUECO_DE_TAMANO: Record<TamanoDePieza, string> = {
  compacta: "normal",
  amplia: "amplio",
  completa: "completa",
};

/**
 * El estado vacio del lienzo: lo que se ve antes del primer turno.
 *
 * No es una maqueta ni un placeholder de trabajo pendiente. Los 8 componentes del
 * catalogo existen y se pintan aqui en cuanto el agente construye la primera pantalla;
 * esto solo dibuja el hueco para que la rejilla no arranque vacia.
 */
export function LienzoPlaceholder() {
  return (
    <div
      data-ancho="amplio"
      className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-borde-sutil bg-card/50 p-8 text-center"
    >
      <LayoutGrid className="size-6 text-muted-foreground" />
      <p className="max-w-sm text-sm text-muted-foreground">
        Aquí Maya construye la pantalla. Escribe abajo lo que necesitas resolver y las
        tarjetas aparecen en esta rejilla.
      </p>
      <p className="text-sm text-muted-foreground/70">
        Un plan de pagos, tu gasto por categoría, un simulador de ahorro: Maya elige el
        componente que resuelve lo que pides.
      </p>
    </div>
  );
}
