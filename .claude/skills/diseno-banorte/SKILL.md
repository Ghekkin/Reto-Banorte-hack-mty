---
name: diseno-banorte
description: El sistema de diseño del proyecto - Minimalism + Fintech UI + Material Design como lenguaje obligatorio, shadcn/ui obligatorio, paleta de Banorte y la forma flotante (lienzo gris, sidebar y tarjetas redondeadas con sombra suave, rejilla bento, barra de conversación). Tokens listos para globals.css, anatomía de tarjeta, qué componente de shadcn usar para cada caso y cómo el agente coloca sus superficies. Invocar antes de escribir cualquier CSS, componente o pantalla.
---

# Diseño: Minimalism + Fintech UI + Material Design sobre shadcn/ui

Tres reglas que no se discuten:

1. **El lenguaje visual es Minimalism + Fintech UI + Material Design.** No es una
   preferencia estética: son las reglas verificables de la sección siguiente. Si un
   componente no las cumple, no entra.
2. **Toda la UI se construye con shadcn/ui.** Nada de componentes a mano, nada de otra
   librería. Si necesitas un botón, un diálogo, una tabla, un slider: `npx shadcn@latest
   add <componente>`. La skill `shadcn` (instalada en `.agents/skills/shadcn`) tiene el
   CLI, el registro y la guía de theming; **invócala** antes de agregar componentes.
3. **El color viene de los tokens de Banorte**, nunca de un hex suelto en un `.tsx`.
   Si un color no está abajo, no se usa.

El reto lo organiza Banorte: la interfaz debe verse suya al primer vistazo. El rojo es
de ellos; el producto es nuestro (ver "Marca" abajo).

## Minimalism + Fintech UI + Material Design

El lenguaje visual del proyecto, en reglas que se pueden verificar mirando el código. Un
adjetivo no sirve de regla: "que se vea minimalista" no se puede revisar en un pull
request, "un solo botón primario por pantalla" sí.

### Minimalismo

| Regla | Cómo se verifica |
|---|---|
| **Una idea por tarjeta.** Si necesita dos frases de explicación, está mal partida | Lee la tarjeta en voz alta: si dice "y además", pártela |
| **Un solo botón primario por pantalla.** El resto son `outline` o `ghost` | `grep 'variant="default"'` en la pantalla: una sola vez |
| **Un solo acento.** El rojo marca la acción principal; todo lo demás es neutro | Un tablero rojo entero esconde dónde hay que tocar |
| **Una sola tarjeta héroe por pantalla.** La segunda va en blanco | El degradado de marca aparece una vez |
| **Sin adornos que no informen.** Nada de iconos decorativos, bordes dobles, fondos con textura | Si quitarlo no pierde información, quítalo |

### Fintech UI

Lo que distingue una interfaz financiera de un tablero cualquiera: **el número manda**.

| Regla | Cómo se verifica |
|---|---|
| El monto es el elemento **más grande de su tarjeta**: `text-3xl` mínimo, `font-semibold` | Ningún texto de la tarjeta compite en tamaño con la cifra |
| **`tabular-nums` en todo monto, porcentaje y fecha en columna.** Sin esto los dígitos bailan al actualizarse | La clase `.monto` de `globals.css` ya lo trae |
| Etiqueta **arriba** del dato, `text-xs text-muted-foreground` | Se lee "Saldo disponible" y después la cifra, no al revés |
| Formato `es-MX` con `Intl.NumberFormat`, moneda `MXN`. Los montos viajan en **centavos** y se formatean solo al pintar | Cero `.toFixed(2)` suelto en un `.tsx` |
| **El signo y el color dicen la dirección**: cargo en `text-foreground`, abono en `text-exito`. El rojo NO es para números negativos: es el color de la marca | Un gasto normal no se pinta de rojo |
| Dato sensible **enmascarado**: `•••• 4821`, nunca el número completo | |
| Estado en `badge`, no en texto libre: "Plan activo", "Atrasado" | |

### Material Design

Se toman los **patrones de interacción** de Material 3. No se toma su paleta, su
tipografía ni su escala de elevación: esos vienen de Banorte y de shadcn.

