"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, FileJson, Layers, Zap } from "lucide-react";
import {
  estadoVacio,
  procesarVarios,
  VERSION_A2UI,
  type Accion,
  type EstadoSuperficie,
  type FalloDeRender,
  type MensajeA2UI,
} from "@maya/a2ui";
import { Lienzo } from "@/components/maya/lienzo";
import { registrarComponentes } from "@/lib/registrar-componentes";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/**
 * La galeria: cada componente del catalogo pintado con el RENDERER de verdad
 * (`procesarVarios` + `<Superficie>`), a partir del mismo `.jsonl` que validan las
 * pruebas y que va al prompt del agente. Nada esta maquetado a mano: si aqui se ve bien,
 * es porque el renderer y el componente funcionan.
 *
 * Lo que se toca tambien es real: el boton de un componente emite su accion A2UI y esta
 * pagina la muestra tal como viajaria al agente (`client_to_server.json`). Es la forma
 * mas corta de explicar el ciclo cerrado sin gastar un turno de modelo.
 */
registrarComponentes();

export type ComponenteDeGaleria = {
  nombre: string;
  cuandoUsarlo: string;
  acciones: string[];
  props: Array<{ nombre: string; tipo: string; requerida: boolean; descripcion?: string }>;
  mensajes: MensajeA2UI[];
  fuente: string;
};

/**
 * A que ancho se ve cada ejemplo. Los componentes del catalogo se adaptan a SU ancho (container
 * queries), no al de la pantalla, asi que desde un escritorio se puede ver exactamente como
 * queda un widget en un celular, en media columna de un dashboard o a lo ancho.
 */
const ANCHOS = {
  celular: { etiqueta: "Celular · 360 px", clase: "max-w-[360px]" },
  mitad: { etiqueta: "Media columna · 480 px", clase: "max-w-[480px]" },
  completo: { etiqueta: "Completo", clase: "" },
} as const;
type Ancho = keyof typeof ANCHOS;

