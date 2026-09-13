/**
 * El dispositivo: la llave que aisla lo que cada visitante hace en la demo
 * (`docs/como-funciona/estado-por-dispositivo.md`, ADR 0012).
 *
 * Las personas demo son tres y los visitantes muchos, todos a la vez. Sin esto, el plan que
 * un juez aplica a Beto desde su celular le aparece aplicado a todos los que abren a Beto, y
 * la pregunta que alguien hace en Inicio le borra la portada al resto. Con esto, cada
 * navegador tiene su propio estado —acciones, portada de Inicio, conversaciones— guardado
 * en la base con su id, y nadie ve el de otro.
 *
 * Es una cookie y no una cuenta: no hay login en un prototipo con datos sinteticos. La pone
 * `proxy.ts` en la primera visita y dura un ano; borrar las cookies (o abrir una ventana de
 * incognito) es empezar la demo desde cero, sin tocar a nadie mas.
 *
 * Este archivo no importa nada de Next ni de la base: lo usan el proxy, las rutas y las
 * pruebas por igual.
 */
export const COOKIE_DISPOSITIVO = "maya_dispositivo";

/**
 * El estado compartido de siempre: el de quien no trae cookie (`pnpm probar-guion`, curl, el
 * reloj del Inicio). El mismo literal vive en el MCP (`apps/mcp/src/datos/dispositivo.ts`) y
 * es el default de la columna en la migracion 0007.
 */
export const DISPOSITIVO_COMUN = "comun";

/** La cabecera de la conexion MCP en que viaja el dispositivo. La lee `registro.ts` del MCP. */
export const CABECERA_DISPOSITIVO = "x-maya-dispositivo";

/** Un ano: lo que dura el hackathon y lo que un juez tarde en volver a abrir la liga. */
export const DURACION_COOKIE_S = 60 * 60 * 24 * 365;

/** El mismo patron que valida el MCP. Todo lo que no lo cumpla es `comun`. */
const PATRON = /^dis_[a-z0-9]{12,40}$/;

export function esIdDeDispositivo(valor: unknown): valor is string {
  return typeof valor === "string" && PATRON.test(valor);
}

/** `dis_` y 24 caracteres hexadecimales al azar. */
export function nuevoIdDeDispositivo(): string {
  return `dis_${crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`;
}

/** Lo que llego en la cookie, validado: si no es un id nuestro, el estado comun. */
export function dispositivoDeCookie(valor: string | undefined): string {
  return esIdDeDispositivo(valor) ? valor : DISPOSITIVO_COMUN;
}

/** Para el log y la base: `null` en vez de `comun`, que es la ausencia de dispositivo. */
export function dispositivoParaRegistro(dispositivoId: string | undefined): string | null {
  return dispositivoId && dispositivoId !== DISPOSITIVO_COMUN ? dispositivoId : null;
}
