"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { cambiarUsuario } from "@/app/(app)/acciones";
import { useIsMobile } from "@/hooks/use-mobile";
import { MARCA } from "@/lib/marca";
import { USUARIOS, usuarioPorId, type UsuarioDemo } from "@/lib/usuarios";
import { cn } from "@/lib/utils";

/**
 * Donde vive el selector, que decide su forma y hacia donde abre el menu:
 *
 * - `tarjeta` (Mas): la tarjeta completa; el menu abre abajo, del ancho del trigger.
 * - `sidebar`: la misma tarjeta en el pie del sidebar. En escritorio el menu flota a la
 *   DERECHA, fuera de la tarjeta blanca, como el `NavUser` del bloque sidebar-07 de shadcn:
 *   abierto hacia arriba tapaba el menu y se salia del sidebar por los dos lados. En movil
 *   el sidebar es un sheet sin espacio a los lados, asi que abre hacia arriba.
 * - `avatar` (barra superior en movil): solo el avatar, en un objetivo tactil de 48 px.
 */
type Variante = "tarjeta" | "sidebar" | "avatar";

/**
 * Selector de persona demo. Cambiar de persona es lo que demuestra la adaptabilidad
 * (20% de la rubrica): misma pantalla, otro contexto, otra interfaz.
 *
 * Cada persona lleva su foto en el avatar (`usuario.foto`). En el menu, la persona activa
 * lleva el renglon en `bg-sidebar-accent` (el mismo tinte del item activo del sidebar) y la
 * palomita en rojo: dos senales juntas se leen en un proyector; una palomita sola no. Si la
 * foto no carga, el avatar cae a las iniciales: oscuro para la activa (el mismo `bg-oscuro`
 * de sus burbujas en el chat; el rojo queda para Maya) y blanco con aro gris para las otras.
 *
 * El contexto de cada persona ("Tarjeta al limite, un pago atrasado") nunca se corta con
 * puntos: es lo que explica por que la pantalla cambia. En el trigger baja a dos renglones;
 * en el menu cabe en uno.
 *
 * Al tocar otra persona el trigger la muestra de inmediato (`useOptimistic`) con un spinner
 * mientras el servidor escribe la cookie y rearma la pantalla. El spinner va `aria-hidden`:
 * la espera la anuncia `aria-busy` en el trigger, y dos anuncios ("Cargando") serian ruido.
 *
 * Base UI pide el `items` en la raiz del Select (no es Radix) y los `SelectItem` van
 * dentro de un `SelectGroup`.
 */
