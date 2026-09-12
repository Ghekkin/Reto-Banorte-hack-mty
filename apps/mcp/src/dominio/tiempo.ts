import { config } from "../config.js";
import { tabla } from "../datos/index.js";

/**
 * El tiempo del dominio. **Los datos sinteticos terminan en una fecha fija**
 * (`db/datos/movimientos.csv` llega hasta 2026-09-12), asi que "hoy" no puede ser
 * `new Date()`: el dia del pitch, "los ultimos 30 dias" devolveria cero movimientos y
 * la demo se veria vacia.
 *
 * `hoy()` es, en este orden: `MCP_HOY` si esta puesta, o la fecha del movimiento mas
 * reciente. Deterministico y a prueba de que el reto se alargue un dia.
 *
 * Todas las fechas del repo son de Monterrey (UTC-6) y viajan como `AAAA-MM-DD`.
 */
let cacheHoy: string | undefined;

export function hoy(): string {
  if (cacheHoy) return cacheHoy;
  if (config.hoy) {
    cacheHoy = config.hoy;
    return cacheHoy;
  }
  let maxima = "";
  for (const fila of tabla("movimientos")) {
    const f = fila.fecha ?? "";
    if (f > maxima) maxima = f;
  }
  cacheHoy = maxima || "2026-09-12";
  return cacheHoy;
}

/** El periodo (`AAAA-MM`) al que pertenece una fecha. */
export function periodoDe(fechaISO: string): string {
  return fechaISO.slice(0, 7);
}

/** El periodo inmediato anterior. `2026-01` -> `2025-12`. */
export function periodoAnterior(periodo: string): string {
  const anio = Number(periodo.slice(0, 4));
  const mes = Number(periodo.slice(5, 7));
  return mes === 1 ? `${anio - 1}-12` : `${anio}-${String(mes - 1).padStart(2, "0")}`;
}

/**
 * Suma meses a una fecha manteniendo el dia. Si el dia no existe en el mes destino
 * (31 de enero + 1 mes), cae al ultimo dia del mes: es lo que hace un banco con la
 * fecha de corte y evita pagos "el 31 de febrero".
 */
export function sumarMeses(fechaISO: string, meses: number): string {
  const [anio, mes, dia] = fechaISO.split("-").map(Number) as [number, number, number];
  const total = (anio * 12 + (mes - 1)) + meses;
  const anioDestino = Math.floor(total / 12);
  const mesDestino = (total % 12) + 1;
  const ultimo = diasDelMes(anioDestino, mesDestino);
  return `${anioDestino}-${String(mesDestino).padStart(2, "0")}-${String(Math.min(dia, ultimo)).padStart(2, "0")}`;
}

export function sumarDias(fechaISO: string, dias: number): string {
  const t = Date.parse(`${fechaISO}T12:00:00Z`) + dias * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

export function diasDelMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

/** Cuantos meses hay entre dos fechas, redondeando hacia arriba. */
export function mesesEntre(desdeISO: string, hastaISO: string): number {
  const [a1, m1] = desdeISO.split("-").map(Number) as [number, number];
  const [a2, m2] = hastaISO.split("-").map(Number) as [number, number];
  return (a2 - a1) * 12 + (m2 - m1);
}

/** `2026-09` -> `septiembre de 2026`. Solo para los mensajes que el agente parafrasea. */
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function periodoEnPalabras(periodo: string): string {
  const mes = Number(periodo.slice(5, 7));
  return `${MESES[mes - 1] ?? periodo} de ${periodo.slice(0, 4)}`;
}
