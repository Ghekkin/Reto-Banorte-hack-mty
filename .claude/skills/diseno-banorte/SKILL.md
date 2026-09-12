---
name: diseno-banorte
description: El sistema de diseño del proyecto - shadcn/ui obligatorio, paleta de Banorte y la forma flotante (lienzo gris, sidebar y tarjetas redondeadas con sombra suave, rejilla bento, barra de conversación). Tokens listos para globals.css, anatomía de tarjeta, qué componente de shadcn usar para cada caso y cómo el agente coloca sus superficies. Invocar antes de escribir cualquier CSS, componente o pantalla.
---

# Diseño: shadcn/ui + identidad Banorte

Dos reglas que no se discuten:

1. **Toda la UI se construye con shadcn/ui.** Nada de componentes a mano, nada de otra
   librería. Si necesitas un botón, un diálogo, una tabla, un slider: `npx shadcn@latest
   add <componente>`. La skill `shadcn` (instalada en `.agents/skills/shadcn`) tiene el
   CLI, el registro y la guía de theming; **invócala** antes de agregar componentes.
2. **El color viene de los tokens de Banorte**, nunca de un hex suelto en un `.tsx`.
   Si un color no está abajo, no se usa.

El reto lo organiza Banorte: la interfaz debe verse suya al primer vistazo. El rojo es
de ellos; el producto es nuestro (ver "Marca" abajo).

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

El lienzo es una **rejilla bento** donde el agente coloca lo que genera:

- El renderer A2UI pinta la superficie `principal` dentro del lienzo, no en un panel
  aparte.
- Cada componente del catálogo ocupa 1 o 2 columnas según su prop `ancho`
  (`"normal" | "amplio"`), por defecto `normal`. `GastoPorCategoria` y las tablas piden
  `amplio`; `Confirmacion` y `ResumenTarjeta` van `normal`.
- Al llegar una UI nueva, las tarjetas **entran con una transición corta** (`opacity` +
  `translate-y-1`, 150 ms) para que se vea que el agente las acaba de construir. Nada
  más de animación.
- Rejilla: `grid gap-4 md:grid-cols-2 xl:grid-cols-3`, con `col-span-2` para `amplio`.
  A 400 px, una columna.

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
| Aviso corto | `alert` | Para "¿por qué veo esto?" no: eso es texto al pie |
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

- Se usan el **nombre Maya** y la **paleta**. **Nunca** el logotipo de Banorte, su
  tipografía corporativa ni la imagen oficial de Maya.
- El **dominio no imita a Banorte**: nada de `maya-banorte.tech`. Neutro o descriptivo.
- Pie de la app y `README.md`: *"Prototipo de hackathon. Concepto sobre Maya, la
  asistente virtual de Banorte. No es un producto oficial ni está afiliado a Grupo
  Financiero Banorte."*
- El nombre vive en **un solo archivo de configuración**, no esparcido en los
  componentes: si en el stand piden no usarlo, se cambia en un `sed`.
- El encabezado puede decir "Reto Banorte · Hack Monterrey 2026" como contexto.

## Checklist antes de commitear UI

- [ ] Cero hex en `.tsx`; todo por token.
- [ ] El componente vino de `npx shadcn@latest add`, no escrito a mano.
- [ ] Un solo botón primario en la superficie.
- [ ] Montos con `tabular-nums` y formato `es-MX`.
- [ ] Se ve bien a 400 px y en el proyector.
- [ ] Todo flota: nada pegado al borde del lienzo; `rounded-2xl` + `shadow-sm`.
- [ ] Una sola tarjeta héroe por pantalla.
- [ ] Estados `skeleton` / vacío / error resueltos (skill `ui-generativa`).
