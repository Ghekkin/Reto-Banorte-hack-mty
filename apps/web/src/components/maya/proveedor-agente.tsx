"use client";

import { createContext, useContext, type ReactNode } from "react";
import { usarAgente } from "@/lib/agente/usar-agente";

/**
 * El provider de la conversación con Maya.
 *
 * ## Por qué existe
 *
 * `usarAgente` guarda el hilo en `useState`, y ese hook lo llamaba `ConsolaMaya`, que ES la
 * página `/maya`. En el App Router, navegar a otra ruta desmonta la página: cambiar a
 * Movimientos y volver borraba la conversación completa, con sus pantallas. La persona
 * armaba su tablero, iba a comprobar un movimiento, regresaba, y Maya no se acordaba de
 * nada.
 *
 * Montado en `(app)/layout.tsx` el hook vive **por encima** de las rutas del grupo. El
 * layout no se vuelve a montar al navegar entre pestañas (usan `next/link`, que es
 * navegación de cliente), así que el hilo sobrevive. La persistencia en `sessionStorage`
 * (`persistencia.ts`) se encarga de lo que el provider no puede: recargar la página.
 *
 * ## Lo que NO se movió aquí
 *
 * La voz. `usarConversacionVoz` se queda en `ConsolaMaya` a propósito: tiene que cortar el
 * micrófono y el websocket al salir de `/maya`, y para eso necesita desmontarse con la
 * página. Subirla aquí dejaría el micrófono abierto mientras la persona navega.
 *
 * ## El cambio de usuario
 *
 * `usuarioId` llega del layout, que lo lee de la cookie en el servidor. Cuando cambia,
 * `usarAgente` lo detecta y arranca conversación nueva (ver `hidratadoPara`); el redirect a
 * Inicio lo hace la server action `cambiarUsuario`.
 */

type Agente = ReturnType<typeof usarAgente>;

const ContextoAgente = createContext<Agente | undefined>(undefined);

export function ProveedorAgente({ usuarioId, children }: { usuarioId: string; children: ReactNode }) {
  const agente = usarAgente(usuarioId);
  return <ContextoAgente.Provider value={agente}>{children}</ContextoAgente.Provider>;
}

/**
 * La conversación viva. Truena si se usa fuera del provider en vez de devolver `undefined`:
 * un componente de Maya sin conversación no tiene forma de funcionar a medias, y el error
 * en el momento del render es más barato de encontrar que una pantalla en blanco.
 */
export function usarAgenteDelContexto(): Agente {
  const agente = useContext(ContextoAgente);
  if (!agente) {
    throw new Error("usarAgenteDelContexto necesita <ProveedorAgente>; se monta en app/(app)/layout.tsx");
  }
  return agente;
}
