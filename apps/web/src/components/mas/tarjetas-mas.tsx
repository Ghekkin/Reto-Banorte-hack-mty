import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  CircleCheck,
  CircleHelp,
  CreditCard,
  FileText,
  LayoutPanelTop,
  MessageCircle,
  Receipt,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Tarjeta } from "@maya/catalogo";
import { IconoBanorte } from "@/components/marca/logo-banorte";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatearMonto } from "@/lib/dinero";
import type { Perfil } from "@/lib/datos/consultas";
import { MARCA } from "@/lib/marca";
import { ETIQUETA_SEGMENTO, enmascararCorreo, enmascararTelefono, textoAntiguedad } from "@/lib/perfil";
import type { UsuarioDemo } from "@/lib/usuarios";
import { cn } from "@/lib/utils";

/**
 * Las piezas de Mas. Es la pantalla que un juez abre para entender quien es la persona, con
 * que datos trabaja Maya y como se cambia de situacion. Programada, no generada: nada de aqui
 * es una decision que valga un turno de modelo.
 *
 * Reglas que cumplen todas (skill `diseno-banorte`): una idea por tarjeta, el degradado de
 * marca una sola vez (el perfil), la cifra de esa tarjeta como lo mas grande de la pantalla,
 * datos sensibles enmascarados y ningun boton rojo: la accion de la pantalla es la pildora
 * clara del heroe, que lleva a Maya.
 *
 * Son `Tarjeta` del catalogo y no `Card` a secas por dos cosas que ya resuelve: se acomodan a
 * su propio ancho (`@container/tarjeta`), y entran con la misma coreografia que los widgets
 * que arma Maya (superficie, cifra, filas), esperando a verse en el celular. Asi Mas se
 * siente de la misma app que Inicio y la conversacion.
 */

/** El titulo pequeno y gris de toda tarjeta blanca de la pantalla. */
function Titulo({ children }: { children: ReactNode }) {
  return <CardTitle className="text-sm font-medium text-muted-foreground">{children}</CardTitle>;
}

// --- El perfil (la heroe) --------------------------------------------------------

/**
 * Quien es la persona y como esta parada, de un vistazo. El numero es lo disponible: es lo
 * primero que alguien busca al abrir su banco, y con "lo que debes" al lado se lee la
 * situacion completa sin abrir otra pantalla.
 */
