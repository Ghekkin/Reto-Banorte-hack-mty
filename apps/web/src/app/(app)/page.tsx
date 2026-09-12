import {
  BarraFlotanteMaya,
  ListaCuentas,
  ListaTarjetas,
  MovimientosRecientes,
  TarjetaSaldo,
} from "@/components/inicio/tarjetas-inicio";
import { cuentasDe, movimientosRecientes, resumenDe, tarjetasDe } from "@/lib/datos/consultas";
import { usuarioActivo } from "@/lib/usuario-activo";

/**
 * Inicio. Componente de servidor: lee los datos de `la base` directo, sin pasar por una
 * API ni por el agente. Es la pantalla programada del producto.
 *
 * La rejilla es la misma que usa el lienzo de Maya, para que las dos se sientan la misma
 * app: bento de 1 columna en movil, 2 o 3 en escritorio, con `data-ancho="amplio"` para
 * lo que ocupa doble.
 *
 * `animar-lista` hace que las tarjetas entren en cascada de 25 ms. No es adorno: es la
 * misma entrada que usa el lienzo cuando el agente construye una pantalla, y usarla aqui
 * es lo que hace que Inicio y Maya se sientan el mismo producto.
 */
export default async function PaginaInicio() {
  const usuario = await usuarioActivo();

  const [resumen, cuentas, tarjetas, movimientos] = await Promise.all([
    resumenDe(usuario.id),
    cuentasDe(usuario.id),
    tarjetasDe(usuario.id),
    movimientosRecientes(usuario.id, 6),
  ]);

  return (
    <div className="relative pb-24 md:pb-20">
      <div className="animar-lista grid gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3 [&>[data-ancho=amplio]]:md:col-span-2">
        <TarjetaSaldo
          disponibleCentavos={resumen.disponibleCentavos}
          deudaCentavos={resumen.deudaCentavos}
          cuenta={resumen.cuentaPrincipal}
        />
        <ListaCuentas cuentas={cuentas} />
        <ListaTarjetas tarjetas={tarjetas} />
        <MovimientosRecientes movimientos={movimientos} />
      </div>

      <BarraFlotanteMaya />
    </div>
  );
}

