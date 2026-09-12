---
name: "shell-web-mobile-first"
created: "2026-09-12T07:03:42.615Z"
status: pending
---

# Plan: shell web mobile-first

## Decisiones tomadas

| Decisión       | Valor                                                                  |
| -------------- | ---------------------------------------------------------------------- |
| Estética       | Minimalismo + Fintech UI + **Material Design**                         |
| Navegación     | **Híbrida**: rutas reales; las financieras siembran contexto al agente |
| Móvil          | **Barra de pestañas abajo** con FAB central para Maya                  |
| Alcance        | **Shell desde cero**                                                   |
| Lienzo central | **Placeholder**, sin programar contenido                               |

## Una advertencia y una desviación deliberada

Pediste rehacer de cero sabiendo que se pierde el hook de streaming. **Voy a rehacer todo el shell visual desde cero, pero conservando `usar-agente.ts`**, moviéndolo a `src/lib/agente/usar-agente.ts`.

El motivo: ese archivo no es diseño, es el cliente de streaming JSONL que ya funciona (lee el `POST /api/agente` línea por línea, aplica los mensajes A2UI al estado y devuelve las acciones al agente por la misma puerta). Borrarlo no mejora el diseño y te deja sin la plomería que las fases 2 y 3 del ADR 0004 necesitan en las próximas horas. Todo lo visual —sidebar, lienzo, barra de conversación, `page.tsx`— sí se tira y se escribe de nuevo.

Si de verdad quieres borrarlo también, es una línea: dímelo y lo elimino.

## Las 8 secciones

Un banco real tiene decenas de pantallas; en 36 horas la pregunta correcta no es "qué tiene un banco" sino **"qué secciones hacen que el jurado entienda el producto"**. Estas ocho, en dos grupos:

### Grupo A — El agente construye la pantalla (4 rutas)

Son las que sostienen el pitch. Tocar la sección **no dibuja nada programado**: le dice a Maya de qué quieres hablar y ella genera las tarjetas en el lienzo.

| Ruta     | Sección       | Icono        | Qué siembra al agente                             |
| -------- | ------------- | ------------ | ------------------------------------------------- |
| `/`      | **Inicio**    | `Home`       | Resumen: "¿cómo estoy?"                           |
| `/deuda` | **Mi deuda**  | `CreditCard` | "Quiero pagar menos intereses" (fase 1, ADR 0004) |
| `/gasto` | **Mi gasto**  | `PieChart`   | "¿En qué se me fue el dinero?" (fase 2)           |
| `/metas` | **Mis metas** | `Target`     | "Quiero empezar a ahorrar" (fase 3)               |

Cada una monta el **mismo** `Lienzo`; lo único que cambia es la intención inicial. Eso es exactamente el argumento del reto: una sola pantalla, contenido generado.

### Grupo B — Pantallas programadas (4 rutas)

Aquí un agente no aporta nada: son datos que se consultan y ajustes que se tocan.

| Ruta           | Sección         | Icono        | Contenido                                               |
| -------------- | --------------- | ------------ | ------------------------------------------------------- |
| `/movimientos` | **Movimientos** | `Receipt`    | Tabla completa, con buscador y filtro por categoría     |
| `/perfil`      | **Perfil**      | `User`       | Datos, cuentas, tarjetas, buró, capacidad de pago       |
| `/ajustes`     | **Ajustes**     | `Settings`   | Usuario demo, tema, panel de transparencia LLM·MCP·A2UI |
| `/ayuda`       | **Ayuda**       | `HelpCircle` | Qué es esto, cómo funciona, aviso de prototipo          |

En este turno las cuatro quedan **maquetadas con su estructura y estado vacío**, no llenas de datos: dijiste que lo que importa ahora es el diseño base.

## Navegación en los dos tamaños

### Móvil (< 768 px) — barra de pestañas con FAB central

```
┌─────────────────────────────────┐
│  ☰   Mi deuda            👤     │  ← barra superior compacta, 56 px
├─────────────────────────────────┤
│                                 │
│   ┌───────────────────────────┐ │
│   │  tarjeta que genera       │ │
│   │  el agente                │ │  ← lienzo, 1 columna
│   └───────────────────────────┘ │
│   ┌───────────────────────────┐ │
│   │  tarjeta                  │ │
│   └───────────────────────────┘ │
│                                 │
├─────────────────────────────────┤
│  🏠     📊    ╭───╮    💳    ⋯  │  ← barra de pestañas, 64 px
│ Inicio Gasto │ ✦ │  Deuda  Más │
└──────────────╰───╯──────────────┘
                 ↑ FAB de Maya, elevado sobre la barra
```

