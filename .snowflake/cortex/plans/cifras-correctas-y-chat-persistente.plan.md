---
name: "cifras-correctas-y-chat-persistente"
created: "2026-09-13T01:31:22.148Z"
status: pending
---

# De dónde salen las cifras imposibles

Investigado con los datos reales de Ana (`/api/productos?usuario=usr_ana`) y la fórmula del propio MCP. **Hay tres fuentes distintas, y ninguna es la base de datos.**

## Lo que está bien

Los datos del MCP son correctos: `saldoInsolutoCentavos: 5578308` ($55,783.08), `mensualidadCentavos: 457095` ($4,570.95), `tasaAnual: 0.279`, 24 meses con 9 pagados. Y `finanzas.mensualidad(5578308, 0.279, 15)` da **exactamente $4,570.95**, el dato guardado: la matemática y los datos cuadran al centavo.

Todo lo que pasa por `formatearMonto` sale bien, y se ve en tu captura: la tarjeta del medio (`$55,783.08`, `$4,570.95`, `$52,716.60`, los intereses de cada hito) es correcta.

## Fuente 1 · El modelo formatea dinero a mano

`Conclusion.datos[].valor` es **`z.string()`** (`packages/catalogo/src/conclusion/schema.ts:21`), descrito como *"Ya formateado y corto"*. Es el único lugar del catálogo donde el modelo escribe una cifra de dinero como texto, y **viola la regla del repo**: *"Los montos vienen y van en CENTAVOS enteros; la interfaz los formatea"*.

Lo que hace el modelo es cirugía de cadenas sobre los centavos:

```
457095  (centavos, el dato real)
457,095 (lo agrupa como si fueran pesos)
457,09.50  ← le mete el punto decimal DENTRO del número ya agrupado
```

Eso es literalmente lo que se ve: `$457,09.50` y `$504,78.50`. El `titular` y el `detalle` tienen el mismo problema (`$504,785`, `$504,800`) porque también son texto libre.

**Empeoró por mi cambio anterior:** el tope de 3 tarjetas hace que `Conclusion` esté en *toda* pantalla, así que este bug pasó de ocasional a sistemático.

## Fuente 2 · El modelo inventó la mensualidad, porque ninguna tool la calcula

Ana preguntó cómo terminar su crédito en un año. **No existe tool que conteste eso.** `simular_reestructura` es solo para la **tarjeta**; `consultar_creditos` con `incluirAmortizacion` devuelve el calendario **que ya existe** (`proximosPagosDe` lee la tabla, no recalcula). Así que el modelo hizo la cuenta de cabeza y rompió la regla 2 del prompt ("Nunca inventes un numero").

La respuesta correcta, con la fórmula que ya está en `apps/mcp/src/dominio/finanzas.ts`:

| Plazo          | Mensualidad                           |
| -------------- | ------------------------------------- |
| 12 meses       | **$5,503.20** ← lo que Ana preguntó   |
| 15 meses (hoy) | $4,570.95 ✓ coincide con el dato real |
| 18 meses       | $3,952.73                             |

El modelo dijo `$504,785`. Ni con el punto en su lugar acertaba: su número era $5,047.85 contra los $5,503.20 reales. **El formato hizo visible el error; el error de fondo era inventar.**

## Fuente 3 · Props fuera de su propio rango, sin nadie que lo note

La tercera tarjeta muestra «Aportación mensual **$477.00**» con el slider de $500.00 a $6,629.05: el valor está **por debajo de su propio piso**, y de ahí salen los "117 meses" y el "12 de junio de 2036". La aritmética del componente es correcta; la entrada es imposible.

Nada lo valida, y por dos razones que se suman:

1. Zod valida prop por prop; no hay regla que relacione `aportacionCentavos` con `aportacionMinimaCentavos` / `aportacionMaximaCentavos`.
2. **`revisarProps` se salta las props enlazadas** (`{ "path": … }`) porque *"no se pueden validar por valor"*. Como el modelo casi siempre enlaza, en la práctica **la mayoría de las props no se validan nunca**. Ese es el agujero grande, y es más general que esta tarjeta.

---

# Plan

## 1 · Tool `simular_liquidacion_credito` (skill `tool-mcp` + `cambiar-schema`)

Para que el modelo deje de calcular de cabeza tiene que existir la respuesta.

