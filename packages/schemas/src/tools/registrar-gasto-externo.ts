import { z } from "zod";
import { IdUsuario, LlaveIdempotencia } from "../comunes.js";
import { CapacidadAntesDespues, GastoDelPeriodo, GastoExterno } from "./simular-gasto-externo.js";

/**
 * `registrar_gasto_externo` — **ACCION**. La persona simulo un gasto de fuera del banco y toco
 * «Guardar gasto». A partir de ahi `analizar_gasto`/`comparar_periodos` lo listan como una
 * categoria mas (`fueraDelBanco: true`), y lo mensual se descuenta de lo libre para pagar deuda
 * (`capacidadPagoMensual`) y para ahorrar (`proyectar_ahorro`).
 *
 * Idempotente por `idempotencyKey`. Guardar otra vez un gasto con el mismo nombre lo
 * **reemplaza**; guardarlo con `montoCentavos: 0` lo quita.
 */
export const EntradaRegistrarGastoExterno = z.object({
  usuarioId: IdUsuario,
  periodo: z.string().regex(/^\d{4}-\d{2}$/).optional().describe("AAAA-MM al que pertenece un gasto `unico`"),
  gastos: z.array(GastoExterno).min(1).max(5),
  idempotencyKey: LlaveIdempotencia,
});
export type EntradaRegistrarGastoExterno = z.infer<typeof EntradaRegistrarGastoExterno>;

export const SalidaRegistrarGastoExterno = z.object({
  aplicado: z.boolean(),
  yaEstaba: z.boolean().describe("true si la llave de idempotencia ya se habia usado: NO se guardo dos veces"),
  mensaje: z.string().describe("Una linea en espanol lista para que el agente la parafrasee"),
  periodo: z.string(),
  gastos: z.array(GastoExterno).describe("Lo que quedo guardado"),
  antes: GastoDelPeriodo.describe("El gasto del periodo antes de guardar: el `antes` de la tarjeta"),
  despues: GastoDelPeriodo.describe("Ya guardado (`guardado: true`): las props nuevas de `GastoPorCategoria`"),
  capacidadAhorro: CapacidadAntesDespues.optional().describe(
    "Lo que puede apartar al mes antes y despues. Si en la pantalla hay `SimuladorMeta`, su tope pasa a `despuesCentavos`",
  ),
  capacidadPago: CapacidadAntesDespues.optional(),
});
export type SalidaRegistrarGastoExterno = z.infer<typeof SalidaRegistrarGastoExterno>;
