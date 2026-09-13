import { config } from "../config.js";
import { obtenerPool } from "./postgres.js";

/**
 * El log del MCP en la base: cada llamada a una tool queda en `banorte.registros` (fuente
 * `mcp`) ademas de salir en consola. Si la llamo el agente, trae el `corridaId` que viaja en
 * `_meta` y se une con su corrida (`docs/como-funciona/corridas-en-db.md`).
 *
 * Mejor esfuerzo, igual que en la web: no se espera, y un fallo se avisa una vez. Apagado
 * sin base, con `FEATURE_CORRIDAS_EN_DB=0` y dentro de vitest (ADR 0010: las pruebas no
 * tocan la base de la demo).
 */
function apagado(): boolean {
  return (
    config.urlPostgres === "" ||
    (process.env.FEATURE_CORRIDAS_EN_DB ?? "1") === "0" ||
    Boolean(process.env.VITEST) ||
    process.env.NODE_ENV === "test"
  );
}

let avisado = false;

export type RegistroMcp = {
  nivel: "info" | "warn";
  evento: string;
  corridaId?: string | null;
  usuarioId?: string | null;
  datos: Record<string, unknown>;
};

export function registrarEnLaBase(registro: RegistroMcp): void {
  if (apagado()) return;
  obtenerPool()
    .query(
      "insert into banorte.registros (fuente, nivel, evento, corrida_id, usuario_id, datos) values ('mcp', $1, $2, $3, $4, $5::jsonb)",
      [registro.nivel, registro.evento, registro.corridaId ?? null, registro.usuarioId ?? null, JSON.stringify(registro.datos)],
    )
    .catch((error: unknown) => {
      if (avisado) return;
      avisado = true;
      console.warn(`[registros] el MCP no pudo guardar en la base: ${error instanceof Error ? error.message : String(error)}`);
    });
}
