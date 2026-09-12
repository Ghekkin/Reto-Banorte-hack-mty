import { EntradaConsultarCatalogoInversiones, SalidaConsultarCatalogoInversiones } from "@maya/schemas";
import { catalogoDeInstrumentos } from "../dominio/inversiones.js";
import type { DefinicionDeTool } from "./registro.js";

/**
 * `consultar_catalogo_inversiones` — LECTURA.
 * Catálogo de instrumentos de inversión de Banorte: CETES, pagarés, fondos de deuda,
 * fondos de renta variable, ETFs y acciones. Permite filtrar por tipo de activo,
 * nivel de riesgo (1 a 5) o monto disponible.
 */
export const consultarCatalogoInversiones: DefinicionDeTool = {
  nombre: "consultar_catalogo_inversiones",
  titulo: "Consultar catálogo de instrumentos de inversión",
  descripcion:
    "Explora los instrumentos de inversión disponibles en Banorte (CETES, fondos de deuda, fondos de renta variable, " +
    "ETFs, pagarés y acciones). Permite filtrar por tipo, riesgo máximo (1 a 5) y monto disponible. " +
    "Úsala cuando pregunten en qué pueden invertir, qué fondos o pagarés ofrece el banco o qué opciones tienen para su dinero.",
  clase: "lectura",
  entrada: EntradaConsultarCatalogoInversiones.shape,
  manejar: (argumentos) => {
    const entrada = EntradaConsultarCatalogoInversiones.parse(argumentos);
    const instrumentos = catalogoDeInstrumentos(entrada);

    return SalidaConsultarCatalogoInversiones.parse({
      total: instrumentos.length,
      instrumentos,
    });
  },
};
