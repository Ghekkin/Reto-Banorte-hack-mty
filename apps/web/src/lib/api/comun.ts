import "server-only";

import { leerTabla } from "@/lib/datos/tablas";
import { USUARIOS } from "@/lib/usuarios";

/**
 * Piezas compartidas de la API REST de lectura (`app/api/*`).
 *
 * Esta API es una **superficie externa**: existe para que alguien de fuera —Postman, un
 * juez con curl, otro servicio— pueda leer los mismos datos que ven las pantallas. Las
 * paginas NO la usan: son componentes de servidor y llaman `lib/datos/consultas.ts`
 * directo, que es un salto en vez de dos.
 *
 * Reglas que valen para todas las rutas:
 *
 * - **Solo lectura.** Ninguna ruta de aqui muta nada. Las acciones (aplicar un plan,
 *   cancelar una suscripcion) viven en el MCP y pasan por el agente, con su llave de
 *   idempotencia; no se exponen por HTTP sin autenticacion.
 * - **Los montos van en CENTAVOS**, enteros, como en toda la capa de datos. Formatear es
 *   de quien pinta. Un `1234567` es $12,345.67.
 * - **`usuario` es obligatorio y se valida contra `USUARIOS`**, no contra la base: los
 *   ids demo son tres y conocidos, asi que un id cualquiera se rechaza con 400 antes de
 *   tocar Postgres. Sin eso, la ruta seria un probador de ids gratis.
 * - **Sin autenticacion, a proposito.** Los datos son sinteticos (tres perfiles
 *   inventados, ADR 0007) y esto es un prototipo de hackathon. Si algun dia hubiera un
 *   dato real detras, esto necesita token ANTES de desplegarse.
 */

/** `Cache-Control` en cero: los datos cambian con las acciones de la demo. */
const CABECERAS = { "Cache-Control": "no-store" };

export function respuesta(cuerpo: unknown, estado = 200): Response {
  return Response.json(cuerpo, { status: estado, headers: CABECERAS });
}

/**
 * El error lleva `usuariosValidos` cuando el problema es el id: quien llama descubre los
 * ids correctos sin abrir el repo ni pedirlos por chat.
 */
export function error(mensaje: string, estado: number, extra?: Record<string, unknown>): Response {
  return respuesta({ error: mensaje, ...extra }, estado);
}

const IDS = USUARIOS.map((u) => u.id);

/**
 * Saca y valida el `?usuario=` de la URL.
 *
 * Devuelve el id o una `Response` de error ya armada. El patron es feo de mirar pero
 * evita el `try/catch` con excepciones de control de flujo en cinco rutas distintas:
 * quien llama hace `if ("problema" in x) return x.problema`.
 */
export function usuarioDeLaUrl(url: string): { usuarioId: string } | { problema: Response } {
  const id = new URL(url).searchParams.get("usuario");

  if (!id) {
    return {
      problema: error("falta el parametro `usuario`", 400, { usuariosValidos: IDS }),
    };
  }
  if (!IDS.includes(id)) {
    return {
      problema: error(`el usuario "${id}" no existe`, 404, { usuariosValidos: IDS }),
    };
  }
  return { usuarioId: id };
}

/**
 * Un entero positivo de la URL, con tope. Sin el tope, un `?limite=999999` pone a la
 * ruta a serializar todo el historial de la base en cada llamada.
 */
export function enteroDeLaUrl(url: string, nombre: string, porOmision: number, maximo: number): number {
  const crudo = new URL(url).searchParams.get(nombre);
  if (crudo === null) return porOmision;
  const n = Number(crudo);
  if (!Number.isInteger(n) || n < 1) return porOmision;
  return Math.min(n, maximo);
}

/**
 * Envuelve el cuerpo de una ruta: convierte un fallo inesperado en 503 con el motivo, en
 * vez del HTML de error de Next.
 */
export async function conManejoDeErrores(cuerpo: () => Promise<Response>): Promise<Response> {
  try {
    return await cuerpo();
  } catch (e) {
    return error("no se pudo consultar la base", 503, {
      detalle: e instanceof Error ? e.message : String(e),
    });
  }
}

/**
 * Senal de vida de la base. Devuelve una `Response` de 503 si no hay datos, o `null` si
 * todo bien.
 *
 * Hace falta porque `lib/datos/tablas.ts` **se traga los errores de conexion y devuelve
 * `[]`**. Para las pantallas se decidio que asi esta bien (muestran su estado vacio y la
 * app no se cae), pero para una API es inaceptable: quien consume no puede distinguir
 * "este usuario no tiene movimientos" de "la base esta muerta", y se lleva un 200 con
 * arreglos vacios como si fuera la verdad.
 *
 * `banorte.usuarios` siempre tiene los tres perfiles demo en una base sana. Si sale
 * vacia, o la base no responde o esta sin poblar; los dos casos son "esta API no puede
 * contestar", y los dos se arreglan igual (`DATABASE_URL` y `pnpm datos:restaurar`).
 */
export async function baseSinDatos(): Promise<Response | null> {
  const usuarios = await leerTabla("usuarios");
  if (usuarios.length > 0) return null;
  return error("la base no responde o esta sin poblar", 503, {
    revisa: ["DATABASE_URL en .env", "pnpm datos:restaurar"],
  });
}
