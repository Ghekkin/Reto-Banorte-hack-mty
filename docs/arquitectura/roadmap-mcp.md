---
estado: propuesta
fecha: 2026-09-12 08:15
---

# Roadmap de pulido del MCP — contraste entre lo que hay y lo que los datos permiten

> **Lectura de 30 segundos.** El MCP es la pieza **más terminada** del proyecto: las 9
> tools del ADR 0004 existen, tienen pruebas y el ciclo de acción está verificado por
> HTTP. No es el cuello de botella; el cuello de botella son los 7 componentes del
> catálogo que faltan. **Por eso este roadmap empieza con una instrucción de no hacer
> nada**: ninguna mejora de aquí entra antes de que la fase 1 esté cerrada. Lo que sigue
> es qué hacer con las horas del MCP *cuando* sobren, ordenado por retorno.

## 1. Estado actual

### Lo que existe

Servidor Streamable HTTP stateless en el puerto 3100, un `McpServer` por petición, token
Bearer opcional, `/health` que reporta commit y lista de tools, carga de los 22 CSV al
arrancar y estado mutable en `estado.json` superpuesto a las lecturas.

| Tool | Clase | Tablas que lee | Qué resuelve |
|---|---|---|---|
| `consultar_perfil` | lectura | `usuarios` | Con quién hablas |
| `consultar_tarjeta` | lectura | `tarjetas`, `movimientos`, estado | Si está atorada y cuánto |
| `consultar_movimientos` | lectura | `movimientos`, `categorias`, `comercios` | El detalle que respalda un número |
| `simular_reestructura` | cálculo | `tarjetas`, `buro`, `planes_reestructura` | Las opciones de plazo |
| `consultar_plan` | lectura | estado | El plan ya aplicado y su calendario |
| `comparar_periodos` | lectura | `movimientos`, `categorias`, estado | El gasto del mes y la categoría atípica |
| `proyectar_ahorro` | cálculo | `metas`, `cuentas`, `movimientos`, `buro` | Cuándo llega a su meta |
| **`aplicar_plan_pago`** | **acción** | estado | Difiere el saldo: cambio real |
| **`crear_apartado`** | **acción** | estado | Aparta dinero: cambio real |

Calidad: idempotencia por llave en las dos acciones, errores que no lanzan (devuelven
`isError` para que el agente los cuente en pantalla), anotaciones correctas
(`readOnlyHint` / `idempotentHint`), log por llamada, `usuarioId` forzado desde el agente
para que ninguna tool lea datos de otra persona, y descripciones escritas **para el
modelo** y no para un humano. Eso último es lo que hace que el agente elija bien.

**Veredicto: no hay deuda técnica que pagar en el MCP.** Lo que hay es superficie sin
explotar.

### Lo que no existe

- **Cero orquestación dentro del MCP.** Las 9 tools son atómicas e independientes.
- **Cero `resources` y cero `prompts`.** El servidor solo usa una de las tres primitivas
  del protocolo.
- **`crear_tope_gasto`**, la tercera acción que el propio ADR 0004 dejó como opcional.

## 2. El contraste: 12 tablas que ninguna tool puede ver

De los 22 CSV, el código del MCP referencia **9**. Las otras 13 (12 con contenido, más
`acciones_aplicadas`, que es la semilla vacía del estado) suman **1,322 filas hoy
invisibles para el agente**: existen en disco, se cargan en memoria al arrancar, y no hay
forma de que lleguen a una pantalla.

