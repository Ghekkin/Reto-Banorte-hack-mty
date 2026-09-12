import Link from "next/link";
import { ArrowRight, CreditCard, PiggyBank, TrendingUp, Wallet } from "lucide-react";
import { TarjetaFisica } from "@/components/productos/tarjeta-fisica";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { formatearFechaCorta, formatearMonto, formatearPorcentaje } from "@/lib/dinero";
import type { Credito, Cuenta, Portafolio, Tarjeta } from "@/lib/datos/consultas";

/**
 * Las piezas de Productos. Es la vista de detalle de lo que Inicio resume: cada producto
 * con su numero grande, su avance y sus fechas.
 *
 * Reglas que cumplen todas (skill `diseno-banorte`): una idea por tarjeta, etiqueta
 * pequena arriba, el monto como el elemento mas grande, `tabular-nums` en toda cifra, un
 * solo boton rojo en la pantalla (vive en la primera tarjeta) y el degradado de marca una
 * sola vez (el plastico de esa misma tarjeta).
 */

// --- Tarjetas (el plastico y su estado) --------------------------------------

/**
 * Una tarjeta bancaria en la mano: el plastico a la izquierda y lo que importa de ella a
 * la derecha. En credito, el saldo por pagar con el uso de la linea, el pago minimo y la
 * fecha limite; en debito, el disponible de la cuenta a la que esta ligada.
 *
 * `heroe` la marca como la primera de la pantalla: plastico rojo y el unico boton primario.
 * Las demas llevan el plastico oscuro y ningun boton.
 */
