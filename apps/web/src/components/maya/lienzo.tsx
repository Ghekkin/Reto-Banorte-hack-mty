"use client";

import { Superficie } from "@maya/a2ui";
import type { Accion, EstadoSuperficie } from "@maya/a2ui";
import { LayoutGrid } from "lucide-react";

/**
 * El lienzo: la rejilla bento donde el agente coloca lo que construye. Cada componente
 * ocupa una o dos columnas segun su prop `ancho` (skill `diseno-banorte`); a 360 px,
 * una sola.
 *
 * El renderer pinta los hijos; esta rejilla solo les da el hueco. Por eso este archivo
 * no sabe nada de plan de pago, gasto ni metas: si supiera, el catalogo dejaria de ser
 * intercambiable.
 */
export function Lienzo({
  superficie,
  conversacionId,
  alAccionar,
  vacio,
}: {
  superficie: EstadoSuperficie | undefined;
  conversacionId: string;
  alAccionar: (accion: Accion) => void;
  vacio?: React.ReactNode;
}) {
  const hayAlgo = superficie && superficie.componentes.size > 0;

  return (
    <div className="grid gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3 [&>[data-ancho=amplio]]:md:col-span-2">
      {hayAlgo ? (
        <Superficie superficie={superficie} conversacionId={conversacionId} alAccionar={alAccionar} />
      ) : (
        vacio
      )}
    </div>
  );
}

/**
 * PLACEHOLDER del lienzo, a proposito.
 *
 * Aqui van los componentes del catalogo A2UI (`PlanDePago`, `GastoPorCategoria`,
 * `SimuladorMeta`...). Hoy 7 de los 8 son carpetas con README y sin codigo, asi que en
 * vez de inventar tarjetas falsas se dibuja el hueco y se dice que va en el.
 *
 * Un placeholder honesto es mejor que una maqueta que el jurado confunda con lo real.
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
      <p className="text-xs text-muted-foreground/70">
        Los componentes del catálogo se conectan en el siguiente paso.
      </p>
    </div>
  );
}
