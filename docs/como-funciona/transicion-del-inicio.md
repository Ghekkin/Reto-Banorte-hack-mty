---
verificado: 2026-09-13 02:15
estado: construido
---

# La transición del Inicio: escribir, que se vaya, que llegue

## Para cualquiera

Inicio no es un chat: es tu pantalla, y cuando le escribes a Maya **la pantalla entera se
rehace**. El problema era que eso no se veía. Escribías, dabas Enter, y el dashboard se
quedaba ahí, idéntico y congelado, los ocho segundos que tarda el modelo en trabajar. Lo
único que se movía era un spinner de 36 px dentro del botón de enviar. Parecía que la app se
había trabado.

Ahora el ciclo se ve. En cuanto escribes, las tarjetas que hay **se van hacia arriba y se
desvanecen**, una tras otra con 25 ms de diferencia, encogiéndose apenas un 2 %. En su lugar
aparecen cuatro bloques grises del tamaño de las tarjetas que vienen, con una línea que dice
"Maya está armando tu pantalla con tus datos…". Y cuando la pantalla nueva llega, entra con
el mismo movimiento pero al revés: sube 4 px y aparece, en cascada.

Las dos animaciones son espejo una de la otra a propósito. Leídas seguidas se ven como un
solo movimiento: las tarjetas de antes se deshacen y las nuevas se arman en el mismo sitio.
No es adorno; es la respuesta a "¿me oyó?", y es lo que hace visible que quien construyó esa
pantalla fue un modelo, en ese momento, con tus datos.

## Técnico

### Dónde vive

- Contexto y fases: `apps/web/src/components/inicio/transicion-inicio.tsx`
  (`ProveedorDeInicio`, `ZonaInicio`, `useTransicionDeInicio`, `MS_SALIDA`)
- Esqueleto de espera: `apps/web/src/components/inicio/esqueleto-inicio.tsx`
- Rejilla que anima: `apps/web/src/components/inicio/masonry.tsx`
- Animaciones: `apps/web/src/app/globals.css` (`@keyframes salida-superficie`,
  `.animar-salida-lista`, `.animar-salida`, tokens `--motion-*`)
- Quien dispara: `BarraFlotanteMaya` en `apps/web/src/components/inicio/tarjetas-inicio.tsx`
- Quien lo envuelve: `apps/web/src/app/(app)/page.tsx`
- Server action: `apps/web/src/app/(app)/acciones.ts` → `preguntarEnInicio`

### Flujo paso a paso

1. La barra flotante llama a `preguntar(texto)` del contexto. Ya no tiene estado propio: el
   `useTransition` vive en `ProveedorDeInicio`, que envuelve la pantalla completa.
2. `isPending` se pone en `true` y el proveedor pasa la fase a **`saliendo`**.
3. `Masonry` lee la fase y cambia `animar-lista` por `animar-salida-lista`: cada celda corre
   `salida-superficie` (150 ms, curva acelerada) con el escalón de 25 ms. La conclusión y la
   línea de evidencia, que no son celdas de la rejilla, llevan `animar-salida` (lo mismo sin
   cascada) desde `InicioDeMaya`.
4. A los `MS_SALIDA` (240 ms = 150 + 3 × 25) el proveedor pasa a **`esperando`** y
   `ZonaInicio` cambia sus hijos por `EsqueletoInicio`.
5. La server action corre el turno en el servidor, guarda la portada en
   `banorte.pantallas_inicio` y hace `revalidatePath("/")`.
6. `isPending` vuelve a `false`, la fase vuelve a **`quieto`** y `ZonaInicio` monta los hijos
   nuevos. Al ser DOM nuevo, `animar-lista` corre sola.
7. Si la acción falló, `fallo` queda en el contexto y la barra lo pinta encima.

### Por qué así, y no de otras dos formas que se probaron mentalmente

- **La entrada no se programa.** No hay `key` artificial ni temporizador: en la fase
  `esperando` los hijos se **desmontan**, así que al volver el DOM es nuevo y la animación
  CSS de montaje se dispara sola. Si se dejaran montados con `opacity: 0`, React reusaría los
  mismos nodos y la animación de entrada no se volvería a ejecutar.