| Tabla | Filas | Qué contiene | Tool que la abriría |
|---|---|---|---|
| `diagnostico_habitos` | 33 | 11 meses × 3 usuarios de `puntaje_salud` (0-100), `tasa_ahorro_pct`, `ratio_deuda_ingreso_pct`, `meses_fondo_emergencia` y un `habito_detectado` **ya redactado** | `diagnostico_salud_financiera` |
| `suscripciones` | 15 | Cargos recurrentes con `dia_cargo`, `periodicidad`, `activa`, `fecha_cancelacion` | `detectar_fugas` + `cancelar_suscripcion` |
| `amortizaciones` | 348 | Tabla de pagos real de cada crédito, con `estatus` y `fecha_pago` | `consultar_creditos` |
| `creditos` | 5 | Créditos personales y de auto: saldo insoluto, CAT, mora, mensualidad | `consultar_creditos` |
| `productos_credito` | 8 | Catálogo del banco con `tasa_anual_min/max`, `score_minimo`, `ingreso_minimo` | `recomendar_producto` |
| `topes_gasto` | 4 | Límites por categoría con `alertar_en_pct` y `estatus` | `crear_tope_gasto` |
| `precios_historicos` | 848 | Serie semanal de precios por instrumento | inversiones (Carmen) |
| `modelos_portafolio` | 24 | Pesos objetivo por perfil | inversiones |
| `posiciones` | 16 | Títulos, plusvalía, peso vs. peso objetivo | inversiones |
| `instrumentos` | 16 | CETES, deuda, renta variable con riesgo y liquidez | inversiones |
| `perfiles_inversion` | 3 | Perfilamiento, horizonte, tolerancia a pérdida | inversiones |
| `portafolios` | 2 | Valor, aportado, rendimiento, desviación del modelo | inversiones |

Las seis últimas ya están registradas como desajuste de alcance en
`docs/issues/2026-09-12-alcance-datos-vs-adr-0004.md`. Las seis primeras **no**: son datos
dentro del alcance del ADR 0004 que simplemente no tienen puerta.

### El contraste por usuario

| Usuario | Perfil | Cobertura hoy |
|---|---|---|
| **Beto** — supervisor, $34,500/mes, tarjeta al límite con mora | El caso de la fase 1 | **Completa.** Todo su viaje tiene tools |
| **Ana** — diseñadora, $32,000/mes, sin deuda de tarjeta | El caso de la fase 3 | **Parcial.** El ahorro sí; su crédito personal con $55,783 de saldo insoluto y su portafolio son invisibles. Si pregunta "¿cuánto debo en total?", el agente contesta mal porque solo ve la tarjeta |
| **Carmen** — arquitecta independiente, $115,000/mes **variable**, segmento patrimonial | Fuera del ADR 0004 | **Ninguna específica.** Las tools funcionan con ella, pero nada habla de ingreso variable ni de patrimonio |

El hueco de Ana es el más incómodo: no es una tabla de sobra, es una **respuesta
equivocada** que el agente puede dar hoy ante una pregunta razonable.

## 3. Las tools que faltan, por retorno

### Sí: tools de análisis

**`diagnostico_salud_financiera(usuarioId, periodo?)`** — la de mayor retorno del
documento. Lee `diagnostico_habitos`, que ya trae **11 meses de historia calculada** por
usuario. Devuelve puntaje 0-100, su tendencia contra meses previos, los cuatro ratios y el
`habito_detectado`. Valor: hoy el agente decide qué pantalla construir con
`consultar_perfil` + `consultar_tarjeta`, o sea con *deuda sí / deuda no*. Con esto decide
con un retrato completo, y la adaptabilidad de la UI —que vale 20% de la rúbrica— deja de
depender de un solo campo. Costo: ~60 líneas, la tabla ya está calculada. **No hay que
inventar el algoritmo, hay que abrir la puerta.**

**`detectar_fugas(usuarioId)`** — cruza `suscripciones` activas con movimientos
recurrentes y atípicos. Devuelve el total mensual comprometido y cuáles no tuvieron uso
reciente. Es la pantalla más vendible que los datos permiten y que nadie ha construido.

**`consultar_creditos(usuarioId)`** — cierra el hueco de Ana. Suma la deuda total real
(tarjeta + créditos) con la amortización de cada uno. Sin esto el agente tiene una visión
parcial de la deuda y no lo sabe.

### Sí: la tercera y la cuarta acción

**`crear_tope_gasto`** — ya estaba planeada y la tabla existe. Convierte la fase 2, que hoy
es **solo lectura**, en un flujo accionable. El reto exige al menos un flujo con cambio
real; tener tres en tres pantallas distintas es la diferencia entre cumplir y destacar.

**`cancelar_suscripcion`** — la pareja accionable de `detectar_fugas`. El cambio es visible
e inmediato: la siguiente lectura de gasto mensual baja.

### No: tools de "mejora de lenguaje"

**Recomendación explícita: no las hagan.** Una tool MCP que redacte o pula texto le pide al
servidor que haga peor lo que el LLM ya hace bien, y cuesta caro:

1. Mete un salto de red y un segundo modelo en el camino crítico de la demo.
2. Rompe la regla que hoy sostiene la credibilidad del sistema — *"todo monto, plazo, tasa
   o fecha que pongas en pantalla sale de una tool"*. Esa regla funciona porque el MCP
   devuelve **hechos verificables** y el modelo pone **las palabras**. Si el MCP empieza a
   devolver prosa generada, deja de ser auditable y la frase deja de ser cierta.
3. Vuelve no determinista una capa que hoy es determinista y está cubierta por pruebas.

La separación actual —el MCP devuelve números, el prompt pone el lenguaje, el componente lo
formatea— es un argumento de arquitectura que se defiende ante el jurado. No la rompan por
comodidad.

**La excepción que sí vale**: `explicar_termino(termino)` con definiciones **escritas a
mano** de CAT, saldo revolvente, pago mínimo y capital vs. interés. Eso es dato, no
generación: es auditable, es barato y toca el ángulo de inclusión financiera. Valor medio,
costo casi nulo.

## 4. Orquestación

### Qué hay hoy

**No hay orquestador en el MCP.** El único orquestador del sistema es el **LLM**, en
`apps/web/src/lib/agente/agente.ts`: un bucle de tools del AI SDK con `stepCountIs(8)` y
una regla propia —entregar la pantalla también es una tool (`pintar_pantalla`), así que el
turno termina solo cuando hay una pantalla válida.

Eso es correcto y es lo que el reto pide. Pero tiene un costo medible en la demo:

```
Turno típico de Beto:
  paso 1  consultar_perfil        → round trip al MCP
  paso 2  consultar_tarjeta       → round trip
  paso 3  simular_reestructura    → round trip
  paso 4  pintar_pantalla
```

Cuatro pasos secuenciales: el modelo espera cada resultado antes de decidir el siguiente.
En vivo, ese es el tiempo en que el jurado mira una pantalla que no cambia. Y el orden
depende de que el modelo se acuerde de llamar `consultar_perfil` primero — hoy eso es una
instrucción del prompt, no una garantía.

### Propuestas

**O1 · `panorama_inicial(usuarioId)` — orquestador de lectura, sin tools nuevas.**
Compone internamente perfil + tarjeta + señal de alerta y devuelve un solo objeto con un
campo `situacion` (`deuda_critica` | `uso_alto` | `plan_activo` | `sin_deuda_con_capacidad`).
Colapsa tres viajes en uno. Reusa `dominio/consultas.ts`, que ya existe: ~80 líneas.
*La objeción y su respuesta:* si el MCP calcula `situacion`, ¿sigue interpretando el LLM?
Sí, y hay que decirlo así: el MCP clasifica la **situación financiera**, que es un dato; el
LLM interpreta la **intención** y elige la pantalla, que es el juicio. Son cosas distintas
y la frontera queda más clara que hoy, no más borrosa.

**O2 · `ejecutar_decision(accion, contexto)` — orquestador de acción.**
Recibe la acción que viene de la UI, despacha a la tool de mutación que corresponde y
devuelve **el estado posterior ya leído**. El ciclo pasa de `acción → aplicar_plan_pago →
consultar_plan → pintar` (3 pasos) a `acción → ejecutar_decision → pintar` (2). Acorta el
momento más importante y más frágil del producto.
*Contra:* acopla el MCP a los nombres de acción de la UI. Se mitiga si solo despacha a
tools existentes y no agrega lógica de negocio propia.

**O3 · Prefetch en el agente, fuera del MCP. La más barata de las cuatro.**
Un paso determinista en `agente.ts` que llama `panorama_inicial` **siempre**, antes del
primer turno del modelo, y lo inyecta en el bloque de contexto de `historial.ts`. No es
orquestación de LLM: es precarga. Garantiza que el modelo nunca decida a ciegas, elimina un
paso del bucle y no cambia nada de la narrativa del reto. Si solo se hace una cosa de este
documento, es esta más O1.

