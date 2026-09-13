import { AsyncLocalStorage } from "node:async_hooks";

/**
 * De que dispositivo es la llamada: la llave que aisla el estado de cada visitante
 * (`docs/como-funciona/estado-por-dispositivo.md`, ADR 0012).
 *
 * La demo tiene tres personas (Beto, Ana, Carmen) y muchos visitantes a la vez. Sin esto,
 * el plan que aplica un juez desde su celular le aparece aplicado a todos los que abren a
 * Beto. Con esto, cada navegador tiene su propia copia del estado mutable: las acciones se
 * guardan con su `dispositivo_id` y cada lectura solo ve las suyas.
 *
 * **Por que no es un argumento de las tools.** El dispositivo no es algo que el modelo deba
 * ver ni pueda cambiar, igual que la `corridaId`. Viaja en la cabecera `x-maya-dispositivo`
 * de la conexion MCP (la pone `conectarMcp` en la web) y `registro.ts` abre este contexto
 * alrededor de cada tool. El dominio lo consulta de forma sincrona, sin `await`, y ninguna
 * tool cambia su schema.
 *
 * Quien no manda cabecera (`pnpm humo`, un inspector MCP, las pruebas) cae en `comun`: el
 * estado compartido de siempre.
 */
export const DISPOSITIVO_COMUN = "comun";

/** La cabecera HTTP en que viaja. En minusculas: asi la entrega Node en `headers`. */
export const CABECERA_DISPOSITIVO = "x-maya-dispositivo";

/** `dis_` y de 12 a 40 caracteres en minusculas y digitos: lo que genera la web. */
const PATRON = /^dis_[a-z0-9]{12,40}$/;

const contexto = new AsyncLocalStorage<string>();

/** Un valor que llego de fuera, ya validado. Cualquier cosa rara es `comun`, nunca un error. */
export function dispositivoValido(valor: unknown): string {
  const crudo = Array.isArray(valor) ? valor[0] : valor;
  return typeof crudo === "string" && PATRON.test(crudo) ? crudo : DISPOSITIVO_COMUN;
}

/** Corre `trabajo` con ese dispositivo como el actual, incluidas sus llamadas asincronas. */
export function conDispositivo<T>(dispositivoId: string, trabajo: () => T): T {
  return contexto.run(dispositivoValido(dispositivoId), trabajo);
}

/** El dispositivo de la llamada en curso; `comun` fuera de una. */
export function dispositivoActual(): string {
  return contexto.getStore() ?? DISPOSITIVO_COMUN;
}
