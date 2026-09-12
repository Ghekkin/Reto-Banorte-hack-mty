import { leer } from "./bindings";
import { hijosFijos, type Componente, type EstadoSuperficie } from "./tipos";

/**
 * Un nodo listo para pintar. `item` solo viene cuando el nodo nacio de una
 * plantilla (`children: { componentId, path }`): es el elemento de la lista
 * contra el que se resuelven sus paths relativos.
 */
export type Nodo = {
  componente: Componente;
  /** id unico en el arbol; una plantilla repetida genera `id#0`, `id#1`… */
  clave: string;
  item?: unknown;
  hijos: Nodo[];
};

/**
 * De la lista plana al arbol. Parte del componente con id `root` (lo exige la
 * spec) y sigue `children` / `child`. Una plantilla se repite por cada elemento
 * de la lista del data model.
 *
 * Un id que no existe se ignora y se avisa; un ciclo se corta.
 */
export function arbol(superficie: EstadoSuperficie, avisar?: (m: string) => void): Nodo | undefined {
  if (!superficie.raiz) return undefined;

  function construir(id: string, clave: string, item: unknown, enCamino: Set<string>): Nodo | undefined {
    const componente = superficie.componentes.get(id);
    if (!componente) {
      avisar?.(`componente sin definir: ${id}`);
      return undefined;
    }
    if (enCamino.has(id)) {
      avisar?.(`ciclo en el arbol: ${id}`);
      return undefined;
    }
    const camino = new Set(enCamino).add(id);
    const hijos: Nodo[] = [];

    const plantilla = componente.children;
    if (plantilla && !Array.isArray(plantilla)) {
      const lista = leer(superficie.dataModel, plantilla.path);
      if (Array.isArray(lista)) {
        for (const [i, elemento] of lista.entries()) {
          const hijo = construir(plantilla.componentId, `${clave}/${plantilla.componentId}#${i}`, elemento, camino);
          if (hijo) hijos.push(hijo);
        }
      } else if (lista !== undefined) {
        avisar?.(`la plantilla de ${id} apunta a ${plantilla.path}, que no es una lista`);
      }
    } else {
      for (const hijoId of hijosFijos(componente)) {
        const hijo = construir(hijoId, `${clave}/${hijoId}`, item, camino);
        if (hijo) hijos.push(hijo);
      }
    }

    return { componente, clave, item, hijos };
  }

  return construir(superficie.raiz, superficie.raiz, undefined, new Set());
}
