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

/**
 * Los componentes que la persona **ve de verdad**: los alcanzables desde la raiz.
 *
 * `procesar` hace upsert por id y nunca poda (es fiel a la spec: `updateComponents`
 * "can be sent multiple times to update the component tree"), asi que
 * `superficie.componentes` es la acumulacion historica de la conversacion. Quien
 * necesite saber que hay en pantalla —el cliente, para contarselo al agente— tiene que
 * preguntar por lo alcanzable, no por el Map completo. Issue #3.
 *
 * Un componente repetido por una plantilla aparece UNA vez: al agente le interesa que
 * hay en pantalla, no cuantas filas tiene la lista.
 */
export function componentesVisibles(superficie: EstadoSuperficie): Componente[] {
  const raiz = arbol(superficie);
  if (!raiz) return [];
  const vistos = new Set<string>();
  const visibles: Componente[] = [];
  const pendientes: Nodo[] = [raiz];
  while (pendientes.length > 0) {
    const nodo = pendientes.shift()!;
    if (!vistos.has(nodo.componente.id)) {
      vistos.add(nodo.componente.id);
      visibles.push(nodo.componente);
    }
    pendientes.push(...nodo.hijos);
  }
  return visibles;
}

/**
 * Los componentes que de verdad estan en pantalla: los alcanzables desde la raiz.
 *
 * Hace falta porque `updateComponents` **fusiona por id** (asi lo define la spec), asi
 * que `superficie.componentes` es la acumulacion de toda la conversacion, no la pantalla
 * de ahora. Quien le cuenta al agente que esta viendo la persona tiene que preguntar
 * aqui, no al Map (issue #3).
 *
 * Recorre la estructura, no los datos: el componente de una plantilla cuenta como
 * visible aunque su lista venga vacia todavia. Es lo que el agente necesita saber.
 */
export function componentesVisibles(superficie: EstadoSuperficie): Componente[] {
  if (!superficie.raiz) return [];
  const vistos = new Set<string>();
  const salida: Componente[] = [];

  const pila = [superficie.raiz];
  while (pila.length > 0) {
    const id = pila.pop()!;
    if (vistos.has(id)) continue;
    vistos.add(id);
    const componente = superficie.componentes.get(id);
    if (!componente) continue;
    salida.push(componente);
    pila.push(...hijosFijos(componente));
    const plantilla = componente.children;
    if (plantilla && !Array.isArray(plantilla)) pila.push(plantilla.componentId);
  }
  return salida;
}

/** Los nombres de lo visible, sin repetir: lo que va en `superficie.componentes` del contrato. */
export function nombresVisibles(superficie: EstadoSuperficie): string[] {
  return [...new Set(componentesVisibles(superficie).map((c) => c.component))];
}
