import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatearFecha, formatearMonto, formatearPorcentaje } from "@/lib/dinero";
import { creditosDe, cuentasDe, portafolioDe, tarjetasDe } from "@/lib/datos/consultas";
import { usuarioActivo } from "@/lib/usuario-activo";

/**
 * Productos: cuentas, tarjetas, creditos e inversiones.
 *
 * Pantalla programada, no generada: es una consulta, y un agente no aporta nada a
 * "muestrame mis productos". Deliberadamente simple, para que el peso del proyecto quede
 * en Inicio y en Maya.
 */
export default async function PaginaProductos() {
  const usuario = await usuarioActivo();
  const [cuentas, tarjetas, creditos, portafolio] = await Promise.all([
    cuentasDe(usuario.id),
    tarjetasDe(usuario.id),
    creditosDe(usuario.id),
    portafolioDe(usuario.id),
  ]);

  return (
    <Tabs defaultValue="cuentas" className="gap-3 md:gap-4">
      <TabsList className="w-full overflow-x-auto">
        <TabsTrigger value="cuentas">Cuentas</TabsTrigger>
        <TabsTrigger value="tarjetas">Tarjetas</TabsTrigger>
        <TabsTrigger value="creditos">Créditos</TabsTrigger>
        <TabsTrigger value="inversiones">Inversiones</TabsTrigger>
      </TabsList>

      <TabsContent value="cuentas" className="animar-lista grid gap-3 md:grid-cols-2 md:gap-4">
        {cuentas.map((cuenta) => (
          <Card key={cuenta.id}>
            <CardContent className="flex flex-col gap-1 p-5">
              <span className="text-xs text-muted-foreground">
                {cuenta.alias} · {cuenta.mascara}
              </span>
              <span className="monto text-2xl font-semibold">
                {formatearMonto(Math.abs(cuenta.saldoCentavos))}
              </span>
              <span className="text-xs text-muted-foreground">
                {cuenta.tipo === "credito" ? "Saldo por pagar" : "Disponible"}
              </span>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      <TabsContent value="tarjetas" className="animar-lista grid gap-3 md:grid-cols-2 md:gap-4">
        {tarjetas.map((tarjeta) => (
          <Card key={tarjeta.id}>
            <CardHeader className="flex-row items-start justify-between gap-2">
              <CardTitle className="text-sm font-medium">{tarjeta.producto}</CardTitle>
              <Badge variant="outline" className="shrink-0 capitalize">
                {tarjeta.tipo}
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <span className="text-xs text-muted-foreground">{tarjeta.mascara}</span>
              {tarjeta.tipo === "credito" ? (
                <>
                  <span className="monto text-2xl font-semibold">
                    {formatearMonto(tarjeta.saldoCentavos)}
                  </span>
                  <Progress value={tarjeta.utilizacion * 100} className="h-2" />
                  <span className="text-xs text-muted-foreground">
                    {formatearPorcentaje(tarjeta.utilizacion)} de{" "}
                    {formatearMonto(tarjeta.limiteCentavos)} · pago mínimo{" "}
                    {formatearMonto(tarjeta.pagoMinimoCentavos)}
                  </span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Ligada a tu cuenta</span>
              )}
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      <TabsContent value="creditos" className="animar-lista grid gap-3 md:grid-cols-2 md:gap-4">
        {creditos.length === 0 ? (
          <Vacio titulo="No tienes créditos" detalle="Cuando contrates uno, aparecerá aquí." />
        ) : (
          creditos.map((credito) => (
            <Card key={credito.id}>
              <CardHeader className="flex-row items-start justify-between gap-2">
                <CardTitle className="text-sm font-medium">{credito.alias}</CardTitle>
                {credito.diasMora > 0 && (
                  <Badge className="shrink-0 bg-oscuro text-white">Atrasado</Badge>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <span className="monto text-2xl font-semibold">
                  {formatearMonto(credito.saldoInsolutoCentavos)}
                </span>
                <Progress
                  value={(credito.pagosRealizados / credito.plazoMeses) * 100}
                  className="h-2"
                />
                <span className="text-xs text-muted-foreground">
                  Pago {credito.pagosRealizados} de {credito.plazoMeses} ·{" "}
                  {formatearMonto(credito.mensualidadCentavos)} al mes · tasa{" "}
                  {formatearPorcentaje(credito.tasaAnual)}
                </span>
                <span className="text-xs text-muted-foreground">
                  Próximo pago: {formatearFecha(credito.proximoPago)}
                </span>
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>

      <TabsContent value="inversiones" className="animar-lista grid gap-3 md:gap-4">
        {!portafolio ? (
          <Vacio
            titulo="Todavía no inviertes"
            detalle="Pregúntale a Maya si te conviene empezar, o si primero deberías salir de deudas."
          />
        ) : (
          <>
            <Card>
              <CardContent className="flex flex-col gap-1 p-5">
                <span className="text-xs text-muted-foreground">
                  {portafolio.nombre} · perfil {portafolio.perfil}
                </span>
                <span className="monto text-3xl font-semibold">
                  {formatearMonto(portafolio.valorActualCentavos)}
                </span>
                <span
                  className={`monto text-sm font-medium ${
                    portafolio.rendimientoCentavos >= 0 ? "text-exito" : "text-foreground"
                  }`}
                >
                  {portafolio.rendimientoCentavos >= 0 ? "+" : "−"}
                  {formatearMonto(Math.abs(portafolio.rendimientoCentavos))} (
                  {formatearPorcentaje(portafolio.rendimientoPct)})
                </span>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Tus posiciones
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {portafolio.posiciones.map((posicion) => (
                  <div key={posicion.clave} className="flex items-baseline justify-between gap-3">
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm">{posicion.instrumento}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatearPorcentaje(posicion.pesoPct)} · riesgo {posicion.riesgo}/5
                      </span>
                    </div>
                    <div className="flex shrink-0 flex-col items-end">
                      <span className="monto text-sm font-medium">
                        {formatearMonto(posicion.valorMercadoCentavos)}
                      </span>
                      <span
                        className={`monto text-xs ${
                          posicion.plusvaliaCentavos >= 0 ? "text-exito" : "text-muted-foreground"
                        }`}
                      >
                        {posicion.plusvaliaCentavos >= 0 ? "+" : "−"}
                        {formatearMonto(Math.abs(posicion.plusvaliaCentavos))}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}

function Vacio({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <Empty className="rounded-2xl border border-borde-sutil bg-card">
      <EmptyHeader>
        <EmptyTitle>{titulo}</EmptyTitle>
        <EmptyDescription>{detalle}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