| Regla | Valor exacto | Qué NO se copia |
|---|---|---|
| **State layers** | Hover `bg-current/8`, pressed `bg-current/12` | El ripple animado: en un proyector es ruido |
| **Objetivos táctiles** | Todo lo tocable **≥ 48 px** en móvil (`min-h-12`), ≥ 36 px en escritorio | |
| **Rejilla de 8** | Espaciado en múltiplos de 4 px: `gap-3`, `gap-4`, `p-4`, `p-5` | Valores arbitrarios tipo `p-[13px]` |
| **Elevación: solo dos niveles** | `shadow-sm` (tarjetas, sidebar) y `shadow-md` (FAB, hojas, popovers) | Las 5 elevaciones de Material y **toda sombra de color** |
| **Motion** | 150–200 ms, `ease-out`. La entrada de superficies usa `.animar-entrada` | Transiciones de contenedor compartido, animaciones de más de 250 ms |
| **FAB** | Un solo FAB por app: es Maya. Círculo de 56 px con el degradado de marca | FABs para acciones secundarias |
| **Bottom app bar** | 4 pestañas más el FAB al centro, `pb-[env(safe-area-inset-bottom)]` | Más de 5 zonas: no caben en 360 px |
| **Jerarquía de superficie** | Lienzo gris → tarjeta blanca → control. Tres capas, no más | Tarjetas dentro de tarjetas dentro de tarjetas |

### Densidad por tamaño

Se construye **móvil primero**. La versión de escritorio es la móvil con más aire y más
columnas, nunca un diseño distinto.

| | Móvil (< 768 px) | Escritorio (≥ 768 px) |
|---|---|---|
| Padding de tarjeta | `p-4` | `p-5` |
| Separación | `gap-3` | `gap-4` |
| Padding del lienzo | `p-3` | `p-4` |
| Columnas de la rejilla | 1 | 2 a 3 |
| Navegación | Barra de pestañas abajo + FAB | Sidebar flotante |
| Tamaño mínimo de texto | 14 px | 14 px |

**Dentro de un componente del catálogo, "móvil" y "escritorio" se miden contra la TARJETA,
no contra la pantalla.** Un widget no sabe dónde lo van a poner (en el chat comparte fila, en
un tablero puede ocupar un tercio), así que en `packages/catalogo` no se usan `sm:`/`md:`:
la tarjeta es un contenedor (`Tarjeta`, `@container/tarjeta`) y todo se acomoda con
`@md/tarjeta:`, `@3xl/tarjeta:`… El padding pasa de `p-4` a `p-5` cuando la tarjeta mide
28rem. Una prueba (`render.spec.tsx`) truena si alguien mete un breakpoint de pantalla ahí.

**La única excepción al mínimo de 14 px son las etiquetas de la barra de pestañas**, que van
en 11 px con `tracking-tight` y `truncate`. Es lo que hacen iOS y Android (10–11 pt), y a
14 px "Movimientos" no cabe en los 66 px que le tocan a una pestaña en una pantalla de
360 px. Fuera de la barra de pestañas, el mínimo no se negocia.

### Las cinco preguntas antes de commitear una pantalla

1. ¿Cuál es **el** número de esta pantalla, y es el más grande?
2. ¿Cuál es **la** acción, y es el único botón rojo?
3. ¿Se ve completa a **360 px** sin scroll horizontal?
4. ¿Qué puedo **quitar** sin perder información?
5. ¿Se lee desde el fondo de un salón, proyectada?

## La paleta

Tomada del proyecto de referencia `Ghekkin/Open-innovation-hack-mty`, con su semántica.

| Rol | Hex | OKLCH | Uso |
|---|---|---|---|
| Rojo principal | `#EC0029` | `oklch(0.5943 0.2407 24.68)` | Acciones primarias, acentos, el color de la marca |
| Rojo marca | `#EB0029` | `oklch(0.5924 0.2399 24.64)` | Equivalente al anterior; el oficial de Banorte |
| Rojo claro | `#FF3355` | `oklch(0.6533 0.2345 18.56)` | Hover, estados activos, degradados |
| Rojo oscuro | `#C00020` | `oklch(0.5091 0.2061 24.53)` | Pressed, fin del degradado, texto sobre claro |
| Gris fondo | `#F5F5F5` | `oklch(0.9702 0 89.88)` | Fondo de la app (`muted`), superficies secundarias |
| Gris plata | `#C7C9C9` | `oklch(0.8343 0.0022 197.11)` | Bordes, separadores, deshabilitado |
| Gris texto | `#6A6867` | `oklch(0.5188 0.0030 48.68)` | Texto secundario (`muted-foreground`) |
| Tinta | `#171717` | `oklch(0.2046 0 89.88)` | Texto principal |
| Blanco | `#FFFFFF` | `oklch(1 0 89.88)` | Tarjetas, fondo base |

