/**
 * Como se ensenan los datos personales en Mas. Funciones puras, sin base ni React, para que
 * las pruebas no dependan de nada.
 *
 * La regla es la de la skill `diseno-banorte`: un dato sensible se ve enmascarado, como el
 * `•••• 4821` de las tarjetas. En un proyector cualquiera lee la pantalla, y aunque los
 * datos sean sinteticos, la costumbre de pintarlos completos es la que termina filtrando
 * uno real.
 */

/** `alberto.ramirez@ejemplo.mx` -> `al•••••@ejemplo.mx`. El dominio se queda: dice que correo es. */
export function enmascararCorreo(correo: string): string {
  const arroba = correo.lastIndexOf("@");
  if (arroba < 1) return "•••••";
  const usuario = correo.slice(0, arroba);
  const visibles = usuario.length > 4 ? 2 : 1;
  return `${usuario.slice(0, visibles)}•••••${correo.slice(arroba)}`;
}

/** `+52 81 1000 0002` -> `•••• 0002`: los ultimos cuatro digitos, como una tarjeta. */
export function enmascararTelefono(telefono: string): string {
  const digitos = telefono.replace(/\D/g, "");
  if (digitos.length < 4) return "••••";
  return `•••• ${digitos.slice(-4)}`;
}

/**
 * Anos completos entre `desde` ("AAAA-MM-DD") y `hoy`. Un aniversario que todavia no llega
 * este ano no cuenta: quien entro el 15 de febrero de 2016 cumple 10 anos el 15 de febrero
 * de 2026, no el 1 de enero.
 */
export function anosDesde(desde: string, hoy: Date): number {
  const [anio, mes, dia] = desde.split("-").map(Number);
  if (!anio || !mes || !dia) return 0;
  let anos = hoy.getFullYear() - anio;
  const yaCumplio = hoy.getMonth() + 1 > mes || (hoy.getMonth() + 1 === mes && hoy.getDate() >= dia);
  if (!yaCumplio) anos -= 1;
  return Math.max(0, anos);
}

/** "Cliente desde 2016 · 10 años". Menos de un ano no se cuenta en anos. */
export function textoAntiguedad(desde: string, hoy: Date): string {
  const anio = desde.slice(0, 4);
  const anos = anosDesde(desde, hoy);
  if (anos < 1) return `Cliente desde ${anio}`;
  return `Cliente desde ${anio} · ${anos} ${anos === 1 ? "año" : "años"}`;
}

export const ETIQUETA_SEGMENTO = {
  nomina: "Nómina",
  preferente: "Preferente",
  patrimonial: "Patrimonial",
} as const;
