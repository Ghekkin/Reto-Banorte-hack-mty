import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Los paquetes del workspace se publican en TypeScript, sin build propio. */
  transpilePackages: ["@maya/a2ui", "@maya/catalogo", "@maya/schemas"],
};

export default nextConfig;
