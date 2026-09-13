---
estado: abierto
severidad: baja
area: web
encontrado: 2026-09-13 07:29
github: 46
---

# `quitarPropsNoDeclaradas` deja `salud` en `Conclusion` porque se parece a `saludo`, y la pantalla se rechaza una vez

**Dónde:** `apps/web/src/lib/agente/pantalla.ts:1383` (`nombresParecidos`, en `108e722`): «salud» y «saludo» se
consideran parecidos por prefijo (`corto >= 4 && y.startsWith(x)`), así que la prop de sobra no se quita y la
validación rechaza `Conclusion` con `la propiedad "salud" no existe en este componente`.

**Qué esperaba:** que la heurística de parecido solo proteja typos reales de una prop declarada que falta. `saludo`
es un texto («Hola, Alberto»); lo que mandó el modelo en `salud` es otro dato (el puntaje o su objeto), no un typo.

**Qué pasa:** el turno paga un reintento de pantalla completo.

**Cómo lo sé:** ensayo final del guion contra producción (`108e722`, 07:25, `--aislado`): «Beto · simulador de
ahorro» pasó, pero en 5 pasos y 9.1 s, con `⚠ se recupero de: a2ui: Conclusion: la propiedad "salud" no existe`.

**Impacto en la demo:** bajo: el turno termina bien, solo más lento y más caro cuando el modelo mete `salud`.

**Arreglo:** considerar parecidos solo si además el valor es compatible con el tipo de la prop declarada (un objeto
o número no es typo de una prop de texto), o si la prop declarada que falta es obligatoria.
