import { baseSinDatos, conManejoDeErrores, enteroDeLaUrl, error, respuesta, usuarioDeLaUrl } from "@/lib/api/comun";
import { TOPE_MOVIMIENTOS, categoriasUsadas, movimientosDe, totalMovimientosDe } from "@/lib/datos/consultas";

/**
 * `GET /api/movimientos?usuario=<id>&limite=<n>&categoria=<id>` — el historial.
 *
 * Devuelve `total` aparte de la lista porque son distintos: `total` es cuantos
 * movimientos tiene el usuario en la base, y `movimientos` cuantos caben en esta
 * respuesta. Sin esa distincion, quien consume cree que 300 es todo lo que hay.
 *
 * `categorias` son solo las que el usuario usa de verdad, que es lo que sirve para armar
 * un filtro; el catalogo completo tiene 18 y la mayoria estarian vacias.
 *
 * El filtro por categoria se aplica DESPUES del tope, igual que en la pantalla: se filtra
 * sobre los ultimos `limite` movimientos, no sobre todo el historial. Es una decision, no
 * un descuido, y por eso la respuesta trae `filtro` diciendo que se aplico.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMITE_MAXIMO = 1000;

export function GET(peticion: Request): Promise<Response> {
  return conManejoDeErrores(async () => {
    const usuario = usuarioDeLaUrl(peticion.url);
    if ("problema" in usuario) return usuario.problema;

    const sinDatos = await baseSinDatos();
    if (sinDatos) return sinDatos;

    const { usuarioId } = usuario;
    const limite = enteroDeLaUrl(peticion.url, "limite", TOPE_MOVIMIENTOS, LIMITE_MAXIMO);
    const categoria = new URL(peticion.url).searchParams.get("categoria");

    const [todos, total, categorias] = await Promise.all([
      movimientosDe(usuarioId, limite),
      totalMovimientosDe(usuarioId),
      categoriasUsadas(usuarioId),
    ]);

    // Una categoria que el usuario no usa es un 404 y no una lista vacia: casi siempre es
    // un id mal escrito, y devolver `[]` deja a quien llama buscando el error en su codigo.
    if (categoria && !categorias.some((c) => c.id === categoria)) {
      return error(`el usuario no tiene movimientos en la categoria "${categoria}"`, 404, {
        categoriasValidas: categorias.map((c) => c.id),
      });
    }

    const movimientos = categoria ? todos.filter((m) => m.categoriaId === categoria) : todos;

    return respuesta({
      usuarioId,
      total,
      limite,
      filtro: { categoria: categoria ?? null },
      categorias,
      movimientos,
    });
  });
}
