import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import {
  ChevronRight,
  CircleHelp,
  FileText,
  Receipt,
  Settings,
  ShieldCheck,
  User,
  Zap,
} from "lucide-react";
import { IconoBanorte } from "@/components/marca/logo-banorte";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SelectorUsuario } from "@/components/shell/selector-usuario";
import { formatearMonto } from "@/lib/dinero";
import { MARCA } from "@/lib/marca";
import { cuentasDe, resumenDe } from "@/lib/datos/consultas";
import { usuarioActivo } from "@/lib/usuario-activo";

/**
 * Mas: lo que no cabe en las cuatro pestanas.
 *
 * Perfil y "que es esto" traen contenido real. Pagos, Servicios, Seguridad y Estados de
 * cuenta quedan como estado vacio HONESTO: dicen que no estan en el prototipo en vez de
 * fingir una pantalla. Un boton que no hace nada es peor que un boton que explica por que.
 */
export default async function PaginaMas() {
  const usuario = await usuarioActivo();
  const [resumen, cuentas] = await Promise.all([resumenDe(usuario.id), cuentasDe(usuario.id)]);

  return (
    <div className="animar-lista grid gap-3 md:grid-cols-2 md:gap-4">
      {/* Perfil: datos reales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Tu perfil</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SelectorUsuario usuario={usuario} />
          <Separator />
          <div className="flex flex-col gap-3">
            <Dato etiqueta="Cuentas activas" valor={String(cuentas.length)} />
            <Dato etiqueta="Disponible" valor={formatearMonto(resumen.disponibleCentavos)} />
            <Dato etiqueta="Deuda total" valor={formatearMonto(resumen.deudaCentavos)} />
          </div>
          <p className="text-xs text-muted-foreground">
            Cambiar de persona cambia la interfaz que Maya construye: es la prueba de que se
            adapta al contexto.
          </p>
        </CardContent>
      </Card>

      {/* Qué es esto: contenido real, sirve al jurado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Qué es esto</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p>
            <span className="font-medium">{MARCA.nombre}</span> no responde con párrafos:
            construye la pantalla que resuelve lo que pediste y ejecuta la operación.
          </p>
          <p className="text-muted-foreground">
            Cada respuesta se arma con un catálogo de componentes financieros propio. El agente
            elige qué componer; no puede inventar pantallas fuera del catálogo.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {MARCA.piezas.split(" · ").map((pieza) => (
              <Badge key={pieza} variant="outline" className="rounded-full">
                {pieza}
              </Badge>
            ))}
          </div>
          <Separator />
          <p className="text-xs leading-relaxed text-muted-foreground">{MARCA.aviso}</p>
        </CardContent>
      </Card>

      {/* Enlaces */}
      <Card data-ancho="amplio">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Todo lo demás</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col">
          <Enlace href="/maya" icono={IconoBanorte} etiqueta="Preguntarle a Maya" disponible />
          <Enlace href="/movimientos" icono={Receipt} etiqueta="Movimientos" disponible />
          <Enlace icono={Zap} etiqueta="Pagos y servicios" />
          <Enlace icono={FileText} etiqueta="Estados de cuenta" />
          <Enlace icono={User} etiqueta="Datos personales" />
          <Enlace icono={Settings} etiqueta="Configuración" />
          <Enlace icono={ShieldCheck} etiqueta="Seguridad" />
          <Enlace icono={CircleHelp} etiqueta="Ayuda" />
        </CardContent>
      </Card>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm text-muted-foreground">{etiqueta}</span>
      <span className="monto text-sm font-medium">{valor}</span>
    </div>
  );
}

/**
 * Un renglon de la lista. Sin `href` no es un enlace: es una fila apagada con la
 * etiqueta "pendiente", que dice la verdad sin prometer nada.
 */
function Enlace({
  href,
  icono: Icono,
  etiqueta,
  disponible = false,
}: {
  href?: string;
  icono: ComponentType<SVGProps<SVGSVGElement>>;
  etiqueta: string;
  disponible?: boolean;
}) {
  const contenido = (
    <>
      <Icono className="size-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 text-sm">{etiqueta}</span>
      {disponible ? (
        // El chevron se corre 2 px al pasar el cursor. Es lo minimo que hace falta para
        // que la fila diga "esto lleva a algun lado" sin agregar texto ni color.
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      ) : (
        <Badge variant="outline" className="shrink-0 rounded-full text-[10px]">
          pendiente
        </Badge>
      )}
    </>
  );

  if (!href || !disponible) {
    return (
      <div
        aria-disabled
        className="flex min-h-12 items-center gap-3 border-b border-borde-sutil px-1 opacity-60 last:border-0"
      >
        {contenido}
      </div>
    );
  }

  return (
    <Link
      href={href}
      // `group` para el chevron. Las dos capas de estado de Material: 8% al pasar el
      // cursor, 12% al presionar. Sin la segunda, en movil no hay ninguna senal de que
      // el toque se registro.
      className="group flex min-h-12 items-center gap-3 border-b border-borde-sutil px-1 transition-colors last:border-0 hover:bg-current/8 active:bg-current/12"
    >
      {contenido}
    </Link>
  );
}