export function TarjetaEnMano({
  tarjeta,
  cuenta,
  titular,
  heroe,
}: {
  tarjeta: Tarjeta;
  /** La cuenta ligada; en debito es de donde sale el disponible. */
  cuenta: Cuenta | undefined;
  titular: string;
  heroe: boolean;
}) {
  const esCredito = tarjeta.tipo === "credito";
  const apretada = esCredito && (tarjeta.utilizacion >= 0.8 || tarjeta.diasMora > 0);
  const disponibleCentavos = Math.max(0, cuenta?.saldoCentavos ?? 0);

  // La pregunta que se le hace a Maya depende de como esta la tarjeta: a quien la trae al
  // limite se le ofrece bajar intereses; a quien no, ver en que se le va el dinero. Son
  // los dos prompts del guion, que ya producen una pantalla verificada.
  const intencion = apretada
    ? "Quiero pagar menos intereses de mi tarjeta"
    : "¿En qué se me está yendo el dinero?";

  return (
    <Card data-ancho="amplio">
      <CardContent className="my-auto grid gap-5 sm:grid-cols-2 sm:items-center sm:gap-6">
        <TarjetaFisica
          producto={tarjeta.producto}
          tipo={tarjeta.tipo}
          marca={tarjeta.marca}
          mascara={tarjeta.mascara}
          titular={titular}
          tono={heroe ? "marca" : "oscuro"}
          className="mx-auto max-w-[26rem]"
        />

        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                {esCredito ? "Saldo por pagar" : "Disponible en tu cuenta"}
              </span>
              <span className="monto-heroe text-3xl font-semibold leading-none">
                {formatearMonto(esCredito ? tarjeta.saldoCentavos : disponibleCentavos)}
              </span>
            </div>
            <EstadoTarjeta tarjeta={tarjeta} />
          </div>

          {esCredito ? (
            <>
              <div className="flex flex-col gap-2">
                <Progress
                  value={Math.min(100, tarjeta.utilizacion * 100)}
                  aria-label="Uso de la línea de crédito"
                  className="[&_[data-slot=progress-track]]:h-2"
                />
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className={apretada ? "font-medium text-primary" : "text-muted-foreground"}>
                    {formatearPorcentaje(tarjeta.utilizacion)} de tu línea
                  </span>
                  <span className="monto text-muted-foreground">
                    Línea de {formatearMonto(tarjeta.limiteCentavos)}
                  </span>
                </div>
              </div>

              <dl className="flex flex-wrap gap-x-6 gap-y-3">
                <Dato etiqueta="Pago mínimo" valor={formatearMonto(tarjeta.pagoMinimoCentavos)} />
                <Dato etiqueta="Fecha límite" valor={formatearFechaCorta(tarjeta.fechaLimitePago)} />
                <Dato etiqueta="Tasa anual" valor={formatearPorcentaje(tarjeta.tasaAnual)} />
              </dl>
            </>
          ) : (
            <dl className="flex flex-wrap gap-x-6 gap-y-3">
              <Dato etiqueta="Ligada a" valor={cuenta?.alias ?? "Tu cuenta"} />
              <Dato etiqueta="Cuenta" valor={cuenta?.mascara ?? tarjeta.mascara} />
            </dl>
          )}

          {heroe && (
            <Button
              render={<Link href={`/maya?intencion=${encodeURIComponent(intencion)}`} />}
              nativeButton={false}
              className="min-h-11 w-full rounded-full sm:min-h-10 sm:w-fit"
            >
              {apretada ? "Pagar menos intereses" : "Ver en qué se me va"}
              <ArrowRight data-icon="inline-end" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * El estado va en badge, no en texto libre. El atraso en oscuro y no en rojo: el rojo es
 * la marca, no una alarma (skill `diseno-banorte`).
 */
function EstadoTarjeta({ tarjeta }: { tarjeta: Tarjeta }) {
  if (tarjeta.diasMora > 0) {
    return (
      <Badge className="shrink-0 bg-oscuro text-white">{tarjeta.diasMora} días de atraso</Badge>
    );
  }
  return (
    <Badge className="shrink-0 bg-tinte text-primary">
      {tarjeta.tipo === "credito" ? "Al corriente" : "Activa"}
    </Badge>
  );
}

// --- Cuentas ------------------------------------------------------------------

const ICONO_CUENTA: Record<Cuenta["tipo"], typeof Wallet> = {
  nomina: Wallet,
  ahorro: PiggyBank,
  inversion: TrendingUp,
  credito: CreditCard,
};

const ETIQUETA_CUENTA: Record<Cuenta["tipo"], string> = {
  nomina: "Nómina",
  ahorro: "Ahorro",
  inversion: "Inversión",
  credito: "Crédito",
};

/**
 * Las cuentas liquidas con su total arriba. Las de tipo `credito` no entran: esa deuda ya
 * esta en la tarjeta y en Creditos, y sumarla aqui como si fuera dinero es el error que
 * hace que una app bancaria pierda la confianza (mismo criterio que `resumenDe`).
 */
export function Cuentas({ cuentas }: { cuentas: Cuenta[] }) {
  const liquidas = cuentas.filter((c) => c.tipo !== "credito");
  const total = liquidas.reduce((suma, c) => suma + c.saldoCentavos, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Cuentas</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Total en tus cuentas</span>
          <span className="monto-heroe text-3xl font-semibold leading-none">
            {formatearMonto(total)}
          </span>
        </div>

        <Separator />

        <ul className="flex flex-col gap-3">
          {liquidas.map((cuenta) => {
            const Icono = ICONO_CUENTA[cuenta.tipo];
            return (
              <li
                key={cuenta.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5"
              >
                <span className="row-span-2 flex size-10 items-center justify-center rounded-xl bg-muted text-foreground">
                  <Icono aria-hidden className="size-5" />
                </span>
                <span className="truncate text-sm font-medium">{cuenta.alias}</span>
                <span className="monto text-base font-semibold">
                  {formatearMonto(cuenta.saldoCentavos)}
                </span>
                {/* La segunda linea cruza por debajo del monto: asi "Nomina principal ·
                    •••• 0301" cabe aunque el monto sea de siete cifras. */}
                <span className="col-span-2 truncate text-xs text-muted-foreground">
                  {ETIQUETA_CUENTA[cuenta.tipo]}
                  {cuenta.esPrincipal ? " principal" : ""} · {cuenta.mascara}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

// --- Creditos -----------------------------------------------------------------

const ETIQUETA_ESTATUS: Record<string, string> = {
  vigente: "Vigente",
  al_corriente: "Al corriente",
  vencido: "Vencido",
  reestructurado: "Reestructurado",
  liquidado: "Liquidado",
};

/**
 * Un credito por tarjeta: su saldo, cuanto lleva pagado del plazo y las tres cifras que
 * alguien busca cuando abre su credito (mensualidad, proximo pago, monto original).
 *
 * El avance va en oscuro y no en rojo: lo pagado es lo bueno (`--chart-1`), y el rojo se
 * reserva para lo que duele, como el uso de la linea en la tarjeta.
 */
export function CreditoEnCurso({ credito }: { credito: Credito }) {
  const avance = credito.plazoMeses > 0 ? credito.pagosRealizados / credito.plazoMeses : 0;
  const pagadoCentavos = Math.max(0, credito.montoOriginalCentavos - credito.saldoInsolutoCentavos);
  const atrasado = credito.diasMora > 0 || credito.estatus === "vencido";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="truncate text-sm font-medium">{credito.alias}</CardTitle>
        <CardDescription className="text-xs">
          Crédito · {formatearPorcentaje(credito.tasaAnual)} anual
        </CardDescription>
        <CardAction>
          <Badge className={atrasado ? "bg-oscuro text-white" : "bg-tinte text-primary"}>
            {credito.diasMora > 0
              ? `${credito.diasMora} días de atraso`
              : (ETIQUETA_ESTATUS[credito.estatus] ?? credito.estatus)}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Saldo por pagar</span>
          <span className="monto-heroe text-3xl font-semibold leading-none">
            {formatearMonto(credito.saldoInsolutoCentavos)}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <Progress
            value={Math.min(100, avance * 100)}
            aria-label="Avance del plazo"
            className="[&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-indicator]]:bg-oscuro"
          />
          <div className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
            <span>
              Pago {credito.pagosRealizados} de {credito.plazoMeses}
            </span>
            <span className="monto">Pagado {formatearMonto(pagadoCentavos)}</span>
          </div>
        </div>

        <dl className="flex flex-wrap gap-x-6 gap-y-3">
          <Dato etiqueta="Mensualidad" valor={formatearMonto(credito.mensualidadCentavos)} />
          <Dato etiqueta="Próximo pago" valor={formatearFechaCorta(credito.proximoPago)} />
          <Dato etiqueta="Monto original" valor={formatearMonto(credito.montoOriginalCentavos)} />
        </dl>
      </CardContent>
    </Card>
  );
}

// --- Inversiones --------------------------------------------------------------

const ETIQUETA_PERFIL: Record<string, string> = {
  conservador: "Perfil conservador",
  moderado: "Perfil moderado",
  agresivo: "Perfil agresivo",
};

/**
 * El portafolio: valor actual grande, lo aportado y el rendimiento, y despues cada
 * posicion con su peso en el portafolio como barra. El verde marca lo que gano; una
 * minusvalia va en gris, nunca en rojo.
 */
export function Inversiones({ portafolio }: { portafolio: Portafolio }) {
  const gano = portafolio.rendimientoCentavos >= 0;

  return (
    <Card data-ancho="amplio">
      <CardHeader>
        <CardTitle className="truncate text-sm font-medium">{portafolio.nombre}</CardTitle>
        <CardDescription className="text-xs">
          Inversiones · {portafolio.posiciones.length} instrumentos
        </CardDescription>
        <CardAction>
          <Badge className="bg-tinte text-primary">
            {ETIQUETA_PERFIL[portafolio.perfil] ?? portafolio.perfil}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Valor actual</span>
            <span className="monto-heroe text-3xl font-semibold leading-none">
              {formatearMonto(portafolio.valorActualCentavos)}
            </span>
          </div>
          <dl className="flex flex-wrap gap-x-6 gap-y-3">
            <Dato etiqueta="Aportado" valor={formatearMonto(portafolio.aportadoCentavos)} />
            <Dato
              etiqueta="Rendimiento"
              valor={`${gano ? "+" : "−"}${formatearMonto(Math.abs(portafolio.rendimientoCentavos))} · ${formatearPorcentaje(portafolio.rendimientoPct)}`}
              className={gano ? "text-exito" : undefined}
            />
          </dl>
        </div>

        <Separator />

        <ul className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {portafolio.posiciones.map((posicion) => {
            const subio = posicion.plusvaliaCentavos >= 0;
            return (
              <li key={posicion.clave} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{posicion.instrumento}</span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{posicion.clave}</span>
                      <Riesgo nivel={posicion.riesgo} />
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    <span className="monto text-sm font-semibold">
                      {formatearMonto(posicion.valorMercadoCentavos)}
                    </span>
                    <span className={`monto text-xs ${subio ? "text-exito" : "text-muted-foreground"}`}>
                      {subio ? "+" : "−"}
                      {formatearMonto(Math.abs(posicion.plusvaliaCentavos))}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Progress
                    value={Math.min(100, posicion.pesoPct * 100)}
                    aria-label={`Peso de ${posicion.instrumento} en el portafolio`}
                    className="flex-1 [&_[data-slot=progress-indicator]]:bg-oscuro"
                  />
                  <span className="monto w-12 shrink-0 text-right text-xs text-muted-foreground">
                    {formatearPorcentaje(posicion.pesoPct)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

/** El riesgo de un instrumento (1 a 5) como cinco puntos, con el numero para el lector. */
function Riesgo({ nivel }: { nivel: number }) {
  return (
    <span className="flex items-center gap-1" aria-label={`Riesgo ${nivel} de 5`} role="img">
      <span aria-hidden className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((punto) => (
          <span
            key={punto}
            className={`size-1.5 rounded-full ${punto <= nivel ? "bg-foreground" : "bg-border"}`}
          />
        ))}
      </span>
    </span>
  );
}

// --- Estados vacios -------------------------------------------------------------

/**
 * Quien no invierte (Beto) no ve un hueco: ve la puerta a Maya con la pregunta que le
 * conviene hacer. Es un boton `outline`, no primario: el rojo de la pantalla ya lo tiene la
 * tarjeta.
 */
export function SinInversiones() {
  const intencion = "¿Me conviene invertir o primero pagar mi tarjeta?";
  return (
    <Card>
      <Empty className="p-5">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TrendingUp aria-hidden />
          </EmptyMedia>
          <EmptyTitle>Todavía no inviertes</EmptyTitle>
          <EmptyDescription>
            Antes de empezar conviene saber si te alcanza o si primero deberías salir de deudas.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            render={<Link href={`/maya?intencion=${encodeURIComponent(intencion)}`} />}
            nativeButton={false}
            variant="outline"
            className="min-h-11 rounded-full sm:min-h-9"
          >
            Preguntarle a Maya
            <ArrowRight data-icon="inline-end" />
          </Button>
        </EmptyContent>
      </Empty>
    </Card>
  );
}

export function Vacio({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <Card>
      <Empty className="p-5">
        <EmptyHeader>
          <EmptyTitle>{titulo}</EmptyTitle>
          <EmptyDescription>{detalle}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </Card>
  );
}

// --- Piezas comunes -------------------------------------------------------------

/** Etiqueta arriba, dato abajo: la anatomia de la skill, en una celda de `dl`. */
function Dato({ etiqueta, valor, className }: { etiqueta: string; valor: string; className?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs whitespace-nowrap text-muted-foreground">{etiqueta}</dt>
      <dd className={`monto text-sm font-medium whitespace-nowrap ${className ?? ""}`}>{valor}</dd>
    </div>
  );
}
