import { baseSinDatos, conManejoDeErrores, enteroDeLaUrl, respuesta, usuarioDeLaUrl } from "@/lib/api/comun";
import { cuentasDe, movimientosRecientes, resumenDe, tarjetasDe } from "@/lib/datos/consultas";

/**
 * `GET /api/panorama?usuario=<id>&recientes=<n>` — lo que ve la pantalla de Inicio.
 *
 * Las cuatro consultas de Inicio en una sola llamada, porque asi es como se usan: nadie
 * quiere el saldo sin las cuentas. Van en paralelo (`Promise.all`) y `leerTabla` dedupica
 * por request, asi que `cuentas` se consulta una vez aunque `resumenDe` tambien la pida.
 *
 * `disponible` es solo lo liquido: las cuentas de credito no suman patrimonio, restan.
 * Esa distincion es de `resumenDe` y no se repite aqui.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RECIENTES_POR_OMISION = 6;
const RECIENTES_MAXIMO = 50;

export function GET(peticion: Request): Promise<Response> {
  return conManejoDeErrores(async () => {
    const usuario = usuarioDeLaUrl(peticion.url);
    if ("problema" in usuario) return usuario.problema;

    const sinDatos = await baseSinDatos();
    if (sinDatos) return sinDatos;

    const cuantos = enteroDeLaUrl(peticion.url, "recientes", RECIENTES_POR_OMISION, RECIENTES_MAXIMO);
    const { usuarioId } = usuario;

    const [resumen, cuentas, tarjetas, recientes] = await Promise.all([
      resumenDe(usuarioId),
      cuentasDe(usuarioId),
      tarjetasDe(usuarioId),
      movimientosRecientes(usuarioId, cuantos),
    ]);

    return respuesta({
      usuarioId,
      resumen: {
        disponibleCentavos: resumen.disponibleCentavos,
        deudaCentavos: resumen.deudaCentavos,
        cuentaPrincipal: resumen.cuentaPrincipal ?? null,
      },
      cuentas,
      tarjetas,
      movimientosRecientes: recientes,
    });
  });
}