- **Cinco ranuras**: Inicio · Gasto · **FAB Maya** · Deuda · Más.
- El **FAB central** es un patrón de Material Design (FAB anclado a la bottom app bar) y resuelve la tensión real que tenías: quieres pestañas de app bancaria, pero la barra de conversación es el corazón del producto. Con el FAB, la conversación no compite por espacio: abre un `sheet` de altura casi completa con el hilo y el input.
- **"Más"** abre un `sheet` con Metas, Movimientos, Perfil, Ajustes y Ayuda.
- Objetivos de toque de **48 × 48 px** mínimo (Material), con `safe-area-inset-bottom` para los iPhone con notch.

### Escritorio (≥ 768 px) — sidebar flotante

```
┌──────────────────────────────────────────────────────────┐  ← lienzo #F2F2F3
│ ┌──────────┐  ┌────────────────────────────────────────┐ │
│ │ ✦ Maya   │  │ Mi deuda                          👤   │ │  ← barra superior
│ │ ┌──────┐ │  │ Tu tarjeta y tus créditos              │ │
│ │ │Beto ▾│ │  └────────────────────────────────────────┘ │
│ │ └──────┘ │  ┌──────────────┐ ┌──────────┐ ┌─────────┐ │
│ │          │  │              │ │          │ │         │ │
│ │ TU VIAJE │  │   lienzo: el agente coloca aquí        │ │
│ │ ● Inicio │  │   lo que construye                     │ │
│ │   Deuda  │  └──────────────┘ └──────────┘ └─────────┘ │
│ │   Gasto  │  ┌────────────────────────────────────────┐ │
│ │   Metas  │  │  Pregúntale a Maya…            Enviar  │ │  ← conversación
│ │          │  └────────────────────────────────────────┘ │
│ │ CONSULTA │                                             │
│ │   Movim. │                                             │
│ │   Perfil │                                             │
│ ├──────────┤                                             │
│ │ Ajustes  │                                             │
│ │ Reto ·MTY│                                             │
│ └──────────┘                                             │
└──────────────────────────────────────────────────────────┘
```

Ítem activo: **píldora rellena** `bg-tinte` con texto e icono en `text-primary`, `rounded-xl` — como manda la skill de diseño. No barra lateral, no subrayado.

## Cómo se aplica Material Design sin romper el sistema de tokens

Material aporta patrones; los colores y la forma siguen siendo los de la skill de diseño.

| De Material            | Cómo se aplica aquí                                                  | Qué NO se copia                                            |
| ---------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------- |
| Bottom app bar + FAB   | La barra de pestañas y el FAB de Maya                                | El FAB no es rojo puro flotando: usa el degradado de marca |
| **State layers**       | Overlay de 8 % / 12 % en hover y pressed, con `bg-current/8`         | Ripple animado: es ruido en un proyector                   |
| Rejilla de 8 dp        | Todo el espaciado en múltiplos de 4 px (`gap-4`, `p-5`)              | —                                                          |
| Objetivos de 48 dp     | Toda zona tocable en móvil mide ≥ 48 px                              | —                                                          |
| Jerarquía de elevación | Solo dos niveles: `shadow-sm` (tarjetas) y `shadow-md` (FAB, sheets) | Las 5 elevaciones de Material y las sombras de color       |
| Motion de 150–200 ms   | La transición de entrada de superficies que ya existe                | Transiciones compartidas de contenedor                     |

Minimalismo y fintech se traducen en algo concreto: **un solo acento rojo por pantalla**, el dato importante en el tamaño más grande de la tarjeta, y `tabular-nums` en todo monto.

## Archivos

### Se borran y se escriben de nuevo

```
apps/web/src/app/page.tsx                          -> reescrito
apps/web/src/components/shell/sidebar-maya.tsx     -> borrado
apps/web/src/components/shell/lienzo.tsx           -> borrado
apps/web/src/components/shell/barra-conversacion.tsx -> borrado
apps/web/src/components/shell/usar-agente.ts       -> movido a lib/agente/
```

