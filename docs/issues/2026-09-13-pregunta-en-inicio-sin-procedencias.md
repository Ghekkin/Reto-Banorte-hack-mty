---
estado: abierto
severidad: media
area: web
encontrado: 2026-09-13 03:55
github: 27
---

# Con widgets vivos, la pregunta hecha en la barra de Inicio se guarda sin procedencias y el siguiente render la tira

**Dónde:** `apps/web/src/app/(app)/acciones.ts:74` (`preguntarEnInicio` → `almacenEnPostgres.guardar`)

**Qué esperaba:** que la pantalla que contesta la pregunta se guarde completa, como la guarda `servicio.ts` al rearmar: con `procedencias` y `referencias` de `generarPortada`.

**Qué pasa:** `preguntarEnInicio` llama `generarPortada(usuario.id, { pregunta })`, que con `FEATURE_WIDGETS_VIVOS=1` arma la pantalla por fuentes y devuelve `procedencias` y `referencias`, pero el `guardar` no las pasa. La fila queda con `procedencias = {}`. En modo widgets, `vencida()` (`lib/inicio/servicio.ts`) considera vencida toda portada sin procedencias, así que la siguiente visita la rearma como portada normal y la respuesta a la pregunta desaparece; mientras tanto se pinta la pantalla programada con el aviso de "Maya está armando tu inicio".

**Cómo lo reproduje / por qué estoy seguro:** lectura de código al pasar el dispositivo por `preguntarEnInicio` (trabajo del ADR 0012). `PortadaGenerada` declara `procedencias?` y `referencias?` en el caso `ok`, `servicio.ts` sí las pasa a `guardar`, y `acciones.ts` no.

**Impacto en la demo:** se nota si `FEATURE_WIDGETS_VIVOS=1` y alguien pregunta desde la barra de la pantalla programada: la respuesta dura hasta el siguiente render.
