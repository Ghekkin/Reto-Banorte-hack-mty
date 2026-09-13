import { config } from "./config";

interface RegistroToken {
  timestamp: number;
  tokens: number;
}

const VENTANA_MS = 60_000; // 1 minuto (60 segundos)
const registros: RegistroToken[] = [];

/**
 * Limpia registros más antiguos que la ventana móvil de 1 minuto.
 */
function limpiarRegistros(ahora = Date.now()): void {
  const limiteTiempo = ahora - VENTANA_MS;
  while (registros.length > 0 && registros[0]!.timestamp < limiteTiempo) {
    registros.shift();
  }
}

/**
 * Devuelve la cantidad de tokens de salida emitidos en el último minuto.
 */
export function tokensDeSalidaEnElUltimoMinuto(ahora = Date.now()): number {
  limpiarRegistros(ahora);
  let total = 0;
  for (const r of registros) {
    total += r.tokens;
  }
  return total;
}

/**
 * Registra tokens de salida efectivamente emitidos por el modelo.
 */
export function registrarTokensDeSalida(tokens: number, timestamp = Date.now()): void {
  if (!Number.isFinite(tokens) || tokens <= 0) return;
  limpiarRegistros(timestamp);
  registros.push({ timestamp, tokens });
}

/**
 * Limpia todos los registros (útil para pruebas unitarias).
 */
export function reiniciarLimitador(): void {
  registros.length = 0;
}

/**
 * Verifica si hay capacidad para emitir tokens dentro del límite por minuto.
 */
export function puedeEmitirTokens(estimados = 2000, ahora = Date.now()): boolean {
  const actual = tokensDeSalidaEnElUltimoMinuto(ahora);
  const limite = config.maxTokensSalidaPorMinuto;
  return actual + estimados <= limite;
}

/**
 * Espera a que haya disponibilidad de tokens de salida dentro del límite de 240k/min.
 * Si la espera requerida excede `timeoutMaxMs`, lanza un error descriptivo.
 */
export async function esperarDisponibilidadTokens(
  estimados = 2000,
  timeoutMaxMs = 15_000,
): Promise<void> {
  const limite = config.maxTokensSalidaPorMinuto;
  const inicio = Date.now();

  while (true) {
    const ahora = Date.now();
    const actual = tokensDeSalidaEnElUltimoMinuto(ahora);

    if (actual + estimados <= limite) {
      return;
    }

    if (registros.length === 0) return;
    const tiempoParaExpirar = Math.max(50, registros[0]!.timestamp + VENTANA_MS - ahora + 10);

    if (Date.now() - inicio + tiempoParaExpirar > timeoutMaxMs) {
      throw new Error(
        `Límite de tokens de salida excedido (${limite.toLocaleString()} tokens/minuto). Consumo actual: ${actual.toLocaleString()} tokens en el último minuto. Espera unos momentos antes de reintentar.`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, Math.min(tiempoParaExpirar, 1000)));
  }
}
