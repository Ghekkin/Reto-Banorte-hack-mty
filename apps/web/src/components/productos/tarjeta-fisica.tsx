import { useId } from "react";
import { Nfc } from "lucide-react";
import { LogoBanorte } from "@/components/marca/logo-banorte";
import { cn } from "@/lib/utils";

/**
 * La tarjeta fisica, dibujada con CSS y SVG: la pieza que hace que Productos se vea como
 * una cartera y no como una tabla. No es una imagen: el logotipo viene de `LogoBanorte`
 * (skill `diseno-banorte`, seccion Marca), el color de los tokens y el patron de chevrones
 * es un `<pattern>` de SVG tono sobre tono, como en el plastico real.
 *
 * Dos tonos, y la regla es la del heroe: **el degradado de marca aparece una vez por
 * pantalla**. La primera tarjeta lleva `marca`; cualquier otra lleva `oscuro`, que ademas es
 * como se ve una tarjeta "premium" en cualquier cartera digital.
 *
 * Proporcion ISO/IEC 7810 ID-1 (85.60 x 53.98 mm = 1.586). Se dimensiona por ancho y la
 * altura sale sola, asi que en movil ocupa el ancho de la tarjeta blanca y en escritorio la
 * mitad, sin deformarse.
 *
 * El numero va enmascarado siempre (`•••• •••• •••• 4821`): el dato sensible nunca se
 * pinta completo, aunque sea sintetico.
 */
export function TarjetaFisica({
  producto,
  tipo,
  marca,
  mascara,
  titular,
  tono = "marca",
  className,
}: {
  producto: string;
  tipo: "debito" | "credito";
  marca: "visa" | "mastercard";
  /** "•••• 4821": solo se usan los ultimos cuatro digitos. */
  mascara: string;
  titular: string;
  tono?: "marca" | "oscuro";
  className?: string;
}) {
  const ultimos = mascara.replace(/\D/g, "").slice(-4) || "••••";

  return (
    <div
      role="img"
      aria-label={`${producto}, ${tipo === "credito" ? "crédito" : "débito"}, terminación ${ultimos}`}
      className={cn(
        "relative aspect-[1.586] w-full select-none overflow-hidden rounded-2xl text-white shadow-sm",
        tono === "marca"
          ? "bg-[linear-gradient(135deg,var(--primary)_0%,var(--marca-oscuro)_100%)]"
          : "bg-[linear-gradient(135deg,var(--oscuro)_0%,var(--foreground)_100%)]",
        className,
      )}
    >
      <Chevrones />
      {/* El brillo del plastico: un radial claro desde la esquina superior izquierda. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-radial-[at_12%_0%] from-white/20 to-transparent to-60%"
      />

      <div className="relative flex h-full flex-col justify-between p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <LogoBanorte className="h-5 w-auto sm:h-6" />
          <span className="flex min-w-0 flex-col items-end gap-0.5 text-right">
            <span className="text-xs font-semibold uppercase tracking-[0.22em]">
              {tipo === "credito" ? "Crédito" : "Débito"}
            </span>
            <span className="truncate text-xs text-white/85">{producto}</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Chip />
          <Nfc aria-hidden className="size-6 opacity-90" strokeWidth={2.25} />
        </div>

        <div className="flex flex-col gap-1">
          <span className="monto whitespace-nowrap font-mono text-base tracking-[0.12em] sm:text-lg">
            •••• •••• •••• {ultimos}
          </span>
          <div className="flex items-end justify-between gap-3">
            <span className="truncate text-xs uppercase tracking-[0.12em] text-white/85">
              {titular}
            </span>
            <Red marca={marca} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * El patron de chevrones del plastico de Banorte, tono sobre tono. Es un `<pattern>` y no
 * un PNG para que herede el color (`currentColor`) y pese cero bytes de red.
 */
function Chevrones() {
  const id = useId();
  return (
    <svg aria-hidden className="absolute inset-0 h-full w-full opacity-[0.13]">
      <defs>
        <pattern id={id} width="32" height="32" patternUnits="userSpaceOnUse">
          <path
            d="M0 16 L16 0 L32 16 M0 32 L16 16 L32 32"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinejoin="miter"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** El chip EMV: un rectangulo plata con sus contactos, en tokens (`muted` a `border`). */
function Chip() {
  return (
    <div
      aria-hidden
      className="relative h-8 w-11 overflow-hidden rounded-md bg-linear-to-br from-muted to-border ring-1 ring-white/40"
    >
      <span className="absolute inset-x-0 top-1/3 border-t border-muted-foreground/40" />
      <span className="absolute inset-x-0 top-2/3 border-t border-muted-foreground/40" />
      <span className="absolute inset-y-0 left-1/3 border-l border-muted-foreground/40" />
      <span className="absolute inset-y-0 right-1/3 border-l border-muted-foreground/40" />
    </div>
  );
}

/**
 * La red de pago, en monocromo blanco: dos circulos superpuestos para Mastercard y la
 * palabra para Visa. Ninguna trae sus colores corporativos a proposito: sobre el rojo de
 * Banorte competirian, y la regla es un solo acento por pantalla.
 */
function Red({ marca }: { marca: "visa" | "mastercard" }) {
  if (marca === "mastercard") {
    return (
      <span role="img" aria-label="Mastercard" className="flex shrink-0 items-center">
        <span className="size-7 rounded-full bg-white/90" />
        <span className="-ml-3 size-7 rounded-full bg-white/50" />
      </span>
    );
  }
  return (
    <span
      role="img"
      aria-label="Visa"
      className="shrink-0 text-2xl font-black italic leading-none tracking-tighter"
    >
      VISA
    </span>
  );
}
