import { CambiarPersona } from "@/components/mas/cambiar-persona";
import {
  AvisoDelPrototipo,
  ComoFuncionaMaya,
  DatosPersonales,
  PerfilHeroe,
  PreguntasSugeridas,
  TarjetaPersonas,
  TodoLoDemas,
} from "@/components/mas/tarjetas-mas";
import { perfilDe, resumenDe } from "@/lib/datos/consultas";
import { usuarioActivo } from "@/lib/usuario-activo";

/**
 * Mas: quien eres, como funciona Maya y todo lo demas.
 *
 * Es la pantalla a la que llega un juez que quiere entender el producto sin que se lo
 * cuenten: el perfil con sus datos reales, las tres personas para cambiar de situacion con un
 * toque, los tres pasos de Maya y las preguntas que conviene hacerle a esta persona. Lo que
 * no esta en el prototipo (pagos, estados de cuenta, seguridad) sigue diciendolo, pero una
 * vez por mosaico y sin parecer una pantalla a medias.
 *
 * La rejilla es la bento de Productos (1 columna en movil, 2 o 3 en escritorio) con
 * `grid-flow-dense`: en 2 columnas la tarjeta de preguntas sube a llenar el hueco junto a la
 * de personas, y datos personales va a lo ancho porque es la tercera sola y dejaria un hueco.
 * En 3 columnas quedan tres filas parejas: perfil + personas, como funciona + preguntas,
 * datos + accesos. Cada tarjeta va en su hueco (`div`), como en el lienzo de Maya, porque
 * `Tarjeta` pone su propia envoltura y el `col-span` tiene que ir en el hijo directo.
 *
 * El orden de lectura en movil: perfil, personas, como funciona, preguntas, datos, accesos.
 */
export default async function PaginaMas() {
  const usuario = await usuarioActivo();
  const [resumen, perfil] = await Promise.all([resumenDe(usuario.id), perfilDe(usuario.id)]);

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <div className="animar-lista grid grid-flow-dense gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
        {/* La heroe del catalogo no se estira (`self-start`, pensado para el lienzo, donde junto a
            una grafica quedaba un bloque rojo de 530 px). Aqui su vecina es la lista de personas,
            casi de su alto: estirada, las dos tarjetas cierran parejas. */}
        <div className="grid md:col-span-2 [&>[data-tarjeta]]:self-stretch">
          <PerfilHeroe
            usuario={usuario}
            perfil={perfil}
            disponibleCentavos={resumen.disponibleCentavos}
            deudaCentavos={resumen.deudaCentavos}
            hoy={new Date()}
          />
        </div>
        <div className="grid">
          <TarjetaPersonas>
            <CambiarPersona usuario={usuario} />
          </TarjetaPersonas>
        </div>
        <div className="grid md:col-span-2">
          <ComoFuncionaMaya />
        </div>
        <div className="grid">
          <PreguntasSugeridas usuario={usuario} />
        </div>
        <div className="grid md:col-span-2 xl:col-span-1">
          <DatosPersonales perfil={perfil} />
        </div>
        <div className="grid md:col-span-2">
          <TodoLoDemas />
        </div>
      </div>
      <AvisoDelPrototipo />
    </div>
  );
}