Semánticos (no son de marca; no compiten con el rojo):

| Rol | Hex | OKLCH |
|---|---|---|
| Éxito | `#0C6E47` | `oklch(0.4764 0.1047 159.51)` |
| Advertencia | `#8F5400` | `oklch(0.5028 0.1128 65.01)` |
| Destructivo | `#C00020` | usa el rojo oscuro |

**Degradado de marca** (solo en el encabezado o una tarjeta de héroe, nunca en varias a
la vez): `linear-gradient(135deg, #EC0029 0%, #C00020 100%)`.

## Tokens para `globals.css`

**Ya están aplicados** en `apps/web/src/app/globals.css`. Los nombres de shadcn no se
renombran; los propios del proyecto (`lienzo`, `tinte`, `tinte-fuerte`, `oscuro`,
`borde-sutil`, `exito`, `advertencia`, `marca-claro`, `marca-oscuro`) se declaran ahí
**y se mapean en el bloque `@theme inline`** (`--color-lienzo: var(--lienzo)`), que es
lo que permite escribir `bg-lienzo`, `text-exito`, `border-borde-sutil`.

En Tailwind v4 **`bg-[--lienzo]` no funciona**: o se mapea en `@theme inline` (lo que
hicimos) o se escribe `bg-[var(--lienzo)]`. Si agregas un token, agrégalo en los dos
lugares del archivo, y aquí.

**Y la trampa que costó una mañana:** Tailwind v4 detecta las fuentes desde la raíz de
`apps/web`, así que `packages/*` queda fuera. Una clase usada **únicamente** en
`packages/catalogo` no genera CSS: no avisa, no rompe el build, no falla ninguna prueba
—simplemente no se ve—. Por eso `globals.css` declara

```css
@source "../../../../packages/catalogo/src";
@source "../../../../packages/a2ui/src";
```

Si agregas un paquete con clases de Tailwind, agrégalo ahí. Lo pasado el 2026-09-12: en
`GastoPorCategoria` **todas** las barras salían rojas porque `bg-chart-4` no existía, y el
"uso del límite" del héroe era un indicador rojo sobre una tarjeta roja. Las clases que sí
funcionaban era por casualidad: `apps/web` las usaba también. Hay dos pruebas que lo
cuidan en `apps/web/src/lib/__tests__/estilos.spec.ts`.

El bloque, como referencia:

