---
estado: resuelto
severidad: media
area: web
encontrado: 2026-09-13 06:59
github: 44
resuelto-en: 12ac74e
---

# «¿Cómo va mi plan de pago?» después de aplicar el plan contesta con texto y no pinta pantalla

**Dónde:** decisión del modelo entre `pintar_pantalla` y `responder` (`apps/web/src/lib/agente/prompt.ts`, reglas de
las tres salidas); caso «Beto · el plan ya aplicado se puede consultar» de `scripts/probar-guion.mjs:65`.

**Qué esperaba:** una pantalla de consulta del plan (`consultar_plan`) con las próximas mensualidades.

**Qué pasa:** el turno cierra con `responder` en 1 paso y el texto dice «en pantalla puedes ver el desglose de tus
próximas mensualidades», aunque la pantalla es la de la acción anterior.

**Cómo lo sé:** ensayo del guion contra producción (`8060918`) el 13 a las 06:54 con `--aislado`: FALLA «no pintó
ninguna pantalla». Es el único turno con esa pregunta en `banorte.corridas` (el caso entró al guion en `a93e699`).

**Impacto en la demo:** medio: si se usa esa pregunta, Maya afirma algo de la pantalla que no está.

**Arreglo:** que una pregunta por el estado de un producto pinte su pantalla de consulta, y que `responder` no
afirme cosas de la pantalla que no puede verificar.

## Resolución

Resuelto en `12ac74e`. **Corrección al diagnóstico:** en la corrida de las 06:54 `responder` era correcto: el plan recién aplicado ya estaba en pantalla (`ResumenTarjeta` con `planActivo`, saldo en cero y `Calendario` de próximos pagos) y el texto no afirmó nada que no estuviera ahí; el caso del guion, anterior a `responder`, esperaba una pantalla nueva en la misma conversación. Se escribió la regla en los dos sentidos: `prompt.ts` («Una pregunta por el ESTADO de un producto…») consulta y pinta salvo que ese estado ya esté en `componentes en pantalla`, y `responder` (prompt y descripción en `cierre.ts`) no afirma lo que no se ve. El caso «el plan ya aplicado se puede consultar» corre ahora en conversación nueva y exige `consultar_plan`/`consultar_tarjeta` y la mensualidad `319335` en pantalla. Pruebas: `estado-de-producto.spec.ts` (3; fallan contra el código anterior). Descartado, medido: un freno con `verificarCifras` sobre `responder` rechazaba 2 de los 4 `responder` correctos del día.
