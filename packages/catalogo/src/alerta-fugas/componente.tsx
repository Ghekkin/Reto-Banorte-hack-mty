"use client";

import { Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader } from "@/components/ui/card";
import type { PropsComponente } from "@maya/a2ui";
import { formatearMonto, formatearPorcentaje, recortar, sumaDeMontos } from "../comunes";
import { EsqueletoCuerpo, EsqueletoEncabezado, EsqueletoFilas, EsqueletoPie, EsqueletoTarjeta } from "../esqueletos";
import { PieTarjeta, Tarjeta } from "../tarjeta";
import type { PropsAlertaFugas } from "./schema";

/**
 * Las suscripciones que se cobran cada mes, y cuáles ya no se usan.
 *
 * **El número grande es lo que cuestan al año**, en negro: el rojo es de la marca, no
 * de "esto está mal" (skill `diseno-banorte`). Cada suscripción es una fila con su
 * monto y su botón; solo las que llevan meses sin uso tienen el botón rojo, porque esa
 * es LA acción que el agente vino a proponer. Las demás lo tienen en contorno.
 *
 * Se quitaron la caja con borde de cada fila, el título en mayúsculas y el icono de
 * alerta: tres cosas que gritaban y no informaban.
 */
export function AlertaFugas(props: Partial<PropsAlertaFugas> & Pick<PropsComponente, "alAccionar">) {
  const {
    totalMensualCentavos,
    totalAnualCentavos,
    pctDelIngreso,
    fugas,
    orden = "monto",
    limite,
    heroe = false,
    razon,
    alAccionar,
  } = props;

  if (typeof totalMensualCentavos !== "number" || typeof totalAnualCentavos !== "number" || !fugas) {
    return (
      <EsqueletoTarjeta heroe={heroe} etiqueta="Buscando cargos recurrentes">
        <EsqueletoEncabezado />
        <EsqueletoCuerpo>
          <EsqueletoFilas filas={3} />
        </EsqueletoCuerpo>
        <EsqueletoPie heroe={heroe} />
      </EsqueletoTarjeta>
    );
  }

  const suave = heroe ? "text-primary-foreground/80" : "text-muted-foreground";
  const sinUso = fugas.filter((f) => f.sinUsoReciente).length;
  // `orden` y `limite` son props de VISTA: el agente las parchea con `ajustar_pantalla` y
  // la tarjeta se reacomoda sin volver a consultar nada.
  const { visibles, fuera } = recortar(ordenar(fugas, orden), limite);
  const montoFuera = sumaDeMontos(fuera);

  return (
    <Tarjeta heroe={heroe}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <span className={`text-xs ${suave}`}>
            Suscripciones · {fugas.length} {fugas.length === 1 ? "cargo recurrente" : "cargos recurrentes"}
          </span>
          {sinUso > 0 ? (
            <Badge variant="secondary" className={`shrink-0 ${heroe ? "bg-white/20 text-primary-foreground" : "bg-tinte text-primary"}`}>
              {sinUso} sin uso
            </Badge>
          ) : null}
        </div>
        <span className="monto text-3xl font-semibold">{formatearMonto(totalAnualCentavos)}</span>
        <span className={`text-sm ${suave}`}>
          al año · <span className="monto">{formatearMonto(totalMensualCentavos)}</span> al mes
          {typeof pctDelIngreso === "number" ? (
            <>
              , <span className="monto">{formatearPorcentaje(pctDelIngreso)}</span> de tu ingreso
            </>
          ) : null}
        </span>
      </CardHeader>

      <CardContent>
        {fugas.length === 0 ? (
          <p className={`text-sm ${suave}`}>No encontré cargos recurrentes en tus movimientos.</p>
        ) : (
          <ul className="flex flex-col">
            {visibles.map((f) => (
              <li
                key={f.id}
                // En una tarjeta angosta no caben nombre, monto y botón en una línea: el botón
                // baja a su propia fila, a lo ancho. Desde 28rem de TARJETA van en la misma.
                className={`flex flex-col gap-2 border-b py-3 last:border-0 @md/tarjeta:flex-row @md/tarjeta:items-center @md/tarjeta:gap-3 @md/tarjeta:py-2 ${
                  heroe ? "border-white/20" : "border-borde-sutil"
                }`}
              >
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{f.concepto}</span>
                    <span className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs ${suave}`}>
                      <span className="truncate">
                        {f.comercio} · {f.periodicidad}
                      </span>
                      {f.sinUsoReciente ? (
                        <Badge variant="secondary" className={heroe ? "bg-white/20 text-primary-foreground" : "bg-tinte text-primary"}>
                          {f.mesesSinUso ? `Sin uso hace ${f.mesesSinUso} meses` : "Sin uso reciente"}
                        </Badge>
                      ) : null}
                    </span>
                  </span>
                  <span className="monto shrink-0 text-sm font-semibold">{formatearMonto(f.montoCentavos)}</span>
                </span>
                {alAccionar ? (
                  <Button
                    variant={f.sinUsoReciente ? "default" : "outline"}
                    size="sm"
                    className={`min-h-12 w-full shrink-0 rounded-full @md/tarjeta:w-auto ${
                      heroe ? (f.sinUsoReciente ? "bg-white/90 text-primary hover:bg-white" : "border-white/40 bg-transparent text-primary-foreground hover:bg-white/10") : ""
                    }`}
                    aria-label={`Cancelar ${f.concepto}`}
                    onClick={() => alAccionar({ accion: "cancelar_suscripcion", suscripcionId: f.id, concepto: f.concepto })}
                  >
                    <Ban /> Cancelar
                  </Button>
                ) : null}
              </li>
            ))}
            {fuera.length > 0 ? (
              // Lo recortado se resume en vez de desaparecer: si no, la suma de las filas no
              // cuadra con el total del encabezado y quien lo lea no sabra a cual creerle.
              <li className={`flex items-center justify-between py-3 text-sm ${suave}`}>
                <span>
                  y {fuera.length} {fuera.length === 1 ? "cargo mas" : "cargos mas"}
                </span>
                <span className="monto">{formatearMonto(montoFuera)}</span>
              </li>
            ) : null}
          </ul>
        )}
      </CardContent>

      <PieTarjeta razon={razon} heroe={heroe} />
    </Tarjeta>
  );
}

/**
 * El orden de la lista.
 *
 * `sinUso` pone primero las que no se usan y, dentro de cada grupo, las mas caras: son las
 * que conviene cancelar y en ese orden. Sin el segundo criterio, dos suscripciones sin uso
 * quedarian en el orden en que vinieron, que no significa nada.
 */
function ordenar(
  fugas: NonNullable<PropsAlertaFugas["fugas"]>,
  orden: NonNullable<PropsAlertaFugas["orden"]>,
): NonNullable<PropsAlertaFugas["fugas"]> {
  const copia = [...fugas];
  if (orden === "nombre") return copia.sort((a, b) => a.concepto.localeCompare(b.concepto, "es"));
  if (orden === "sinUso") {
    return copia.sort(
      (a, b) => Number(b.sinUsoReciente) - Number(a.sinUsoReciente) || b.montoCentavos - a.montoCentavos,
    );
  }
  return copia.sort((a, b) => b.montoCentavos - a.montoCentavos);
}
