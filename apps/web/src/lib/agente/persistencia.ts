"use client";

import { estadoVacio, type Componente, type Estado, type EstadoSuperficie } from "@maya/a2ui";
import type { EntradaDelHilo } from "@/lib/agente/usar-agente";
import type { LineaStream } from "@/lib/agente/tipos";

/**
 * Guardar y recuperar la conversación con Maya dentro de la sesión del navegador.
 *
 * ## Por qué existe
 *
 * El hilo vivía en `useState` dentro de `usarAgente`, y ese hook lo consumía la página
 * `/maya`. Cambiar de pestaña desmonta la página, así que la conversación se perdía: la
 * persona armaba su pantalla, iba a Movimientos a comprobar algo, volvía, y Maya no se
 * acordaba de nada. Con el provider del layout el hilo ya sobrevive a navegar; esto agrega
 * que sobreviva a **recargar** (F5) y a abrir `/maya` en otra pestaña del navegador.
 *
 * ## Por qué `sessionStorage` y no `localStorage`
 *
 * Una conversación financiera no tiene por qué quedarse en el disco de nadie después de
 * cerrar la pestaña. `sessionStorage` muere con la pestaña, que es exactamente la vida que
 * debe tener. Los datos son sintéticos (ADR 0007) pero la forma correcta se practica igual.
 *
 * ## El detalle que rompe en silencio
 *
 * `EstadoSuperficie.componentes` es un `Map` y no sobrevive a `JSON.stringify`, así que se
 * guarda como pares. Y `calcularSuperficieViva` compara la superficie viva contra la
 * congelada **por REFERENCIA**: al hidratar, el `estado` vivo tiene que apuntar al MISMO
 * objeto que la última pantalla del hilo, no a una copia con los mismos campos. Si fueran
 * dos objetos distintos, la comparación diría "son diferentes" y la última pantalla se
 * pintaría dos veces, una congelada en el hilo y otra como pantalla en curso.
 *
 * Por eso aquí solo se persiste el `hilo`: el `estado` se **reconstruye a partir de él**
 * reutilizando esa misma referencia. La invariante se cumple por construcción, no por
 * cuidado de quien lo lea.
 */

/** Sube con cualquier cambio de forma: un hilo viejo se descarta en vez de romper. */
const VERSION = "v1";

/** La llave lleva el usuario: un hilo de otra persona no puede reaparecer nunca. */
function llaveDe(usuarioId: string): string {
  return `maya:hilo:${VERSION}:${usuarioId}`;
}

/** Lo que se guarda. El `estado` NO va: se deriva del hilo al hidratar. */
type Guardado = {
  version: string;
  usuarioId: string;
  conversacionId: string;
  sugerencias: string[];
  razon?: string;
  hilo: EntradaSerializada[];
};

type EntradaSerializada =
  | { tipo: "mensaje"; rol: "usuario" | "agente" | "accion"; texto: string }
  | {
      tipo: "pantalla";
      transparencia: LineaStream[];
      superficie: {
        id: string;
        catalogId: string;
        componentes: Array<[string, Componente]>;
        raiz?: string;
        dataModel: Record<string, unknown>;
      };
    };

export type HiloRecuperado = {
  hilo: EntradaDelHilo[];
  estado: Estado;
  conversacionId: string;
  sugerencias: string[];
  razon?: string;
};

/**
 * Guarda el hilo. Silencioso ante fallos a propósito: `sessionStorage` puede estar lleno o
 * deshabilitado, y perder la persistencia es un inconveniente; tumbar la conversación en
 * curso por no poder guardarla, no.
 */
export function guardarHilo(
  usuarioId: string,
  datos: { hilo: EntradaDelHilo[]; conversacionId: string; sugerencias: string[]; razon?: string },
): void {
  if (typeof window === "undefined") return;

  try {
    if (datos.hilo.length === 0) {
      window.sessionStorage.removeItem(llaveDe(usuarioId));
      return;
    }

    const guardado: Guardado = {
      version: VERSION,
      usuarioId,
      conversacionId: datos.conversacionId,
      sugerencias: datos.sugerencias,
      razon: datos.razon,
      hilo: datos.hilo.map(serializarEntrada),
    };
    window.sessionStorage.setItem(llaveDe(usuarioId), JSON.stringify(guardado));
  } catch (error) {
    console.warn("[maya] no se pudo guardar el hilo:", error);
  }
}

