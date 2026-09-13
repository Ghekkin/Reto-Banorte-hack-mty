---
estado: resuelto
severidad: critica
area: web
github: 21
encontrado: 2026-09-13 02:36
---

# `main` roto: `pantalla.ts` exige `montoCentavos` en `Conclusion` y el schema exige `valor`, así que ninguna pantalla con montos pasa

**Dónde:** `apps/web/src/lib/agente/pantalla.ts:1326` (la llamada a `dineroEscritoAMano`), entrada
en `98620ab` (Chee3mss, dom 02:24) y desplegada con `c18e9a6`.

**Qué esperaba:** que una `Conclusion` con un dato de dinero (`{"etiqueta":"Mensualidad fija","valor":"$3,193.35"}`) pase la validación, como exige el schema de `main`
(`packages/catalogo/src/conclusion/schema.ts`: `valor` es texto obligatorio y no existe `montoCentavos`).

**Qué pasa:** `dineroEscritoAMano` rechaza cualquier `valor` que empiece con `$` y pide
`montoCentavos`, una prop que llegó con el trabajo revertido el sábado (`2a60a89`) y que el
schema de `main` no tiene. El modelo obedece el error, manda `montoCentavos` sin `valor`, y el
schema lo rechaza. Dos intentos y el turno termina **sin pantalla**.

**Cómo lo reproduje:** el paso "un prompt del guion contra la URL pública" del CI de
`c18e9a6` (run 34747620548) falló con los dos errores seguidos:

```
Conclusion (conclusion): el dato "Mensualidad fija" trae el monto escrito a mano en `valor` ("$3,193.35"). El dinero va en `montoCentavos` ...
Conclusion (conclusion): datos.0.valor Invalid input: expected string, received undefined; ...
```

Con la llamada quitada, el mismo prompt en local pinta en 2 pasos (`cor_445c86b5…`).

**Impacto en la demo:** la rompía. Casi toda pantalla lleva `Conclusion` con un monto; el
deploy de `c18e9a6` quedó en producción con el agente sin poder pintar esas pantallas.

**Arreglo:** se quitó `dineroEscritoAMano`. Si se quiere de vuelta la idea (que el dinero lo
formatee el componente), es un cambio de schema completo: `montoCentavos` en `DatoDeApoyo`,
el componente, `catalogo.json`, el ejemplo y el prompt, en el mismo commit (skill `cambiar-schema`).
