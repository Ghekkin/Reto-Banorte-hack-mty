import { defineConfig } from "vitest/config";

/**
 * Las tools de accion escriben en el estado mutable. En las pruebas ese estado va a un
 * archivo aparte (`estado.pruebas.json`, fuera de git) para no pisar el que usa la demo,
 * y los archivos corren en serie porque todos comparten ese archivo.
 */
export default defineConfig({
  test: {
    env: { MCP_ESTADO: "apps/mcp/estado.pruebas.json" },
    fileParallelism: false,
  },
});
