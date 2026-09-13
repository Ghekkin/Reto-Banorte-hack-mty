---
estado: resuelto
severidad: baja
area: web
encontrado: 2026-09-13 07:29
github: 46
resuelto-en: 95c6f8b
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

## Resolución

Resuelto en `95c6f8b`. **Corrección al diagnóstico:** en la llamada real (`corrida_tools` 3042, ensayo contra
producción de las 07:28) el modelo mandó `salud: "Hola, Alberto"`, un typo de `saludo` del mismo tipo (texto), no
un objeto. `quitarPropsNoDeclaradas` mira ahora también el valor: candidatas = props declaradas que faltan,
parecidas por nombre y cuyo tipo acepta el valor (`valorCompatible`/`tiposDeProp` sobre `catalogo.json`). Con una
sola candidata y valor de texto, se adopta (el texto pasa a la prop real y el nombre mal escrito se borra); con
número, arreglo, objeto, enlace o varias candidatas se deja para que la validación lo nombre (puede traer otra
unidad); sin candidatas se quita. Pruebas en `prop-parecida.spec.ts` (5; contra `108e722` fallan 3). Con las 191
`pintar_pantalla` del 13 pasan 173 contra 172, sin regresiones.

**Verificado con el modelo real en producción** (`95c6f8b`, `--aislado`): guion 17 de 17 y los 3 casos extra;
«Beto · simulador de ahorro» sin el rechazo de `salud` (4 pasos, 5.5 s; antes 5 pasos, 9.1 s). `estable` → `95c6f8b`.