```css
:root {
  --radius: 0.625rem;

  --background: oklch(1 0 89.88);
  --foreground: oklch(0.2046 0 89.88);

  --card: oklch(1 0 89.88);
  --card-foreground: oklch(0.2046 0 89.88);
  --popover: oklch(1 0 89.88);
  --popover-foreground: oklch(0.2046 0 89.88);

  --primary: oklch(0.5943 0.2407 24.68);          /* #EC0029 */
  --primary-foreground: oklch(1 0 89.88);

  --secondary: oklch(0.9702 0 89.88);             /* #F5F5F5 */
  --secondary-foreground: oklch(0.2046 0 89.88);

  --muted: oklch(0.9702 0 89.88);
  --muted-foreground: oklch(0.5188 0.0030 48.68); /* #6A6867 */

  --accent: oklch(0.9702 0 89.88);
  --accent-foreground: oklch(0.5943 0.2407 24.68);

  --destructive: oklch(0.5091 0.2061 24.53);      /* #C00020 */
  --destructive-foreground: oklch(1 0 89.88);

  --border: oklch(0.8343 0.0022 197.11);          /* #C7C9C9 */
  --input: oklch(0.8343 0.0022 197.11);
  --ring: oklch(0.5943 0.2407 24.68);

  /* Propios del dominio financiero */
  --exito: oklch(0.4764 0.1047 159.51);
  --advertencia: oklch(0.5028 0.1128 65.01);
  --marca-claro: oklch(0.6533 0.2345 18.56);      /* #FF3355 */
  --marca-oscuro: oklch(0.5091 0.2061 24.53);     /* #C00020 */

  /* Forma: lienzo flotante (ver "La forma") */
  --lienzo: oklch(0.9614 0.0013 286.38);          /* #F2F2F3 fondo de la app */
  --tinte: oklch(0.9506 0.0256 5.65);             /* #FFE8EC chips y fondos suaves */
  --tinte-fuerte: oklch(0.9026 0.0529 5.02);      /* #FFD1DA hover de chips */
  --oscuro: oklch(0.2114 0.0088 351.77);          /* #1C1719 tarjeta oscura, barras */
  --borde-sutil: oklch(0.9265 0.0022 17.20);      /* #E8E6E6 bordes de tarjeta */

  /* Gráficas: el rojo primero, después neutros. Nunca arcoíris. */
  --chart-1: oklch(0.2114 0.0088 351.77);         /* oscuro: ingresos / lo bueno */
  --chart-2: oklch(0.5943 0.2407 24.68);          /* rojo: gasto / lo que duele */
  --chart-3: oklch(0.6533 0.2345 18.56);          /* rojo claro: tercera serie */
  --chart-4: oklch(0.8343 0.0022 197.11);         /* plata: resto */
  --chart-5: oklch(0.9506 0.0256 5.65);           /* tinte: fondo de barra */
}

.dark {
  --background: oklch(0.1800 0.0050 25);
  --foreground: oklch(0.9700 0 89.88);
  --card: oklch(0.2200 0.0060 25);
  --card-foreground: oklch(0.9700 0 89.88);
  --popover: oklch(0.2200 0.0060 25);
  --popover-foreground: oklch(0.9700 0 89.88);
  --primary: oklch(0.6533 0.2345 18.56);          /* el claro rinde mejor en oscuro */
  --primary-foreground: oklch(0.1800 0.0050 25);
  --secondary: oklch(0.2600 0.0060 25);
  --secondary-foreground: oklch(0.9700 0 89.88);
  --muted: oklch(0.2600 0.0060 25);
  --muted-foreground: oklch(0.7200 0.0030 48.68);
  --accent: oklch(0.2600 0.0060 25);
  --accent-foreground: oklch(0.6533 0.2345 18.56);
  --destructive: oklch(0.6533 0.2345 18.56);
  --destructive-foreground: oklch(0.1800 0.0050 25);
  --border: oklch(0.3200 0.0060 25);
  --input: oklch(0.3200 0.0060 25);
  --ring: oklch(0.6533 0.2345 18.56);
}
```

El proyecto se presenta en **modo claro** (es lo que el jurado verá en el proyector).
El oscuro existe para que la página no se rompa si alguien lo tiene puesto.

## La forma: lienzo con piezas flotantes

La referencia visual acordada es un panel financiero moderno: **nada pegado al borde**.
Todo flota sobre un lienzo gris claro.

```
┌──────────────────────────────────────────────────────────────┐  ← lienzo #F2F2F3
│  ┌──────────┐   ┌────────────────────────────────────────┐   │
│  │ sidebar  │   │  barra superior (título + acciones)     │   │
│  │ flotante │   └────────────────────────────────────────┘   │
│  │          │   ┌──────────────┐ ┌──────────┐ ┌───────────┐  │
│  │  blanca  │   │  héroe rojo  │ │  tarjeta │ │  tarjeta  │  │  ← superficies
│  │ redondeada│  └──────────────┘ └──────────┘ └───────────┘  │    generadas
│  │          │   ┌───────────────────────┐ ┌───────────────┐  │    por el agente
│  │          │   │       tarjeta         │ │   tarjeta     │  │
│  └──────────┘   └───────────────────────┘ └───────────────┘  │
│                 ┌────────────────────────────────────────┐   │
│                 │  barra de conversación (flotante)      │   │  ← siempre visible
└──────────────────────────────────────────────────────────────┘
```

### Medidas

| Elemento | Valor |
|---|---|
| Lienzo | `bg-lienzo`, `p-3` (móvil) a `p-4` (escritorio) |
| Sidebar | `w-64`, blanca, `rounded-2xl`, separada del borde por el padding del lienzo, alto completo menos el padding |
| Tarjetas | `rounded-2xl border border-borde-sutil bg-card shadow-sm` |
| Separación entre tarjetas | `gap-4` |
| Padding interno de tarjeta | `p-5` (`p-4` en móvil) |
| Radio | `--radius: 0.625rem` para controles; **`rounded-2xl` (1rem) para tarjetas y sidebar** |
| Sombra | `shadow-sm` y nada más. Sin sombras de color, sin `shadow-lg` |

### Sidebar flotante

