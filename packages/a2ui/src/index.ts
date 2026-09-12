/**
 * Renderer A2UI propio (ADR 0008). Dueno: rol `contrato`.
 * Como funciona, entero: docs/arquitectura/renderer-a2ui.md
 *
 * Ojo con lo que NO sale por aqui: la validacion contra los JSON Schema oficiales vive
 * en `@maya/a2ui/esquema`, aparte, porque arrastra ajv y los schemas de la spec y el
 * navegador no los necesita. La importa el agente, en el servidor.
 */
export * from "./tipos";
export * from "./bindings";
export * from "./validar";
export * from "./procesar";
export * from "./arbol";
export * from "./registro";
export * from "./layout/nombres";
export * from "./layout/esquemas";
export * from "./acciones";
export { Superficie, variablesDelTema, type FalloDeRender, type PiezaDeRaiz } from "./Superficie";
