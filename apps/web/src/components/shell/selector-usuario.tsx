"use client";

import { useTransition } from "react";
import { ChevronsUpDown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { cambiarUsuario } from "@/app/(app)/acciones";
import { USUARIOS, type UsuarioDemo } from "@/lib/usuarios";
import { cn } from "@/lib/utils";

/**
 * Selector de usuario demo. Cambiar de persona es lo que demuestra la adaptabilidad
 * (20% de la rubrica): misma pantalla, otro contexto, otra interfaz.
 *
 * El seleccionado se marca con CONTRASTE, no con palomita: el mismo degradado de marca
 * que usa Maya en el sidebar. Una palomita de 16 px al borde derecho no se ve en un
 * proyector; un renglon relleno de rojo si. De ahi el `indicador={false}` en cada item.
 *
 * Ojo con el contraste al pasar el cursor: los estilos `focus:` del `SelectItem` base
 * tienen mas especificidad que una clase pelada. Ver el comentario del `className` del
 * item, que explica por que ahi van `!`.
 *
 * Base UI pide el `items` en la raiz del Select (no es Radix) y los `SelectItem` van
 * dentro de un `SelectGroup`.
 */
export function SelectorUsuario({
  usuario,
  compacto = false,
}: {
  usuario: UsuarioDemo;
  compacto?: boolean;
}) {
  const [pendiente, iniciar] = useTransition();

  const items = USUARIOS.map((u) => ({ label: u.nombre, value: u.id }));

  return (
    <Select
      items={items}
      value={usuario.id}
      onValueChange={(valor) => {
        const id = String(valor ?? usuario.id);
        if (id === usuario.id) return;
        iniciar(() => void cambiarUsuario(id));
      }}
    >
      <SelectTrigger
        aria-label="Cambiar de usuario demo"
        className={cn(
          // `data-[size=default]:h-auto` y no `h-auto`: shadcn fija la altura con ese
          // variant (especificidad 0,2,0) y una clase pelada pierde, dejando el trigger
          // en 32 px con el avatar desbordando.
          "h-auto w-full rounded-2xl py-3 transition-colors data-[size=default]:h-auto",
          compacto &&
            "w-auto rounded-full border-0 bg-transparent p-0.5 shadow-none data-[size=default]:h-auto",
        )}
      >
        <SelectValue>
          <span className="flex min-w-0 flex-1 items-center gap-3 text-left">
            {/* `render={<span />}`: `SelectValue` es un <span> y el Avatar de Base UI es un
                <div> por omision. Un <div> dentro de un <span> es HTML invalido y React lo
                reporta como desajuste de hidratacion. */}
            <Avatar
              render={<span />}
              className={cn("shrink-0", compacto ? "size-10" : "size-11")}
            >
              <AvatarFallback
                render={<span />}
                className="bg-tinte text-sm font-semibold text-primary"
              >
                {usuario.iniciales}
              </AvatarFallback>
            </Avatar>
            {!compacto && (
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-semibold leading-tight">
                  {usuario.nombre}
                </span>
                <span className="truncate text-xs leading-tight text-muted-foreground">
                  {usuario.contexto}
                </span>
              </span>
            )}
            {pendiente && <Spinner className="size-4 shrink-0 text-muted-foreground" />}
          </span>
        </SelectValue>
        {!compacto && !pendiente && (
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        )}
      </SelectTrigger>

      <SelectContent alignItemWithTrigger={false} className="min-w-64 p-1.5">
        <SelectGroup className="flex flex-col gap-1">
          {USUARIOS.map((u) => {
            const esActivo = u.id === usuario.id;
            return (
              <SelectItem
                key={u.id}
                value={u.id}
                // Sin palomita: la seleccion se lee por contraste, que si se ve proyectado.
                indicador={false}
                className={cn(
                  "min-h-14 gap-3 overflow-hidden rounded-xl p-2",
                  // El `!` no es pereza, es la unica forma de ganar aqui. El item base trae
                  // `focus:bg-accent focus:text-accent-foreground` (0,2,0) y ademas
                  // `not-data-[variant=destructive]:focus:**:text-accent-foreground`
                  // (0,3,0, y aplica a TODOS los descendientes). Una clase pelada es 0,1,0
                  // y pierde: al pasar el cursor por el renglon activo, el degradado rojo se
                  // cambiaba por el gris de `accent` y el texto blanco quedaba blanco sobre
                  // gris claro. Es el mismo choque que ya se pago en el item de Maya del
                  // sidebar (`sidebar-app.tsx`), aqui con un `**:` de por medio.
                  esActivo &&
                    "bg-[linear-gradient(135deg,var(--primary)_0%,var(--marca-oscuro)_100%)]! text-primary-foreground! **:text-primary-foreground!",
                )}
              >
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar render={<span />} className="size-9 shrink-0">
                    <AvatarFallback
                      render={<span />}
                      className={cn(
                        "text-xs font-semibold",
                        esActivo ? "bg-white/20" : "bg-tinte text-primary",
                      )}
                    >
                      {u.iniciales}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-semibold leading-tight">{u.nombre}</span>
                    <span
                      className={cn(
                        "truncate text-xs leading-tight",
                        // Activo: el color lo pone el `**:text-primary-foreground!` del item,
                        // asi que el segundo nivel se baja con opacidad y no con un color con
                        // alfa (que perderia contra esa regla).
                        esActivo ? "opacity-80" : "text-muted-foreground",
                      )}
                    >
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
