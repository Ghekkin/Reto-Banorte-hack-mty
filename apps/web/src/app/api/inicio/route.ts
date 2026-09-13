import { after } from "next/server";
import { config } from "@/lib/agente/config";
import { conManejoDeErrores, error, respuesta, usuarioDeLaUrl } from "@/lib/api/comun";
import { dispositivoActivo } from "@/lib/dispositivo-activo";
import type { PantallaDeInicio } from "@/lib/inicio/almacen";
import { componentesDe, estadoDelInicio, regenerarSiCambio } from "@/lib/inicio/servicio";

/**
 * `GET /api/inicio?usuario=<id>` — la portada que Maya armo para esa persona, con su
 * estado: si esta al dia o si ya cambiaron los datos con los que se armo.
 *
 * La usa el propio Inicio para refrescarse solo mientras Maya rearma la portada, y
 * sirve igual a quien quiera verla desde fuera (es la sexta ruta de la API de lectura).
 * Si la portada esta desactualizada, pedirla la pone a rearmar en segundo plano: un
 * cliente que pregunta cada pocos segundos ve llegar la nueva sin hacer nada mas.
 *
 * `POST /api/inicio?usuario=<id>[&forzar=1]` — la rearma AHORA y espera el resultado.
 * Es la puerta del ensayo (`pnpm probar-inicio`) y de quien quiera verla rearmarse en
 * vivo. Llama al modelo, asi que va con el `MCP_TOKEN` en `Authorization: Bearer`; sin
 * token configurado solo se permite en desarrollo. `forzar` la rearma aunque la huella
 * no haya cambiado.
 *
 * Las dos hablan del Inicio del **dispositivo** que llama (cookie `maya_dispositivo`, ADR
 * 0012): el aviso de "Maya esta armando tu inicio" pregunta por la portada que ESE navegador
 * esta esperando. Sin cookie (curl, `pnpm probar-inicio`) es la portada comun.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(peticion: Request): Promise<Response> {
  return conManejoDeErrores(async () => {
    const usuario = usuarioDeLaUrl(peticion.url);
    if ("problema" in usuario) return usuario.problema;

    const dispositivoId = await dispositivoActivo();
    const estado = await estadoDelInicio(usuario.usuarioId, { dispositivoId });
    if (estado.activo && estado.desactualizada) {
      after(() => regenerarSiCambio(usuario.usuarioId, "consulta", { dispositivoId }));
    }
    return respuesta({
      usuarioId: usuario.usuarioId,
      activo: estado.activo,
      desactualizada: estado.desactualizada,
      pantalla: estado.pantalla ? resumen(estado.pantalla) : null,
    });
  });
}

export function POST(peticion: Request): Promise<Response> {
  return conManejoDeErrores(async () => {
    const rechazo = sinPermiso(peticion);
    if (rechazo) return rechazo;

    const usuario = usuarioDeLaUrl(peticion.url);
    if ("problema" in usuario) return usuario.problema;

    const forzar = new URL(peticion.url).searchParams.get("forzar") === "1";
    const resultado = await regenerarSiCambio(usuario.usuarioId, "manual", { forzar, dispositivoId: await dispositivoActivo() });
    return respuesta(
      {
        usuarioId: usuario.usuarioId,
        hecho: resultado.hecho,
        motivo: resultado.motivo ?? null,
        ms: resultado.ms ?? null,
        pantalla: resultado.pantalla ? resumen(resultado.pantalla) : null,
      },
      resultado.hecho === "fallo" ? 502 : 200,
    );
  });
}

/** Mismo token que protege el MCP: es el secreto que la web ya tiene, y esto gasta modelo. */
function sinPermiso(peticion: Request): Response | null {
  const cabecera = peticion.headers.get("authorization") ?? "";
  if (config.tokenMcp) {
    return cabecera === `Bearer ${config.tokenMcp}` ? null : error("token invalido", 401);
  }
  return process.env.NODE_ENV === "production" ? error("sin MCP_TOKEN configurado no se puede rearmar por HTTP", 403) : null;
}

/** La pantalla completa mas lo que se quiere saber de un vistazo. */
function resumen(pantalla: PantallaDeInicio) {
  return { ...pantalla, componentes: componentesDe(pantalla) };
}
