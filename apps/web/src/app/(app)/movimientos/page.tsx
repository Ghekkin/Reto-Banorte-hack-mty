import { ListaMovimientos } from "@/components/movimientos/lista-movimientos";
import { categoriasUsadas, movimientosDe, totalMovimientosDe } from "@/lib/datos/consultas";
import { hoyEnZona } from "@/lib/periodos";
import { usuarioActivo } from "@/lib/usuario-activo";

/**
 * Movimientos: el historial completo, con buscador, multiselector de categorias y la
 * lista partida por periodo.
 *
 * La pagina lee en el servidor y entrega la lista ya armada al componente de cliente,
 * que solo filtra. Asi el primer render llega con datos y no con un spinner.
 *
 * El `hoy` se calcula AQUI, no en el cliente: es lo que define a que periodo pertenece
 * cada movimiento, y si cada lado usara su propio reloj (el servidor corre en otra zona)
 * el HTML del servidor y el del navegador no coincidirian.
 */
export default async function PaginaMovimientos() {
  const usuario = await usuarioActivo();
  const [movimientos, categorias, total] = await Promise.all([
    movimientosDe(usuario.id),
    categoriasUsadas(usuario.id),
    totalMovimientosDe(usuario.id),
  ]);

  return (
    <ListaMovimientos
      movimientos={movimientos}
      categorias={categorias}
      total={total}
      hoy={hoyEnZona()}
    />
  );
}
