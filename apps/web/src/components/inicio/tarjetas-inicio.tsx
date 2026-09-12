import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { IconoBanorte } from "@/components/marca/logo-banorte";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
          <span className="monto text-4xl font-semibold leading-none">
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

        <Button
          render={<Link href="/maya" />}
          nativeButton={false}
          className="w-full rounded-full bg-white/90 text-primary hover:bg-white sm:w-auto"
        >
          Pregúntale a Maya
          <ArrowRight data-icon="inline-end" />
        </Button>
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
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Movimientos recientes
        </CardTitle>
        <Button
          render={<Link href="/movimientos" />}
          nativeButton={false}
          variant="ghost"
          size="sm"
          className="rounded-full text-xs"
        >
          Ver todos
        </Button>
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
 * El puente a Maya. Existe porque el riesgo de un Inicio bien hecho es que el jurado vea
 * un banco bonito y no un agente: desde aqui, una pregunta concreta lleva al lienzo.
 */
export function AtajoMaya({ sugerencias }: { sugerencias: string[] }) {
  return (
    <Card data-ancho="amplio" className="border-primary/20 bg-tinte/40">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center gap-2">
          <IconoBanorte className="size-4 text-primary" />
          <span className="text-sm font-medium">¿Y si le preguntas a Maya?</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {sugerencias.map((sugerencia) => (
            <Button
              key={sugerencia}
              render={<Link href={`/maya?intencion=${encodeURIComponent(sugerencia)}`} />}
              nativeButton={false}
              variant="outline"
              size="sm"
              className="min-h-11 rounded-full bg-background text-xs sm:min-h-9"
            >
              {sugerencia}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
