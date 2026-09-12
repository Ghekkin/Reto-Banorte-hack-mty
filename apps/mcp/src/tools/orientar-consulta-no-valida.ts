import { EntradaOrientarConsultaNoValida, SalidaOrientarConsultaNoValida } from "@maya/schemas";
import { orientarConsultaNoValida as orientarDominio } from "../dominio/consultas-no-validas.js";
import type { DefinicionDeTool } from "./registro.js";

/**
 * `orientar_consulta_no_valida` — Tool de lectura / orientación para solicitudes
 * inviables, contraproducentes (e.g. invertir con deuda al 62% CAT) o fuera del
 * alcance regulatorio de Banorte (cripto, apuestas, etc.).
 */
export const orientarConsultaNoValida: DefinicionDeTool = {
  nombre: "orientar_consulta_no_valida",
  titulo: "Orientar sobre consultas o solicitudes no válidas / fuera de alcance",
  descripcion:
    "Analiza y orienta al usuario cuando realiza consultas inviables, perjudiciales para su salud financiera " +
    "(por ejemplo: pedir invertir cuando tiene deuda crítica con alta tasa de interés, o pedir reestructurar tarjeta " +
    "cuando no tiene tarjeta de crédito) o fuera del marco bancario formal (criptomonedas, apuestas, pirámides). " +
    "Devuelve la explicación con números reales del cliente, el motivo formal y alternativas accionables.",
  clase: "lectura",
  entrada: EntradaOrientarConsultaNoValida.shape,
  manejar: (argumentos) => {
    const { usuarioId, consulta, categoria } = EntradaOrientarConsultaNoValida.parse(argumentos);
    const resultado = orientarDominio(usuarioId, consulta, categoria);
    return SalidaOrientarConsultaNoValida.parse(resultado);
  },
};
