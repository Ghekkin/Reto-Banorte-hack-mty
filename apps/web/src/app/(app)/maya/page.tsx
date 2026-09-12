import { ConsolaMaya } from "@/components/maya/consola-maya";
import { usuarioActivo } from "@/lib/usuario-activo";

/**
 * Maya. La seccion donde el agente construye la interfaz.
 *
 * La pagina es de servidor solo para resolver el usuario activo desde la cookie; todo lo
 * demas es cliente, porque aqui vive el streaming.
 *
 * `?intencion=...` permite entrar con una pregunta ya hecha: es como Inicio manda al
 * usuario aqui con contexto en vez de dejarlo frente a un input vacio.
 */
export default async function PaginaMaya({
  searchParams,
}: {
  searchParams: Promise<{ intencion?: string }>;
}) {
  const [usuario, params] = await Promise.all([usuarioActivo(), searchParams]);

  return <ConsolaMaya usuario={usuario} intencionInicial={params.intencion} />;
}
