import {
  CreditoEnCurso,
  Cuentas,
  Inversiones,
  SinInversiones,
  TarjetaEnMano,
  Vacio,
} from "@/components/productos/tarjetas-productos";
import { creditosDe, cuentasDe, portafolioDe, tarjetasDe } from "@/lib/datos/consultas";
import { usuarioActivo } from "@/lib/usuario-activo";

/**
 * Productos: la cartera. Lo que la persona tiene contratado, producto por producto, con su
 * numero grande y su detalle.
 *
 * Pantalla programada, no generada: es una consulta, y un agente no aporta nada a
 * "muestrame mis productos". Lo que si aporta es la puerta a Maya desde el producto que
 * mas pesa: el unico boton rojo vive en la primera tarjeta, y la pregunta que lleva depende
 * de como esta esa tarjeta.
 *
 * Es la misma rejilla bento de Inicio y del lienzo de Maya (1 columna en movil, 2 o 3 en
 * escritorio, `data-ancho="amplio"` para lo que ocupa doble) y la misma entrada en cascada,
 * para que las tres se sientan la misma app. `grid-flow-dense` rellena el hueco que deja una
 * tarjeta ancha cuando la siguiente tambien lo es (Carmen trae dos plasticos).
 *
 * Orden: primero los plasticos (credito antes que debito, porque es el que trae un saldo
 * que decidir), luego las cuentas, los creditos y el portafolio.
 */
export default async function PaginaProductos() {
  const usuario = await usuarioActivo();
  const [cuentas, tarjetas, creditos, portafolio] = await Promise.all([
    cuentasDe(usuario.id),
    tarjetasDe(usuario.id),
    creditosDe(usuario.id),
    portafolioDe(usuario.id),
  ]);

  const cuentaPorId = new Map(cuentas.map((c) => [c.id, c]));
  const plasticos = [...tarjetas].sort((a, b) => peso(a.tipo) - peso(b.tipo));

  return (
    <div className="animar-lista grid grid-flow-dense gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3 [&>[data-ancho=amplio]]:md:col-span-2">
      {plasticos.map((tarjeta, indice) => (
        <TarjetaEnMano
          key={tarjeta.id}
          tarjeta={tarjeta}
          cuenta={cuentaPorId.get(tarjeta.cuentaId)}
          titular={usuario.nombre}
          heroe={indice === 0}
        />
      ))}

      <Cuentas cuentas={cuentas} />

      {creditos.length === 0 ? (
        <Vacio titulo="No tienes créditos" detalle="Cuando contrates uno, aparecerá aquí." />
      ) : (
        creditos.map((credito) => <CreditoEnCurso key={credito.id} credito={credito} />)
      )}

      {portafolio ? <Inversiones portafolio={portafolio} /> : <SinInversiones />}
    </div>
  );
}

/** Credito primero: es el plastico con un saldo que decidir. */
function peso(tipo: "credito" | "debito"): number {
  return tipo === "credito" ? 0 : 1;
}
