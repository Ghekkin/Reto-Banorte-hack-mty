---
estado: resuelto
severidad: media
area: web
encontrado: 2026-09-13 06:48
github: 42
resuelto-en: 4f00835
---

# `pantalla.ts` copia los alias que manda el modelo a la prop real pero no los borra, y el schema estricto rechaza el sobrante

**Dónde:** `apps/web/src/lib/agente/pantalla.ts`, `normalizarListaDeComponentes` (en `8060918`, desde ~línea
203): `comp.tasaAnualPct = comp.tasaAnual`, `comp.TasaAnualPct`, `objetivoCentavos`, `ahorro`,
`mesesAhorrados` y otros alias se copian a su prop real y el alias se queda en el componente.

**Qué esperaba:** que la normalización que ya reconoce el alias deje el componente válido: prop real puesta
y alias fuera.

**Qué pasa:** la validación del catálogo es estricta (`la propiedad "X" no existe en este componente`), así
que un componente que llegó con el alias se rechaza aunque el host ya lo haya corregido. El modelo paga un
paso más para quitarlo.

**Cómo lo sé:** lectura del código, reportado por el agente de `8060918`. En las corridas de hoy no hubo
rechazos por esos alias (sí por `portafolioId` en `DistribucionPortafolio` y `heroe` en `PlanDePago`,
una vez cada uno): es un fallo latente, se dispara con el primer turno en que el modelo use el alias.

**Impacto en la demo:** medio y aleatorio: depende de cómo nombre el modelo la prop en ese turno.

**Arreglo:** al reconocer un alias, borrarlo después de copiarlo. Revisar con el schema de cada componente
que la normalización no deje ninguna prop fuera de él, y cubrirlo con prueba.

## Resolución

Resuelto en `4f00835`. Los alias que reconoce `normalizarListaDeComponentes` pasan por `adoptarAlias`/`quitarAlias`: llenan la prop real si falta y se borran (salvo que el componente declare el alias como prop propia), y los enlaces no los reponen. Al final, `quitarPropsNoDeclaradas` quita toda prop que `catalogo.json` no permite al componente, salvo las que `nombresParecidos` empareja con una prop declarada que falta (esas se dejan para que la validación las nombre): así se arreglan `portafolioId` en `DistribucionPortafolio` y `heroe` en `PlanDePago`. Pruebas en `normalizacion-alias.spec.ts` (42; contra `8060918` fallan 26 de 33). Con las 164 `pintar_pantalla` del 13 pasan 141 en vez de 135, sin regresiones.
