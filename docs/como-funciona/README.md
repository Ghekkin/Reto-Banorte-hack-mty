# Cómo funciona cada cosa

Un archivo por feature o flujo: `docs/como-funciona/<slug>.md`. Se crea **en el mismo
commit** que la feature. Si la feature cambia, el doc cambia en ese commit.

## La regla de los dos niveles

Cada documento tiene dos secciones obligatorias, en este orden:

1. **`## Para cualquiera`** — sin código, sin jerga, sin nombres de archivo. Lo que
   diría uno del equipo a un juez en 30 segundos. Si un familiar sin contexto técnico
   no lo entiende, está mal escrito.
2. **`## Técnico`** — rutas de archivo, funciones, schemas, qué tool se llama, qué
   componente renderiza, cómo se prueba. Lo que necesita alguien para tocar el código
   sin leerlo entero.

No se mezclan. El primero no se sacrifica por el segundo ni al revés.

## Plantilla

```markdown
---
verificado: 2026-09-11 14:30     # cuándo comprobaste que esto es cierto
estado: construido                # plan | en-progreso | construido
---

# <Nombre de la feature>

## Para cualquiera

Qué problema resuelve, qué ve el usuario, qué pasa por dentro en palabras simples.
Tres párrafos máximo.

## Técnico

### Dónde vive
- Tool: `apps/mcp/src/tools/<archivo>.ts` → `<nombreTool>`
- Schema: `packages/schemas/src/<archivo>.ts` → `<NombreSchema>`
- Componente: `apps/web/src/components/generated/<archivo>.tsx`
- Datos mock: tablas del esquema `banorte` en PostgreSQL (ADR 0010)

### Flujo paso a paso
1. ...
2. ...

### Entradas y salidas
Qué recibe la tool, qué devuelve, con el schema o un ejemplo real.

### Casos límite conocidos
Qué pasa si no hay datos, si el usuario pide algo raro, si falla el mock.

### Cómo probarlo
Comando o pasos manuales concretos.

### Algoritmos involucrados
Enlaces a `docs/algoritmos/<slug>.md` si aplica.
```