export function SelectorUsuario({
  usuario,
  variante = "tarjeta",
}: {
  usuario: UsuarioDemo;
  variante?: Variante;
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [idVisible, mostrarId] = useOptimistic(usuario.id);
  const visible = usuarioPorId(idVisible);
  const esMovil = useIsMobile();

  const items = USUARIOS.map((u) => ({ label: u.nombre, value: u.id }));
  const soloAvatar = variante === "avatar";

  return (
    <Select
      items={items}
      value={idVisible}
      onValueChange={(valor) => {
        const id = String(valor ?? usuario.id);
        if (id === idVisible) return;
        iniciar(async () => {
          mostrarId(id);
          await cambiarUsuario(id);
          router.push("/");
          router.refresh();
        });
      }}
    >
      <SelectTrigger
        aria-label="Cambiar de persona"
        aria-busy={pendiente}
        icono={false}
        className={cn(
          // `data-[size=default]:h-*` y no `h-*` a secas: shadcn fija la altura con ese
          // variant (especificidad 0,2,0) y una clase pelada pierde. Dejaba el trigger en
          // 32 px con el avatar desbordando.
          soloAvatar
            ? "size-12 justify-center rounded-full border-0 bg-transparent p-1 hover:bg-current/8 active:bg-current/12 data-[size=default]:h-12"
            : // Sin borde gris: con `border-input` parecia un campo de formulario. Un
              // relleno suave dice "esto se toca" y el tinte al pasar el cursor es el
              // mismo de los items del sidebar. Los gaps y paddings estan medidos: con
              // `gap-3` y `pr-3` a "Ana Sofía Treviño" (123 px) le quedaban 120 en los
              // 224 px del pie del sidebar y se cortaba.
              "w-full gap-2 rounded-xl border-transparent bg-muted px-2.5 py-2.5 hover:bg-sidebar-accent data-popup-open:bg-sidebar-accent data-[size=default]:h-auto",
        )}
      >
        <SelectValue>
          <span className="flex min-w-0 flex-1 items-center gap-2.5">
            <AvatarPersona usuario={visible} activa pendiente={soloAvatar && pendiente} />
            {!soloAvatar && (
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-semibold leading-tight">{visible.nombre}</span>
                {/* `whitespace-normal`: el trigger base es `whitespace-nowrap`, y sin esto
                    el contexto no baja de renglon y el `line-clamp` corta en el primero. */}
                <span className="line-clamp-2 text-xs leading-snug whitespace-normal text-muted-foreground">
                  {visible.contexto}
                </span>
              </span>
            )}
          </span>
        </SelectValue>
        {!soloAvatar &&
          (pendiente ? (
            <Spinner className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          ) : (
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          ))}
      </SelectTrigger>

      <SelectContent
        alignItemWithTrigger={false}
        {...posicionDelMenu(variante, esMovil)}
        className={cn(
          "max-w-(--available-width) rounded-2xl p-1",
          variante === "tarjeta" ? "w-(--anchor-width) min-w-72" : "w-80",
        )}
      >
        <SelectGroup className="flex flex-col gap-0.5 p-0">
          <SelectLabel className="flex flex-col gap-0.5 px-3 pt-2.5 pb-2">
            <span className="text-sm font-semibold text-foreground">Cambiar de persona</span>
            <span>{MARCA.nombre} adapta lo que te muestra a cada una.</span>
          </SelectLabel>

          {USUARIOS.map((u) => {
            const activa = u.id === idVisible;
            return (
              <SelectItem
                key={u.id}
                value={u.id}
                className={cn(
                  "min-h-14 gap-3 rounded-xl py-2 pr-10 pl-2.5",
                  // La palomita es la del propio SelectItem (solo existe en la seleccionada),
                  // centrada en el hueco del `pr-10` y en el rojo de la marca.
                  "*:data-[slot=select-item-indicator]:right-3.5 *:data-[slot=select-item-indicator]:text-primary",
                  // `focus:` es el mismo variant del item base: con una clase pelada, al pasar
                  // el cursor el tinte se cambiaba por el gris de `accent`.
                  activa && "bg-sidebar-accent focus:bg-sidebar-accent",
                )}
              >
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <AvatarPersona usuario={u} activa={activa} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-semibold leading-tight">{u.nombre}</span>
                    {/* El `!` no es pereza: el item base pinta a TODOS sus descendientes con
                        `not-data-[variant=destructive]:focus:**:text-accent-foreground`
                        (0,3,0). Sin el, al pasar el cursor el contexto se volvia rojo igual
                        que el nombre y los dos renglones competian. */}
                    <span className="text-xs leading-snug whitespace-normal text-muted-foreground!">
                      {u.contexto}
                    </span>
                  </span>
                </span>
              </SelectItem>
            );
          })}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function posicionDelMenu(variante: Variante, esMovil: boolean) {
  if (variante === "avatar") return { side: "bottom", align: "end" } as const;
  if (variante === "tarjeta") return { side: "bottom", align: "start" } as const;
  // 16 px = el padding del pie mas el del contenedor flotante: el menu arranca justo
  // afuera de la tarjeta blanca, a la misma distancia que el contenido del lienzo.
  if (!esMovil) return { side: "right", align: "end", sideOffset: 16 } as const;
  return { side: "top", align: "start" } as const;
}

/**
 * El avatar de una persona. `render={<span />}` en los dos: el Avatar de Base UI es un
 * <div> por omision y aqui vive dentro del <span> de `SelectValue` o del `ItemText`; un
 * <div> dentro de un <span> es HTML invalido y React lo reporta como desajuste de
 * hidratacion.
 *
 * Mientras cambia de persona, la variante `avatar` no tiene otro lugar para el spinner:
 * se quita la foto y el spinner ocupa el fallback.
 */
function AvatarPersona({
  usuario,
  activa,
  pendiente = false,
}: {
  usuario: UsuarioDemo;
  activa: boolean;
  pendiente?: boolean;
}) {
  return (
    <Avatar render={<span />} className="size-10 shrink-0">
      {!pendiente && <AvatarImage src={usuario.foto} alt="" />}
      <AvatarFallback
        render={<span />}
        className={cn(
          "text-sm font-semibold",
          // `!` por la misma regla `**:` del item: sin el, al pasar el cursor las iniciales
          // se volvian rojas (blancas sobre oscuro dejaban de leerse; en gris parecia que
          // la persona ya estaba elegida). Las inactivas van en blanco con el aro del
          // Avatar: sobre el gris del renglon al pasar el cursor siguen despegando.
          activa ? "bg-oscuro text-white!" : "bg-background text-muted-foreground!",
        )}
      >
        {pendiente ? <Spinner className="size-4" aria-hidden /> : usuario.iniciales}
      </AvatarFallback>
    </Avatar>
  );
}
