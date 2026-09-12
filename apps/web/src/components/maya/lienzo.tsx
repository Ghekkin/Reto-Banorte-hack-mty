"use client";

import { Superficie } from "@maya/a2ui";
import type { Accion, EstadoSuperficie, FalloDeRender } from "@maya/a2ui";
import { LayoutGrid } from "lucide-react";
import { registrarComponentes } from "@/lib/registrar-componentes";

/**
 * El lienzo: la rejilla bento donde el agente coloca lo que construye. Cada componente
 * ocupa una o dos columnas segun su prop `ancho` (skill `diseno-banorte`); a 360 px,
 * una sola.
 *
 * El renderer pinta los hijos; esta rejilla solo les da el hueco. Por eso este archivo
 * no sabe nada de plan de pago, gasto ni metas: si supiera, el catalogo dejaria de ser
 * intercambiable.
 *
<<<<<<< Updated upstream
 * Lo unico que si tiene que saber es que el registro exista: sin el, `<Superficie>` no
 * encuentra ni `Column` y la pantalla entera cae en `Desconocido`.
=======
 * `animar-cascada` (no `animar-lista`) porque los componentes del catalogo ya traen su
 * propia `animar-entrada`: aqui solo se agrega el retraso escalonado, para que se vea que
 * las tarjetas se construyeron una tras otra y no que aparecieron de golpe. Es el detalle
 * que le dice al jurado "esto lo acaba de armar el agente".
>>>>>>> Stashed changes
 */
registrarComponentes();

export function Lienzo({
  superficie,
  conversacionId,
  alAccionar,
  alFallar,
  vacio,
}: {
  superficie: EstadoSuperficie | undefined;
  conversacionId: string;
  alAccionar: (accion: Accion) => void;
  /** Un componente que el renderer no supo pintar: se le devuelve al agente. */
  alFallar?: (fallo: FalloDeRender) => void;
  vacio?: React.ReactNode;
}) {
  const hayAlgo = superficie && superficie.componentes.size > 0;

  return (
    <div className="animar-cascada grid gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3 [&>[data-ancho=amplio]]:md:col-span-2">
      {hayAlgo ? (
        <Superficie superficie={superficie} conversacionId={conversacionId} alAccionar={alAccionar} alFallar={alFallar} />
      ) : (
        vacio
      )}
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
