---
estado: abierto
severidad: alta
area: web
encontrado: 2026-09-13 04:05
github: 28
---

# La tarjeta de Inicio dice `ÔÇóÔÇóÔÇóÔÇó 4821` en vez de `•••• 4821`

**Dónde:** `apps/web/src/lib/agente/pantalla.ts:422`, el valor por omisión de `mascara` cuando
el modelo no la manda en `ResumenTarjeta`:
`comp.mascara = (tarjetaData.mascara as string) ?? "ÔÇóÔÇóÔÇóÔÇó 4821";`

**Qué esperaba:** el número enmascarado con viñetas, `•••• 4821` (skill `diseno-banorte`,
"dato sensible enmascarado").

**Qué pasa:** el literal está guardado con la codificación rota: son los bytes UTF-8 de `•`
(`E2 80 A2`) leídos como CP437/Windows-1252. Llegó en el commit `98620ab` ("."). Cuando la
portada no trae la máscara, la tarjeta pinta basura justo debajo del saldo.

**Cómo lo reproduje / por qué estoy seguro:** se ve en https://ghekkinxmaya.tech/ en escritorio
y en celular (390 px), portada de Alberto, tarjeta "Saldo de tu tarjeta" (capturas con
Chromium headless, 2026-09-13 04:00). `grep -rn "ÔÇó"` solo encuentra esa línea; el resto del
repo usa `••••` bien (`apps/mcp/src/__tests__/datos-de-prueba.json`).

**Impacto en la demo:** alto: es texto roto en la segunda tarjeta de la portada, en el
dispositivo donde se va a ver.

**Arreglo sugerido:** cambiar el literal por `•••• 4821`, y revisar el resto del relleno de
`pantalla.ts` con el issue #23 (cifras inventadas).
