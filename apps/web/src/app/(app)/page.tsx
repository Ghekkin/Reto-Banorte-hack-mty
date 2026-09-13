import { after } from "next/server";
import { InicioDeMaya } from "@/components/inicio/inicio-de-maya";
import { InicioVivo } from "@/components/inicio/inicio-vivo";
import { RefrescoDelInicio } from "@/components/inicio/refresco-del-inicio";
import {
  BarraFlotanteMaya,
  ListaCuentas,
  ListaTarjetas,
  MovimientosRecientes,
  TarjetaSaldo,
} from "@/components/inicio/tarjetas-inicio";
import { cuentasDe, movimientosRecientes, resumenDe, tarjetasDe } from "@/lib/datos/consultas";
import { configInicio } from "@/lib/inicio/config";
import { estadoDelInicio, regenerarSiCambio } from "@/lib/inicio/servicio";
import { usuarioActivo } from "@/lib/usuario-activo";

/**
 * Inicio. Componente de servidor.
 *
 * Dos portadas posibles, y la eleccion es de `lib/inicio/servicio.ts`:
 *
 *  - **La que armo Maya** (`docs/como-funciona/inicio-personalizado.md`): 3 o 4 tarjetas
 *    del catalogo elegidas por un modelo chico para ESTA persona con sus datos de hoy.
 *    Se pinta cuando existe y esta al dia.
 *  - **La programada**: saldo, cuentas, tarjetas y movimientos, leidos de la base directo.
 *    Es lo que se ve con el flag apagado, sin llave, y mientras Maya rearma la otra (los
 *    datos cambiaron: una accion, un reinicio). En ese ultimo caso, `RefrescoDelInicio`
 *    pregunta si ya esta y la trae sola.
 *
 * `after()`: si la portada esta desactualizada, se manda rearmar DESPUES de responder,
 * para que la visita no espere al modelo. El servicio no la rearma dos veces.
 *
 * La rejilla programada es la misma del lienzo de Maya (bento; `data-ancho="amplio"`
 * ocupa doble) y `animar-lista` la misma entrada en cascada, para que las dos portadas
 * se sientan la misma app.
 */
export default async function PaginaInicio() {
  const usuario = await usuarioActivo();
  const inicio = await estadoDelInicio(usuario.id);

  if (inicio.activo && inicio.desactualizada) {
    after(() => regenerarSiCambio(usuario.id, "visita"));
  }

  if (inicio.activo && inicio.pantalla && !inicio.desactualizada) {
    // Widgets vivos: cada tarjeta se pregunta y cambia en su lugar. La `key` es la
    // generacion: cuando el reloj rearma la portada, el estado vivo del navegador (foco,
    // notas, tarjetas ajustadas) arranca de la nueva en vez de mezclarse con la vieja.
    if (configInicio.widgetsVivos && Object.keys(inicio.pantalla.procedencias).length > 0) {
      return <InicioVivo key={inicio.pantalla.generadaEn} pantalla={inicio.pantalla} />;
    }
    return (
      <div className="relative pb-24 md:pb-20">
        <InicioDeMaya pantalla={inicio.pantalla} nombre={usuario.nombre} />
        <BarraFlotanteMaya />
      </div>
    );
  }

  const [resumen, cuentas, tarjetas, movimientos] = await Promise.all([
    resumenDe(usuario.id),
    cuentasDe(usuario.id),
    tarjetasDe(usuario.id),
    movimientosRecientes(usuario.id, 6),
  ]);

  return (
    <div className="relative flex flex-col gap-3 pb-24 md:gap-4 md:pb-20">
      {inicio.activo && <RefrescoDelInicio usuarioId={usuario.id} generadaEn={inicio.pantalla?.generadaEn ?? null} />}
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
