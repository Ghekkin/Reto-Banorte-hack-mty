"use client";

import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader } from "@/components/ui/card";
import type { PropsComponente } from "@maya/a2ui";
import { CLASES_BOTON_PIE, formatearMonto, formatearPorcentaje, recortar, sumaDeMontos } from "../comunes";
import { EsqueletoCuerpo, EsqueletoEncabezado, EsqueletoFilas, EsqueletoPie, EsqueletoTarjeta } from "../esqueletos";
import { PieTarjeta, Tarjeta } from "../tarjeta";
import type { PropsOrdenRebalanceo } from "./schema";

/**
 * Las operaciones que hacen falta para volver al modelo, antes de confirmarlas.
 *
 * Cada operación es una fila: qué se vende o compra (badge), el instrumento, y a la
 * derecha el monto con el cambio de peso. Sin cuadros de icono ni título en mayúsculas:
 * el badge ya dice compra o venta. La comisión va en el detalle del encabezado porque es
 * la pregunta que sigue a "¿y esto cuánto me cuesta?".
 */
export function OrdenRebalanceo(props: Partial<PropsOrdenRebalanceo> & Pick<PropsComponente, "alAccionar">) {
  const { portafolioId, nombrePortafolio, valorTotalCentavos, comisionTotalCentavos = 0, movimientos, orden = "monto", limite, heroe = false, razon, alAccionar } = props;

  if (!nombrePortafolio || typeof valorTotalCentavos !== "number" || !movimientos || movimientos.length === 0) {
    return (
      <EsqueletoTarjeta heroe={heroe} etiqueta="Preparando la orden de rebalanceo">
        <EsqueletoEncabezado />
        <EsqueletoCuerpo>
          <EsqueletoFilas filas={2} />
        </EsqueletoCuerpo>
        <EsqueletoPie heroe={heroe} boton />
      </EsqueletoTarjeta>
    );
  }

  const suave = heroe ? "text-primary-foreground/80" : "text-muted-foreground";
  const { visibles, fuera } = recortar(ordenar(movimientos, orden), limite);
  const montoFuera = sumaDeMontos(fuera);

  return (
    <Tarjeta heroe={heroe}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <span className={`text-xs ${suave}`}>Orden de rebalanceo · {nombrePortafolio}</span>
          <Badge variant="secondary" className={`shrink-0 ${heroe ? "bg-white/20 text-primary-foreground" : "bg-tinte text-primary"}`}>
            {movimientos.length} {movimientos.length === 1 ? "operación" : "operaciones"}
          </Badge>
        </div>
        <span className="monto text-3xl font-semibold">{formatearMonto(valorTotalCentavos)}</span>
        <span className={`text-sm ${suave}`}>
          en el portafolio ·{" "}
          {comisionTotalCentavos === 0 ? (
            <span className={heroe ? "font-medium" : "font-medium text-exito"}>sin comisión</span>
          ) : (
            <>
              comisión <span className="monto">{formatearMonto(comisionTotalCentavos)}</span>
            </>
          )}
        </span>
      </CardHeader>

      <CardContent>
        <ul className="flex flex-col">
          {visibles.map((m, i) => {
            const compra = m.tipo === "compra";
            return (
              <li key={`${m.instrumentoClave}-${i}`} className={`flex items-center gap-3 border-b py-2 last:border-0 ${heroe ? "border-white/20" : "border-borde-sutil"}`}>
                <Badge
                  variant="secondary"
                  className={`w-16 shrink-0 justify-center ${
                    heroe ? "bg-white/20 text-primary-foreground" : compra ? "bg-exito/10 text-exito" : "bg-tinte text-primary"
                  }`}
                >
                  {compra ? "Compra" : "Venta"}
                </Badge>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{m.instrumentoClave}</span>
                  <span className={`truncate text-xs ${suave}`}>{m.claseActivo}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end">
                  <span className="monto text-sm font-semibold">{formatearMonto(m.montoCentavos)}</span>
                  <span className={`monto text-xs ${suave}`}>
                    {formatearPorcentaje(m.pesoAnteriorPct)} → {formatearPorcentaje(m.pesoNuevoPct)}
                  </span>
                </span>
              </li>
            );
          })}
          {fuera.length > 0 ? (
            // El boton confirma TODAS las operaciones, tambien las que el limite no lista:
            // recortar la vista no recorta la orden, y eso hay que decirlo aqui.
            <li className={`flex items-center justify-between py-2 text-sm ${suave}`}>
              <span>
                y {fuera.length} {fuera.length === 1 ? "operacion mas" : "operaciones mas"} en la orden
              </span>
              <span className="monto">{formatearMonto(montoFuera)}</span>
            </li>
          ) : null}
        </ul>
      </CardContent>

      <PieTarjeta razon={razon} heroe={heroe}>
        {alAccionar ? (
          <Button
            className={`${CLASES_BOTON_PIE} ${heroe ? "bg-white/90 text-primary hover:bg-white" : ""}`}
            size="lg"
            onClick={() => alAccionar({ accion: "confirmar_rebalanceo", portafolioId, totalOperaciones: movimientos.length })}
          >
            Confirmar rebalanceo <ArrowRight />
          </Button>
        ) : null}
      </PieTarjeta>
    </Tarjeta>
  );
}

/**
 * El orden de las operaciones. `tipo` pone primero las ventas porque es el orden en que se
 * ejecutan de verdad: hay que liberar efectivo antes de comprar. Dentro de cada grupo manda
 * el monto.
 */
function ordenar(
  movimientos: NonNullable<PropsOrdenRebalanceo["movimientos"]>,
  orden: NonNullable<PropsOrdenRebalanceo["orden"]>,
): NonNullable<PropsOrdenRebalanceo["movimientos"]> {
  const copia = [...movimientos];
  if (orden === "instrumento") {
    return copia.sort((a, b) => a.instrumentoClave.localeCompare(b.instrumentoClave, "es"));
  }
  if (orden === "tipo") {
    return copia.sort(
      (a, b) => Number(a.tipo === "compra") - Number(b.tipo === "compra") || b.montoCentavos - a.montoCentavos,
    );
  }
  return copia.sort((a, b) => b.montoCentavos - a.montoCentavos);
}
