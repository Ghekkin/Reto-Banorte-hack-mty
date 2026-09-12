/**
 * Los montos viajan en centavos por todo el sistema (tools, data model, props) y
 * se formatean SOLO al pintar. Un `toFixed` suelto en un componente es un bug.
 */
export function formatearMonto(centavos: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(centavos / 100);
}

/** El CAT y el uso del limite llegan como fraccion: 0.621 -> "62.1%". */
export function formatearPorcentaje(fraccion: number): string {
  return new Intl.NumberFormat("es-MX", { style: "percent", maximumFractionDigits: 1 }).format(fraccion);
}

/** "2026-10-05" -> "5 de octubre". */
export function formatearFecha(iso: string): string {
  const [anio, mes, dia] = iso.split("-").map(Number);
  if (!anio || !mes || !dia) return iso;
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long" }).format(new Date(anio, mes - 1, dia));
}
