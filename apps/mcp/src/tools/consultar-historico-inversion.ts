import { EntradaConsultarHistoricoInversion, SalidaConsultarHistoricoInversion } from "@maya/schemas";
import { historicoDePrecios } from "../dominio/inversiones.js";
import type { DefinicionDeTool } from "./registro.js";

/**
 * `consultar_historico_inversion` — LECTURA.
 * Serie histórica semanal de precios y rendimiento acumulado de un instrumento de inversión.
 * Respalda visualizaciones de evolución temporal y comportamiento de mercado.
 */
export const consultarHistoricoInversion: DefinicionDeTool = {
  nombre: "consultar_historico_inversion",
  titulo: "Consultar histórico de precios de un instrumento",
  descripcion:
    "Obtiene la serie histórica semanal de precios y el rendimiento acumulado de un instrumento de inversión " +
    "de Banorte durante las últimas N semanas. Úsala cuando pregunten cómo se ha comportado un fondo, acción o ETF " +
    "o cuando necesiten ver la tendencia y volatilidad de un activo en el tiempo.",
  clase: "lectura",
  entrada: EntradaConsultarHistoricoInversion.shape,
  manejar: (argumentos) => {
    const entrada = EntradaConsultarHistoricoInversion.parse(argumentos);
    const semanas = entrada.semanas ?? 12;

    const resultado = historicoDePrecios(entrada.instrumentoId, semanas);

    return SalidaConsultarHistoricoInversion.parse(resultado);
  },
};
