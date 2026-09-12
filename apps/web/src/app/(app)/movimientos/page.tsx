import { ListaMovimientos } from "@/components/movimientos/lista-movimientos";
import { categoriasUsadas, movimientosDe, totalMovimientosDe } from "@/lib/datos/consultas";
import { usuarioActivo } from "@/lib/usuario-activo";

/**
 * Movimientos: el historial completo, con buscador y filtros.
 *
 * La pagina lee en el servidor y entrega la lista ya armada al componente de cliente,
 * que solo filtra. Asi el primer render llega con datos y no con un spinner.
 */
export default async function PaginaMovimientos() {
  const usuario = await usuarioActivo();
  const [movimientos, categorias, total] = await Promise.all([
    movimientosDe(usuario.id),
    categoriasUsadas(usuario.id),
    totalMovimientosDe(usuario.id),
  ]);

  return <ListaMovimientos movimientos={movimientos} categorias={categorias} total={total} />;
}
