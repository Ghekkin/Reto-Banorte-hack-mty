import type { LineaDeWidget } from "./linea";

/**
 * Lo que la persona ve mientras Maya contesta una pregunta de Inicio: en qué etapa va el
 * turno, dicho con palabras, y cuánto lleva esperando.
 *
 * ## Por que existe
 *
 * Una pregunta a un widget vivo tarda de 2 a 8 s, a veces más. Medido el 2026-09-13 en un
 * iPhone 13 (emulado): lo único que cambiaba era el placeholder gris de la barra («Maya está
 * pensando…») y, con una tarjeta en foco, un velo blanco que la lavaba entera con el aviso en
 * su borde de arriba, que en el celular quedaba fuera de la pantalla. La pregunta que se acababa
 * de escribir desaparecía. El usuario lo dijo así: «que no se quede tan vacío».
 *
 * ## Sin mentir
 *
 * Las etapas salen de las líneas REALES del stream (`POST /api/inicio/widget`), en el orden del
 * servidor: el modelo entiende (`estado: pensando`), consulta al MCP (`tool`,
 * `estado: consultando`), cierra el turno (`estado: armando`), el auditor re-consulta la fuente
 * (`estado: verificando`) y llega la tarjeta (`a2ui`). No hay temporizadores que adelanten una
 * etapa: si el stream no avanza, el texto no avanza. Lo único que corre con el reloj son los
 * segundos que lleva la espera (`paraLaEspera`), que son verdad.
 *
 * Nunca retrocede: un reintento del modelo vuelve a mandar `pensando`, pero lo que ya se hizo
 * sigue hecho y ver la barra regresar se lee como un error. Una etapa que el turno se salta (una
 * respuesta sin tools) queda llena en la barra de tres segmentos, porque la barra dice en qué
 * PUNTO del camino va, no qué trabajo se hizo; el texto dice siempre lo que pasa ahora.
 */

export type EtapaVisible = "entendiendo" | "consultando" | "armando" | "verificando" | "actualizando" | "listo";

export type ProgresoDeConsulta = {
  etapa: EtapaVisible;
  /** La última tool del MCP que se consultó. */
  tool?: string;
};

export const PROGRESO_INICIAL: ProgresoDeConsulta = { etapa: "entendiendo" };

const RANGO: Record<EtapaVisible, number> = {
  entendiendo: 0,
  consultando: 1,
  armando: 2,
  verificando: 3,
  actualizando: 4,
  listo: 5,
};

/** La etapa que marca una línea del stream, o `undefined` si la línea no dice nada de eso. */
export function etapaDeLinea(linea: LineaDeWidget): EtapaVisible | undefined {
  switch (linea.tipo) {
    case "estado":
      return linea.valor === "pensando" ? "entendiendo" : linea.valor;
    case "tool":
      return "consultando";
    case "a2ui":
      return "actualizando";
    case "fin":
    case "error":
      return "listo";
  }
}

/** El progreso tras una línea: avanza, nunca retrocede, y se queda con la última tool. */
export function avanzarProgreso(progreso: ProgresoDeConsulta, linea: LineaDeWidget): ProgresoDeConsulta {
  const tool = linea.tipo === "tool" ? linea.nombre : progreso.tool;
  const etapa = etapaDeLinea(linea);
  if (!etapa || RANGO[etapa] <= RANGO[progreso.etapa]) {
    return tool === progreso.tool ? progreso : { ...progreso, tool };
  }
  return { etapa, tool };
}

/** Lo que dice la barra en cada etapa. Con tarjeta, lo que cambia es ESA tarjeta. */
export function textoDeEtapa(etapa: EtapaVisible, { conTarjeta }: { conTarjeta: boolean }): string {
  switch (etapa) {
    case "entendiendo":
      return "Entendiendo tu pregunta";
    case "consultando":
      return "Consultando tus datos";
    case "armando":
      return conTarjeta ? "Preparando el cambio" : "Preparando tu respuesta";
    case "verificando":
      return "Verificando las cifras con el banco";
    case "actualizando":
      return conTarjeta ? "Actualizando la tarjeta" : "Mostrando tu respuesta";
    case "listo":
      return "Listo";
  }
}

export type Segmento = "hecho" | "actual" | "pendiente";

/**
 * Tres segmentos: entender, consultar, y responder (armar + verificar + actualizar). Tres y no
 * cinco porque a 390 px cinco segmentos son rayas que no se distinguen.
 */
export function segmentosDe(etapa: EtapaVisible): [Segmento, Segmento, Segmento] {
  const indice = Math.min(RANGO[etapa], 2);
  const de = (i: number): Segmento => (etapa === "listo" || i < indice ? "hecho" : i === indice ? "actual" : "pendiente");
  return [de(0), de(1), de(2)];
}

/**
 * Cuánto lleva esperando, dicho solo cuando ayuda: los primeros 3 s no se dice nada (distrae),
 * después los segundos, y desde los 12 s que está tardando más de lo normal. Es verdad siempre:
 * sale del reloj, no de una estimación.
 */
export function paraLaEspera(ms: number): string | undefined {
  if (ms < 3000) return undefined;
  const segundos = Math.floor(ms / 1000);
  if (ms < 12_000) return `${segundos} s`;
  return `tarda más de lo normal · ${segundos} s`;
}
