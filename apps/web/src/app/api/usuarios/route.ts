import { baseSinDatos, conManejoDeErrores, respuesta } from "@/lib/api/comun";
import { USUARIOS } from "@/lib/usuarios";

/**
 * `GET /api/usuarios` — los tres perfiles demo.
 *
 * Es el punto de entrada de la API: sin esto, quien llama no sabe que `usuario` poner en
 * las demas rutas y tiene que adivinar o abrir el repo. Devuelve tambien el `contexto` de
 * cada perfil, que es lo que explica por que la misma pantalla se ve distinta con cada
 * uno (la prueba de adaptabilidad de la rubrica).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): Promise<Response> {
  return conManejoDeErrores(async () => {
    const sinDatos = await baseSinDatos();
    if (sinDatos) return sinDatos;

    return respuesta({
      usuarios: USUARIOS.map((u) => ({ id: u.id, nombre: u.nombre, contexto: u.contexto })),
    });
  });
}