export function PerfilHeroe({
  usuario,
  perfil,
  disponibleCentavos,
  deudaCentavos,
  hoy,
}: {
  usuario: UsuarioDemo;
  perfil: Perfil | undefined;
  disponibleCentavos: number;
  deudaCentavos: number;
  hoy: Date;
}) {
  const detalle = perfil ? `${perfil.edad} años · ${perfil.ocupacion}` : usuario.contexto;

  return (
    <Tarjeta heroe>
      <CardContent className="flex flex-1 flex-col justify-between gap-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <Avatar render={<span />} className="size-14 shrink-0 after:border-white/30">
            <AvatarFallback render={<span />} className="bg-white/15 text-lg font-semibold text-primary-foreground">
              {usuario.iniciales}
            </AvatarFallback>
          </Avatar>
          {/* `min-w-48`: en celular el badge de antiguedad baja de renglon en vez de apretar el
              nombre a tres lineas. */}
          <div className="flex min-w-48 flex-1 flex-col gap-0.5">
            <span className="text-lg font-semibold leading-tight @md/tarjeta:text-xl">
              {perfil?.nombreCompleto ?? usuario.nombre}
            </span>
            <span className="text-sm text-primary-foreground/80">{detalle}</span>
          </div>
          {perfil ? (
            <Badge className="h-7 shrink-0 rounded-full border-0 bg-white/15 px-3 text-xs text-primary-foreground">
              {textoAntiguedad(perfil.clienteDesde, hoy)}
            </Badge>
          ) : null}
        </div>

        {/* La cifra y los botones van juntos al fondo: estirada junto a la lista de personas, el
            aire de mas queda entre quien es y cuanto tiene, no partido en dos huecos. */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 @2xl/tarjeta:flex-row @2xl/tarjeta:items-end @2xl/tarjeta:justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-primary-foreground/80">Disponible hoy</span>
              <span className="cifra monto-heroe text-4xl font-semibold leading-none @md/tarjeta:text-5xl">
                {formatearMonto(disponibleCentavos)}
              </span>
            </div>

            {/* Sin "Invertido": se quito cuando `resumenDe` sumaba la cuenta de inversion al
                disponible y el portafolio de Carmen se veia dos veces (issue #32, ya resuelto:
                el disponible es solo nomina y ahorro). Queda la misma cifra que el heroe de Inicio. */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-primary-foreground/80">Lo que debes</span>
              <span className="monto text-xl font-medium leading-none">{formatearMonto(deudaCentavos)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 @sm/tarjeta:flex-row">
            <Button
              render={<Link href="/maya" />}
              nativeButton={false}
              className="min-h-12 rounded-full bg-white/90 px-5 text-primary hover:bg-white @md/tarjeta:min-h-10"
            >
              Preguntarle a {MARCA.nombre}
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button
              render={<Link href="/productos" />}
              nativeButton={false}
              className="min-h-12 rounded-full bg-oscuro px-5 text-white hover:bg-oscuro/90 @md/tarjeta:min-h-10"
            >
              Ver mis productos
            </Button>
          </div>
        </div>
      </CardContent>
    </Tarjeta>
  );
}

// --- Cambiar de persona ------------------------------------------------------------

/** La envoltura de servidor de `CambiarPersona`: el titulo y la frase que explica para que. */
export function TarjetaPersonas({ children }: { children: ReactNode }) {
  return (
    <Tarjeta>
      <CardHeader>
        <Titulo>Prueba con otra persona</Titulo>
        <CardDescription className="text-foreground">
          La misma pregunta arma otra pantalla, porque {MARCA.nombre} decide con la situación de cada quien.
        </CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Tarjeta>
  );
}

// --- Como funciona ----------------------------------------------------------------

/**
 * Los tres pasos del reto en palabras de la persona, sin siglas: entiende, arma, ejecuta. Cada
 * paso lleva una miniatura hecha con las mismas piezas de la app (la burbuja oscura del chat,
 * los chips de las tarjetas, el badge de estado), con el ejemplo del guion de la demo, que es
 * el flujo verificado: bajar intereses, plan de pago, plan activo.
 *
 * En tarjeta angosta es una linea de tiempo vertical; en ancha, tres columnas unidas por una
 * linea. Las dos lineas son el mismo `after:` con otra orientacion.
 */
export function ComoFuncionaMaya() {
  const pasos: {
    icono: ComponentType<SVGProps<SVGSVGElement>>;
    titulo: string;
    detalle: string;
    muestra: ReactNode;
  }[] = [
    {
      icono: MessageCircle,
      titulo: "Le dices qué necesitas",
      detalle: "Con tus palabras, sin menús.",
      muestra: (
        <span className="w-fit max-w-full rounded-2xl rounded-bl-md bg-oscuro px-3 py-2 text-sm text-white">
          Quiero pagar menos intereses
        </span>
      ),
    },
    {
      icono: LayoutPanelTop,
      titulo: "Arma tu pantalla",
      detalle: "Consulta tus datos y elige las tarjetas que lo resuelven.",
      muestra: (
        <span className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="h-7 rounded-full border-borde-sutil px-2.5 text-xs">
            Tu tarjeta
          </Badge>
          <Badge variant="outline" className="h-7 rounded-full border-borde-sutil px-2.5 text-xs">
            Plan de pago
          </Badge>
        </span>
      ),
    },
    {
      icono: CircleCheck,
      titulo: "Tocas y se hace",
      detalle: "La operación se aplica y la misma pantalla cambia con el resultado.",
      muestra: (
        <Badge className="h-7 w-fit rounded-full bg-tinte px-2.5 text-xs text-primary">
          <CircleCheck aria-hidden /> Plan activo
        </Badge>
      ),
    },
  ];

  return (
    <Tarjeta>
      <CardHeader>
        <Titulo>Cómo funciona {MARCA.nombre}</Titulo>
        <CardDescription className="text-base font-medium text-foreground">
          No te contesta con párrafos: construye la pantalla que resuelve lo que pediste.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="animar-filas grid gap-5 @2xl/tarjeta:grid-cols-3 @2xl/tarjeta:gap-6">
          {pasos.map(({ icono: Icono, titulo, detalle, muestra }, i) => (
            <li
              key={titulo}
              className={cn(
                "relative flex gap-4 @2xl/tarjeta:flex-col @2xl/tarjeta:gap-3",
                // La linea que une los pasos: vertical bajo el icono en angosta, horizontal a
                // la derecha del icono en ancha. El ultimo paso no la lleva.
                i < pasos.length - 1 &&
                  "after:absolute after:top-12 after:-bottom-4 after:left-5 after:w-px after:bg-borde-sutil @2xl/tarjeta:after:top-5 @2xl/tarjeta:after:right-0 @2xl/tarjeta:after:bottom-auto @2xl/tarjeta:after:left-14 @2xl/tarjeta:after:h-px @2xl/tarjeta:after:w-auto",
              )}
            >
              <span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
                <Icono aria-hidden className="size-5" />
                <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-oscuro text-[11px] font-semibold text-white tabular-nums">
                  {i + 1}
                </span>
              </span>
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">{titulo}</span>
                  <span className="text-sm text-muted-foreground">{detalle}</span>
                </div>
                {muestra}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Tarjeta>
  );
}

// --- Preguntas sugeridas ------------------------------------------------------------

/**
 * Tres preguntas por persona, las que ya producen una pantalla verificada: las del guion
 * (`docs/demo/guion-demo.md`), la de "¿invertir o pagar?" que ofrece Productos a quien no
 * invierte, y los chips iniciales de la consola de Maya. Cambian con la persona, que es el
 * punto: a Beto no se le sugiere invertir primero y a Carmen no se le habla de su tarjeta.
 */
const PREGUNTAS: Record<string, string[]> = {
  usr_beto: [
    "Quiero pagar menos intereses de mi tarjeta",
    "¿En qué se me está yendo el dinero?",
    "¿Me conviene invertir o primero pagar mi tarjeta?",
  ],
  usr_ana: ["Quiero pagar menos intereses de mi tarjeta", "Quiero empezar a ahorrar", "¿En qué se me fue el dinero?"],
  usr_carmen: ["¿Cómo estoy?", "¿En qué se me fue el dinero?", "¿Cómo va mi portafolio?"],
};

export function PreguntasSugeridas({ usuario }: { usuario: UsuarioDemo }) {
  const preguntas = PREGUNTAS[usuario.id] ?? PREGUNTAS.usr_beto!;
  const nombre = usuario.nombre.split(" ")[0];

  return (
    <Tarjeta>
      <CardHeader>
        <Titulo>Pregúntale a {MARCA.nombre}</Titulo>
        <CardDescription className="text-foreground">Lo que {nombre} le preguntaría hoy.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="animar-filas flex flex-col gap-2">
          {preguntas.map((pregunta) => (
            <li key={pregunta}>
              <Link
                href={`/maya?intencion=${encodeURIComponent(pregunta)}`}
                className="group flex min-h-12 items-center gap-3 rounded-xl border border-borde-sutil px-3 py-2 transition-colors duration-150 ease-out hover:border-tinte-fuerte hover:bg-tinte active:bg-tinte-fuerte"
              >
                {/* Neutro en reposo y rojo al pasar: tres isotipos rojos quietos le quitaban el
                    acento a la pildora del heroe, que es la accion de la pantalla. */}
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors duration-150 ease-out group-hover:bg-card group-hover:text-primary">
                  <IconoBanorte aria-hidden className="size-4" />
                </span>
                <span className="flex-1 text-sm">{pregunta}</span>
                <ArrowUpRight
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
                />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Tarjeta>
  );
}

// --- Datos personales ---------------------------------------------------------------

/**
 * Lo que el banco sabe de la persona, de `banorte.usuarios`. Es con lo que Maya decide: un
 * plan de pago "cabe" o no segun el ingreso, y a Carmen se le habla distinto por ser
 * patrimonial. Correo y telefono van enmascarados (`lib/perfil.ts`).
 */
export function DatosPersonales({ perfil }: { perfil: Perfil | undefined }) {
  return (
    <Tarjeta>
      <CardHeader>
        <Titulo>Datos personales</Titulo>
        {perfil ? (
          <CardAction>
            <Badge variant="secondary" className="h-6 rounded-full px-2.5">
              {ETIQUETA_SEGMENTO[perfil.segmento]}
            </Badge>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {perfil ? (
          <dl className="animar-filas grid @2xl/tarjeta:grid-cols-2 @2xl/tarjeta:gap-x-8">
            <Fila etiqueta="Ocupación" valor={perfil.ocupacion} />
            <Fila
              etiqueta={perfil.ingresoEsVariable ? "Ingreso promedio" : "Ingreso mensual"}
              valor={formatearMonto(perfil.ingresoMensualCentavos)}
              monto
            />
            <Fila etiqueta="Ciudad" valor={`${perfil.ciudad}, ${perfil.estado}`} />
            <Fila etiqueta="Correo" valor={enmascararCorreo(perfil.correo)} />
            <Fila etiqueta="Teléfono" valor={enmascararTelefono(perfil.telefono)} monto />
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">No pudimos leer tus datos en este momento.</p>
        )}
      </CardContent>
    </Tarjeta>
  );
}

function Fila({ etiqueta, valor, monto = false }: { etiqueta: string; valor: string; monto?: boolean }) {
  return (
    // El borde va arriba de cada fila menos la primera; en dos columnas, tampoco la segunda.
    <div className="flex min-h-12 items-center justify-between gap-4 border-t border-borde-sutil py-2 first:border-t-0 @2xl/tarjeta:nth-2:border-t-0">
      <dt className="shrink-0 text-sm text-muted-foreground">{etiqueta}</dt>
      <dd className={cn("min-w-0 text-right text-sm font-medium", monto && "monto")}>{valor}</dd>
    </div>
  );
}

// --- Todo lo demas --------------------------------------------------------------------

type Acceso = {
  icono: ComponentType<SVGProps<SVGSVGElement>>;
  etiqueta: string;
  detalle: string;
  /** Sin `href` no es un enlace: es un mosaico apagado que dice que no esta en el prototipo. */
  href?: string;
};

const ACCESOS: Acceso[] = [
  { icono: Receipt, etiqueta: "Movimientos", detalle: "Tu historial, con filtros", href: "/movimientos" },
  { icono: CreditCard, etiqueta: "Productos", detalle: "Cuentas, tarjetas y créditos", href: "/productos" },
  { icono: CircleHelp, etiqueta: "Ayuda", detalle: `Pregúntale a ${MARCA.nombre}`, href: "/maya" },
  { icono: Zap, etiqueta: "Pagos y servicios", detalle: "Fuera de este prototipo" },
  { icono: FileText, etiqueta: "Estados de cuenta", detalle: "Fuera de este prototipo" },
  { icono: ShieldCheck, etiqueta: "Seguridad", detalle: "Fuera de este prototipo" },
];

/**
 * El menu de un banco, honesto. Antes eran ocho renglones y seis decian "pendiente": en un
 * proyector se leia como una pantalla sin terminar. Ahora lo que existe va primero y se toca,
 * y lo que no, va apagado y lo dice una sola vez por mosaico, sin badge. Nada finge ser boton.
 */
export function TodoLoDemas() {
  return (
    <Tarjeta>
      <CardHeader>
        <Titulo>Todo lo demás</Titulo>
      </CardHeader>
      <CardContent>
        <ul className="animar-filas grid gap-2 @md/tarjeta:grid-cols-2">
          {ACCESOS.map((acceso) => (
            <li key={acceso.etiqueta}>
              <Mosaico {...acceso} />
            </li>
          ))}
        </ul>
      </CardContent>
    </Tarjeta>
  );
}

function Mosaico({ icono: Icono, etiqueta, detalle, href }: Acceso) {
  const contenido = (
    <>
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-xl",
          href ? "bg-muted text-foreground" : "bg-muted/60 text-muted-foreground",
        )}
      >
        <Icono aria-hidden className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn("text-sm font-medium", !href && "text-muted-foreground")}>{etiqueta}</span>
        <span className="truncate text-sm text-muted-foreground">{detalle}</span>
      </span>
    </>
  );

  if (!href) {
    return (
      <div aria-disabled className="flex min-h-16 items-center gap-3 rounded-xl px-3 py-2">
        {contenido}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="group flex min-h-16 items-center gap-3 rounded-xl px-3 py-2 transition-colors duration-150 ease-out hover:bg-current/8 active:bg-current/12"
    >
      {contenido}
      <ChevronRight
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 ease-out group-hover:translate-x-0.5"
      />
    </Link>
  );
}

// --- El aviso ---------------------------------------------------------------------------

/**
 * El pie de la pantalla. No es una tarjeta: es la firma del prototipo, sobre el lienzo. El
 * aviso va en `text-sm`, mas grande que antes: la skill `diseno-banorte` pide que no se
 * esconda ni se achique, porque es lo que separa un homenaje de una suplantacion.
 */
export function AvisoDelPrototipo() {
  return (
    <footer className="flex flex-col items-center gap-2 px-4 pt-4 pb-2 text-center md:pt-6">
      <span className="flex items-center gap-2 text-sm font-medium">
        <IconoBanorte aria-hidden className="size-4 text-primary" />
        {MARCA.contexto}
      </span>
      <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{MARCA.aviso}</p>
    </footer>
  );
}
