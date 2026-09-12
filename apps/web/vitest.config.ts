import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

/**
 * El alias `@` es el de Next (`tsconfig.json` -> paths). Hace falta aqui porque
 * `@maya/catalogo` importa componentes de shadcn con ese alias, y las pruebas del agente
 * cargan el catalogo para conocer los schemas.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "src"),
      // `import "server-only"` lo resuelve Next, no Node: en las pruebas es un modulo
      // vacio. Lo que protege (que un componente de cliente no importe la base) lo
      // sigue vigilando el build de Next.
      "server-only": resolve(import.meta.dirname, "src/lib/__tests__/fixtures/server-only.ts"),
    },
  },
  test: { environment: "node", include: ["src/**/*.spec.ts"] },
});
