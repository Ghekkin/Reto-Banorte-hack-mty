---
verificado: 2026-09-13 04:40
estado: construido
---

# La pantalla Más

## Para cualquiera

Más es la pestaña a la que llega alguien que quiere entender la app sin que se la expliquen.
Arriba, en la tarjeta roja, está la persona: su nombre completo, su edad, a qué se dedica, desde
cuándo es cliente y cuánto dinero tiene disponible hoy. Al lado están las tres personas de la
demo (Alberto con la tarjeta al límite, Ana sin fondo de emergencia, Carmen con su portafolio):
se toca una y toda la app cambia a su situación. Es la forma más rápida de ver que Maya no enseña
lo mismo a todos.

Debajo, Maya se explica en tres pasos, con dibujos hechos con las mismas piezas de la app: le
dices qué necesitas, arma la pantalla con tus datos, tocas y la operación se hace. Junto, tres
preguntas que conviene hacerle a esta persona en particular; al tocar una, se abre Maya con la
pregunta ya hecha.

Al final están los datos personales, que salen de la base del banco (ocupación, ingreso, ciudad,
correo y teléfono, estos dos tapados como una tarjeta), y el menú de lo demás. Lo que existe se
toca; lo que no está en el prototipo (pagos, estados de cuenta, seguridad) lo dice en voz baja, sin
fingir un botón. Hasta abajo, el aviso de que es un prototipo de hackathon y no un producto de
Banorte.

## Técnico

### Dónde vive

- Página: `apps/web/src/app/(app)/mas/page.tsx` (server component).
- Tarjetas: `apps/web/src/components/mas/tarjetas-mas.tsx` → `PerfilHeroe`, `TarjetaPersonas`,
  `ComoFuncionaMaya`, `PreguntasSugeridas`, `DatosPersonales`, `TodoLoDemas`, `AvisoDelPrototipo`.
- Cambio de persona: `apps/web/src/components/mas/cambiar-persona.tsx` → `CambiarPersona`
  (cliente), que llama a la server action `cambiarUsuario` de `app/(app)/acciones.ts`.
- Datos: `perfilDe` y `resumenDe` en `apps/web/src/lib/datos/consultas.ts`.
- Máscaras y antigüedad: `apps/web/src/lib/perfil.ts` → `enmascararCorreo`, `enmascararTelefono`,
  `anosDesde`, `textoAntiguedad`, `ETIQUETA_SEGMENTO`. Pruebas en `src/lib/__tests__/perfil.spec.ts`.
- Subtítulo de la barra superior: `components/shell/navegacion.ts` (`"Tu perfil y todo lo demás"`).

### Flujo paso a paso

1. `PaginaMas` lee la persona de la cookie (`usuarioActivo`) y, en paralelo, `resumenDe` y
   `perfilDe`.
2. `perfilDe` lee `banorte.usuarios` con `leerTabla` (cae al volcado de pruebas si la base no
   responde) y devuelve nombre completo, edad, ocupación, ingreso, ciudad, estado, segmento,
   `cliente_desde`, correo y teléfono. Si la persona no está, `undefined`: el héroe cae al
   contexto de `lib/usuarios.ts` y la tarjeta de datos dice que no pudo leerlos.
3. Cada tarjeta es la `Tarjeta` de `@maya/catalogo`: trae `@container/tarjeta` y la coreografía de
   entrada de los widgets (`animar-tarjeta`, `.cifra` en el disponible, `.animar-filas` en las
   listas), y espera a verse en el celular. Ver `animacion-de-widgets.md`.
4. Al tocar otra persona, `CambiarPersona` la marca de inmediato con `useOptimistic`, corre
   `cambiarUsuario` en una transición (cookie + `revalidatePath("/", "layout")`) y el servidor
   vuelve a pintar Más, el sidebar y la barra con la persona nueva. Medido en local: 0.5–1.2 s.
5. Cada pregunta sugerida es un `Link` a `/maya?intencion=<pregunta>`, que la consola de Maya
   manda sola al abrir.

### La rejilla

`grid grid-flow-dense`, una columna en móvil, `md:grid-cols-2`, `xl:grid-cols-3`. Cada tarjeta
va en un `div` hueco porque `Tarjeta` pone su propia envoltura y el `col-span` tiene que ir en el
hijo directo de la rejilla.

| Ancho | Filas |
|---|---|
| móvil | perfil · personas · cómo funciona · preguntas · datos · todo lo demás |
| `md` (2 col) | perfil (2) · personas + preguntas (el `dense` sube preguntas) · cómo funciona (2) · datos (2, en dos columnas internas) · todo lo demás (2) |
| `xl` (3 col) | perfil (2) + personas · cómo funciona (2) + preguntas · datos + todo lo demás (2) |

La héroe del catálogo no se estira (`self-start`); aquí el hueco la estira con
`[&>[data-tarjeta]]:self-stretch` para que cierre pareja con la lista de personas, y la cifra y los
botones van juntos al fondo.

### Decisiones de diseño

- **Una sola héroe y ningún botón rojo.** La acción de la pantalla es la píldora clara «Preguntarle
  a Maya» del héroe. Los isotipos de las preguntas son neutros y se ponen rojos al pasar el cursor.
- **Sin «Invertido» en el héroe.** Se quitó cuando `resumenDe` sumaba la cuenta de inversión al
  disponible y con las dos cifras juntas el portafolio de Carmen se veía dos veces (issue #32).
  Desde el 2026-09-13 el disponible es solo nómina y ahorro, así que ya no hay doble conteo; el
  héroe sigue con la misma cifra que el de Inicio.
- **Personas como `RadioGroup`, no como `Select`.** En el sidebar el menú cabe cerrado; aquí lo que
  hay que enseñar son las tres situaciones a la vez. La fila activa usa el `border-primary bg-tinte`
  de las opciones de `PlanDePago`.
- **Cómo funciona sin siglas.** LLM, MCP y A2UI no aparecen: es para la persona. El ejemplo de las
  miniaturas es el flujo verificado del guion (bajar intereses → plan de pago → «Plan activo»).
- **Lo que no existe, dicho una vez.** Antes eran ocho renglones y seis decían «pendiente»; ahora
  son mosaicos apagados con «Fuera de este prototipo» y `aria-disabled`, sin badge.
- **El aviso sale de la tarjeta y crece a `text-sm`**, centrado al pie sobre el lienzo. La skill
  `diseno-banorte` pide que no se esconda ni se achique.

### Casos límite conocidos

- Sin base, `leerTabla` cae al volcado y los datos personales salen igual (la tabla `usuarios`
  está en `datos-de-prueba.json`).
- Las preguntas sugeridas están fijas por id de persona (`PREGUNTAS`); una persona nueva cae a las
  de Beto. Son las del guion, los chips de `consola-maya.tsx` y la de `SinInversiones`; si alguna
  deja de producir una pantalla buena, se cambia ahí.
- El selector `variante="tarjeta"` de `selector-usuario.tsx` se quedó sin uso: Más era su único
  lugar.

### Cómo probarlo

- `pnpm --filter @maya/web exec vitest run src/lib/__tests__/perfil.spec.ts`.
- Abrir `/mas` a 360, 1024 y 1440 px: sin scroll horizontal, tres filas parejas en 1440.
- Tocar Ana y Carmen: el héroe, las preguntas y los datos cambian, y el sidebar también.
