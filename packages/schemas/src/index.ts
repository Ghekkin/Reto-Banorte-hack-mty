/**
 * Schemas Zod de las tools MCP. Dueno: rol `contrato`.
 *
 * Una tool nueva: archivo en `src/tools/<nombre>.ts` con `EntradaX` y `SalidaX`,
 * exportado aqui, y en el MISMO commit su mock en `apps/mcp` (skill `cambiar-schema`).
 */
export * from "./comunes.js";
export * from "./tools/consultar-perfil.js";
