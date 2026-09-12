# Bitácoras

Dos tipos, en esta carpeta:

| Archivo | Quién escribe | Qué va |
|---|---|---|
| `equipo.md` | Cualquiera | **Decisiones** del equipo, hechos que afectan a todos, ideas para no perder |
| `<nombre>.md` | Solo esa persona | Su propio hilo: qué tomó, qué dejó a medias, qué tocó de otro dominio, qué aprendió |

La personal existe para que cualquiera pueda retomar **tu** trabajo leyendo solo el
repo: si dejaste algo a medias a las 3 am, el que entra a las 7 sabe exactamente dónde
estabas. También es tu memoria para el pitch.

## Formato de la personal

`docs/bitacora/<nombre>.md`, nombre en kebab-case sin acentos. La skill `inicio` lo
crea la primera vez. Entradas con hora, las más recientes **arriba**:

```markdown
# Bitácora de <nombre>

## 2026-09-11

- **16:40 · cierre** — Dejé `consultar_movimientos` con mock funcionando; falta el
  test del caso vacío. Toqué `apps/web/registry.ts` (dominio web) para registrar el tipo.
- **14:10 · inicio** — Tomo el rol mcp. Voy por las tools de cuentas y movimientos.
```

Tipos de entrada: `inicio`, `cierre`, `hecho`, `a-medias`, `toque-ajeno`, `nota`.

## Reglas

- Se escribe al **iniciar** y al **cerrar** cada sesión (las skills `inicio` y `cerrar`
  lo piden). Entre medias, cuando pase algo que otro necesitaría saber.
- Frases cortas. Rutas concretas. Nada de "avancé en el front".
- Las decisiones van a `equipo.md`, no a la personal, aunque las hayas tomado tú.
