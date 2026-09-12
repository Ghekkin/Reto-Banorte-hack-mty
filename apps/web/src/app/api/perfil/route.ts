import { baseSinDatos, conManejoDeErrores, respuesta, usuarioDeLaUrl } from "@/lib/api/comun";
import { resumenDe } from "@/lib/datos/consultas";
import { usuarioPorId } from "@/lib/usuarios";

/**
 * `GET /api/perfil?usuario=<id>` — quien es y como esta parado, que es lo que muestra Mas.
 *
 * Junta las dos mitades del perfil: la identidad (de `lib/usuarios.ts`, que vive en
 * codigo porque son los tres perfiles de la demo) y el estado financiero (de la base).
 * Separadas en la respuesta a proposito: la primera no cambia nunca, la segunda cambia
 * con cada accion que aplica el agente.
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
    const perfil = usuarioPorId(usuarioId);
    const resumen = await resumenDe(usuarioId);

    return respuesta({
      usuarioId,
      identidad: {
        nombre: perfil.nombre,
        iniciales: perfil.iniciales,
        contexto: perfil.contexto,
      },
      resumen: {
        disponibleCentavos: resumen.disponibleCentavos,
        deudaCentavos: resumen.deudaCentavos,
        cuentaPrincipal: resumen.cuentaPrincipal ?? null,
      },
    });
  });
}
