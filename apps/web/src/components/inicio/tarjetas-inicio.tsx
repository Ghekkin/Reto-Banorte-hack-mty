"use client";

import Link from "next/link";
import { ArrowRight, ArrowUp, Mic } from "lucide-react";
import { IconoBanorte } from "@/components/marca/logo-banorte";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatearFecha, formatearMonto, formatearPorcentaje } from "@/lib/dinero";
import type { Cuenta, Movimiento, Tarjeta } from "@/lib/datos/consultas";

/**
 * Las piezas de Inicio. Estan aqui y no en la pagina para que la pagina se lea como un
 * indice de lo que muestra.
 *
 * Reglas que cumplen todas (skill `diseno-banorte`): etiqueta pequena arriba, el monto
 * como el elemento mas grande, `tabular-nums` en toda cifra, y un solo heroe por
 * pantalla.
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
      data-ancho="amplio"
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
    <Card data-ancho="amplio">
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
 * Es la pura barra de input (con texto, micrófono de voz y botón de envío)
 * flotando en la parte inferior de la pantalla.
 */
export function BarraFlotanteMaya() {
  return (
    <aside
      aria-label="Chat flotante con Maya"
      className="fixed inset-x-0 bottom-20 z-30 flex justify-center px-4 pointer-events-none md:bottom-6 md:left-[var(--sidebar-width,16rem)]"
    >
      <div className="flex w-full max-w-2xl items-center gap-2 rounded-2xl border border-borde-sutil bg-card/95 p-2 shadow-xl backdrop-blur-md ring-1 ring-black/5 pointer-events-auto transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,var(--primary)_0%,var(--marca-oscuro)_100%)] text-primary-foreground shadow-xs">
          <IconoBanorte className="size-4" />
        </span>
        <input
          type="text"
          placeholder="Pregúntale a Maya sobre tus gastos, créditos o inversiones..."
          aria-label="Pregúntale a Maya"
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
          className="flex-1 bg-transparent px-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
        <button
          type="button"
          aria-label="Entrada de voz (pendiente)"
          className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-primary active:scale-95"
        >
          <Mic className="size-4.5" />
        </button>
        <button
          type="button"
          aria-label="Enviar mensaje (pendiente)"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-xs transition-transform hover:bg-primary/90 active:scale-95"
        >
          <ArrowUp className="size-4.5" />
        </button>
      </div>
    </aside>
  );
}

export const PreguntaleAMaya = BarraFlotanteMaya;
export const AtajoMaya = BarraFlotanteMaya;

