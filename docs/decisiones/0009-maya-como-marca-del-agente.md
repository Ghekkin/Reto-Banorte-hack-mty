---
estado: aceptada
fecha: 2026-09-11 23:30
---

# 0009 — El agente se llama Maya: la siguiente generación del asistente de Banorte

Reemplaza el nombre "Brújula" que se había elegido horas antes y ajusta la sección
"Marca" de la skill `diseno-banorte`.

## Contexto

**Maya es la asistente virtual real de Banorte** (banorte.com/Personal/Canales-Banorte/
Asistente-Virtual-Maya): chat con IA que resuelve **más de 300 consultas** de productos
y ejecuta **17 operaciones bancarias** —pagos, transferencias, consulta de movimientos,
estado de cuenta— en la web, Banorte Móvil, BEP y BEM. Es gratuita y para operar pide
credenciales de Banca Digital.

Hoy Maya entrega todo eso como **texto y menús**. El reto pide exactamente lo contrario:
"de la respuesta en texto a la interfaz que actúa". La brecha entre lo que Maya ya puede
hacer y cómo lo entrega **es el enunciado del reto**.

Un nombre propio inventado (Brújula) obligaba a explicar un producto nuevo a un jurado
que trabaja en Banorte. Maya no necesita presentación: la conocen, la construyeron.

## Decisión

1. **El agente se llama Maya.** Es el nombre en la interfaz (sidebar, barra de
   conversación, saludo inicial) y en el pitch. Los paquetes son `@maya/*`.
2. **El encuadre es evolución, no reemplazo ni crítica.** La tesis del pitch:
   > "Maya ya hace 17 operaciones bancarias. Lo que le falta no es capacidad: es
   > superficie. Hoy te contesta con texto; nosotros hacemos que construya la pantalla
   > que tu situación necesita, y que la acción ocurra ahí mismo."
3. **Las 17 operaciones son el ancla de credibilidad** del flujo accionable (regla 3 del
   reto). No inventamos capacidad nueva: cambiamos cómo se entrega. `aplicar_plan_pago`
   y `crear_apartado` son plausibles porque Maya ya opera de verdad.
4. **Límites de marca, sin excepción:**
   - Se usa el **nombre Maya** y la **paleta** de Banorte. **No** el logotipo, **no** la
     tipografía corporativa, **no** la imagen de Maya si la tiene.
     *(El límite del logotipo se levantó el 2026-09-12; ver la enmienda al final.)*
   - El **dominio no imita a Banorte**: nada de `maya-banorte.tech` ni `mayabanorte.tech`.
     Neutro o descriptivo.
   - `README.md` y el pie de la app llevan: *"Prototipo de hackathon. Concepto sobre
     Maya, la asistente virtual de Banorte. No es un producto oficial ni está afiliado
     a Grupo Financiero Banorte."*
   - **Se confirma con los mentores en el stand** antes del pitch. Es lo normal en un
     reto de marca, pero se pregunta.
5. **Los datos siguen siendo sintéticos.** Usar el nombre no cambia nada del ADR 0007:
   tres perfiles inventados, cero conexión con sistemas reales, y se dice en la demo.

## Alternativas descartadas

- **Brújula / Tanto / Umbral.** Nombres propios limpios, sin riesgo de marca, pero
  obligan a explicar un producto nuevo y pierden el mejor gancho disponible: que el
  jurado reconozca su propio asistente en la primera pantalla.
- **"Maya 2.0" o "Nueva Maya" como nombre.** Suena a versión de software y envejece mal
  en una demo. Maya, a secas; la evolución se cuenta con palabras, no con el nombre.
- **Inventar un asistente de un banco ficticio.** Cero riesgo y cero conexión: el jurado
  es Banorte.

## Consecuencias

- Todo `@brujula/*` pasa a `@maya/*` antes del primer commit del scaffold.
- El guion de la demo abre contrastando **Maya hoy** (texto) con **Maya aquí**
  (interfaz que se construye). Ver `docs/demo/guion-demo.md`.
- La skill `diseno-banorte` cambia su sección "Marca": el nombre ya no es propio, pero
  los límites de logotipo, tipografía y dominio se endurecen.
- Riesgo asumido: si en el stand piden no usar el nombre, se cambia en un `sed` y el
  encuadre sobrevive ("el asistente de tu banco"). Por eso el nombre vive en un solo
  archivo de configuración, no esparcido en los componentes.

## Enmienda 2026-09-12 — sí se usa el logotipo de Banorte

**Qué cambia.** El punto 4 prohibía el logotipo. Se levanta esa prohibición por decisión
del equipo: el logotipo oficial de Banorte entra en la interfaz. El resto del punto 4
sigue igual —**no** se usa la tipografía corporativa, **no** la imagen de Maya, y el
dominio sigue sin imitar a la marca.

**Por qué.** La paleta sola no lee como Banorte en un proyector a tres metros. El
encuadre del pitch ("Maya ya opera; le damos superficie") depende de que el jurado
reconozca su propio producto en la primera pantalla, y el reconocimiento lo carga el
logotipo, no el rojo. Es la misma apuesta del nombre, un paso más lejos.

**Dónde vive.** `apps/web/src/components/marca/logo-banorte.tsx`, dos componentes:

| Componente | Qué es | Dónde se usa |
|---|---|---|
| `LogoBanorte` | Logotipo completo (isotipo + palabra). 8.16:1, se dimensiona por altura | Header del sidebar de escritorio |
| `IconoBanorte` | Isotipo solo, en `viewBox` cuadrado y centrado | Todo lo que representa a Maya: item del sidebar, FAB central de móvil, avatar del saludo en `/maya`, atajo de Inicio |

Van como SVG **en línea** con `fill="currentColor"`, no como `<img>`: el isotipo tiene que
ser blanco sobre el degradado rojo de marca y un `<img>` no se puede recolorear. Los SVG
fuente quedan en `apps/web/public/marca/`.

**Lo que sigue vigente y se vuelve más importante.** El disclaimer de `src/lib/marca.ts`,
del `README.md` y del pie de la app es ahora la única cosa que separa el prototipo de una
suplantación de marca: no se toca, no se esconde y no se hace más chico. Y el punto 5 del
ADR ("se confirma con los mentores en el stand antes del pitch") **deja de ser cortesía
y pasa a ser obligatorio**: si piden retirarlo, se quitan los dos componentes de
`components/marca/` y se vuelve a la insignia con la inicial. El riesgo está acotado a un
archivo, igual que el nombre.

**Riesgo asumido:** que un juez lea el logotipo como afiliación real pese al disclaimer.
Se mitiga diciéndolo en voz alta en la demo, no solo en el pie.
