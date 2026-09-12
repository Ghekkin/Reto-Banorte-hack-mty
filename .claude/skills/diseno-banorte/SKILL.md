---
name: diseno-banorte
description: El sistema de diseño del proyecto - shadcn/ui obligatorio para toda la UI y la paleta de Banorte como única fuente de color. Tokens listos para globals.css, reglas de uso, qué componente de shadcn usar para cada caso y cómo se construyen encima los componentes del catálogo A2UI. Invocar antes de escribir cualquier CSS, componente o pantalla.
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

Bloque listo. Va en `apps/web/app/globals.css` después de `@import "tailwindcss"` y de
la línea de shadcn. Los nombres son los que shadcn espera: no se renombran.

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

  /* Gráficas: el rojo primero, después neutros. Nunca arcoíris. */
  --chart-1: oklch(0.5943 0.2407 24.68);
  --chart-2: oklch(0.6533 0.2345 18.56);
  --chart-3: oklch(0.5091 0.2061 24.53);
  --chart-4: oklch(0.5188 0.0030 48.68);
  --chart-5: oklch(0.8343 0.0022 197.11);
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
| Cambiar de usuario demo | `select` | En la cabecera, discreto |

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

- El producto tiene **nombre propio**; no es "Banorte algo". El dominio tampoco.
- Se usa la **paleta** de Banorte, no su logotipo ni su tipografía corporativa, salvo
  que ellos lo autoricen en el stand.
- El encabezado puede decir "Reto Banorte · Hack Monterrey 2026" como contexto.

## Checklist antes de commitear UI

- [ ] Cero hex en `.tsx`; todo por token.
- [ ] El componente vino de `npx shadcn@latest add`, no escrito a mano.
- [ ] Un solo botón primario en la superficie.
- [ ] Montos con `tabular-nums` y formato `es-MX`.
- [ ] Se ve bien a 400 px y en el proyector.
- [ ] Estados `skeleton` / vacío / error resueltos (skill `ui-generativa`).
