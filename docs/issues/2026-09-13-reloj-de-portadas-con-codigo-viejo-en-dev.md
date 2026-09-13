---
estado: resuelto
severidad: media
area: web
encontrado: 2026-09-13 06:15
github: 38
resuelto-en: 1218e6d
---

# En `next dev`, el reloj de portadas sigue corriendo el código de cuando arrancó el servidor y pisa las portadas de la base compartida

**Dónde:** `apps/web/src/instrumentation.ts` (el reloj que llama `regenerarTodos` cada
`INICIO_CADA_MINUTOS`) y `apps/web/src/lib/inicio/generar.ts`.

**Qué esperaba:** que, tras un cambio en `generar.ts`, las portadas que rearma el reloj usen el código
nuevo, como lo usan las peticiones.

**Qué pasa:** el reloj se registra una vez al arrancar el `next-server` y conserva los módulos de ese
momento; el HMR actualiza las rutas pero no ese intervalo. El 2026-09-13 el `next dev` compartido de
este VPS arrancó a las 04:05 y la regla de widgets por cuenta (`36a1c09`) llegó a las 04:56: a las
06:07 y 06:12 su reloj rearmó las portadas del estado común de Ana y Beto con el prompt VIEJO (en
`banorte.corridas` se ve la escalera y no «YA ESTÁN DECIDIDAS»), y a Ana le volvió a pintar el
portafolio. Como la base es la misma que usa producción, la portada «vieja» se ve también ahí.

**Cómo lo reproduje / por qué estoy seguro:** corridas `cor_ebe1d5a7486348afba01eecd` y
`cor_4938d0b649a048b1ba631d36` (motivo `reloj`, `widgetsVivos: true`, prompt sin la elección por
cuenta), mientras `origin/main` y el contenedor de producción sí tienen `widgetsPorCuenta`. Reiniciar el
`next-server` (tocar `next.config.ts`) y rearmar con `POST /api/inicio?forzar=1` lo corrigió.

**Impacto en la demo:** se nota si un `next dev` viejo sigue vivo con la base compartida: cada 10 min
puede sobrescribir las portadas que ven los jueces. Mitigación: reiniciar el `next dev` tras cambiar
`lib/inicio/`, o apagar su reloj en desarrollo.

## Resolución

Resuelto en `1218e6d`. El reloj solo arranca con `NODE_ENV=production` (`decisionDelReloj()` en
`apps/web/src/lib/inicio/config.ts`, usado por `iniciarReloj()`). En `next dev` no corre, salvo
`INICIO_RELOJ=1`; `INICIO_RELOJ=0` lo apaga en cualquier entorno. El log de arranque dice si quedó
prendido o apagado y por qué. Visitas, acciones y `POST /api/inicio` rearman igual en los dos entornos.
Pruebas en `apps/web/src/lib/inicio/__tests__/reloj.spec.ts` (5): contra el `reloj.ts` anterior fallan 3.

**Lo que el código no puede arreglar:** un `next dev` que ya estaba corriendo con código viejo sigue con
su reloj hasta que se actualiza y reinicia. La auditoría del 13 a las 06:40 encontró uno fuera del VPS
(prompt `fc557a11`, cada 10 min) que alternaba las portadas de Ana y Beto con producción; ver el
comentario en GitHub.