- **Tres fases y no dos.** Sin la intermedia hay que elegir entre dos cosas malas: el
  esqueleto aparece de inmediato y se come la animación de salida (nunca se ve), o no hay
  esqueleto y la pantalla queda en blanco ocho segundos.
- **`useTransition` y no `useState` + `fetch`.** El trabajo lo hace una server action que
  termina en `revalidatePath`: `isPending` cubre el turno del modelo **y** el re-render del
  servidor. Con estado propio, la fase volvería a `quieto` en cuanto la acción resolviera y la
  pantalla vieja seguiría ahí medio segundo.
- **`ZonaInicio` no mete ningún `div`.** Devuelve sus hijos o el esqueleto, nada más: un
  contenedor de más entre el lienzo y la rejilla rompería el masonry (las celdas dejarían de
  ser hijas directas y `animar-lista > *` apuntaría al contenedor).

### Entradas y salidas

| Del contexto | Tipo | Para qué |
|---|---|---|
| `fase` | `"quieto" \| "saliendo" \| "esperando"` | `Masonry` elige animación, `ZonaInicio` elige contenido |
| `saliendo` | `boolean` | atajo para las piezas que no son celdas |
| `pensando` | `boolean` | la barra se deshabilita y cambia su placeholder |
| `fallo` | `string \| undefined` | el motivo real, que en la demo lo lee alguien del equipo |
| `preguntar` | `(texto: string) => void` | lo llama la barra |

### Casos límite conocidos

- **Fuera de Inicio no hay transición.** El contexto tiene un default (`quieto`), así que
  `Masonry` y `Lienzo` funcionan igual en `/maya`, en `/catalogo` y en las pruebas que pintan
  con `renderToStaticMarkup` sin proveedor.
- **Quien pidió menos movimiento no ve nada de esto**: el bloque
  `prefers-reduced-motion` de `globals.css` apaga las dos animaciones (a 0.01 ms, no a
  `none`, porque hay componentes de Base UI que esperan el evento `animationend`).
- **Si el turno falla**, la pantalla anterior vuelve tal cual (el `revalidatePath` no cambió
  nada) y el fallo se pinta sobre la barra. No se queda el esqueleto colgado.
- **Las dos clases de animación nunca conviven** en el mismo elemento: las dos escriben el
  shorthand `animation` con la misma especificidad y quién gana dependería del orden en que
  Tailwind emita el CSS. `Masonry` elige una u otra según la fase.

### Cómo probarlo

```bash
pnpm dev                      # web 3000, mcp 3100
```

Con la app arriba, en `/`: escribe cualquier pregunta y dale Enter. Debe verse la cascada de
salida, después los cuatro bloques grises con la línea de estado, y después la pantalla nueva
entrando en cascada. Las pruebas automáticas:

```bash
pnpm --filter @maya/web test src/lib/__tests__/masonry.spec.ts
```

Cubren que la zona pinte sus hijos sin proveedor, que el esqueleto se anuncie una sola vez y
tenga la forma de la portada, que la salida exista en el CSS y comparta los escalones de la
entrada, que ninguna de las dos cruce el techo de 250 ms de la skill `diseno-banorte`, y que
`MS_SALIDA` nunca sea menor que la cascada completa (si se queda corto, la última tarjeta se
corta a media animación).

Medido en el navegador el 2026-09-13 con turnos reales del modelo: salida de 150 ms
(`opacity` 1 → 0.921 → 0.764 → 0.513 → 0.227 → 0, con `scale` a 0.98 y `translateY` −4 px),
entrada del esqueleto en 160 ms, turno completo entre 8.9 y 19 s, y la entrada de la pantalla
nueva animándose de nuevo.

### Algoritmos involucrados

- `docs/algoritmos/masonry-del-inicio.md` — cómo se acomodan las tarjetas que entran y salen.
- `docs/algoritmos/portada-de-maya.md` — cómo se elige qué tarjetas trae la pantalla nueva.
