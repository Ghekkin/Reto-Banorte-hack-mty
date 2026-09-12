import { defineConfig } from "vitest/config";

/**
 * `setupFiles` carga el volcado de datos antes de cada archivo de pruebas: asi
 * ninguna prueba abre conexion a PostgreSQL ni depende de la red (ver
 * `src/__tests__/preparar.ts`).
 */
export default defineConfig({
  test: {
    setupFiles: ["./src/__tests__/preparar.ts"],
  },
});
