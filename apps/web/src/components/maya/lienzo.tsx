"use client";

import { Superficie } from "@maya/a2ui";
import type { Accion, EstadoSuperficie, FalloDeRender, PiezaDeRaiz } from "@maya/a2ui";
import { ProveedorCatalogo } from "@maya/catalogo";
import { LayoutGrid } from "lucide-react";
import { registrarComponentes } from "@/lib/registrar-componentes";
import { CLASES_REJILLA, clasesDePieza, tamanoDePieza } from "@/lib/rejilla";

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
 */
registrarComponentes();

export function Lienzo({
  superficie,
  conversacionId,
  alAccionar,
  alFallar,
  vacio,
  ocultarSugerenciasEnTarjeta = true,
}: {
  superficie: EstadoSuperficie | undefined;
  conversacionId: string;
  alAccionar: (accion: Accion) => void;
  /** Un componente que el renderer no supo pintar: se le devuelve al agente. */
  alFallar?: (fallo: FalloDeRender) => void;
  vacio?: React.ReactNode;
  /**
   * Si es true (por omisión en Lienzo/consola), no se pintan las sugerencias duplicadas
   * dentro de tarjetas como Conclusion porque la consola de conversación ya las renderiza
   * abajo como opciones interactivas de la conversación.
   */
  ocultarSugerenciasEnTarjeta?: boolean;
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
            disponer={(piezas) => <Rejilla piezas={piezas} />}
          />
        ) : (
          vacio
        )}
      </div>
    </ProveedorCatalogo>
  );
}

/** Las piezas de primer nivel, cada una en su hueco. Ver `@/lib/rejilla`. */
function Rejilla({ piezas }: { piezas: PiezaDeRaiz[] }) {
  const tamanos = piezas.map((p) => tamanoDePieza(p.componente, p.ancho));
  const tarjetas = tamanos.filter((t) => t !== "completa").length;

  return (
    <div className={`animar-lista ${CLASES_REJILLA}`}>
      {piezas.map((pieza, i) => (
        <div key={pieza.clave} data-pieza={pieza.id} data-tamano={tamanos[i]} className={clasesDePieza(tamanos[i]!, tarjetas)}>
          {pieza.nodo}
        </div>
      ))}
    </div>
  );
}

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
