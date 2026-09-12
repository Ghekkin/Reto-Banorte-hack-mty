---
verificado: 2026-09-12 06:55
estado: plan
---

# Sistema de diseño

## Para cualquiera

La aplicación se ve como Banorte: fondo blanco y gris muy claro, texto casi negro, y el
rojo de Banorte reservado para una sola cosa en cada pantalla —la acción que queremos
que la persona haga—. Todos los botones, tarjetas, tablas y gráficas salen de la misma
librería de componentes, así que todo encaja aunque lo haya hecho gente distinta a
horas distintas.

## Técnico

**Base**: [shadcn/ui](https://ui.shadcn.com) sobre Tailwind v4, en `apps/web`. Es
obligatorio (regla 9 del `CLAUDE.md`): ningún componente a mano, ninguna otra librería.
Las skills oficiales de shadcn están instaladas en `.agents/skills/` (enlazadas desde
`.claude/skills/`, versión fijada en `skills-lock.json`) y se invocan como `shadcn`.

**Color**: la paleta de Banorte, tomada del proyecto de referencia
`Ghekkin/Open-innovation-hack-mty`. Vive **solo** en `apps/web/app/globals.css` como
variables CSS; en el código se usan las clases de Tailwind sobre los tokens
(`bg-primary`, `text-muted-foreground`). Un hex en un `.tsx` es un bug.

| Rol | Hex | Token shadcn |
|---|---|---|
| Rojo principal | `#EC0029` | `--primary`, `--ring`, `--chart-1` |
| Rojo claro | `#FF3355` | `--marca-claro`, `--chart-2`, primario en oscuro |
| Rojo oscuro | `#C00020` | `--destructive`, `--marca-oscuro`, `--chart-3` |
| Gris fondo | `#F5F5F5` | `--muted`, `--secondary` |
| Gris plata | `#C7C9C9` | `--border`, `--input` |
| Gris texto | `#6A6867` | `--muted-foreground` |
| Tinta | `#171717` | `--foreground` |

El bloque completo de tokens (OKLCH, claro y oscuro) está en la skill
**`diseno-banorte`**, que también lleva el mapa de qué componente de shadcn usar para
cada necesidad y el checklist previo a commitear UI.

**Forma**: lienzo gris (`#F2F2F3`) con todo flotando encima: sidebar blanca
`rounded-2xl` separada del borde, tarjetas `rounded-2xl border shadow-sm`, rejilla
bento de 1–3 columnas, y una barra de conversación fija abajo. Las superficies que
genera el agente se pintan **dentro** de esa rejilla, no en un panel aparte: cada
componente del catálogo declara si ocupa una o dos columnas y entra con una transición
de 150 ms para que se vea que acaba de construirse. Una sola tarjeta héroe (degradado
rojo) por pantalla. Medidas exactas en la skill `diseno-banorte`.

**Catálogo A2UI**: los componentes de `packages/catalogo` son composiciones de
primitivas de shadcn con props tipadas y acciones A2UI. shadcn aporta accesibilidad y
consistencia; el catálogo financiero —lo que el agente puede invocar— es nuestro, como
pide la regla 1 del reto.

**Marca**: se usa la paleta, no el logotipo ni la tipografía corporativa de Banorte. El
producto tiene nombre propio y el dominio también.
