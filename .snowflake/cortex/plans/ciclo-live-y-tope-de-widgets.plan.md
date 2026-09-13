---
name: "ciclo-live-y-tope-de-widgets"
created: "2026-09-12T23:45:51.704Z"
status: pending
---

# Plan: tope de 3 widgets y ciclo LIVE

## Lo que ya está construido (y por qué el plan es más chico de lo que parece)

Tu idea de "un JSON del backend que los componentes leen con `useEffect`" **ya existe** en el motor A2UI, y es mejor que un mecanismo paralelo:

- `procesar()` (`packages/a2ui/src/procesar.ts:13-57`) es un reducer puro. Un `updateDataModel` **solo toca `dataModel`**: no reconstruye `componentes` ni `raiz`.
- `<Superficie>` no guarda estado; llama `resolver(propsDe(componente), dataModel, item)` **en cada render** (`Superficie.tsx:152`). Un data model nuevo produce props nuevas sin más.
- El dueño del estado es `usarAgente` con `useState<Estado>` (`usar-agente.ts:70`), y como `procesar` nunca muta, `setEstado` con referencia nueva re-renderiza.

O sea: **la reactividad está resuelta y probada** (`renderer.test.ts:291-316`). Lo que falta son tres cosas, y ninguna es el motor:

1. `armarMensajes` emite **siempre** los tres mensajes juntos (`agente/pantalla.ts:164-168`) y `createSurface` **borra el data model** (`procesar.ts:21`). No hay camino para un parche.
2. El modelo recibe como "pantalla actual" **solo una lista de nombres**, sin ids ni props (`historial.ts:73-77`). No puede referirse a nada existente aunque quisiera.
3. Cinco componentes siembran `useState` desde props **solo al montar**, así que un parche re-renderiza la tarjeta pero deja el control en el valor viejo.

## Decisiones tomadas

- Tope: **3 tarjetas en total, Conclusion incluida.**
- Conclusion: **la pinta el modelo**; el host solo si el árbol no trae ninguna.
- Intención: **tres tools de pintado**, sin llamada extra de clasificación.
- Alcance: completo, incluidas props de variante.

## Riesgo de tiempo

Vamos por la hora \~23 de 36 y la regla del repo prohíbe refactors después de la hora 30. El orden de abajo es deliberado: los pasos 1 y 2 son media hora y arreglan lo que pediste primero; el paso 4 es el único con riesgo real sobre el pitch. **Después de cada paso, `main` arranca.** Si el reloj aprieta, el corte natural es después del paso 5: el ciclo live queda demostrable y el paso 6 (props) es puro lucimiento.

---

## 1 · Tope duro de 3 tarjetas

Hoy no hay ningún límite en código: el prompt dice "1 a 4" (`prompt.ts:58`), Inicio dice "3 a 4" (`generar.ts:294`), y la única regla de cardinalidad validada es `heroe ≤ 1` (`pantalla.ts:184-187`). Si el modelo manda 8, se pintan 8.

**Dónde:** `apps/web/src/lib/agente/pantalla.ts`, dentro de `armarMensajes`, junto a la regla de `heroe`.

- Contar sobre el **árbol alcanzable**, no sobre la lista plana: `componentesVisibles(superficie)` de `@maya/a2ui/arbol`, descartando los cuatro de layout (`Column`, `Row`, `Text`, `Divider`).
- `> 3` → error de validación que vuelve al modelo como resultado de tool, igual que cualquier otro. El reintento ya existe (`MAX_INTENTOS_DE_PANTALLA = 2`, `agente.ts:42`).
- **Fallback determinista** al segundo intento fallido: conservar `Conclusion` (si viene) más las primeras por orden hasta llenar 3, y reescribir los `children` de `root`. Un turno **nunca** muere por el tope; el jurado no puede ver una pantalla en blanco.
- Aplicar el mismo tope en `apps/web/src/lib/inicio/generar.ts`, que usa el mismo `armarMensajes`.

**Textos del prompt, en el mismo commit:**

- `prompt.ts:58` — "de 1 a 4 tarjetas" → "máximo 3 tarjetas, `Conclusion` incluida".
- `generar.ts:294` — "SIEMPRE de 3 a 4 tarjetas" → "exactamente 3, `Conclusion` incluida".
- `generar.ts:359` — "De 2 a 4 tarjetas" → "de 2 a 3, `Conclusion` incluida".

