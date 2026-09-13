import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_DISPOSITIVO, DURACION_COOKIE_S, esIdDeDispositivo, nuevoIdDeDispositivo } from "@/lib/dispositivo";

/**
 * Le da a cada navegador su dispositivo en la primera visita (ADR 0012).
 *
 * Next 16 llama `proxy` a lo que antes era `middleware`. Corre antes de renderizar, que es
 * justo lo que hace falta: Inicio es un componente de servidor que lee la portada DE ESTE
 * dispositivo, y un componente de servidor no puede escribir cookies. Aqui si.
 *
 * La cookie se pone en dos lados: en la respuesta, para las siguientes visitas, y en la
 * PETICION que sigue hacia la pagina, para que el primer render ya la vea. Sin lo segundo,
 * la primera visita se pintaria con el estado comun y la segunda con el propio.
 *
 * **No corre en `/api`**, a proposito. Las rutas las llaman tambien scripts y curl, y un
 * `pnpm probar-guion` sin cookie estrenaria un dispositivo en cada peticion: la accion de un
 * paso no se veria en la lectura del siguiente. Sin cookie, una ruta usa el estado comun. El
 * navegador llega a `/api` con la cookie que le puso la pagina.
 */
export function proxy(peticion: NextRequest) {
  if (esIdDeDispositivo(peticion.cookies.get(COOKIE_DISPOSITIVO)?.value)) return NextResponse.next();

  const id = nuevoIdDeDispositivo();
  peticion.cookies.set(COOKIE_DISPOSITIVO, id);
  const respuesta = NextResponse.next({ request: { headers: peticion.headers } });
  respuesta.cookies.set(COOKIE_DISPOSITIVO, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: DURACION_COOKIE_S,
  });
  return respuesta;
}

export const config = {
  // Las paginas, sin `/api`, los estaticos de Next ni los iconos y el catalogo publico.
  matcher: ["/((?!api|_next/static|_next/image|catalogo/v1\\.json|icon\\.png|apple-icon\\.png|favicon\\.ico).*)"],
};
