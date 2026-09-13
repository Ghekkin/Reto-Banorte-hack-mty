"use client";

import { useId, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { ChevronDown, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { usarEntradaAlVerse } from "./animacion";
import { CLASES_TARJETA, CLASES_TARJETA_HEROE } from "./comunes";

/**
 * La tarjeta de TODO componente del catalogo, responsiva a su propio ancho.
 *
 * **Por que un contenedor y no breakpoints.** Un widget no sabe donde lo van a poner: en
 * el chat de Maya comparte fila con otra tarjeta, en un dashboard puede ocupar un tercio,
 * en un celular ocupa todo. Los breakpoints de Tailwind (`sm:`, `md:`) miran la PANTALLA,
 * asi que una tarjeta de 245 px en un escritorio se pintaba como si tuviera 1,440 px: las
 * fichas en cuatro columnas se recortaban a "$27,…". Aqui la envoltura declara
 * `@container/tarjeta`, y todo lo de adentro se acomoda con `@sm/tarjeta:`,
 * `@md/tarjeta:`, `@3xl/tarjeta:`… que miden la tarjeta, no la ventana.
 *
 * La envoltura es `grid` para que la tarjeta se estire al alto de su fila, y `min-w-0`
 * para que un contenido ancho (una grafica) no la empuje.
 *
 * **La heroe no se estira.** Junto a una tarjeta con grafica, la heroe (unos 200 px de
 * contenido) se volvia un bloque rojo de 530 px con el texto arriba y nada abajo: el
 * degradado grita, y estirado grita el doble. Se queda de su alto (`self-start`); las
 * blancas si se estiran, porque ahi el espacio de mas no pesa y los pies quedan alineados.
 *
 * **Entra animada, siempre.** `CLASES_TARJETA` trae `animar-tarjeta`, que es toda la
 * coreografia del widget (superficie, cifra, filas, trazo de la grafica) y vive en CSS
 * (`docs/como-funciona/animacion-de-widgets.md`). Lo unico que pone esta envoltura es que una
 * tarjeta montada fuera de la pantalla espere a verse (`usarEntradaAlVerse`).
 */
export function Tarjeta({
  heroe = false,
  className = "",
  children,
  ...props
}: ComponentProps<typeof Card> & { heroe?: boolean }) {
  const envoltura = useRef<HTMLDivElement>(null);
  usarEntradaAlVerse(envoltura);
  return (
    <div ref={envoltura} data-tarjeta="" className={`@container/tarjeta grid min-w-0 ${heroe ? "self-start" : ""}`}>
      <Card className={`${heroe ? CLASES_TARJETA_HEROE : CLASES_TARJETA} ${className}`} {...props}>
        {children}
      </Card>
    </div>
  );
}

/**
 * El pie de toda tarjeta: la accion (si hay) y el "¿Por que veo esto?" **plegado**.
 *
 * Antes la razon iba completa al pie, en una banda gris con borde: dos a cuatro lineas
 * en cada tarjeta, que en una pantalla de tres tarjetas eran doce lineas de letra chica
 * compitiendo con los numeros. Ahora es una sola linea que se abre al tocarla. La razon
 * sigue en el HTML (con `hidden`), asi que un lector de pantalla la anuncia al abrirla y
 * nadie la puede quitar sin que truene una prueba.
 *
 * El boton del "por que" mide 48 px en pantallas tactiles y 32 px con mouse
 * (`pointer-fine`): el objetivo tactil del sistema sin inflar el pie en escritorio.
 * `mt-auto` lo manda al fondo cuando la tarjeta se estira al alto de su fila.
 */
export function PieTarjeta({
  razon,
  heroe = false,
  children,
}: {
  razon?: string;
  heroe?: boolean;
  /** Los botones de la tarjeta. Usa `CLASES_BOTON_PIE` para el principal. */
  children?: ReactNode;
}) {
  const [abierta, setAbierta] = useState(false);
  const idRazon = useId();
  if (!razon && !children) return null;
  const suave = heroe ? "text-primary-foreground/80" : "text-muted-foreground";

  return (
    <CardFooter className="mt-auto flex-col items-stretch gap-1 border-t-0 bg-transparent pt-0">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        {children}
        {razon ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={abierta}
            aria-controls={idRazon}
            onClick={() => setAbierta((v) => !v)}
            className={`-mx-2 min-h-12 rounded-full px-2 text-xs font-normal pointer-fine:min-h-8 ${suave} ${
              heroe ? "hover:bg-white/10 hover:text-primary-foreground" : "hover:text-foreground"
            }`}
          >
            <Info aria-hidden /> ¿Por qué veo esto?
            <ChevronDown aria-hidden className={`transition-transform ${abierta ? "rotate-180" : ""}`} />
          </Button>
        ) : null}
      </div>
      {razon ? (
        <p id={idRazon} hidden={!abierta} className={`text-xs leading-relaxed ${suave}`}>
          {razon}
        </p>
      ) : null}
    </CardFooter>
  );
}
