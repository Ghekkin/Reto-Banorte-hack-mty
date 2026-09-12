import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

/**
 * El alias `@` apunta a `apps/web/src`, igual que en `tsconfig.json`: los componentes del
 * catalogo importan las primitivas de shadcn de ahi (ver README del paquete).
 */
export default defineConfig({
  resolve: { alias: { "@": resolve(import.meta.dirname, "../../apps/web/src") } },
  test: { environment: "node", include: ["src/**/*.spec.ts", "src/**/*.spec.tsx"] },
});
