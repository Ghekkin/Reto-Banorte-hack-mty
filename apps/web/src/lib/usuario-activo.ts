import "server-only";

import { cookies } from "next/headers";
import { USUARIO_POR_DEFECTO, usuarioPorId, type UsuarioDemo } from "@/lib/usuarios";

/**
 * Cual de los usuarios demo esta activo.
 *
 * Va en cookie y no en contexto de React porque Inicio, Productos y Movimientos son
 * componentes de SERVIDOR: leen los CSV directo y necesitan saber de quien son los
 * datos antes de que exista cualquier contexto de cliente. Una cookie la ve el
 * servidor en el primer render; un `useState` no.
 */
export const COOKIE_USUARIO = "maya_usuario";

export async function usuarioActivo(): Promise<UsuarioDemo> {
  const id = (await cookies()).get(COOKIE_USUARIO)?.value;
  return id ? usuarioPorId(id) : USUARIO_POR_DEFECTO;
}