- Tarjeta blanca `rounded-2xl`, con: logo + nombre del producto arriba; **selector de
  usuario demo** (Beto / Ana) como tarjeta con avatar y `chevron`; etiqueta
  `MAIN MENU` en mayúsculas diminutas grises; ítems con icono a la izquierda.
- **Ítem activo**: fondo `bg-tinte` con texto e icono en `text-primary`, `rounded-xl`.
  No una barra lateral, no subrayado: una píldora rellena.
- Ítems inactivos: `text-muted-foreground`, hover `bg-muted`.
- Abajo, separada, una tarjeta pequeña de contexto (en nuestro caso: "Reto Banorte ·
  Hack MTY 2026" o el modo transparencia).
- Componente: `sidebar` de shadcn en variante `inset` o `floating` — **no la escribas
  a mano**, invoca la skill `shadcn`.
- En móvil (< 768 px): se colapsa a `sheet`.

### Barra superior

Título de la pantalla + una línea de subtítulo en `text-muted-foreground`. A la
derecha: buscador opcional con chip `⌘K`, y el `select` de usuario si no cabe en el
sidebar. Flota igual: `rounded-2xl`, o simplemente sin fondo sobre el lienzo.

### Anatomía de una tarjeta

De arriba abajo: **etiqueta** pequeña en gris (`text-xs text-muted-foreground`), el
**dato grande** (`text-3xl font-semibold tabular-nums`), y debajo el detalle, la
gráfica o los controles. Acciones al pie, alineadas a la izquierda. Si hay estado,
`badge` arriba a la derecha.

En el catálogo la tarjeta es **`Tarjeta`** (envuelve `Card` en su contenedor) y el pie es
**`PieTarjeta`** (`packages/catalogo/src/tarjeta.tsx`): el botón principal
(`CLASES_BOTON_PIE`, a lo ancho en tarjeta angosta) y a su lado **"¿Por qué veo esto?"
plegado**, que abre la razón al tocarlo. Sin banda gris ni borde: la razón completa al pie de
cada tarjeta eran doce líneas de letra chica en una pantalla de tres tarjetas. La razón sigue
en el HTML (`hidden`), así que un lector de pantalla la anuncia y ninguna prueba deja quitarla.

Cuando la tarjeta es ancha, **usa el ancho**: gráfica a un lado y números al otro
(`@3xl/tarjeta:grid-cols-…`), opciones en dos columnas, categorías en dos columnas. Una tarjeta
estirada con una sola columna de contenido es espacio vacío.

### La tarjeta héroe

**Una por pantalla, nunca dos.** Fondo con el degradado de marca
(`bg-[linear-gradient(135deg,var(--primary)_0%,var(--marca-oscuro)_100%)]`), texto blanco, dos
botones píldora: uno claro (`bg-white/90 text-primary`) y uno oscuro (`bg-oscuro text-white`).
Es donde va el número que resume la situación: el saldo de la tarjeta, el total del
gasto, el avance de la meta.

Si el agente genera dos superficies que ambas piden héroe, la segunda va en blanco. La
regla vive en el prompt del agente y en el schema del componente.

### Botones y chips

- Botones principales: **píldora** (`rounded-full`), `h-10`, con icono a la derecha
  (`→`, `↑`) cuando la acción lleva a algo.
- Chips de sugerencia (como las del asistente de la referencia): `rounded-full border
  bg-background text-sm px-3 py-1.5`, hover `bg-tinte`.
- `badge` para estados: `Plan activo` en `bg-tinte text-primary`; `Atrasado` en
  `bg-oscuro text-white`. **El rojo no se usa para error**: es el color de la
  marca. Un error va en tarjeta con borde `border-oscuro`.

### Gráficas

Par de dos tonos como la referencia, pero con nuestro par: **oscuro `#1C1719` + rojo
`#EC0029`** (`--chart-1` / `--chart-2`). En un gasto por categoría, lo que más duele va
en rojo y el resto en plata. Barras `rounded-t-md`, sin cuadrícula pesada, etiquetas en
`text-xs text-muted-foreground`. Donut con el total en el centro. Componente `chart` de
shadcn (Recharts).

### La barra de conversación

Es lo que hace que esto **no sea un dashboard**: siempre visible, flotante abajo del
lienzo (`sticky bottom-4`), `rounded-2xl border bg-card shadow-sm`, con el input, los
chips de sugerencia encima cuando el agente los ofrece, y el botón **Enviar** en
píldora roja. En la referencia es la tarjeta del asistente; aquí es el centro del
producto.

### Cómo encaja con las superficies del agente

El lienzo reparte lo que genera el agente en **filas que se llenan solas**
(`docs/algoritmos/acomodo-del-lienzo.md`):

- El renderer A2UI pinta la superficie `principal` dentro del lienzo, no en un panel
  aparte. Con `<Superficie disponer>`, si la raíz es un `Column`/`Row`, sus tarjetas llegan
  sueltas al lienzo en vez de apiladas.
- Cada tarjeta tiene el **ancho natural** de su componente (el default de su prop `ancho`):
  `amplio` para gráficas y tablas (`GastoPorCategoria`, `ProyeccionPagoCredito`…), `normal`
  para `Confirmacion`, `ResumenTarjeta`, `PlanDePago`, `SimuladorMeta`. El lienzo usa ese, no
  el que mande el agente.
- Compacta parte de 18rem y crece ×1; amplia parte de 26rem y crece ×2; caben lado a lado
  mientras quepan, y si no, bajan a su fila a lo ancho. Una sola tarjeta ocupa todo; con
  cuatro o más, de dos en dos. Todo se mide contra el lienzo (`@container/lienzo`), no la
  pantalla: a 390 px queda una por fila.
- Cada tarjeta mide lo que su contenido (`items-start`); la héroe nunca se estira.
- Al llegar una UI nueva, las tarjetas **entran con una transición corta** (`opacity` +
  `translate-y-1`, 150 ms, escalonada 25 ms) para que se vea que el agente las acaba de
  construir. Nada más de animación.

## Reglas de uso

- **Un solo acento.** El rojo marca la acción principal de cada pantalla: un botón
  primario por superficie. Todo lo demás es neutro. Un tablero rojo entero grita y
  esconde dónde hay que tocar.
- **Nunca un hex en un componente.** Se usa la clase de Tailwind sobre el token
  (`bg-primary`, `text-muted-foreground`, `border-border`). Si hace falta un color
  nuevo, se agrega aquí primero.
- **Tipografía**: la que trae el `create-next-app` (Geist) o Inter. No se agregan
  familias. Números de dinero con `tabular-nums` **siempre**.
- **Dinero**: `Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" })`.
  Los montos viajan en centavos (skill `datos-mock`) y se formatean solo al pintar.
- **Radio**: `--radius: 0.625rem`, el de shadcn. No se mezclan radios.
- **Sombras**: las de shadcn (`shadow-sm` en tarjetas). Nada de sombras de colores.
- **Legible en proyector**: nada menor a 14 px, contraste alto, el dato importante en
  el tamaño más grande de la tarjeta.
- **Ancho**: funciona a 400 px. Las tablas van en su contenedor con scroll propio.

## Qué componente de shadcn usar

| Necesitas | shadcn | Notas |
|---|---|---|
| Tarjeta/superficie | `card` | La base de casi todo componente del catálogo |
| Acción principal | `button` | `variant="default"` = rojo. Uno por superficie |
| Acción secundaria | `button` | `variant="outline"` o `ghost` |
| Elegir plazo/opción | `radio-group` o `toggle-group` | No inventes tarjetas clicables sin semántica |
| Monto/aportación | `slider` + `input` | El slider da la sensación de simulador |
| Tabla de movimientos | `table` | Con `scroll-area` si crece |
| Etiqueta de estado | `badge` | "Plan activo", "Atrasado" |
| Avance de meta/tope | `progress` | |
| Detalle sin salir | `dialog` o `sheet` | En A2UI = superficie secundaria |
| Cargando | `skeleton` | Del tamaño final del contenido |
| Aviso corto | `alert` | Para "¿por qué veo esto?" no: eso es el pie plegable `PieTarjeta` |
| Gráfica | `chart` (Recharts) | Colores `--chart-1..5`, nunca paleta propia |
| Separadores | `separator` | |
| Cambiar de usuario demo | `select` | En el sidebar, como tarjeta con avatar |
| Sidebar flotante | `sidebar` (variante `inset`/`floating`) | Nunca a mano |
| Sidebar en móvil | `sheet` | Se colapsa < 768 px |
| Chips de sugerencia | `button` `variant="outline"` `rounded-full` | Encima de la barra de conversación |

Antes de agregar cualquiera: **invoca la skill `shadcn`** y usa su CLI. No copies código
de componentes a mano.

## Cómo encaja con el catálogo A2UI

Los componentes de `packages/catalogo` (`PlanDePago`, `GastoPorCategoria`, …) **se
construyen encima de shadcn**: son composiciones de `card` + `button` + `radio-group` +
`chart`, con nuestras props tipadas y nuestras acciones A2UI. La regla 1 del reto ("el
sistema de componentes lo diseña y programa el equipo") se cumple igual: shadcn son
primitivas sin opinión, como Tailwind; **el catálogo financiero es nuestro**.

Cuando el jurado pregunte: "usamos shadcn/ui como base de primitivas accesibles y
construimos encima un catálogo de componentes financieros propios, que es lo que el
agente puede invocar".

## Marca

El agente se llama **Maya**, como la asistente virtual real de Banorte (ADR 0009). El
encuadre es *evolución*: Maya ya hace 17 operaciones bancarias; nosotros cambiamos cómo
las entrega. Límites:

- Se usan el **nombre Maya**, la **paleta** y el **logotipo** de Banorte (la prohibición
  del logotipo se levantó el 2026-09-12; ver la enmienda del ADR 0009). **Nunca** la
  tipografía corporativa ni la imagen oficial de Maya.
- **El logotipo no se escribe a mano ni se mete como `<img>`.** Son dos componentes en
  `apps/web/src/components/marca/logo-banorte.tsx`: `LogoBanorte` (completo, se dimensiona
  por altura porque es 8.16:1) e `IconoBanorte` (el isotipo, cuadrado, para todo lo que
  representa a Maya). Rellenan con `currentColor`, así que se colorean con `text-*` y
  funcionan en blanco sobre el degradado de marca.
- Por lo mismo, el **disclaimer no es decorativo**: es lo único que separa el prototipo de
  una suplantación de marca. No se esconde ni se hace más chico. Confirmar con los
  mentores en el stand antes del pitch es obligatorio, no cortesía.
- El **dominio no imita a Banorte**: nada de `maya-banorte.tech`. Neutro o descriptivo.
- Pie de la app y `README.md`: *"Prototipo de hackathon. Concepto sobre Maya, la
  asistente virtual de Banorte. No es un producto oficial ni está afiliado a Grupo
  Financiero Banorte."*
- El nombre vive en **un solo archivo de configuración**, no esparcido en los
  componentes: si en el stand piden no usarlo, se cambia en un `sed`.
- El encabezado puede decir "Reto Banorte · Hack Monterrey 2026" como contexto.

## Checklist antes de commitear UI

Lenguaje visual:

- [ ] **Una idea por tarjeta**; nada que se pueda quitar sin perder información.
- [ ] **Un solo botón primario** (`variant="default"`) en la pantalla.
- [ ] **Una sola tarjeta héroe**; el degradado de marca aparece una vez.
- [ ] El **monto es el elemento más grande** de su tarjeta, con `tabular-nums`.
- [ ] Etiqueta arriba del dato, en `text-xs text-muted-foreground`.
- [ ] Abonos en `text-exito`; el rojo **no** se usa para números negativos ni errores.
- [ ] Datos sensibles enmascarados (`•••• 4821`).

Material:

- [ ] Todo lo tocable mide **≥ 48 px** en móvil.
- [ ] Espaciado en múltiplos de 4 px; densidad `p-4`/`gap-3` en móvil, `p-5`/`gap-4` en escritorio.
- [ ] Solo `shadow-sm` y `shadow-md`. Cero sombras de color.
- [ ] Transiciones de 150–200 ms.
- [ ] Barra inferior con `pb-[env(safe-area-inset-bottom)]`.

Base:

- [ ] Cero hex en `.tsx`; todo por token.
- [ ] El componente vino de `npx shadcn@latest add`, no escrito a mano.
- [ ] Montos con formato `es-MX`, convertidos desde centavos al pintar.
- [ ] **Se construyó móvil primero** y se ve bien a 360 px.
- [ ] Todo flota: nada pegado al borde del lienzo; `rounded-2xl` + `shadow-sm`.
- [ ] Legible proyectado: nada menor a 14 px.
- [ ] Estados `skeleton` / vacío / error resueltos (skill `ui-generativa`).
- [ ] En `packages/catalogo`: `Tarjeta` + `PieTarjeta`, y **cero `sm:`/`md:`**; el acomodo
      interno usa variantes `@…/tarjeta`. Revisado en `/catalogo` a 360 px, 480 px y completo.
