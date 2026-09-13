import { ID_RAIZ, type Componente, type MensajeA2UI } from "@maya/a2ui";

/**
 * La pantalla viva, del lado del servidor: leer las tarjetas de una portada guardada y
 * aplicarle un ajuste sin rearmarla.
 *
 * Una portada se guarda como los tres mensajes A2UI con los que se pinto
 * (`createSurface`, `updateComponents`, `updateDataModel`). Un ajuste es un
 * `updateComponents` con uno o dos componentes (la tarjeta que cambio y, si hace falta, la
 * `Conclusion` con sus cifras rehechas). Guardarlo como un cuarto mensaje haria crecer la
 * fila con cada pregunta; en vez de eso se funde en el `updateComponents` original, que es
 * exactamente lo que el motor A2UI hace en el cliente (`updateComponents` reemplaza por id).
 */

export function componentesDe(mensajes: readonly MensajeA2UI[]): Map<string, Componente> {
  const mapa = new Map<string, Componente>();
  for (const mensaje of mensajes) {
    if ("updateComponents" in mensaje) {
      for (const c of mensaje.updateComponents.components) mapa.set(c.id, c);
    }
  }
  return mapa;
}

/** Los ids de las tarjetas en el orden en que se leen: los hijos de la raiz. */
export function idsEnOrden(componentes: ReadonlyMap<string, Componente>): string[] {
  const raiz = componentes.get(ID_RAIZ);
  return Array.isArray(raiz?.children) ? (raiz.children as string[]) : [];
}

/** Los mensajes guardados con los componentes del ajuste ya fundidos. Puro. */
export function fundirAjuste(mensajes: readonly MensajeA2UI[], ajuste: readonly MensajeA2UI[]): MensajeA2UI[] {
  const nuevos = new Map<string, Componente>();
  for (const m of ajuste) {
    if ("updateComponents" in m) for (const c of m.updateComponents.components) nuevos.set(c.id, c);
  }
  if (nuevos.size === 0) return [...mensajes];
  return mensajes.map((m) => {
    if (!("updateComponents" in m)) return m;
    const componentes = m.updateComponents.components.map((c) => nuevos.get(c.id) ?? c);
    return { ...m, updateComponents: { ...m.updateComponents, components: componentes } };
  });
}
