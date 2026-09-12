"use client";

import { Superficie } from "@maya/a2ui";
import type { Accion, EstadoSuperficie } from "@maya/a2ui";

/**
 * El lienzo es una rejilla bento donde el agente coloca lo que genera. Cada
 * componente ocupa una o dos columnas segun su prop `ancho` (skill
 * `diseno-banorte`); a 400 px, una sola columna.
 *
 * El renderer pinta los hijos; esta rejilla solo les da el hueco.
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
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 [&>[data-ancho=amplio]]:md:col-span-2">
      {hayAlgo ? (
        <Superficie superficie={superficie} conversacionId={conversacionId} alAccionar={alAccionar} />
      ) : (
        vacio
      )}
    </div>
  );
}
