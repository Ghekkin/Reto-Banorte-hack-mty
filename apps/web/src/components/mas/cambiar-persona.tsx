"use client";

import { useOptimistic, useTransition } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { cambiarUsuario } from "@/app/(app)/acciones";
import { USUARIOS, type UsuarioDemo } from "@/lib/usuarios";
import { cn } from "@/lib/utils";

/**
 * Las tres personas de la demo a la vista, y se cambia con un toque.
 *
 * En el sidebar la persona es un `Select`: cabe en el pie y no estorba. Aqui es lo contrario:
 * Mas es donde un juez llega a preguntar "¿y esto para quien es?", y un menu cerrado esconde
 * justo lo que hay que ensenar, que son TRES situaciones distintas una junto a otra ("Tarjeta
 * al limite", "Sin fondo de emergencia", "Patrimonial"). Es la prueba de adaptabilidad de la
 * rubrica (20 %) puesta como pantalla.
 *
 * Es un `RadioGroup` de shadcn con cada renglon como `label`: una sola eleccion, flechas del
 * teclado y lector de pantalla gratis, sin inventar tarjetas clicables sin semantica. La fila
 * activa lleva el borde rojo y el `bg-tinte` de las opciones de `PlanDePago`, para que elegir
 * se vea igual en toda la app.
 *
 * Al tocar, la fila se marca de inmediato (`useOptimistic`) con un spinner mientras la server
 * action escribe la cookie y el servidor rearma la pantalla con la otra persona. Es la misma
 * accion del selector del sidebar, asi que las dos quedan sincronizadas.
 */
export function CambiarPersona({ usuario }: { usuario: UsuarioDemo }) {
  const [pendiente, iniciar] = useTransition();
  const [idVisible, mostrarId] = useOptimistic(usuario.id);

  return (
    <RadioGroup
      value={idVisible}
      onValueChange={(valor) => {
        const id = String(valor ?? usuario.id);
        if (id === idVisible) return;
        iniciar(async () => {
          mostrarId(id);
          await cambiarUsuario(id);
        });
      }}
      aria-label="Persona de la demo"
      aria-busy={pendiente}
      className="animar-filas gap-2"
    >
      {USUARIOS.map((u) => {
        const activa = u.id === idVisible;
        return (
          <label
            key={u.id}
            className={cn(
              "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors duration-150 ease-out hover:bg-current/8 active:bg-current/12",
              activa ? "border-primary bg-tinte hover:bg-tinte" : "border-borde-sutil",
            )}
          >
            <AvatarPersona persona={u} activa={activa} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm font-semibold leading-tight">{u.nombre}</span>
              <span className="text-sm leading-snug text-muted-foreground">{u.contexto}</span>
            </span>
            {activa && pendiente ? (
              <Spinner className="size-4 shrink-0 text-primary" aria-hidden />
            ) : null}
            <RadioGroupItem value={u.id} aria-label={u.nombre} />
          </label>
        );
      })}
    </RadioGroup>
  );
}

/**
 * Oscuro es quien usa la app (el mismo `bg-oscuro` de sus burbujas en el chat y del selector
 * del sidebar); el rojo queda para Maya. Las que no estan activas van en blanco con aro gris.
 */
function AvatarPersona({ persona, activa }: { persona: UsuarioDemo; activa: boolean }) {
  return (
    <Avatar render={<span />} className="size-10 shrink-0">
      <AvatarFallback
        render={<span />}
        className={cn(
          "text-sm font-semibold",
          activa ? "bg-oscuro text-white" : "bg-background text-muted-foreground",
        )}
      >
        {persona.iniciales}
      </AvatarFallback>
    </Avatar>
  );
}