**O4 · Fachada de dos niveles — solo si entran las tools nuevas.**
Con 14–16 tools, un modelo empieza a elegir mal y los pasos por turno suben. El patrón que
lo resuelve es fachada + drill-down: el MCP expone 3–4 tools compuestas de alto nivel
(`panorama_inicial`, `analizar_deuda`, `analizar_gasto`, `analizar_ahorro`) que por dentro
llaman a las atómicas, y las atómicas siguen expuestas para el detalle. El prompt le dice al
modelo: empieza por la compuesta, baja a la atómica solo si necesitas el detalle. Con eso
los pasos por turno se quedan en 2–3 aunque el catálogo de tools se duplique.

## 5. El roadmap

**Hora de escritura: sábado 08:15 (H12).** Fase 1 vence a las 10:00 (H14), congelación
domingo 02:00 (H30), entrega 08:00 (H36).

### Nivel 0 — ahora mismo: no tocar el MCP

El tablero dice que faltan **7 de 8 componentes del catálogo** y que no hay llave de modelo
en el `.env`. Ninguna tool nueva mejora la demo mientras el agente no tenga con qué pintar.
**La mejor contribución del rol `mcp` en las próximas horas es prestarle manos al rol
`web`.** Si alguien va a tocar el MCP antes de H18, que sea para conseguir la llave del
modelo y correr el nivel 4 de `probar`.

### Nivel 1 — H18–H20 (sáb 14:00–16:00) · ~90 min · retorno alto

| # | Qué | Por qué ahora |
|---|---|---|
| 1 | **O3 prefetch** de `consultar_perfil` en `agente.ts` | 20 min, quita un paso de todos los turnos y elimina el riesgo de que el modelo decida a ciegas |
| 2 | **O1 `panorama_inicial`** | Colapsa 3 viajes en 1; es el ahorro de latencia que se ve en vivo |

Corte: si a las 16:00 la fase 2 no está cerrada, el nivel 2 no empieza.

### Nivel 2 — H20–H24 (sáb 16:00–20:00) · retorno alto

| # | Qué | Por qué |
|---|---|---|
| 3 | **`diagnostico_salud_financiera`** | 33 filas ya calculadas con 11 meses de historia. Sube la adaptabilidad de la UI, que vale 20% de la rúbrica |
| 4 | **`crear_tope_gasto`** | Convierte la fase 2 de solo lectura a accionable. Tercera acción con cambio real |

### Nivel 3 — H24–H28 (sáb 20:00–dom 00:00) · solo si la fase 3 está cerrada

| # | Qué | Por qué |
|---|---|---|
| 5 | **`detectar_fugas`** + **`cancelar_suscripcion`** | La pantalla más vendible que los datos permiten, con su acción. Cuarta acción con cambio real |
| 6 | **`consultar_creditos`** | Cierra la respuesta equivocada de Ana sobre su deuda total |
| 7 | **O2 `ejecutar_decision`** | Acorta el ciclo de acción de 3 pasos a 2 |

Si entran 5 y 6, el número de tools llega a 13–14: **evaluar O4** antes de seguir.

### Nivel 4 — después de la congelación, o nunca

`recomendar_producto`, las seis tablas de inversión y el perfil de Carmen. Son una cuarta
intención y el ADR 0004 las excluyó por una razón que sigue siendo válida. La decisión
pendiente del issue de alcance se resuelve así: **opción 1, dejarlo**, con la respuesta
lista para el jurado —"el esquema modela un banco, no una demo; la demo usa el subconjunto
que su caso de uso necesita"—. Recortar a estas alturas es riesgo sin premio.

### Nunca

Tools de generación o mejora de lenguaje dentro del MCP, por las tres razones de la
sección 3.

## 6. Pulido de bajo costo, en cualquier hueco

Cosas de menos de 20 minutos que suben la nota de arquitectura sin tocar la ruta crítica:

- **Exponer el catálogo A2UI como `resource` de MCP.** El servidor solo usa una de las tres
  primitivas del protocolo; usar dos se nota en la evaluación técnica y cuesta poco.
- **`/health` con la cuenta de filas por tabla.** Hoy reporta las tools; si además dice qué
  datos cargó, una demo que falla se diagnostica de un vistazo.
- **Prueba de humo que recorra el guion completo**, no una tool suelta.
- **Que el prompt diga qué NO existe.** Cuando una tool no está, el modelo lo descubre
  fallando; es más barato decírselo.