- `packages/schemas/`: `EntradaSimularLiquidacionCredito` (`usuarioId`, `creditoId?`, `plazoObjetivoMeses` 1–360) y `SalidaSimularLiquidacionCredito`.
- `apps/mcp/src/tools/simular-liquidacion-credito.ts`, clase `lectura`, **reusando `finanzas.mensualidad()`** — la misma función que reproduce el dato guardado al centavo, así que no nace una segunda versión de la verdad.
- Salida, todo en centavos enteros: `mensualidadActualCentavos`, `mensualidadNuevaCentavos`, `pagosRestantesActuales`, `plazoObjetivoMeses`, `interesesActualesCentavos`, `interesesNuevosCentavos`, `ahorroInteresesCentavos`, `mesesQueAdelanta`, y `dentroDeCapacidad: boolean` comparando contra `capacidadPagoMensualCentavos` — porque la respuesta honesta a veces es "sí se puede, pero no te alcanza".
- Sin `creditoId` toma el de mayor saldo. Un `creditoId` de otra persona lanza, como `consultar_creditos`.
- Registro en `tools/index.ts` (queda 24) y prueba en `apps/mcp/src/tools/__tests__/`: el caso de Ana a 12 meses da 550,320, y a 15 meses da **exactamente** su `mensualidadCentavos` real — esa segunda aserción es la que amarra la tool a los datos.
- Prompt (`apps/web/src/lib/agente/prompt.ts`): una línea en la lista de tools y una regla dura — *"una mensualidad, un plazo o un interés que no venga de una tool no se escribe: se pide"*.

## 2 · `Conclusion` deja de formatear dinero

- `DatoDeApoyo`: se agrega **`montoCentavos: Centavos.optional()`** y `valor` pasa a ser `.optional()`, con un `.refine` que exige exactamente uno de los dos. `valor` se redescribe: *"solo para lo que NO es dinero (porcentajes, puntajes, fechas). Para dinero, `montoCentavos`"*.
- `conclusion/componente.tsx`: si viene `montoCentavos`, lo pinta con `formatearMonto`. Con eso el error es **imposible por construcción**, venga la prop enlazada o literal.
- **Rechazo explícito** de un `valor` que empiece con `$`: el error vuelve al modelo diciéndole que use `montoCentavos`. Va donde sí se ve el valor final (ver paso 3: validación sobre props resueltas), porque `datos` casi siempre llega enlazado.
- El `titular` y el `detalle` seguirán siendo texto libre —son prosa, no se pueden tipar—, así que además una regla en el prompt: *"en el titular y el detalle, todo monto se escribe como lo formatea la interfaz (`$5,503.20`), y sale de una tool; los centavos NUNCA se escriben como pesos"*.
- `ejemplos/conclusion.jsonl` migra a `montoCentavos` (es few-shot: si el ejemplo formatea a mano, le enseña a formatear a mano), `pnpm catalogo`, y el README y `docs/como-funciona/componente-conclusion.md`.

## 3 · Validar las props **resueltas**, no saltárselas

El agujero de fondo: hoy una prop enlazada no se valida nunca, y el modelo enlaza casi todo.

- En `armarMensajes` (`pintar_pantalla`) y en `armarParches` (`ajustar_pantalla`) el data model **está disponible**. Se resuelven las props con `resolver()` de `@maya/a2ui` y se valida el resultado contra el schema Zod del componente.
- Una prop cuyo path resuelve a `undefined` se sigue saltando: puede ser un path relativo de plantilla (`children: { componentId, path }`, que solo resuelve contra su elemento) o un dato que llega después. Ese es el único caso que queda fuera, y queda documentado.
- **Riesgo, y es real:** esto va a cazar errores del modelo que hoy pasan invisibles, así que puede subir los reintentos. Se mide con `pnpm probar-guion` antes de darlo por bueno; si aparecen errores nuevos y legítimos, se corrigen ahí y no aflojando la validación.

## 4 · `SimuladorMeta` acota y avisa

- **Componente:** `usarEstadoSeguido` recibe la aportación ya acotada al rango `[aportacionMinimaCentavos, aportacionMaximaCentavos]`. La pantalla nunca vuelve a mostrar un valor fuera de su slider.
- **Schema:** `.refine` que exige `minima <= aportacion <= maxima` y `minima < maxima`. Con el paso 3 esto sí se dispara aunque las props vengan enlazadas.
- Prueba de las dos mitades: el componente acota, y `armarMensajes` rechaza el caso de la captura ($477 con piso de $500).
- Además, una línea en el `cuandoUsarlo`: `SimuladorMeta` es para una **meta de ahorro**; para adelantar un crédito ahora existe la tool del paso 1 y la tarjeta correcta es `ProyeccionPagoCredito`. Es la misma clase de mal uso que el prompt ya prohíbe para `MetaActiva`.

