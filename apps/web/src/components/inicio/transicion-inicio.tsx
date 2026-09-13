"use client";

import { createContext, useContext, useEffect, useState, useTransition } from "react";
import { preguntarEnInicio } from "@/app/(app)/acciones";

/**
 * El ciclo visible de Inicio: escribir -> las tarjetas de ahora se van -> Maya trabaja
 * -> las nuevas entran.
 *
 * **Por que existe un contexto y no basta el estado de la barra.** La barra flotante ya
 * sabia cuando estaba pensando (`useTransition`), pero ese `isPending` vivia dentro de
 * ella y las tarjetas son hermanas suyas, pintadas en el servidor. Sin un canal comun, la
 * unica pieza de la pantalla que se enteraba de que habia una pregunta en curso era el
 * spinner de un boton de 36 px: se escribia, se daba Enter y el dashboard entero se
 * quedaba congelado ocho segundos, identico, hasta que cambiaba de golpe. Con el contexto,
 * la barra publica la fase y toda la pantalla reacciona.
 *
 * **Las tres fases y por que son tres y no dos.**
 *
 *  - `quieto`: lo normal. Las tarjetas estan y entran con `animar-lista` al montar.
 *  - `saliendo`: los primeros 240 ms. Las tarjetas corren `animar-salida-lista`, en
 *    cascada, y quedan en el ultimo fotograma (invisibles).
 *  - `esperando`: de ahi hasta que llega la respuesta. `ZonaInicio` cambia las tarjetas
 *    por el esqueleto.
 *
 * Sin la fase intermedia habria que elegir entre dos cosas malas: o el esqueleto aparece
 * de inmediato y se come la animacion de salida (nunca se ve), o no hay esqueleto y la
 * pantalla se queda en blanco los ocho segundos que tarda el modelo.
 *
 * **La entrada no se programa: se obtiene gratis.** En `esperando` los hijos se
 * desmontan, asi que cuando la server action termina y Next vuelve a renderizar, el DOM
 * de las tarjetas es nuevo y `animar-lista` corre sola. Es la razon de que aqui no haya
 * ningun `key` artificial ni ningun temporizador de entrada: si se dejaran las tarjetas
 * montadas con `opacity: 0`, React reusaria los mismos nodos y la animacion de entrada
 * —que es una animacion CSS de montaje— no se volveria a disparar.
 */

/** Cuanto dura la cascada de salida completa: 150 ms + 3 escalones de 25 (globals.css). */
export const MS_SALIDA = 240;

export type FaseDeInicio = "quieto" | "saliendo" | "esperando";

type Transicion = {
  fase: FaseDeInicio;
  /** Atajo para el caso comun: la pantalla ya no es la de antes. */
  saliendo: boolean;
  /** El turno esta corriendo (cubre la salida y la espera). */
  pensando: boolean;
  fallo?: string;
  preguntar: (texto: string) => void;
};

const QUIETO: Transicion = {
  fase: "quieto",
  saliendo: false,
  pensando: false,
  preguntar: () => {},
};

/**
 * El default no es un placeholder: es el estado correcto fuera de Inicio. `Lienzo` y
 * `Masonry` se usan tambien en `/maya` y en `/catalogo`, y las pruebas pintan
 * `InicioDeMaya` con `renderToStaticMarkup` sin proveedor. Todos ven `quieto`.
 */
const ContextoDeInicio = createContext<Transicion>(QUIETO);

export function useTransicionDeInicio(): Transicion {
  return useContext(ContextoDeInicio);
}

/**
 * Envuelve Inicio completo: la zona de tarjetas y la barra flotante.
 *
 * `useTransition` y no `useState` + `fetch` porque el trabajo lo hace una server action
 * que termina en `revalidatePath`: `isPending` cubre el turno del modelo Y el re-render
 * del servidor. Con un estado propio, la fase volveria a `quieto` en cuanto la accion
 * resolviera y la pantalla vieja seguiria ahi medio segundo.
 */
export function ProveedorDeInicio({ children }: { children: React.ReactNode }) {
  const [pensando, iniciar] = useTransition();
  const [fase, setFase] = useState<FaseDeInicio>("quieto");
  const [fallo, setFallo] = useState<string>();

  useEffect(() => {
    if (!pensando) {
      setFase("quieto");
      return;
    }
    setFase("saliendo");
    const temporizador = setTimeout(() => setFase("esperando"), MS_SALIDA);
    return () => clearTimeout(temporizador);
  }, [pensando]);

  function preguntar(texto: string) {
    const limpio = texto.trim();
    if (!limpio || pensando) return;
    setFallo(undefined);
    iniciar(async () => {
      const resultado = await preguntarEnInicio(limpio);
      if (!resultado.ok) setFallo(resultado.motivo);
    });
  }

  return (
    <ContextoDeInicio.Provider
      value={{ fase, saliendo: fase === "saliendo", pensando, fallo, preguntar }}
    >
      {children}
    </ContextoDeInicio.Provider>
  );
}

/**
 * La zona de tarjetas. Devuelve sus hijos tal cual, o el esqueleto mientras Maya trabaja.
 *
 * No mete ningun `div` propio: los hijos son la rejilla, y un contenedor de mas entre el
 * lienzo y la rejilla romperia el masonry (las celdas dejarian de ser hijas directas de
 * la rejilla y `animar-lista > *` apuntaria al contenedor, no a las tarjetas).
 */
export function ZonaInicio({
  children,
  esqueleto,
}: {
  children: React.ReactNode;
  esqueleto: React.ReactNode;
}) {
  const { fase } = useTransicionDeInicio();
  return <>{fase === "esperando" ? esqueleto : children}</>;
}
