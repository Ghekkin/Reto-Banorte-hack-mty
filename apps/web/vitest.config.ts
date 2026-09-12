import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

/**
 * El alias `@` es el de Next (`tsconfig.json` -> paths). Hace falta aqui porque
 * `@maya/catalogo` importa componentes de shadcn con ese alias, y las pruebas del agente
 * cargan el catalogo para conocer los schemas.
 */
export default defineConfig({
  resolve: { alias: { "@": resolve(import.meta.dirname, "src") } },
  test: { environment: "node", include: ["src/**/*.spec.ts"] },
});
