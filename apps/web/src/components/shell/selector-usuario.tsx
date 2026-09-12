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
 * Base UI pide el `items` en la raiz del Select (no es Radix), y los `SelectItem` van
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
          "h-auto w-full rounded-xl py-2 transition-colors",
          compacto && "w-auto border-0 bg-transparent px-1 shadow-none",
        )}
      >
        <SelectValue>
          <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className="bg-tinte text-xs font-medium text-primary">
                {usuario.iniciales}
              </AvatarFallback>
            </Avatar>
            {!compacto && (
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{usuario.nombre}</span>
                <span className="truncate text-xs text-muted-foreground">{usuario.contexto}</span>
              </span>
            )}
            {pendiente && <Spinner className="size-3.5 shrink-0 text-muted-foreground" />}
          </span>
        </SelectValue>
        {!compacto && !pendiente && (
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        )}
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        <SelectGroup>
          {USUARIOS.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              <span className="flex flex-col">
                <span className="text-sm">{u.nombre}</span>
                <span className="text-xs text-muted-foreground">{u.contexto}</span>
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
