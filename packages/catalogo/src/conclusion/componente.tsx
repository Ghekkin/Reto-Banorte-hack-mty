"use client";

import { CardContent, CardHeader } from "@/components/ui/card";
import { EsqueletoCuerpo, EsqueletoPie, EsqueletoTarjeta, Linea } from "../esqueletos";
import { PieTarjeta, Tarjeta } from "../tarjeta";
import type { PropsComponente } from "@maya/a2ui";
import { CLASES_FILA_TOCABLE } from "../comunes";
import { useConfiguracionCatalogo } from "../contexto";
import type { PropsConclusion } from "./schema";

/**
 * La conclusion: lo que Maya te dice, con el peso que merece.
 *
 * **Que reemplaza y por que.** El `texto` del turno se pintaba como un parrafo
 * `text-sm text-muted-foreground` arriba del lienzo, con el avatar a la izquierda y los
 * chips de evidencia debajo: la forma de un mensaje de chat. Dos problemas, y el segundo
 * es el grave:
 *
 *  1. El consejo —lo unico que un banco no te da hoy— era el elemento con MENOS peso
 *     visual de la pantalla, por debajo de cualquier monto de cualquier tarjeta.
 *  2. Con forma de burbuja de chat, la pantalla se leia como "un chat con tarjetas
 *     pegadas" en vez de un dashboard que alguien armo para ti. El encuadre del reto es
 *     exactamente el contrario.
 *
 * Aqui el titular va en `text-2xl` y crece con el ancho de la tarjeta, las cifras que lo
 * sostienen van en fichas al lado, y las preguntas de seguimiento son botones. Es una
 * tarjeta del catalogo como las demas: mismo contenedor, mismo pie, mismo `razon`.
 *
 * **El layout aprovecha el ancho** porque esta tarjeta casi siempre va a lo ancho de la
 * pantalla: desde 42rem de tarjeta el titular y las cifras se ponen lado a lado
 * (`@2xl/tarjeta:grid-cols-[1.6fr_1fr]`) en vez de dejar media tarjeta vacia a la derecha,
 * que es lo que hacia el parrafo.
 */

/**
 * Los tres tonos que esta tarjeta sabe pintar. `tono` llega como texto libre (ver el schema:
 * las dos capas de validacion tienen que decir lo mismo y un `enum` costaba un reintento por
 * turno), asi que lo que no este aqui se pinta neutro.
 */
const TONO: Record<string, string> = {
  neutro: "text-foreground",
  bueno: "text-exito",
  alerta: "text-advertencia",
};

export function Conclusion(props: Partial<PropsConclusion> & Pick<PropsComponente, "alAccionar">) {
  const { saludo, titular, detalle, datos, sugerencias, razon, alAccionar } = props;
  const { ocultarSugerenciasEnTarjeta } = useConfiguracionCatalogo();
  const debeMostrarSugerencias = !ocultarSugerenciasEnTarjeta && Boolean(sugerencias && sugerencias.length > 0);

  if (!titular) {
    return (
      <EsqueletoTarjeta etiqueta="Cargando lo que Maya te va a decir">
        <CardHeader>
          <Linea tamano="xs" ancho="w-28" />
          <Linea tamano="xl" ancho="w-full" />
          <Linea tamano="xl" ancho="w-3/5" />
        </CardHeader>
        <EsqueletoCuerpo>
          <div className="flex flex-col gap-2">
            <Linea tamano="sm" ancho="w-full" />
            <Linea tamano="sm" ancho="w-4/5" />
          </div>
        </EsqueletoCuerpo>
        <EsqueletoPie />
      </EsqueletoTarjeta>
    );
  }

  const hayDatos = datos !== undefined && datos.length > 0;

  return (
    <Tarjeta>
      <CardContent className="grid gap-4 @2xl/tarjeta:grid-cols-[1.6fr_1fr] @2xl/tarjeta:gap-6">
        <div className="flex min-w-0 flex-col gap-2">
          {saludo ? <p className="text-xs text-muted-foreground">{saludo}</p> : null}
          {/* El titular es el elemento mas grande de la tarjeta, como el monto en las
              demas: es EL dato de esta pieza. Crece con el ancho de la tarjeta, no de la
              pantalla, para que no se desborde cuando comparte fila con otra. */}
          <p className="text-balance text-2xl font-semibold leading-tight @md/tarjeta:text-3xl">{titular}</p>
          {detalle ? (
            <p className="text-pretty text-sm leading-relaxed text-muted-foreground @md/tarjeta:text-base">
              {detalle}
            </p>
          ) : null}
        </div>

        {hayDatos ? (
          <ul className="animar-filas flex flex-col gap-2 @2xl/tarjeta:border-l @2xl/tarjeta:border-borde-sutil @2xl/tarjeta:pl-6">
            {datos.map((d) => (
              <li key={d.etiqueta} className="flex flex-col">
                <span className="text-xs text-muted-foreground">{d.etiqueta}</span>
                {/* `?? TONO.neutro` porque `tono` es texto libre: un valor que no esta en el
                    mapa se pinta neutro en vez de dejar `undefined` en el className. */}
                <span className={`monto text-lg font-semibold ${TONO[d.tono ?? "neutro"] ?? TONO.neutro}`}>{d.valor}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>

      {debeMostrarSugerencias ? (
        <CardContent className="animar-filas flex flex-wrap gap-2 pt-0">
          {sugerencias!.map((s) => (
            // Sin `alAccionar` no son botones: en un lienzo de solo lectura (la galeria,
            // una portada sin host que atienda la accion) un boton que no hace nada al
            // tocarlo es peor que un texto que no invita a tocarlo.
            <button
              key={s}
              type="button"
              disabled={!alAccionar}
              onClick={alAccionar ? () => alAccionar({ pregunta: s }) : undefined}
              className={`rounded-full border border-borde-sutil bg-background px-3 text-xs text-muted-foreground disabled:opacity-70 ${CLASES_FILA_TOCABLE} ${
                alAccionar ? "hover:border-primary/40 hover:text-primary" : ""
              }`}
            >
              {s}
            </button>
          ))}
        </CardContent>
      ) : null}

      <PieTarjeta razon={razon} />
    </Tarjeta>
  );
}
