"use client";

import { Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import type { PropsComponente } from "@maya/a2ui";
import { CLASES_PIE_HEROE, CLASES_TARJETA, CLASES_TARJETA_HEROE, formatearMonto, formatearPorcentaje } from "../comunes";
import { EsqueletoCuerpo, EsqueletoEncabezado, EsqueletoFilas, EsqueletoPie, EsqueletoTarjeta } from "../esqueletos";
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
  const { totalMensualCentavos, totalAnualCentavos, pctDelIngreso, fugas, heroe = false, razon, alAccionar } = props;

  if (typeof totalMensualCentavos !== "number" || typeof totalAnualCentavos !== "number" || !fugas) {
    return (
      <EsqueletoTarjeta heroe={heroe} etiqueta="Buscando cargos recurrentes">
        <EsqueletoEncabezado />
        <EsqueletoCuerpo>
          <EsqueletoFilas filas={3} />
        </EsqueletoCuerpo>
        <EsqueletoPie heroe={heroe} lineas={2} />
      </EsqueletoTarjeta>
    );
  }

  const suave = heroe ? "text-primary-foreground/80" : "text-muted-foreground";
  const sinUso = fugas.filter((f) => f.sinUsoReciente).length;

  return (
    <Card className={heroe ? CLASES_TARJETA_HEROE : CLASES_TARJETA}>
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
            {fugas.map((f) => (
              <li
                key={f.id}
                // A 360 px no caben nombre, monto y botón en una línea: el botón baja a su
                // propia fila, a lo ancho. En escritorio los tres van en la misma.
                className={`flex flex-col gap-2 border-b py-3 last:border-0 sm:flex-row sm:items-center sm:gap-3 sm:py-2 ${
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
                    className={`min-h-12 w-full shrink-0 rounded-full sm:w-auto ${
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
          </ul>
        )}
      </CardContent>

      {razon ? (
        <CardFooter className={heroe ? CLASES_PIE_HEROE : ""}>
          <p className={`text-xs ${suave}`}>¿Por qué veo esto? {razon}</p>
        </CardFooter>
      ) : null}
    </Card>
  );
}
