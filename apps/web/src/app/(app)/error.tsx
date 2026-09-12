"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Lo que se ve cuando una seccion revienta a media navegacion.
 *
 * Existe porque sin `error.tsx` Next muestra su propia pantalla: en desarrollo el overlay
 * rojo con el stack, y en produccion un "Application error" en blanco sin marca ni salida.
 * Cualquiera de las dos delante del jurado es peor que el fallo mismo.
 *
 * Es de CLIENTE por obligacion: `error.tsx` recibe `reset`, que rerenderiza el segmento
 * sin recargar la pagina. Eso importa aqui porque el fallo mas probable es que la base
 * tarde o rechace una conexion, y en ese caso reintentar suele bastar
 * (`docs/issues/2026-09-12-postgres-remoto-inalcanzable.md`).
 *
 * El borde va en `border-oscuro` y NO en rojo: el rojo es el color de la marca, no el de
 * error (skill `diseno-banorte`).
 */
export default function ErrorApp({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card className="animar-entrada border-oscuro">
      <CardContent className="flex flex-col items-start gap-4 p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">Esta sección no cargó</h2>
          <p className="text-sm text-muted-foreground">
            Casi siempre es la conexión a la base de datos. Reintentar suele bastar; si no,
            revisa <code className="font-mono text-xs">DATABASE_URL</code>.
          </p>
        </div>

        {/* El mensaje real, no un "algo salió mal". Quien ve esto en la demo es del equipo
            y necesita el motivo; el `digest` es lo unico que hay para cruzarlo con el log
            del servidor cuando el mensaje viene ofuscado en produccion. */}
        <p className="w-full break-words rounded-xl bg-muted p-3 font-mono text-xs text-muted-foreground">
          {error.message || "sin mensaje"}
          {error.digest && <span className="block pt-1 opacity-70">digest: {error.digest}</span>}
        </p>

        <Button onClick={reset} className="min-h-11 rounded-full sm:min-h-9">
          Reintentar
          <RotateCcw data-icon="inline-end" />
        </Button>
      </CardContent>
    </Card>
  );
}
