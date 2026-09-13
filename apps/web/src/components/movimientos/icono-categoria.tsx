import {
  ArrowRightLeft,
  Banknote,
  Briefcase,
  Car,
  GraduationCap,
  HeartPulse,
  Home,
  Percent,
  PiggyBank,
  Receipt,
  Repeat,
  Shirt,
  ShoppingCart,
  Store,
  Ticket,
  TrendingUp,
  Utensils,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * El icono de una categoria de gasto.
 *
 * Las categorias traen el nombre del icono en kebab-case (`shopping-cart`), que es como
 * los nombra Lucide, pero no se puede importar por nombre en tiempo de ejecucion sin
 * arrastrar el paquete completo al bundle. Por eso el mapa es explicito: son 18
 * categorias, no van a crecer en la demo, y asi el `tree-shaking` solo se lleva estas.
 *
 * El icono NO es decorativo: es lo que permite escanear una lista de 300 renglones sin
 * leer la etiqueta de cada uno. Va en monocromo sobre el tinte de la marca, nunca con el
 * color propio de la categoria, porque 18 colores en una lista es un arcoiris.
 */
const ICONOS: Record<string, LucideIcon> = {
  "arrow-right-left": ArrowRightLeft,
  banknote: Banknote,
  // Lucide llama `Bolt` a un tornillo; el rayo de "servicios del hogar" es `Zap`.
  bolt: Zap,
  briefcase: Briefcase,
  car: Car,
  "graduation-cap": GraduationCap,
  "heart-pulse": HeartPulse,
  home: Home,
  percent: Percent,
  "piggy-bank": PiggyBank,
  receipt: Receipt,
  repeat: Repeat,
  shirt: Shirt,
  "shopping-cart": ShoppingCart,
  store: Store,
  ticket: Ticket,
  "trending-up": TrendingUp,
  utensils: Utensils,
};

/**
 * El circulo con el icono de la categoria.
 *
 * 36 px: cabe en el renglon sin empujar el monto y sigue siendo legible proyectado. No
 * es un objetivo tactil, es decoracion informativa dentro de un renglon que no se toca,
 * asi que no aplica el minimo de 48 px.
 */
export function IconoCategoria({
  icono,
  categoria,
  abono = false,
}: {
  /** El nombre kebab-case que viene en el dato. */
  icono: string;
  /** Para el lector de pantalla: el renglon ya dice la categoria, asi que el icono se oculta. */
  categoria: string;
  /** Un ingreso se pinta en verde, igual que su monto. */
  abono?: boolean;
}) {
  const Icono = ICONOS[icono] ?? Receipt;
  return (
    <span
      aria-hidden="true"
      title={categoria}
      className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
        abono ? "bg-exito/10 text-exito" : "bg-tinte text-primary"
      }`}
    >
      <Icono className="size-4" strokeWidth={2} />
    </span>
  );
}
