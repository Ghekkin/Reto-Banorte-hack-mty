import { z } from "zod";
import { Centavos, IdUsuario } from "../comunes.js";

/**
 * `simular_gasto_externo` — lectura (calcula, no muta). «También pago $3,500 de renta en
 * efectivo»: un gasto que el banco no ve porque no pasa por sus cuentas.
 *
 * Devuelve el gasto del periodo **antes y despues** de sumarlo, con las categorias en la forma
 * de las props de `GastoPorCategoria` (el agente parchea la tarjeta tal cual), y cuanto le queda
 * libre al mes para pagar deuda y para ahorrar. Lo que se simula sale con `guardado: false`: la
 * tarjeta ofrece «Guardar gasto», que dispara `registrar_gasto_externo`.
 *
 * Detalle y limites (el efectivo que ya salio del cajero): `docs/algoritmos/gastos-fuera-del-banco.md`.
 */
export const FrecuenciaDeGasto = z
  .enum(["mensual", "unico"])
  .describe("mensual: se repite cada mes (renta, colegiatura, lo que le da a su mamá). unico: solo este periodo");

export const GastoExterno = z.object({
  nombre: z.string().min(1).max(60).describe("Como lo dice la persona, corto: 'Renta', 'Apoyo a mi mamá'"),
  montoCentavos: Centavos.min(0).describe("Cuanto, en centavos. 0 = quitar un gasto guardado con ese nombre"),
  frecuencia: FrecuenciaDeGasto,
});
export type GastoExterno = z.infer<typeof GastoExterno>;

/** Una fila de `GastoPorCategoria`, con las marcas de lo que no viene del banco. */
export const CategoriaConExterno = z.object({
  categoriaId: z.string().optional(),
  nombre: z.string(),
  montoCentavos: Centavos,
  variacionPct: z.number().optional(),
  fueraDelBanco: z.boolean().optional().describe("true: no sale de los movimientos, lo dijo la persona"),
  guardado: z.boolean().optional().describe("false: simulado, todavia sin guardar"),
  frecuencia: FrecuenciaDeGasto.optional(),
});
export type CategoriaConExterno = z.infer<typeof CategoriaConExterno>;

export const GastoDelPeriodo = z.object({
  totalCentavos: Centavos.describe("La suma exacta de `categorias`"),
  categorias: z.array(CategoriaConExterno).describe("De mayor a menor; las de fuera del banco incluidas"),
});
export type GastoDelPeriodo = z.infer<typeof GastoDelPeriodo>;

export const CapacidadAntesDespues = z.object({
  antesCentavos: Centavos,
  despuesCentavos: Centavos,
});

export const EntradaSimularGastoExterno = z.object({
  usuarioId: IdUsuario,
  periodo: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional()
    .describe("AAAA-MM de la tarjeta que se ajusta. Default: el ultimo mes cerrado, igual que `analizar_gasto`"),
  gastos: z.array(GastoExterno).min(1).max(5),
});
export type EntradaSimularGastoExterno = z.infer<typeof EntradaSimularGastoExterno>;

export const SalidaSimularGastoExterno = z.object({
  periodo: z.string(),
  antes: GastoDelPeriodo.describe("Como se ve hoy, con los gastos de fuera ya guardados. Su total es el `antes` de la tarjeta"),
  despues: GastoDelPeriodo.describe("Con lo simulado sumado (`guardado: false`): las props nuevas de `GastoPorCategoria`"),
  gastos: z.array(GastoExterno).describe("Lo simulado, normalizado; es el context de «Guardar gasto»"),
  capacidadAhorro: CapacidadAntesDespues.describe("Lo que puede apartar al mes, antes y si guardara esto"),
  capacidadPago: CapacidadAntesDespues.describe("Lo libre al mes para deuda (buró), antes y si guardara esto"),
  aviso: z
    .string()
    .nullable()
    .describe("Si con esto ya no le queda nada libre al mes: la frase para la tarjeta, tal cual"),
});
export type SalidaSimularGastoExterno = z.infer<typeof SalidaSimularGastoExterno>;
