---
estado: resuelto
severidad: media
area: web
encontrado: 2026-09-12 11:15
---

# `lienzo-pinta.spec.ts` no arranca en Windows: `.pathname` de una `file://` URL no es una ruta válida

**Dónde:** `apps/web/src/lib/__tests__/lienzo-pinta.spec.ts:30`

**Qué esperaba:** que la prueba nueva del lienzo (`el lienzo de la demo`) corriera en
cualquier máquina del equipo, Windows incluido.

**Qué pasa:** construía la ruta al `.jsonl` de ejemplo con
`new URL(ruta, import.meta.url).pathname`. En POSIX eso da una ruta absoluta normal; en
Windows da `/C:/Proyectos%20Personales/...` — con la barra inicial y los espacios en
`%20` — que `readFileSync` no resuelve:

```
Error: ENOENT: no such file or directory, open 'C:\C:\Proyectos%20Personales\...\plan-de-pago.jsonl'
```

**Por qué nadie lo vio:** el archivo llegó en un merge desde una sesión que corría en
Linux/Mac, donde `.pathname` sí funciona. Al fusionar con el trabajo hecho en Windows
(Bloque A de los orquestadores) el conjunto de pruebas completo falló aquí.

**Cómo lo reproduje:** `pnpm --filter @maya/web test` en Windows, justo después de
resolver el merge que trajo este archivo.

**Impacto:** bajo pero real — bloquea `pnpm test` completo en cualquier máquina Windows
del equipo, no solo en CI.

## Cómo quedó

Se cambió a `fileURLToPath(new URL(ruta, import.meta.url))` (`node:url`), que resuelve
bien en ambos sistemas operativos. `pnpm --filter @maya/web test` en verde (37 pruebas).