### Estructura nueva

```
apps/web/src/
  app/
    layout.tsx                  raíz: fuentes + <ProveedorShell>
    (app)/layout.tsx            el shell: sidebar + topbar + tabs + conversación
    (app)/page.tsx              Inicio          -> Lienzo (placeholder)
    (app)/deuda/page.tsx        Mi deuda        -> Lienzo
    (app)/gasto/page.tsx        Mi gasto        -> Lienzo
    (app)/metas/page.tsx        Mis metas       -> Lienzo
    (app)/movimientos/page.tsx  maqueta + estado vacío
    (app)/perfil/page.tsx       maqueta + estado vacío
    (app)/ajustes/page.tsx      maqueta + estado vacío
    (app)/ayuda/page.tsx        contenido real (es texto)
  components/
    shell/
      proveedor-shell.tsx       contexto: usuario demo, estado del agente, chat abierto
      sidebar-app.tsx           sidebar flotante, escritorio
      barra-superior.tsx        título + subtítulo + selector de usuario
      barra-pestanas.tsx        bottom bar móvil + FAB
      hoja-mas.tsx              sheet de "Más"
      hoja-conversacion.tsx     sheet del chat en móvil
      barra-conversacion.tsx    barra flotante, escritorio
      lienzo.tsx                rejilla bento + PLACEHOLDER
      navegacion.ts             LAS 8 SECCIONES EN UN SOLO ARREGLO
  lib/
    marca.ts                    nombre, tagline, aviso legal (un solo lugar)
    agente/usar-agente.ts       movido, sin cambios
```

`navegacion.ts` es la pieza clave: sidebar, bottom bar y hoja de "Más" leen **el mismo arreglo**. Agregar una sección es una entrada, no editar tres componentes.

```ts
export type Seccion = {
  href: string;
  etiqueta: string;
  icono: LucideIcon;
  grupo: "viaje" | "consulta" | "sistema";
  // Si existe, la sección le habla al agente en vez de dibujar una pantalla.
  intencion?: string;
  enPestanas?: boolean;   // aparece en la barra inferior de móvil
};
```

`marca.ts` cumple la regla de la skill: si en el stand piden no usar el nombre Maya, se cambia en un archivo.

## Componentes de shadcn que faltan

Se agregan con el CLI, **nunca a mano**, invocando antes la skill `shadcn` (`.agents/skills/shadcn`):

```bash
pnpm dlx shadcn@latest add tabs dropdown-menu popover textarea switch label
```

Ya están instalados los 24 que hacen falta para el resto (`sidebar`, `sheet`, `card`, `button`, `select`, `avatar`, `badge`, `empty`, `scroll-area`, `separator`…).

## Lo que este plan NO hace

- **No programa el contenido del lienzo.** Queda un placeholder que dice qué va ahí y muestra la rejilla. Los componentes del catálogo A2UI (`PlanDePago`, `GastoPorCategoria`…) siguen siendo trabajo de otra sesión: 7 de 8 son carpetas con README y sin código.
- **No llena las pantallas del grupo B con datos.** Estructura y estado vacío.
- **No toca el agente, el prompt, el MCP ni el catálogo.**
- **No agrega el tercer perfil.** El cliente sigue con Beto y Ana, como fija el ADR 0004, aunque los datos tengan también a Carmen. Esa decisión sigue abierta en `docs/issues/2026-09-12-alcance-datos-vs-adr-0004.md`.

## Riesgos

- **Ocho secciones son muchas para la hora 14.** Cuatro de ellas quedan como maqueta vacía, y una maqueta vacía frente al jurado es peor que no tenerla. Si la demo se acerca sin que se llenen, hay que esconderlas: por eso van todas en `navegacion.ts`, para poder comentar una línea.
- **La barra de pestañas puede volver esto un dashboard.** El pitch del reto es "la UI la construye el agente". El FAB central es la mitigación: Maya es el elemento más prominente de la barra, no una pestaña más.
- **`page.tsx` reescrito rompe la pantalla mientras se trabaja.** La regla 4 del `CLAUDE.md` dice que `main` siempre arranca; conviene no dejar el turno a medias.