export function Galeria({
  componentes,
  layout,
  urlCatalogo,
}: {
  componentes: ComponenteDeGaleria[];
  layout: string[];
  urlCatalogo: string;
}) {
  const [ultimaAccion, setUltimaAccion] = useState<Accion | undefined>();
  const [fallos, setFallos] = useState<FalloDeRender[]>([]);
  const [ancho, setAncho] = useState<Ancho>("completo");

  // `pb-72` y no `pb-28`: el panel de accion de abajo es `fixed` y crece hasta
  // `max-h-64` (256 px) cuando muestra el JSON de la accion, asi que con menos padding
  // se come la ultima tarjeta.
  return (
    <div className="min-h-svh bg-lienzo p-3 pb-72 md:p-6 md:pb-72">
      <header className="mx-auto flex max-w-6xl flex-col gap-2 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold">Catálogo A2UI</h1>
          <Badge variant="secondary" className="bg-tinte text-primary">
            {componentes.length} componentes propios
          </Badge>
          <Badge variant="secondary">+ {layout.length} de layout</Badge>
          {/* Un enlace de verdad, no un boton: es lo que un juez abre en otra pestana. */}
          <a
            href={urlCatalogo}
            target="_blank"
            rel="noreferrer"
            className={`${buttonVariants({ variant: "outline", size: "sm" })} ml-auto rounded-full`}
          >
            <FileJson /> catalogo.json
          </a>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Los componentes que el agente puede invocar, pintados con el renderer real a partir de sus
          ejemplos <code>.jsonl</code>. Esta página no es el producto —eso es <code>/maya</code>—: es el
          banco de pruebas del catálogo, y funciona sin llave de modelo y sin el MCP arriba.
        </p>
        <p className="text-xs text-muted-foreground">
          Layout disponible para el agente: {layout.join(", ")}.
        </p>
        <div className="flex min-w-0 flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-muted-foreground">Ver cada ejemplo a:</span>
          <div className="-mx-1 min-w-0 overflow-x-auto px-1 pb-1">
            <ToggleGroup
              value={[ancho]}
              onValueChange={(valor) => {
                const elegido = (valor as string[])[0] as Ancho | undefined;
                if (elegido) setAncho(elegido);
              }}
              spacing={2}
              className="w-max"
            >
              {(Object.keys(ANCHOS) as Ancho[]).map((clave) => (
                <ToggleGroupItem key={clave} value={clave} className="min-h-11 whitespace-nowrap rounded-full px-3 text-xs sm:min-h-9">
                  {ANCHOS[clave].etiqueta}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-4">
        {componentes.map((c) => (
          <Ficha
            key={c.nombre}
            componente={c}
            claseAncho={ANCHOS[ancho].clase}
            alAccionar={setUltimaAccion}
            alFallar={(f) => setFallos((v) => [...v, f])}
          />
        ))}
      </main>

      <PanelDeAccion accion={ultimaAccion} fallos={fallos} alCerrar={() => setUltimaAccion(undefined)} />
    </div>
  );
}

/** Un componente: su ficha del catálogo, su render con datos y su estado de carga. */
function Ficha({
  componente,
  claseAncho,
  alAccionar,
  alFallar,
}: {
  componente: ComponenteDeGaleria;
  /** El tope de ancho elegido arriba: el mismo lienzo del producto, mas angosto. */
  claseAncho: string;
  alAccionar: (accion: Accion) => void;
  alFallar: (fallo: FalloDeRender) => void;
}) {
  const [verFuente, setVerFuente] = useState(false);
  const [verProps, setVerProps] = useState(false);

  // El estado del renderer, uno por componente: cada ejemplo crea su propia superficie.
  const conDatos = useMemo(() => superficieDe(componente.mensajes), [componente.mensajes]);
  const cargando = useMemo(
    () => superficieDeCarga(componente.nombre, componente.mensajes),
    [componente.nombre, componente.mensajes],
  );

  return (
    <section className="rounded-2xl border border-borde-sutil bg-card p-4 shadow-sm md:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Layers className="size-4 text-muted-foreground" />
        <h2 className="text-base font-semibold">{componente.nombre}</h2>
        {componente.acciones.map((a) => (
          <Badge key={a} variant="secondary" className="bg-tinte text-primary">
            <Zap /> {a}
          </Badge>
        ))}
        {componente.mensajes.length === 0 ? (
          <Badge variant="secondary" className="bg-oscuro text-white">
            sin ejemplo .jsonl
          </Badge>
        ) : null}
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setVerProps((v) => !v)}>
            props ({componente.props.length}) <ChevronDown />
          </Button>
          {componente.fuente ? (
            <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setVerFuente((v) => !v)}>
              .jsonl <ChevronDown />
            </Button>
          ) : null}
        </div>
      </div>

      <p className="pt-1 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Cuándo lo elige el agente:</span> {componente.cuandoUsarlo}
      </p>

      {verProps ? (
        <table className="mt-3 w-full text-xs">
          <tbody>
            {componente.props.map((p) => (
              <tr key={p.nombre} className="border-b border-borde-sutil last:border-0">
                <td className="py-1 pr-3 align-top font-medium whitespace-nowrap">
                  {p.nombre}
                  {p.requerida ? <span className="text-primary">*</span> : null}
                </td>
                <td className="py-1 pr-3 align-top whitespace-nowrap text-muted-foreground">{p.tipo}</td>
                <td className="py-1 align-top text-muted-foreground">{p.descripcion ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {verFuente ? (
        <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-muted p-3 text-[11px] leading-relaxed">
          {componente.fuente}
        </pre>
      ) : null}

      <Separator className="my-4" />

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">Con datos del ejemplo</span>
          {/* El mismo `Lienzo` de /maya: si aqui se acomoda bien, alla tambien. */}
          <div className={`w-full ${claseAncho}`}>
            {conDatos ? (
              <Lienzo
                superficie={conDatos}
                conversacionId="c_galeria"
                alAccionar={alAccionar}
                alFallar={alFallar}
                ocultarSugerenciasEnTarjeta={false}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Falta <code>packages/catalogo/ejemplos/</code> para este componente.
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">Estado de carga</span>
          <div className={`w-full ${claseAncho}`}>
            <Lienzo superficie={cargando} conversacionId="c_galeria" alAccionar={() => {}} />
          </div>
        </div>
      </div>
    </section>
  );
}

/** Procesa los mensajes del ejemplo igual que el cliente del producto. */
function superficieDe(mensajes: MensajeA2UI[]): EstadoSuperficie | undefined {
  if (mensajes.length === 0) return undefined;
  const { estado } = procesarVarios(estadoVacio(), mensajes);
  return [...estado.values()][0];
}

/**
 * El componente sin data model: es como lo ve la persona en el instante entre que llegan
 * los componentes y llegan los datos. Todo componente del catalogo tiene que aguantarlo
 * (skill `ui-generativa`, tres estados), y aqui se comprueba de un vistazo.
 */
/**
 * El componente sin datos, como lo veria la persona mientras llegan. Copia del ejemplo
 * solo las props que NO dependen del data model —`heroe` y `ancho`—, porque esas si se
 * conocen antes que los datos: sin ellas la galeria mostraba siempre el esqueleto blanco,
 * aunque en la pantalla real la tarjeta heroe ya aparece roja desde la carga.
 */
function superficieDeCarga(nombre: string, mensajes: MensajeA2UI[]): EstadoSuperficie | undefined {
  const delEjemplo = mensajes
    .flatMap((m) => ("updateComponents" in m ? m.updateComponents.components : []))
    .find((c) => c.component === nombre);
  const literales: Record<string, unknown> = {};
  for (const clave of ["heroe", "ancho"] as const) {
    const valor = delEjemplo?.[clave];
    if (typeof valor === "boolean" || typeof valor === "string") literales[clave] = valor;
  }
  const { estado } = procesarVarios(estadoVacio(), [
    { version: VERSION_A2UI, createSurface: { surfaceId: "carga", catalogId: "galeria" } },
    {
      version: VERSION_A2UI,
      updateComponents: {
        surfaceId: "carga",
        components: [
          { id: "root", component: nombre, ...literales, razon: "Todavía no llegan los datos de este componente." },
        ],
      },
    },
  ]);
  return estado.get("carga");
}

/**
 * Lo que la interfaz devolveria al agente. Se muestra el mensaje completo de
 * `client_to_server.json`, con `idempotencyKey` incluida: es el ciclo cerrado del reto,
 * visible sin gastar un turno de modelo.
 */
function PanelDeAccion({
  accion,
  fallos,
  alCerrar,
}: {
  accion: Accion | undefined;
  fallos: FalloDeRender[];
  alCerrar: () => void;
}) {
  if (!accion && fallos.length === 0) {
    return (
      <footer className="fixed inset-x-0 bottom-0 border-t border-borde-sutil bg-card/95 p-3 text-center text-xs text-muted-foreground backdrop-blur">
        Toca el botón de un componente: aquí aparece la acción A2UI que viajaría al agente.
      </footer>
    );
  }

  return (
    <footer className="fixed inset-x-0 bottom-0 max-h-64 overflow-auto border-t border-borde-sutil bg-card/95 p-3 backdrop-blur md:p-4">
      <div className="mx-auto flex max-w-6xl flex-col gap-2">
        {accion ? (
          <>
            <div className="flex items-center gap-2">
              <Check className="size-4 text-exito" />
              <span className="text-sm font-medium">
                La interfaz devolvería <code>{accion.name}</code>
              </span>
              <Button variant="ghost" size="sm" className="ml-auto rounded-full" onClick={alCerrar}>
                limpiar
              </Button>
            </div>
            <pre className="overflow-auto rounded-xl bg-muted p-3 text-[11px] leading-relaxed">
              {JSON.stringify({ version: VERSION_A2UI, action: accion }, null, 2)}
            </pre>
          </>
        ) : null}
        {fallos.map((f, i) => (
          <p key={i} className="text-xs text-muted-foreground">
            <Badge variant="secondary" className="bg-oscuro text-white">
              {f.code}
            </Badge>{" "}
            {f.path}: {f.message}
          </p>
        ))}
      </div>
    </footer>
  );
}
