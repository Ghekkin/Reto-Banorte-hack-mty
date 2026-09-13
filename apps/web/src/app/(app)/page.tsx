import { after } from "next/server";
import { EsqueletoInicio } from "@/components/inicio/esqueleto-inicio";
import { InicioDeMaya } from "@/components/inicio/inicio-de-maya";
import { InicioVivo } from "@/components/inicio/inicio-vivo";
import { Masonry } from "@/components/inicio/masonry";
import { RefrescoDelInicio } from "@/components/inicio/refresco-del-inicio";
import { ProveedorDeInicio, ZonaInicio } from "@/components/inicio/transicion-inicio";
import {
  BarraFlotanteMaya,
  ListaCuentas,
  ListaTarjetas,
  MovimientosRecientes,
  TarjetaSaldo,
} from "@/components/inicio/tarjetas-inicio";
import { cuentasDe, movimientosRecientes, resumenDe, tarjetasDe } from "@/lib/datos/consultas";
import { configInicio } from "@/lib/inicio/config";
import { dispositivoActivo } from "@/lib/dispositivo-activo";
import { estadoDelInicio, regenerarSiCambio } from "@/lib/inicio/servicio";
import { usuarioActivo } from "@/lib/usuario-activo";

/**
 * Inicio. Componente de servidor.
 *
 * Dos portadas posibles, y la eleccion es de `lib/inicio/servicio.ts`:
 *
 *  - **La que armo Maya** (`docs/como-funciona/inicio-personalizado.md`): 3 o 4 tarjetas
 *    del catalogo elegidas por un modelo chico para ESTA persona con sus datos de hoy.
 *    Se pinta cuando existe, aunque este vencida: mientras se rearma, la que hay.
 *  - **La programada**: saldo, cuentas, tarjetas y movimientos, leidos de la base directo.
 *    Es lo que se ve con el flag apagado, sin llave, y mientras Maya arma la primera (no hay
 *    ninguna para este visitante: un reinicio, la primera vez). En ese ultimo caso,
 *    `RefrescoDelInicio` pregunta si ya esta y la trae sola.
 *
 * `after()`: si la portada esta desactualizada, se manda rearmar DESPUES de responder,
 * para que la visita no espere al modelo. El servicio no la rearma dos veces.
 *
 * La rejilla programada es la misma del lienzo de Maya (**masonry**, sin huecos verticales;
 * `data-ancho="amplio"` ocupa doble) y la entrada en cascada la misma, para que las dos
 * portadas se sientan la misma app.
 *
 * **El ciclo de escribir tambien es el mismo en las dos.** `ProveedorDeInicio` envuelve la
 * pantalla completa: cuando la persona pregunta en la barra, las tarjetas que hay se van en
 * cascada, `ZonaInicio` pone el esqueleto mientras el modelo trabaja, y las nuevas entran
 * con la misma cascada al revertir. Ver `docs/como-funciona/transicion-del-inicio.md`.
 */
export default async function PaginaInicio() {
  // La portada es la de ESTE dispositivo (ADR 0012): la propia si ya hizo algo, la comun si no.
  const [usuario, dispositivoId] = await Promise.all([usuarioActivo(), dispositivoActivo()]);
  const inicio = await estadoDelInicio(usuario.id, { dispositivoId });

  // Sin portada, o con una vencida: se rearma en segundo plano, en su destino (la comun, la
  // compartida sin acciones o la propia; `servicio.ts`), y mientras se pinta la que hay. El
  // servicio no la paga dos veces ni por visitante, y espera entre reintentos de la misma.
  if (inicio.activo && inicio.desactualizada) {
    after(() => regenerarSiCambio(usuario.id, "visita", { dispositivoId }));
  }

  if (inicio.activo && inicio.pantalla) {
    // Widgets vivos: cada tarjeta se pregunta y cambia en su lugar. La `key` es la
    // generacion: cuando el reloj rearma la portada, el estado vivo del navegador (foco,
    // notas, tarjetas ajustadas) arranca de la nueva en vez de mezclarse con la vieja.
    if (configInicio.widgetsVivos && Object.keys(inicio.pantalla.procedencias).length > 0) {
      return <InicioVivo key={inicio.pantalla.generadaEn} pantalla={inicio.pantalla} />;
    }
    return (
      <ProveedorDeInicio>
        <div className="relative pb-24 md:pb-20">
          <ZonaInicio esqueleto={<EsqueletoInicio />}>
            <InicioDeMaya pantalla={inicio.pantalla} nombre={usuario.nombre} />
          </ZonaInicio>
          <BarraFlotanteMaya />
        </div>
      </ProveedorDeInicio>
    );
  }

  const [resumen, cuentas, tarjetas, movimientos] = await Promise.all([
    resumenDe(usuario.id),
    cuentasDe(usuario.id),
    tarjetasDe(usuario.id),
    movimientosRecientes(usuario.id, 6),
  ]);

  return (
    <ProveedorDeInicio>
      <div className="relative flex flex-col gap-3 pb-24 md:gap-4 md:pb-20">
        {inicio.activo && <RefrescoDelInicio usuarioId={usuario.id} generadaEn={inicio.pantalla?.generadaEn ?? null} />}
        <ZonaInicio esqueleto={<EsqueletoInicio />}>
          <Masonry>
            {/* `data-hueco` es lo que dice cuanto ocupa cada tarjeta a lo ancho. Lo declara
                quien arma la pantalla, no la tarjeta: el heroe y la lista de movimientos
                piden media rejilla, las otras dos una columna. */}
            <div data-hueco="amplio">
              <TarjetaSaldo
                disponibleCentavos={resumen.disponibleCentavos}
                deudaCentavos={resumen.deudaCentavos}
                cuenta={resumen.cuentaPrincipal}
              />
            </div>
            <div>
              <ListaCuentas cuentas={cuentas} />
            </div>
            <div>
              <ListaTarjetas tarjetas={tarjetas} />
            </div>
            <div data-hueco="amplio">
              <MovimientosRecientes movimientos={movimientos} />
            </div>
          </Masonry>
        </ZonaInicio>

        <BarraFlotanteMaya />
      </div>
    </ProveedorDeInicio>
  );
}
