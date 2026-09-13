"use client";

import { createContext, useContext, type ReactNode } from "react";

export type ConfiguracionCatalogo = {
  /**
   * Si es true, las tarjetas que ofrecen opciones o sugerencias de seguimiento (como Conclusion)
   * no pintan los botones dentro de la tarjeta porque el contenedor anfitrión (por ejemplo,
   * la consola de chat de Maya) ya los muestra abajo en su propio flujo de conversación.
   */
  ocultarSugerenciasEnTarjeta?: boolean;
};

const ContextoCatalogo = createContext<ConfiguracionCatalogo>({
  ocultarSugerenciasEnTarjeta: false,
});

export function ProveedorCatalogo({
  children,
  configuracion,
}: {
  children: ReactNode;
  configuracion: ConfiguracionCatalogo;
}) {
  return <ContextoCatalogo.Provider value={configuracion}>{children}</ContextoCatalogo.Provider>;
}

export function useConfiguracionCatalogo(): ConfiguracionCatalogo {
  return useContext(ContextoCatalogo);
}