/** Recupera el hilo de este usuario, o `undefined` si no hay nada usable. */
export function recuperarHilo(usuarioId: string): HiloRecuperado | undefined {
  if (typeof window === "undefined") return undefined;

  let guardado: Guardado;
  try {
    const crudo = window.sessionStorage.getItem(llaveDe(usuarioId));
    if (!crudo) return undefined;
    guardado = JSON.parse(crudo) as Guardado;
  } catch (error) {
    console.warn("[maya] hilo guardado ilegible, se descarta:", error);
    olvidarHilo(usuarioId);
    return undefined;
  }

  // La llave ya lleva version y usuario, pero se revisa el contenido igual: un `sessionStorage`
  // es entrada del navegador y aqui sale de un `JSON.parse` sin validar.
  if (guardado.version !== VERSION || guardado.usuarioId !== usuarioId || !Array.isArray(guardado.hilo)) {
    olvidarHilo(usuarioId);
    return undefined;
  }

  const hilo = guardado.hilo.map(deserializarEntrada).filter((e): e is EntradaDelHilo => e !== undefined);
  if (hilo.length === 0) return undefined;

  return {
    hilo,
    // El estado se arma con la MISMA referencia que quedo en el hilo: es lo que mantiene
    // exacta la comparacion de `calcularSuperficieViva`.
    estado: estadoDe(hilo),
    conversacionId: typeof guardado.conversacionId === "string" ? guardado.conversacionId : crearIdDeRespaldo(),
    sugerencias: Array.isArray(guardado.sugerencias) ? guardado.sugerencias : [],
    razon: typeof guardado.razon === "string" ? guardado.razon : undefined,
  };
}

export function olvidarHilo(usuarioId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(llaveDe(usuarioId));
  } catch {
    // Si no se puede borrar, el cambio de usuario igual reinicia el estado en memoria.
  }
}

/**
 * El estado del renderer a partir del hilo: la ULTIMA pantalla congelada, con su objeto tal
 * cual. Sin pantallas en el hilo, el estado arranca vacio.
 *
 * La llave es el `id` que la propia superficie trae, no la constante `SUPERFICIE`: asi este
 * modulo no depende de `usar-agente` en tiempo de ejecucion (seria un ciclo, porque de ahi
 * sale el tipo del hilo) y de paso queda correcto si alguna vez hay mas de una superficie.
 */
function estadoDe(hilo: EntradaDelHilo[]): Estado {
  for (let i = hilo.length - 1; i >= 0; i--) {
    const entrada = hilo[i]!;
    if (entrada.tipo === "pantalla") {
      const estado = estadoVacio();
      estado.set(entrada.superficie.id, entrada.superficie);
      return estado;
    }
  }
  return estadoVacio();
}

function serializarEntrada(entrada: EntradaDelHilo): EntradaSerializada {
  if (entrada.tipo === "mensaje") return entrada;
  return {
    tipo: "pantalla",
    transparencia: entrada.transparencia,
    superficie: {
      id: entrada.superficie.id,
      catalogId: entrada.superficie.catalogId,
      componentes: [...entrada.superficie.componentes.entries()],
      raiz: entrada.superficie.raiz,
      dataModel: entrada.superficie.dataModel,
    },
  };
}

/** `undefined` para lo que no se reconoce: una entrada rota se salta, no tumba el hilo. */
function deserializarEntrada(entrada: EntradaSerializada): EntradaDelHilo | undefined {
  if (!entrada || typeof entrada !== "object") return undefined;

  if (entrada.tipo === "mensaje") {
    return typeof entrada.texto === "string" ? entrada : undefined;
  }
  if (entrada.tipo !== "pantalla" || !entrada.superficie) return undefined;

  const s = entrada.superficie;
  if (!Array.isArray(s.componentes)) return undefined;

  const superficie: EstadoSuperficie = {
    id: s.id,
    catalogId: s.catalogId,
    componentes: new Map(s.componentes),
    raiz: s.raiz,
    dataModel: s.dataModel ?? {},
  };
  return {
    tipo: "pantalla",
    superficie,
    transparencia: Array.isArray(entrada.transparencia) ? entrada.transparencia : [],
  };
}

function crearIdDeRespaldo(): string {
  return `c_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
}
