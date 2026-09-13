import type { NextConfig } from "next";
import { join } from "node:path";

/**
 * El `.env` vive en la RAIZ del repo, pero Next corre con `cwd` en `apps/web` y solo
 * busca `.env` ahi. `scripts/dev.sh` lo resolvia exportando las variables antes de
 * arrancar; eso solo funciona con bash, asi que en Windows (o con
 * `pnpm --filter @maya/web dev` a secas) la app quedaba sin `DATABASE_URL` y **todas
 * las pantallas salian vacias**, porque `lib/datos/tablas.ts` devuelve `[]` cuando
 * falta. Cargarlo aqui hace que el origen del dato no dependa de como arrancaste.
 *
 * `loadEnvFile` NO sobreescribe lo que ya esta en el entorno, asi que `dev.sh`, Docker
 * y Coolify siguen mandando. El `try` es porque en la imagen de produccion no hay `.env`.
 */
try {
  process.loadEnvFile(join(import.meta.dirname, "..", "..", ".env"));
} catch {
  // Sin .env en la raiz: se usa lo que venga del entorno.
}

const nextConfig: NextConfig = {
  /**
   * Solo aplica a `next dev`. Next 16 bloquea el websocket de HMR y los endpoints del
   * overlay cuando el navegador entra por un host que no es `localhost`; asi se puede
   * abrir el dev server del VPS por Tailscale (IP o nombre MagicDNS).
   */
  allowedDevOrigins: ["100.115.81.108", "**.ts.net"],
  /** Los paquetes del workspace se publican en TypeScript, sin build propio. */
  transpilePackages: ["@maya/a2ui", "@maya/catalogo", "@maya/schemas"],
};

export default nextConfig;
