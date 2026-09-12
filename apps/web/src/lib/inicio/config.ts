/**
 * Variables de entorno del Inicio personalizado, leidas en un solo lugar. Toda variable
 * nueva entra tambien en `.env.example`, con comentario, en el mismo commit.
 *
 * Es aparte del `config` del agente a proposito: el Inicio lo arma OTRO modelo, mas
 * chico, y con OTRO ritmo (un reloj, no una pregunta). Lo que comparten —la llave, el
 * MCP, el catalogo— lo sigue leyendo de `lib/agente/config.ts`.
 */
export const configInicio = {
  /** Con `0`, Inicio es la pantalla programada de siempre y no corre ningun modelo. */
  activo: (process.env.FEATURE_INICIO_PERSONALIZADO ?? "1") !== "0",
  /** Id del modelo chico. `gemini-*` o `claude-*`; la llave es la misma del agente. */
  modelo: process.env.MODELO_INICIO ?? "gemini-3.5-flash-lite",
  /** Cada cuantos minutos el reloj revisa a los tres usuarios. */
  cadaMinutos: minutosValidos(process.env.INICIO_CADA_MINUTOS, 10),
  /**
   * Pasos del bucle: uno para pedir lo que le falte (todas las tools en paralelo), uno
   * para pintar, y uno de gracia si la pantalla vino invalida. Es la mitad del turno de
   * conversacion porque arranca con los datos ya en la mano.
   */
  maxPasos: 3,
  /** Tope por generacion. Corre en segundo plano: puede esperar mas que un turno. */
  timeoutMs: 45_000,
};

/** Un valor raro en `.env` no tumba el reloj: cae al default, y minimo un minuto. */
function minutosValidos(crudo: string | undefined, porOmision: number): number {
  const n = Number(crudo);
  if (!crudo || !Number.isFinite(n) || n < 1) return porOmision;
  return n;
}