## 5 · El hilo de Maya sobrevive a la pestaña y al recargar

Hoy `usarAgente` vive en `useState` dentro de `ConsolaMaya`, que es la página `/maya`: cambiar de pestaña la desmonta y se pierde todo.

- **Provider en el layout.** `apps/web/src/components/maya/proveedor-agente.tsx` (cliente) llama `usarAgente(usuarioId)` y lo expone por contexto; se monta en `(app)/layout.tsx`, que **no se desmonta** al navegar (las pestañas usan `next/link`). `ConsolaMaya` consume el contexto.
- **`sessionStorage`** en `apps/web/src/lib/agente/persistencia.ts`, con la llave por usuario (`maya:hilo:v1:<usuarioId>`) para que un hilo de otra persona no pueda reaparecer nunca. Se guardan `hilo`, `conversacionId`, `sugerencias` y `razon`.
- **El detalle que puede romperlo en silencio:** `EstadoSuperficie.componentes` es un `Map` (no es JSON) y `calcularSuperficieViva` compara **por referencia**. Al hidratar, el `estado` vivo se reconstruye apuntando **al mismo objeto** que la última pantalla congelada del hilo, no a una copia; si fueran dos objetos, la última pantalla se pintaría dos veces. Es una función pura con pruebas, junto a las de `colocarPantalla`.
- Lo que **no** se mueve: la voz (`usarConversacionVoz`) se queda en `ConsolaMaya`, porque tiene que cortar el micrófono al salir de `/maya`.

## 6 · Cambiar de usuario limpia y manda a Inicio

- `cambiarUsuario` (server action) agrega `redirect("/")` después de la cookie y el `revalidatePath`.
- El provider recibe `usuarioId` del layout; cuando cambia, `reiniciar()` y borra la llave del usuario anterior en `sessionStorage`. Ya existe `reiniciar()` en `usarAgente`.
- Prueba: con hilo lleno, cambiar de usuario deja el hilo vacío, un `conversacionId` nuevo y la ruta en `/`.

## 7 · Verificar

```bash
pnpm typecheck && pnpm test          # las 5 suites
pnpm catalogo                        # y git diff vacío
pnpm reiniciar-estado                # antes de cualquier ensayo
pnpm humo                            # la tool nueva por HTTP
pnpm probar-guion                    # ¿subieron los reintentos por el paso 3?
```

Y a mano, los tres casos de esta sesión:

1. Ana: «¿cómo termino mi crédito en un año?» → llama `simular_liquidacion_credito`, la `Conclusion` dice **$5,503.20** y ninguna cifra trae el punto fuera de lugar.
2. Escribir en Maya, ir a Movimientos, volver a Maya → el hilo sigue ahí. Recargar con F5 → sigue.
3. Cambiar de usuario → chat vacío y en Inicio.

**Aviso sobre el modelo:** la cuota de Gemini está agotada (issue #12, reabierto). Los pasos 1–6 se prueban con las suites y el modelo simulado, pero **la verificación 1 y `probar-guion` necesitan cuota o `MODELO=claude`**. Sin eso, el paso 3 se queda sin su medición más importante.

## 8 · Documentar y registrar

- `docs/como-funciona/tools-mcp.md` (la tool nueva), `componente-conclusion.md` (dinero en centavos), `ciclo-live.md` (la validación sobre props resueltas), y `contrato-agente-cliente.md` si el contrato de la petición cambia.
- `docs/algoritmos/` — la mensualidad ya está en `amortizacion.md`; se agrega la sección del plazo objetivo, que es una aplicación de la misma fórmula.
- **Issue por cada hallazgo** (`docs/issues/` + `gh issue create`, que en esta máquina no está: se anota como pendiente): (a) el modelo formateando dinero a mano en `Conclusion`, severidad **alta**, porque llegó a pantalla; (b) `revisarProps` se salta las props enlazadas, severidad **alta**, que es la causa de que (a) y el $477 pasaran invisibles.
- Nuevo doc `docs/como-funciona/persistencia-del-hilo.md`, dos niveles.
- Bitácora de equipo y del rol, y `docs/tablero.md` (mi fila, cuando haya identidad en `.sesion`).