**Trampa:** `ejemplosEnTexto()` (`prompt.ts:210-239`) inyecta los 21 `.jsonl` como few-shot. Un ejemplo con 4 tarjetas le **enseña** al modelo a pasarse del tope. Auditar los 21 y recortar los que se pasen.

## 2 · Fin de la Conclusion duplicada

Causa exacta, y son dos sumándose:

- `inicio-de-maya.tsx:53-65` pinta `<Conclusion>` **incondicionalmente**, importado directo de `@maya/catalogo`, saltándose el renderer.
- El prompt de consulta la exige como primera tarjeta (`generar.ts:360-363`) y el `cuandoUsarlo` del catálogo dice "SIEMPRE la primera tarjeta" (`conclusion/schema.ts:69-73`), así que el modelo también la emite. `encargoDePortada` prohíbe `Confirmacion` y `Text` pero **no** `Conclusion` (`generar.ts:309`).

Peor aún: la del host se arma desde `pantalla.texto`, que el prompt pide "una frase corta" (`generar.ts:372`) — queda una conclusión rica del modelo y encima una pobre del host.

**Cambio:**

- `inicio-de-maya.tsx`: pintar `<Conclusion>` solo si `componentesDe(pantalla)` (ya existe, `servicio.ts:161-166`) **no** incluye `"Conclusion"`. Se conserva la garantía de que siempre aparece y gana la del modelo.
- `encargoDePortada` pide `Conclusion` como primera tarjeta, igual que el de consulta, para que el fallback del host casi nunca dispare.
- El comentario de `inicio-de-maya.tsx:24-28` afirma lo contrario: se corrige.

**Prueba que hoy falta:** `inicio-pinta.spec.ts:26` usa `plan-de-pago.jsonl`, que no trae `Conclusion`, así que el caso duplicado **no está cubierto**. Agregar un caso con `conclusion.jsonl` y afirmar exactamente una.

## 3 · Que el modelo vea la pantalla actual (prerrequisito del paso 4)

Sin ids no hay parcheo posible. Hoy `bloqueDeContexto` imprime `pantalla actual: Conclusion, GastoPorCategoria` y el data model recortado a 2000 caracteres — ni un id, ni una prop.

- `apps/web/src/lib/agente/tipos.ts`: en `PeticionAgente.superficie` y en `esquemaPeticion`, añadir `arbol: { id, component, props }[]`. Se **agrega**, no se reemplaza: `componentes` sigue derivándose para no romper a nadie (campo nuevo opcional, regla 4 del repo).
- `usar-agente.ts:119-127`: llenarlo con `componentesVisibles(superficie)` (`arbol.ts:77-95`), que ya recorre lo alcanzable desde la raíz — la defensa del issue #3 se mantiene. Mandar las props **tal como se emitieron**, con los `{ path }` intactos: eso es justo lo que le dice al modelo qué path parchear.
- `historial.ts` `bloqueDeContexto`: imprimir el árbol compacto, una línea por componente (`gasto · GastoPorCategoria · categorias→/gasto/categorias, periodo→/gasto/periodo`), y para el data model bastan **las rutas con su tipo**, no los valores, cuando pase de los 2000 caracteres.
- `docs/arquitectura/contrato-agente-cliente.md` en el mismo commit (skill `cambiar-schema`).

## 4 · Tres tools de pintado — el ciclo LIVE

Hoy el turno **siempre** termina pintando: `prepareStep` fuerza `toolChoice: pintar_pantalla` en los últimos dos pasos (`agente.ts:166-169`) y el contexto cierra con "Termina llamando `pintar_pantalla` exactamente una vez" (`historial.ts:95`). No existe forma de contestar sin repintar.

Se abren tres salidas, y **la elección de tool es la clasificación de intención** — sin llamada extra, sin latencia, y visible en la tira de transparencia ante el jurado:

| Tool               | Cuándo                                      | Mensajes A2UI que emite                                       |
| ------------------ | ------------------------------------------- | ------------------------------------------------------------- |
| `responder`        | Aclaración sobre lo que ya está en pantalla | **ninguno**; la pantalla no se toca                           |
| `ajustar_pantalla` | Cambiar parámetros de lo que ya está        | `updateDataModel` de **subpath** + `updateComponents` parcial |
| `pintar_pantalla`  | Otra pregunta, otros widgets                | los tres de hoy, sin cambios                                  |

**`ajustar_pantalla({ razon, texto, parchesDatos, parchesComponentes?, sugerencias? })`:**

- `parchesDatos: { path, value }[]` → un `updateDataModel` por parche, con el `path` real (`/gasto/periodo`), **nunca `"/"`**, y **sin `createSurface`**. El data model sobrevive, que es todo el punto.
- `parchesComponentes: { id, props }[]` → un solo `updateComponents` con esos componentes. `procesar` fusiona por id (`procesar.ts:33`), así que un parche parcial es exactamente lo correcto aquí. Es el canal para activar una prop de variante (paso 6).
- **Validación, reusando lo que ya hay:** cada `path` debe existir en `peticion.superficie.dataModel`; cada `id` debe existir en el árbol entrante; las props se validan con `revisarProps` (`pantalla.ts:350`) contra el schema Zod de ese componente. Un parche inválido vuelve al modelo como error de tool, igual que hoy.
- El tope del paso 1 se recalcula sobre el árbol resultante: un parche no puede meter una cuarta tarjeta por la puerta de atrás.

**`responder({ texto })`** cierra el turno con las líneas `texto`/`razon` y cero mensajes `a2ui`. `usarAgente` ya lo tolera: en `case "fin"` solo congela si `componentes.size > 0` (`usar-agente.ts:157-167`), y `calcularSuperficieViva` compara por referencia, así que la pantalla anterior sigue en pie sin duplicarse (probado en `hilo.spec.ts`).

**Cableado en `agente.ts`:**

- `stopWhen`: cerrar con **cualquiera** de las tres, no solo con `pintor.pintada()`.
- `prepareStep`: en los pasos reservados, `activeTools` = las tres (hoy solo `pintar_pantalla`). Se conserva el recorte de \~6,600 tokens de definiciones MCP que motivó ese código.
- **Primer turno** (`!peticion.superficie`): solo `pintar_pantalla`. No hay nada que ajustar ni aclarar, y ofrecer las tres invita a que el modelo conteste con texto — justo lo que este producto existe para no hacer.
- Una **acción** entrante que muta estado sigue obligada a `pintar_pantalla`: la regla de volver a pintar la tarjeta que cambió (`prompt.ts:83-86`) es la prueba del ciclo ante el jurado y no se toca.

**Prompt (`historial.ts` + `prompt.ts`), con el criterio explícito:** pregunta sobre un número que ya está en pantalla → `responder`. "y si fueran 24 meses", "ordénalo por variación", "muéstrame septiembre" → `ajustar_pantalla`. Tema nuevo → `pintar_pantalla`. En duda, `pintar_pantalla`.

## 5 · Resincronizar los 5 componentes con estado local

Cinco componentes siembran `useState` desde props y **solo al montar**. La `key` de React es estable (`arbol.ts:45`), así que no se remontan: un parche cambia el encabezado y los límites del slider pero **deja el control en el valor viejo**. Es el bug que haría que `ajustar_pantalla` se vea como que no hizo nada.

| Archivo                                    | Estado que hay que sincronizar                 |
| ------------------------------------------ | ---------------------------------------------- |
| `plan-de-pago/componente.tsx:31`           | `seleccion` ← `plazoElegido`                   |
| `simulador-meta/componente.tsx:43`         | `aportacion` ← `aportacionCentavos`            |
| `proyeccion-crecimiento/componente.tsx:55` | `aportacion` ← `aportacionMensualCentavos`     |
| `escenarios-inversion/componente.tsx:36`   | `seleccionado` ← `escenarioInicial`            |
| `riesgo-rendimiento/componente.tsx:40`     | `seleccionadoId` ← `instrumentoSeleccionadoId` |

**Patrón:** ajustar el estado durante el render comparando la prop contra un `useRef` del último valor visto (el patrón documentado de React para "ajustar estado cuando una prop cambia"), no un `useEffect`: un efecto pinta un frame con el valor viejo y en un slider eso se ve como un salto. El estado local sigue siendo el correcto para el arrastre del slider — mover la aportación no debe ser un turno del agente, y esa justificación (`simulador-meta/componente.tsx:19-25`) sigue vigente.

