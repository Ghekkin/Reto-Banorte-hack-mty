---
estado: resuelto
severidad: media
area: web
encontrado: 2026-09-13 06:15
github: 37
resuelto-en: fd73cb9
---

# Desde 6cefc30, un visitante nuevo ve la portada común aunque se armó con las acciones de otro

**Dónde:** `apps/web/src/lib/inicio/servicio.ts:109-110` (`sinAccionesPropias` manda al ámbito común
a todo dispositivo sin acciones, sin mirar si la común las tiene) y `apps/web/src/app/(app)/page.tsx:52`
(la visita solo genera cuando no hay **ninguna** portada).

**Qué esperaba:** lo que promete el ADR 0012: un visitante que no ha aplicado nada ve una portada
armada con **cero** acciones, y lo que otro hizo no le aparece. Y lo que dice
`docs/algoritmos/portada-por-dispositivo.md`, paso 4: la común solo sirve si la huella del dispositivo
**es igual** a la común.

**Qué pasa:** el arreglo del #33 cambió el costo por el aislamiento. Si la común tiene una acción
(cualquier script sin cookie que aplique algo: `pnpm probar-guion` sin `--aislado`, curl, una prueba
manual contra `/api/agente`), **todos** los visitantes nuevos ven la portada común armada con esa
acción, y se quedan con ella. La visita ya no la rearma porque "ya hay pantalla", y el reloj solo
rearma la común.

**Cómo lo sé:** prueba temporal sobre `servicio.ts` de `229fe35` (dependencias inyectadas, sin base
ni modelo): común con huella `a:1:7` y su portada guardada, 100 dispositivos con huella `a:0:0`.
Resultado: 0 llamadas al modelo (el #33 queda resuelto) y **100 de 100** reciben la portada común
con huella `a:1:7`.

Hoy no se ve porque la común tiene 0 acciones (se corrió `reiniciar-estado` después del arreglo).
Aparece con la primera acción sin cookie.

**Impacto en la demo:** medio. Un juez abre a Beto y en Inicio ve el resultado de un plan que él no
aplicó; si pregunta en `/maya`, que lee **sus** acciones, Maya le dice otra cosa. Además, una portada
propia vencida (por ejemplo, cuando cambia el número de componentes del catálogo, que entra en la
huella como `c21`) ya no se rearma al visitar.

**Arreglo posible:** reusar cualquier portada **de la misma persona con la misma huella**, venga del
ámbito que venga; si no hay ninguna con `a:0:0`, armarla una sola vez en un ámbito compartido
"sin acciones" (no en `comun`), con la misma generación en vuelo. Así se conservan las dos cosas: cero
costo por visitante y aislamiento. Y actualizar el paso 4 de `docs/algoritmos/portada-por-dispositivo.md`,
que hoy no describe lo que hace el código.

## Resolución

Resuelto en `fd73cb9`. El visitante sin acciones propias, cuando la común tiene acciones, usa la
portada compartida `dis_sinacciones00` (`DISPOSITIVO_SIN_ACCIONES` en `apps/web/src/lib/dispositivo.ts`):
una generación por persona y nunca la común. Las visitas y consultas esperan 5 min antes de reintentar
la misma portada (`ESPERA_ENTRE_INTENTOS_MS`); acción, reloj y manual no esperan. `page.tsx` vuelve a
rearmar las portadas vencidas mientras pinta la que hay.

**Evidencia:** 8 pruebas nuevas en `servicio.spec.ts`, `dispositivo.spec.ts` y `huella.spec.ts` (común con
una acción y 100 visitantes, en serie y a la vez: 1 generación y ninguno ve la común; común sin
acciones: 0; propia con acciones; propia vencida; reintentos con espera). Contra el `servicio.ts` de
`6cefc30` fallan 3. Docs: `docs/algoritmos/portada-por-dispositivo.md` (paso 5 y la espera),
`estado-por-dispositivo.md`, `inicio-personalizado.md`.

**Límites:** la espera vive en la memoria de cada proceso (se reinicia con cada deploy).
