/**
 * Lo que corre UNA vez al levantar el servidor de Next (convencion `instrumentation.ts`).
 *
 * Aqui arranca el reloj del Inicio personalizado (`lib/inicio/reloj.ts`). Solo en el
 * runtime de Node: el reloj toca la base y el MCP, y en Edge no hay `pg`. El import
 * es dinamico para que ese codigo no se cargue en ningun otro runtime. El reloj decide solo
 * si corre: por omision, solo en produccion (`decisionDelReloj` en `lib/inicio/config.ts`).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { iniciarReloj } = await import("@/lib/inicio/reloj");
  iniciarReloj();
}
