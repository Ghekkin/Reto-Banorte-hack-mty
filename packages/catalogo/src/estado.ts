"use client";

import { useState } from "react";

/**
 * Estado local que **sigue** al valor que manda el agente.
 *
 * ## Por que hace falta
 *
 * Cinco tarjetas del catalogo tienen un control que la persona mueve —el plazo de
 * `PlanDePago`, la aportacion de `SimuladorMeta` y de `ProyeccionCrecimiento`, el escenario
 * de `EscenariosInversion`, el instrumento de `RiesgoRendimiento`— y ese movimiento vive en
 * estado local a proposito: ir al agente por cada tick de un slider seria un turno por
 * pixel, y esa decision sigue siendo la correcta.
 *
 * El problema es que `useState(props.algo)` lee la prop **solo al montar**. La `key` de React
 * la deriva el motor del id del componente (`arbol.ts`), asi que la tarjeta no se remonta
 * entre turnos: cuando `ajustar_pantalla` parchea `/planElegido`, la tarjeta re-renderiza
 * —el encabezado, los limites del slider, todo lo que viene de props— **pero el control se
 * queda en el valor viejo**. Para la persona, pidio un cambio y no paso nada, que es peor
 * que un error.
 *
 * Hasta el 2026-09-12 no se notaba porque cada turno rearmaba la superficie completa y el
 * `createSurface` borraba el data model. Con el ciclo live, se nota siempre.
 *
 * ## Por que se ajusta en el render y no con `useEffect`
 *
 * Es el patron que React documenta para "ajustar estado cuando una prop cambia": llamar al
 * setter durante el render. React descarta el render en curso y vuelve a renderizar de
 * inmediato, **sin pintar** el intermedio. Un `useEffect` pintaria un frame con el valor
 * viejo, y en un slider eso se ve como un salto.
 */
export function usarEstadoSeguido<T>(valorDelAgente: T): [T, (nuevo: T) => void] {
  const [valor, setValor] = useState(valorDelAgente);
  const [anterior, setAnterior] = useState(valorDelAgente);

  const siguiente = seguir(valorDelAgente, anterior, valor);
  if (!Object.is(siguiente.valor, valor)) {
    setAnterior(siguiente.anterior);
    setValor(siguiente.valor);
  }

  return [siguiente.valor, setValor];
}

/**
 * La decision, aparte del hook y pura: **¿gana lo que toco la persona o lo que mando el
 * agente?**
 *
 * Vive fuera porque es lo unico que se puede equivocar en silencio (si gana el valor viejo,
 * el ajuste del agente no se ve; si gana el del agente de mas, el slider se pega y no se
 * puede arrastrar) y porque asi se prueba sin DOM, igual que `calcularSuperficieViva` en la
 * web. Gana la persona mientras el agente no cambie de opinion: en cuanto `valorDelAgente`
 * es distinto del que se vio la ultima vez, ese pisa al local.
 *
 * El valor que se sigue es siempre un primitivo (un plazo, unos centavos, un id), asi que
 * `Object.is` basta y no hace falta comparar en profundidad.
 */
export function seguir<T>(valorDelAgente: T, anterior: T, valor: T): { valor: T; anterior: T } {
  if (Object.is(valorDelAgente, anterior)) return { valor, anterior };
  return { valor: valorDelAgente, anterior: valorDelAgente };
}