Una prueba por componente en `render.spec.tsx`: pintar, cambiar la prop, afirmar que el control muestra el valor nuevo.

## 6 · Props de variante

Todas **opcionales con default**, para que ningún `.jsonl` ni prueba existente se rompa. Cada prop queda enlazable sola: `generar-catalogo.ts:81` envuelve toda prop en `anyOf: [literal, DataBinding]`.

- `GastoPorCategoria`: `orden` (`"monto" | "variacion" | "nombre"`, default `"monto"`), `limite` (entero, cuántas filas), `resaltarCategoriaId`.
- `ProyeccionPagoCredito`: `granularidad` (`"mensual" | "trimestral" | "anual"`) sobre el resumen de amortización.
- `RendimientoHistorico`: `mostrarComparacion` (booleano).

Ya existen y no hay que inventarlas: `escenarioInicial`, `instrumentoSeleccionadoId`, `periodo`, `plazoElegido`, `plazoMeses`, `horizonteMeses`. Son los primeros objetivos de `ajustar_pantalla`.

Por cada prop, en **un solo commit** (skill `cambiar-schema`): schema con `.describe()` → la implementación la respeta → `pnpm catalogo` (el CI exige que el `catalogo.json` versionado no tenga diff) → el `.jsonl` de ejemplo si aplica → prueba → `docs/como-funciona/componente-*.md`.

## 7 · Verificación (definición de "hecho", skill `probar`)

```
pnpm typecheck            # los 5 paquetes
pnpm test                 # 5 suites; las críticas son catalogo.spec.ts y renderer.test.ts
pnpm catalogo             # y git diff vacío
pnpm reiniciar-estado     # antes de cualquier ensayo
pnpm humo                 # el MCP por HTTP
pnpm probar-guion         # los 9 pasos con el MODELO REAL
pnpm probar-inicio        # las 3 portadas: exactamente 3 tarjetas y UNA Conclusion
```

Y a mano, los tres tipos de turno sobre una pantalla ya pintada:

1. "¿por qué me sale tan alto?" → **cero** mensajes `a2ui`, la pantalla intacta.
2. "ordénalo por variación" → **solo** `updateDataModel`/`updateComponents`, la tarjeta cambia sin parpadear y sin esqueleto de carga.
3. "¿cómo voy con mi ahorro?" → repintado completo, 3 tarjetas.

Ojo con dos cosas del entorno: `pnpm test` **escribe en la base real si `DATABASE_URL` está cargada** (issue abierto, mitigado), y el issue #12 (cuota de Gemini) está marcado abierto en la tabla aunque el tablero lo da por resuelto — confirmar antes de gastar corridas del modelo real.

## 8 · Documentación y cierre

Nuevos:

- `docs/como-funciona/ciclo-live.md` — dos niveles: qué ve la persona, y el contrato de las tres tools con ejemplos de mensajes.
- `docs/algoritmos/intencion-y-parcheo.md` — la regla del repo: todo algoritmo se explica. Entra el tope de 3 con su truncamiento determinista y el criterio de elección de tool.

Quedan mintiendo y se corrigen en el mismo commit:

- `docs/arquitectura/contrato-agente-cliente.md` — el árbol en la petición y las tres tools.
- `docs/como-funciona/componente-conclusion.md:77-84` — documenta el duplicado como **deliberado**.
- `docs/como-funciona/inicio-personalizado.md` — el tope y quién pinta la Conclusion.
- El comentario de `pantalla.ts:143-150` ("la superficie se rearma completa en cada turno") deja de ser cierto: ahora es el camino de `pintar_pantalla`, no el único.

Cierre: entrada en `docs/bitacora/<nombre>.md` y en `docs/bitacora/equipo.md` (es una decisión de arquitectura), solo mi fila de `docs/tablero.md`, e issue en `docs/issues/` **más** `gh issue create` por cada hallazgo ajeno. Uno ya identificado: los `useState` sin resincronizar son un bug latente que existe hoy, independiente de este cambio. Si el ciclo live queda estable, ensayo completo y `scripts/marcar-estable.sh`.
