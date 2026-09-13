# La conversación con Maya sobrevive

Qué pasa con el hilo del chat cuando la persona cambia de pestaña, recarga la página o cambia de
usuario.

Piezas: `apps/web/src/components/maya/proveedor-agente.tsx`,
`apps/web/src/lib/agente/persistencia.ts`, `apps/web/src/lib/agente/usar-agente.ts` y
`apps/web/src/app/(app)/layout.tsx`.

## Para cualquiera

Antes, si escribías a Maya, ibas a Movimientos a comprobar algo y volvías, **la conversación se había
borrado**: el texto, las tarjetas, todo. Tenías que volver a preguntar.

Ahora se queda. Cambias de sección y vuelves, y ahí está. Recargas la página y sigue ahí. Lo único
que la borra es **cambiar de usuario**, y eso es a propósito: la conversación de Ana no tiene por qué
aparecerle a Carmen. Al cambiar de persona, además, te lleva a Inicio, que es la pantalla que se
rearma sola para quien acaba de entrar.

Si cierras la pestaña, se va. No queda guardada en el disco.

## Para quien toca el código

### Por qué se perdía

`usarAgente` guarda el hilo en `useState`, y ese hook lo llamaba `ConsolaMaya`, que **es** la página
`/maya`. En el App Router, navegar a otra ruta desmonta la página; con ella se iba el estado.

### Dos capas, dos problemas distintos

**1. El provider, para navegar.** `ProveedorAgente` llama `usarAgente` y lo expone por contexto, y se
monta en `(app)/layout.tsx`. El layout **no se vuelve a montar** al navegar entre pestañas del grupo,
porque la barra de pestañas y el sidebar usan `next/link` (navegación de cliente). Así el hilo vive
por encima de las rutas.

**2. `sessionStorage`, para recargar.** El provider no sobrevive a un F5. La llave lleva versión y
usuario (`maya:hilo:v1:<usuarioId>`), y esa segunda parte no es decoración: hace **imposible** que el
hilo de una persona reaparezca en la sesión de otra, incluso si algo más falla.

Se eligió `sessionStorage` y no `localStorage` porque una conversación financiera no tiene por qué
quedarse en el disco de nadie después de cerrar la pestaña. Los datos son sintéticos (ADR 0007), pero
la forma correcta se practica igual.

### El detalle que rompe en silencio: la comparación por REFERENCIA

`calcularSuperficieViva` decide si la última pantalla del hilo es también la del turno en curso
comparando los dos objetos con `===`. Eso es **exacto**, no una aproximación, porque `procesar` nunca
muta: devuelve estado nuevo en cada mensaje.

Al hidratar desde JSON hay que mantener esa exactitud. Si el `estado` vivo tuviera una **copia** de la
superficie —mismos campos, otro objeto—, la comparación diría "son diferentes" y la última pantalla se
pintaría **dos veces**: una congelada en la conversación y otra como pantalla en curso.

Por eso solo se persiste el `hilo`, y el `estado` se **reconstruye a partir de él** reutilizando esa
misma referencia:

```ts
// persistencia.ts
estado.set(entrada.superficie.id, entrada.superficie);  // el MISMO objeto, no una copia
```

La invariante se cumple por construcción, no por cuidado de quien lo lea. Y hay una prueba que la
vigila explícitamente (`persistencia.spec.ts`, "el estado apunta al MISMO objeto que la ultima
pantalla del hilo" y "por eso la pantalla recuperada NO se pinta dos veces").

### El `Map` no es JSON

`EstadoSuperficie.componentes` es un `Map<string, Componente>` y no sobrevive a `JSON.stringify`: se
guarda como pares y se rehidrata con `new Map(pares)`. La prueba comprueba también que los enlaces
siguen siendo enlaces (`{ "path": "/gasto/periodo" }`), porque si se perdieran la tarjeta se pintaría
vacía sin que nada avisara.

### Hidratar durante el render, no en un efecto

La recuperación pasa **durante el render**, no en un `useEffect`, comparando el `usuarioId` recibido
contra un `useRef`. Con un efecto se pintaría un fotograma con la conversación vacía y el hilo
aparecería de golpe después. Es el mismo patrón de "ajustar estado durante el render" que ya usa
`usarEstadoSeguido` en el catálogo.

Guardar sí va en un efecto: escribir en `sessionStorage` es un efecto secundario.

### El cambio de usuario

- La server action `cambiarUsuario` escribe la cookie, revalida y hace `redirect("/")`.
- El provider recibe el `usuarioId` nuevo del layout; `usarAgente` lo detecta, arranca conversación
  nueva y **borra la llave del usuario anterior**. Sin ese borrado, recargar resucitaría la
  conversación que se acababa de tirar.

### Lo que NO se movió al provider

La voz. `usarConversacionVoz` se queda en `ConsolaMaya` a propósito: tiene que cortar el micrófono y
el websocket al salir de `/maya`, y para eso necesita desmontarse con la página. Subirla al layout
dejaría el micrófono abierto mientras la persona navega por la app.

### Lo que se descarta en vez de romper

Un JSON ilegible, una versión vieja de la llave, un `usuarioId` que no cuadra con la llave, o una
entrada de pantalla sin componentes: todo eso se salta o se borra, y la conversación arranca limpia.
Perder la persistencia es un inconveniente; tumbar la app por un `sessionStorage` corrupto, no.
