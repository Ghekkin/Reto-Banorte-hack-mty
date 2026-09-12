"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { COOKIE_USUARIO } from "@/lib/usuario-activo";
import { USUARIOS } from "@/lib/usuarios";

/**
 * Cambiar de usuario demo. Es una server action porque tiene que escribir la cookie que
 * leen los componentes de servidor y despues invalidar el cache: sin el
 * `revalidatePath`, Inicio seguiria mostrando los datos del usuario anterior.
 *
 * Se valida el id contra la lista en vez de confiar en lo que llega del cliente: es una
 * entrada del navegador y termina en una lectura de disco.
 */
export async function cambiarUsuario(id: string): Promise<void> {
  if (!USUARIOS.some((u) => u.id === id)) return;

  (await cookies()).set(COOKIE_USUARIO, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  revalidatePath("/", "layout");
}
