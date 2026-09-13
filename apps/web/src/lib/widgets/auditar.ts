import type { Componente } from "@maya/a2ui";
import type { Procedencias } from "./armar";
import { canonico, huellaDe, type Llamar } from "./consultor";
import { fuente } from "./fuentes";

/**
 * El auditor: la prueba, en tiempo de ejecucion, de que lo que se ve en cada tarjeta es
 * exactamente lo que devuelve el MCP.
 *
 * Para cada widget con procedencia: vuelve a llamar la tool con los MISMOS argumentos
 * guardados (sin cache), corre el MISMO adaptador y compara, prop por prop, contra el
 * componente que esta en pantalla. Cero diferencias quiere decir que ninguna cifra de esa
 * tarjeta la escribio el modelo ni se altero en el camino (base, cliente, almacenamiento).
 *
 * Distingue dos cosas que no son lo mismo:
 *  - `diferencias`: una prop en pantalla que NO es lo que produce el MCP. Es un bug.
 *  - `datosCambiaron`: la huella del resultado ya no es la guardada. No es mentira: la
 *    cuenta se movio despues de armar la tarjeta (una accion, un movimiento nuevo).
 */

export type Diferencia = { widgetId: string; campo: string; enPantalla: unknown; delMcp: unknown };

export type Auditoria = {
  revisados: number;
  diferencias: Diferencia[];
  /** Widgets cuya fuente devolvio otra cosa que cuando se armaron: la cuenta cambio. */
  datosCambiaron: string[];
  /** Widgets que no se pudieron auditar (la tool fallo, la fuente ya no existe). */
  sinAuditar: Array<{ widgetId: string; motivo: string }>;
  ms: number;
};

export async function auditarWidgets(
  componentes: ReadonlyMap<string, Componente>,
  procedencias: Procedencias,
  llamar: Llamar,
  ids: readonly string[] = Object.keys(procedencias),
): Promise<Auditoria> {
  const inicio = Date.now();
  const auditoria: Auditoria = { revisados: 0, diferencias: [], datosCambiaron: [], sinAuditar: [], ms: 0 };

  await Promise.all(
    ids.map(async (widgetId) => {
      const procedencia = procedencias[widgetId];
      const componente = componentes.get(widgetId);
      const definicion = procedencia ? fuente(procedencia.fuente) : undefined;
      if (!procedencia || !componente || !definicion) {
        auditoria.sinAuditar.push({ widgetId, motivo: "sin procedencia, sin componente o fuente desconocida" });
        return;
      }

      const { resultado, ok } = await llamar(procedencia.tool, procedencia.argumentos);
      if (!ok) {
        auditoria.sinAuditar.push({ widgetId, motivo: `la tool ${procedencia.tool} fallo al re-consultar` });
        return;
      }
      const adaptado = definicion.adaptar(resultado, procedencia.parametros);
      if (!adaptado.ok) {
        auditoria.sinAuditar.push({ widgetId, motivo: adaptado.motivo });
        return;
      }

      auditoria.revisados++;
      if (huellaDe(resultado) !== procedencia.huella) auditoria.datosCambiaron.push(widgetId);
      for (const diferencia of compararDatos(widgetId, componente, adaptado.props, procedencia.variantes)) {
        auditoria.diferencias.push(diferencia);
      }
    }),
  );

  auditoria.ms = Date.now() - inicio;
  return auditoria;
}

/**
 * Prop por prop, con igualdad canonica (mismo JSON sin importar el orden de las llaves).
 * Las variantes pisan legitimamente a una prop del adaptador (`plazoElegido`), asi que esas
 * se comparan contra la variante guardada.
 */
export function compararDatos(
  widgetId: string,
  componente: Componente,
  delMcp: Record<string, unknown>,
  variantes: Record<string, unknown> = {},
): Diferencia[] {
  const diferencias: Diferencia[] = [];
  for (const [campo, valor] of Object.entries(delMcp)) {
    const esperado = campo in variantes ? variantes[campo] : valor;
    if (canonico(componente[campo]) !== canonico(esperado)) {
      diferencias.push({ widgetId, campo, enPantalla: componente[campo], delMcp: esperado });
    }
  }
  return diferencias;
}
