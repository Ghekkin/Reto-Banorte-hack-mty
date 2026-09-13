import { ConsolaMaya } from "@/components/maya/consola-maya";
import { esquemaAccionEntrante, type AccionEntrante } from "@/lib/agente/tipos";
import { usuarioActivo } from "@/lib/usuario-activo";

/**
 * Maya. La seccion donde el agente construye la interfaz.
 *
 * La pagina es de servidor solo para resolver el usuario activo desde la cookie; todo lo
 * demas es cliente, porque aqui vive el streaming.
 *
 * `?intencion=...` permite entrar con una pregunta ya hecha: es como Inicio manda al
 * usuario aqui con contexto en vez de dejarlo frente a un input vacio.
 *
 * `?accion=...` (JSON de una accion A2UI) entra con un boton ya tocado: es como llega
 * quien toco "Aplicar plan" en la portada que armo Maya en Inicio. El agente la ejecuta
 * aqui, donde vive el ciclo de accion. Un JSON que no pase el schema se ignora.
 *
 * `?voz=1` entra con la sesion de voz arrancando sola: es el atajo del boton de voz de
 * Inicio (`docs/como-funciona/premio-elevenlabs.md`).
 */
export default async function PaginaMaya({
  searchParams,
}: {
  searchParams: Promise<{ intencion?: string; accion?: string; voz?: string }>;
}) {
  const [usuario, params] = await Promise.all([usuarioActivo(), searchParams]);

  return (
    <ConsolaMaya
      key={usuario.id}
      usuario={usuario}
      intencionInicial={params.intencion}
      accionInicial={accionDeLaUrl(params.accion)}
      vozAuto={params.voz === "1"}
    />
  );
}

function accionDeLaUrl(cruda: string | undefined): AccionEntrante | undefined {
  if (!cruda) return undefined;
  try {
    const resultado = esquemaAccionEntrante.safeParse(JSON.parse(cruda));
    return resultado.success ? resultado.data : undefined;
  } catch {
    return undefined;
  }
}
