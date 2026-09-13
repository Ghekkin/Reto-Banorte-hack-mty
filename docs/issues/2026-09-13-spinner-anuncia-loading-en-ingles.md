---
estado: abierto
severidad: baja
area: web
encontrado: 2026-09-13 02:29
github: 20
---

# El `Spinner` anuncia "Loading" en inglés en los botones de enviar

**Dónde:** `apps/web/src/components/ui/spinner.tsx:6` (`aria-label="Loading"`), usado sin
sobrescribir en `apps/web/src/components/maya/barra-conversacion.tsx:97` y `:163`, y en
`apps/web/src/components/inicio/tarjetas-inicio.tsx:276`.

**Qué esperaba:** que un lector de pantalla anunciara la espera en español, o que no dijera
nada cuando el botón ya comunica que está ocupado.

**Qué pasa:** `Spinner` pinta `<Loader2Icon role="status" aria-label="Loading" />`.
lucide-react 1.45 solo agrega `aria-hidden="true"` cuando el ícono no recibe ninguna prop
aria (`params.hasA11yProp === false`), así que con ese `aria-label` el spinner queda
expuesto: al enviar una pregunta a Maya, VoiceOver o NVDA dicen "Loading" en una app en
español.

**Cómo lo reproduje / por qué estoy seguro:** leyendo `spinner.tsx` y la condición de
`aria-hidden` en `node_modules/lucide-react/dist/cjs/lucide-react.js`. Los demás usos ya lo
esquivan: `progreso-maya.tsx` con `aria-hidden`, `refresco-del-inicio.tsx` con
`aria-label=""` y `selector-usuario.tsx` con `aria-hidden` (su trigger lleva `aria-busy`).
Salió al rediseñar el selector de persona.

**Impacto en la demo:** ninguno visible; solo quien usa lector de pantalla.

**Arreglo sugerido:** `aria-label="Cargando"` por omisión en `spinner.tsx` (una línea en la
primitiva), o `aria-hidden` en los tres botones de enviar.
