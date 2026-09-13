"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowUp, X } from "lucide-react";
import { IconoBanorte } from "@/components/marca/logo-banorte";
import { useTransicionDeInicio } from "@/components/inicio/transicion-inicio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { formatearFecha, formatearMonto, formatearPorcentaje } from "@/lib/dinero";
import type { Cuenta, Movimiento, Tarjeta } from "@/lib/datos/consultas";

/**
 * Las piezas de Inicio. Estan aqui y no en la pagina para que la pagina se lea como un
 * indice de lo que muestra.
 *
 * Reglas que cumplen todas (skill `diseno-banorte`): etiqueta pequena arriba, el monto
 * como el elemento mas grande, `tabular-nums` en toda cifra, y un solo heroe por
 * pantalla.
 *
 * **Cuanto ocupa cada una no se decide aqui**, se declara con `data-hueco` en la pagina:
 * una tarjeta no sabe si la van a poner sola, en una rejilla de tres o en el chat
 * (`components/inicio/masonry.tsx`).
 */

/**
 * El heroe. Una sola tarjeta con el degradado de marca y el numero que resume la
 * situacion. Si hay deuda se dice aqui: esconderla seria el tipo de omision que hace que
 * una app bancaria se sienta deshonesta.
 */
export function TarjetaSaldo({
  disponibleCentavos,
  deudaCentavos,
  cuenta,
}: {
  disponibleCentavos: number;
  deudaCentavos: number;
  cuenta: Cuenta | undefined;
}) {
  return (
    <Card
      className="border-0 bg-[linear-gradient(135deg,var(--primary)_0%,var(--marca-oscuro)_100%)] text-primary-foreground shadow-sm"
    >
      <CardContent className="flex flex-col gap-5 p-5">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-primary-foreground/80">
            Disponible {cuenta ? `· ${cuenta.alias} ${cuenta.mascara}` : ""}
          </span>
          <span className="monto-heroe text-4xl font-semibold leading-none">
            {formatearMonto(disponibleCentavos)}
          </span>
        </div>

        {deudaCentavos > 0 && (
          <div className="flex flex-col gap-1 border-t border-primary-foreground/20 pt-4">
            <span className="text-xs text-primary-foreground/80">Lo que debes</span>
            <span className="monto text-xl font-medium leading-none">
              {formatearMonto(deudaCentavos)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ListaCuentas({ cuentas }: { cuentas: Cuenta[] }) {
  const liquidas = cuentas.filter((c) => c.tipo !== "credito");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Tus cuentas</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {liquidas.map((cuenta) => (
          <div key={cuenta.id} className="flex items-baseline justify-between gap-3">
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{cuenta.alias}</span>
              <span className="text-xs text-muted-foreground">
                {ETIQUETA_CUENTA[cuenta.tipo]} · {cuenta.mascara}
              </span>
            </div>
            <span className="monto shrink-0 text-lg font-semibold">
              {formatearMonto(cuenta.saldoCentavos)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

const ETIQUETA_CUENTA: Record<Cuenta["tipo"], string> = {
  nomina: "Nómina",
  ahorro: "Ahorro",
  inversion: "Inversión",
  credito: "Crédito",
};

/**
 * Tarjetas de credito con su utilizacion. Es la pieza que delata el problema de Beto:
 * al 97% del limite se ve de inmediato, sin que nadie tenga que leer un numero.
 */
export function ListaTarjetas({ tarjetas }: { tarjetas: Tarjeta[] }) {
  const credito = tarjetas.filter((t) => t.tipo === "credito");
  if (credito.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Tus tarjetas</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {credito.map((tarjeta) => {
          const apretada = tarjeta.utilizacion >= 0.8;
          return (
            <div key={tarjeta.id} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{tarjeta.producto}</span>
                  <span className="text-xs text-muted-foreground">{tarjeta.mascara}</span>
                </div>
                {tarjeta.diasMora > 0 && (
                  <Badge className="shrink-0 bg-oscuro text-white">
                    {tarjeta.diasMora} días de atraso
                  </Badge>
                )}
              </div>

              <Progress value={tarjeta.utilizacion * 100} className="h-2" />

              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className={apretada ? "font-medium text-primary" : "text-muted-foreground"}>
                  {formatearPorcentaje(tarjeta.utilizacion)} de tu línea
                </span>
                <span className="monto text-muted-foreground">
                  {formatearMonto(tarjeta.saldoCentavos)} de {formatearMonto(tarjeta.limiteCentavos)}
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function MovimientosRecientes({ movimientos }: { movimientos: Movimiento[] }) {
  return (
    <Card>
      {/* `CardAction` no es opcional cuando hay una accion en el encabezado: el
          `CardHeader` de shadcn activa su segunda columna con
          `has-data-[slot=card-action]`, y un boton sin envolver no trae ese slot. Sin
          esto la rejilla se queda en una columna y el "Ver todos" cae DEBAJO del titulo,
          indentado, en vez de alinearse a la derecha. */}
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Movimientos recientes
        </CardTitle>
        <CardAction>
          <Button
            render={<Link href="/movimientos" />}
            nativeButton={false}
            variant="ghost"
            size="sm"
            className="rounded-full text-xs"
          >
            Ver todos
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {movimientos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay movimientos.</p>
        ) : (
          movimientos.map((movimiento) => (
            <div key={movimiento.id} className="flex items-baseline justify-between gap-3">
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm">{movimiento.descripcion}</span>
                <span className="text-xs text-muted-foreground">
                  {movimiento.categoria} · {formatearFecha(movimiento.fecha)}
                </span>
              </div>
              {/* El signo dice la direccion; el verde marca lo que entra. El rojo NO se
                  usa para gastos: es el color de la marca (skill `diseno-banorte`). */}
              <span
                className={`monto shrink-0 text-sm font-medium ${
                  movimiento.tipo === "abono" ? "text-exito" : "text-foreground"
                }`}
              >
                {movimiento.tipo === "abono" ? "+" : "−"}
                {formatearMonto(movimiento.montoCentavos)}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Barra flotante de entrada de Maya en Inicio.
 *
 * **Estaba muerta.** Era una maqueta: el `onKeyDown` hacia `e.preventDefault()` en Enter y
 * nada mas, y los dos botones decian `aria-label="… (pendiente)"` sin `onClick`. Escribir y
 * dar Enter no hacia absolutamente nada, que es exactamente lo que se reporto.
 *
 * Ahora llama a `preguntarEnInicio`, que corre el turno en el servidor y **reemplaza la
 * portada completa** con la pantalla que contesta. No se abre un chat ni se agrega una
 * burbuja: el dashboard se borra y aparece otro, que es lo que la persona espera al
 * escribir en su pantalla de inicio.
 *
 * **El envio ya no vive aqui: vive en `ProveedorDeInicio`** (`transicion-inicio.tsx`).
 * Tenia su propio `useTransition`, y con el estado encerrado en la barra la unica pieza de
 * la pantalla que se enteraba de que habia una pregunta en curso era el spinner de este
 * boton: las tarjetas se quedaban congeladas los ~8 s del turno y cambiaban de golpe.
 * Ahora la barra publica la pregunta y lee la fase; la salida en cascada de las tarjetas y
 * el esqueleto salen de ahi. El `useTransition` sigue siendo lo correcto (y no un `useState`
 * + `fetch`) porque cubre el turno Y el re-render del servidor.
 */
/**
 * El modo vivo de la barra (`FEATURE_WIDGETS_VIVOS`): quien la aloja decide que pasa con la
 * pregunta. La barra solo pinta el foco ("Sobre: Plan de pago"), la etapa de la consulta y
 * las preguntas sugeridas. Sin esto, la barra usa la transicion de Inicio (`transicion-inicio.tsx`).
 */
export type BarraViva = {
  enviar: (texto: string) => void;
  ocupado: boolean;
  /** "Consultando simular_reestructura…": lo que se esta haciendo ahora mismo. */
  estado?: string;
  foco?: { etiqueta: string; alQuitar: () => void };
  sugerencias: string[];
  fallo?: string;
  alDescartarFallo: () => void;
};

export function BarraFlotanteMaya({ vivo }: { vivo?: BarraViva } = {}) {
  const [texto, setTexto] = useState("");
  const transicion = useTransicionDeInicio();
  const enviando = vivo ? vivo.ocupado : transicion.pensando;
  const fallo = vivo ? vivo.fallo : transicion.fallo;

  function enviar(pregunta = texto) {
    const limpio = pregunta.trim();
    if (!limpio || enviando) return;
    if (vivo) vivo.enviar(limpio);
    else transicion.preguntar(limpio);
    setTexto("");
  }

  return (
    <aside
      aria-label="Pregúntale a Maya"
      className="fixed inset-x-0 bottom-20 z-30 flex flex-col items-center gap-2 px-4 pointer-events-none md:bottom-6 md:left-[var(--sidebar-width,16rem)]"
    >
      {fallo && (
        <p
          role="status"
          className="animar-entrada pointer-events-auto flex max-w-2xl items-center gap-2 rounded-xl border border-oscuro bg-card px-3 py-2 text-sm text-foreground shadow-md"
        >
          {fallo}
          {vivo && (
            <Button variant="ghost" size="icon" onClick={vivo.alDescartarFallo} aria-label="Descartar" className="size-8 rounded-full">
              <X className="size-4" />
            </Button>
          )}
        </p>
      )}
      {vivo && !enviando && vivo.sugerencias.length > 0 && (
        <div className="animar-cascada pointer-events-auto flex max-w-2xl flex-wrap justify-center gap-2">
          {vivo.sugerencias.map((s) => (
            <Button
              key={s}
              variant="outline"
              size="sm"
              onClick={() => enviar(s)}
              className="animar-entrada min-h-12 rounded-full bg-card/95 text-sm shadow-sm backdrop-blur-md hover:bg-tinte md:min-h-9"
            >
              {s}
            </Button>
          ))}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
        className="flex w-full max-w-2xl items-center gap-2 rounded-2xl border border-borde-sutil bg-card/95 p-2 shadow-md ring-1 ring-black/5 pointer-events-auto backdrop-blur-md transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,var(--primary)_0%,var(--marca-oscuro)_100%)] text-primary-foreground shadow-xs">
          <IconoBanorte className="size-4" />
        </span>
        {vivo?.foco && (
          // Todo el chip es el boton de quitar el foco: un blanco de 36 px como los demas
          // controles de la barra, y no una "x" de 24 px dentro de un badge.
          <Button
            type="button"
            variant="ghost"
            onClick={vivo.foco.alQuitar}
            aria-label={`Dejar de preguntar sobre ${vivo.foco.etiqueta.toLowerCase()}`}
            className="h-9 max-w-40 shrink-0 gap-1 rounded-full bg-tinte pl-3 pr-2 text-sm text-primary hover:bg-tinte-fuerte hover:text-primary"
          >
            <span className="truncate">{vivo.foco.etiqueta}</span>
            <X aria-hidden className="size-3.5" />
          </Button>
        )}
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          disabled={enviando}
          placeholder={
            enviando
              ? (vivo?.estado ?? "Maya está armando tu pantalla…")
              : vivo?.foco
                ? `Pregúntale a Maya sobre ${vivo.foco.etiqueta.toLowerCase()}…`
                : "Pregúntale a Maya sobre tus gastos, créditos o inversiones..."
          }
          aria-label="Pregúntale a Maya"
          className="min-w-0 flex-1 bg-transparent px-2 text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-70"
        />
        <button
          type="submit"
          aria-label="Enviar"
          disabled={enviando || texto.trim() === ""}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-xs transition-transform hover:bg-primary/90 active:scale-95 disabled:opacity-50"
        >
          {enviando ? <Spinner /> : <ArrowUp className="size-4.5" />}
        </button>
      </form>
    </aside>
  );
}

export const PreguntaleAMaya = BarraFlotanteMaya;
export const AtajoMaya = BarraFlotanteMaya;

