import type { LucideIcon } from "lucide-react";
import { CreditCard, Home, MoreHorizontal, Receipt, Sparkles } from "lucide-react";

/**
 * Las cinco secciones de la app, en UN solo lugar. El sidebar de escritorio y la barra
 * de pestanas de movil leen de aqui: agregar o esconder una seccion es tocar este
 * arreglo, no tres componentes.
 *
 * Si hay que recortar alcance antes de la demo, se comenta la entrada y desaparece de
 * las dos navegaciones a la vez.
 */
export type Seccion = {
  href: string;
  etiqueta: string;
  /** Lo que va bajo el titulo en la barra superior. */
  descripcion: string;
  icono: LucideIcon;
  grupo: "banco" | "maya" | "mas";
  /**
   * Maya. En movil es el boton central elevado; en escritorio, el item con el
   * degradado de marca. Solo una seccion puede tenerlo (skill `diseno-banorte`:
   * un solo FAB por app).
   */
  destacada?: boolean;
};

export const SECCIONES: Seccion[] = [
  {
    href: "/",
    etiqueta: "Inicio",
    descripcion: "Tu saldo, tus productos y lo ultimo que pasó",
    icono: Home,
    grupo: "banco",
  },
  {
    href: "/productos",
    etiqueta: "Productos",
    descripcion: "Cuentas, tarjetas, créditos e inversiones",
    icono: CreditCard,
    grupo: "banco",
  },
  {
    href: "/maya",
    etiqueta: "Maya",
    descripcion: "Pregunta lo que necesites y ella construye la pantalla",
    icono: Sparkles,
    grupo: "maya",
    destacada: true,
  },
  {
    href: "/movimientos",
    etiqueta: "Movimientos",
    descripcion: "Historial completo, con filtros",
    icono: Receipt,
    grupo: "banco",
  },
  {
    href: "/mas",
    etiqueta: "Más",
    descripcion: "Pagos, servicios, perfil y configuración",
    icono: MoreHorizontal,
    grupo: "mas",
  },
];

/** Orden de la barra inferior: las cuatro pestanas con Maya en medio. */
export const ORDEN_PESTANAS = ["/", "/productos", "/maya", "/movimientos", "/mas"];

export const PESTANAS = ORDEN_PESTANAS.map(
  (href) => SECCIONES.find((s) => s.href === href)!,
).filter(Boolean);

/**
 * La seccion activa segun la ruta. Se compara el prefijo para que `/movimientos/algo`
 * siga marcando Movimientos, pero `/` solo coincide exacto (si no, marcaria siempre).
 */
export function seccionActiva(ruta: string): Seccion | undefined {
  if (ruta === "/") return SECCIONES.find((s) => s.href === "/");
  return SECCIONES.filter((s) => s.href !== "/").find(
    (s) => ruta === s.href || ruta.startsWith(`${s.href}/`),
  );
}
