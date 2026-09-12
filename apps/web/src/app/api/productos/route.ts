import { baseSinDatos, conManejoDeErrores, respuesta, usuarioDeLaUrl } from "@/lib/api/comun";
import { creditosDe, cuentasDe, portafolioDe, tarjetasDe } from "@/lib/datos/consultas";

/**
 * `GET /api/productos?usuario=<id>` — cuentas, tarjetas, creditos e inversiones.
 *
 * `portafolio` es `null` cuando el usuario no invierte, y **eso no es un error**: es el
 * caso de Beto y esta puesto a proposito. Un consumidor que lo trate como fallo se
 * equivoca; por eso la respuesta lo dice con un `null` explicito y no omitiendo la llave.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(peticion: Request): Promise<Response> {
  return conManejoDeErrores(async () => {
    const usuario = usuarioDeLaUrl(peticion.url);
    if ("problema" in usuario) return usuario.problema;

    const sinDatos = await baseSinDatos();
    if (sinDatos) return sinDatos;

    const { usuarioId } = usuario;
    const [cuentas, tarjetas, creditos, portafolio] = await Promise.all([
      cuentasDe(usuarioId),
      tarjetasDe(usuarioId),
      creditosDe(usuarioId),
      portafolioDe(usuarioId),
    ]);

    return respuesta({ usuarioId, cuentas, tarjetas, creditos, portafolio });
  });
}
