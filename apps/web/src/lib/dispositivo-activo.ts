import "server-only";

import { cookies } from "next/headers";
import { COOKIE_DISPOSITIVO, dispositivoDeCookie } from "@/lib/dispositivo";

/**
 * El dispositivo de la peticion en curso, para componentes de servidor, server actions y
 * rutas. Hermano de `usuario-activo.ts`: la cookie de la persona dice DE QUIEN son los datos;
 * esta dice DE QUE VISITANTE es lo que se muto sobre ellos.
 *
 * Sin cookie (una ruta llamada con curl o un script) es `comun`. En las paginas siempre hay:
 * `proxy.ts` la pone antes del primer render.
 */
export async function dispositivoActivo(): Promise<string> {
  return dispositivoDeCookie((await cookies()).get(COOKIE_DISPOSITIVO)?.value);
}
