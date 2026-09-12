# Bitácora de parlack

## 2026-09-12

### 12:05 · hecho — `estable` existe, y lo que costo llegar: tres bugs y un `main` roto

El corte H14 pedia fase 1 completa y `estable` marcado. Esta hecho: **`estable` apunta a
`6ed173d`, que es exactamente lo que corre en produccion**, verificado paso por paso con
el modelo real.

**El ensayo final, los cinco pasos:**

| Paso | Tools | Pinta | Tiempo |
|---|---|---|---|
| Beto pide bajar intereses | `panorama_inicial` → `simular_reestructura` | `ResumenTarjeta` + `PlanDePago` | 3.6 s |
| Aplica 18 meses | `aplicar_plan_pago` → `consultar_plan` | `Confirmacion` + **`ResumenTarjeta` con saldo 0, mora 0, plan activo** + `Calendario` | 4.4 s |
| Su gasto | `comparar_periodos` | `GastoPorCategoria` | 3.1 s |
| Ana, la misma frase | `panorama_inicial` → `proyectar_ahorro` | `SimuladorMeta` | 7.7 s |
| Ana crea el apartado | `crear_apartado` | `Confirmacion` + `MetaActiva` | 3.2 s |

Todos bajo 12 s; el primero bajo de 10.5 a 3.6. Ana corrida tres veces seguidas antes de
dar por buena la adaptabilidad: `SimuladorMeta` las tres.

**Tres bugs, los tres registrados y cerrados:**

- **#9 · `pnpm reiniciar-estado` decia que vaciaba la tabla y no borraba nada.** Sin
  `DATABASE_URL` exportada se saltaba el `truncate` y limpiaba una cache en memoria del
  proceso que moria enseguida, imprimiendo exito. Es el primer paso del checklist de
  cada ensayo: se ensayaba con el plan de Beto ya aplicado y nadie se enteraba. Ahora
  carga el `.env`, exige la variable, verifica que quedo vacia y dice cuantas filas borro
  y contra que base.
- **#10 · el plan B sin red no funcionaba.** `pnpm datos:restaurar` listaba
  `modelos_portafolio` antes que `instrumentos`, del que depende por llave foranea.
  Contra la base de la demo no se notaba (`on conflict do nothing`), solo contra una base
  vacia, que es el unico caso para el que existe. Rehice `ORDEN` desde el grafo real y
  **ensaye el plan B entero**: Postgres 17 limpio, `schema.sql`, migraciones, restaurar
  (3,690 filas), el MCP arranca contra esa base con 18 tools y `consultar_tarjeta`
  devuelve a Beto. Era el riesgo abierto del ADR 0010 desde ayer.
- **#11 · `main` roto.** Otra sesion subio `prompt.ts` con marcadores de conflicto
  dentro; el typecheck fallaba y **el CI cortaba antes del deploy**, asi que lo publicado
  se quedaba atras sin que nadie lo notara. El lado perdedor del conflicto venia de un
  stash viejo y mandaba llamar `ejecutar_decision`, una tool que no existe: habria roto
  el ciclo de accion. Lo mismo pasaba con `analizar_gasto` y `analizar_ahorro`, que el
  prompt nombraba fuera del conflicto. Resuelto desde un `git worktree` aparte, **sin
  tocar el arbol compartido**, y respetando el prefetch de `panorama_inicial`, que si
  esta implementado y es trabajo bueno de esa sesion.

**Cuatro cosas del producto que cambiaron**, todas medidas antes y despues:

1. **La tira LLM · MCP · A2UI** sobre el lienzo, encendiendose con el stream real y
   nombrando las tools de cada turno. Sale de `transparencia`, que el hook ya guardaba;
   no toque el hook. Cubre los segundos en que antes solo se movia el spinner del boton.
2. **La tarjeta vuelve cambiada tras la accion, siempre.** Era una moneda al aire: una de
   cada dos veces el agente repintaba solo la confirmacion, y cuando si repintaba la
   tarjeta la enlazaba con `{path}` al data model, que todavia trae lo de ANTES — o sea
   "Plan activo" con el saldo intacto, peor que no repintarla. El prompt ahora exige
   valores literales.
3. **Segunda persona.** Salia "Alberto tiene la tarjeta al 96.7 %" en tres de cuatro
   turnos, y una vez "Muestro el desglose". Ahora habla de la persona y su dinero.
4. **Fuera la razon duplicada** del pie del lienzo: cada tarjeta ya trae la suya junto al
   dato, y las dos decian cosas distintas en la misma pantalla.

**Y una decision que documente como decision, no como olvido:** Carmen ya no pregunta por
su portafolio. Lo probe y el agente, sin componente de portafolio, pintaba su valor de
mercado dentro de `MetaActiva`: una barra de avance hacia una meta ya alcanzada, la unica
interfaz del proyecto que mentia. Quitar el chip cuesta una linea; un componente nuevo a
la hora 12.5 es abrir alcance, justo lo que el consejo oficial desaconseja. Su portafolio
se ve en Productos → Inversiones, que es una pantalla programada y honesta sobre serlo.
Tercera enmienda del ADR 0004.

**Lo que deje escrito para el jurado:** `vision-general.md` y `trade-offs.md` pasaron de
"plan; nada construido aun" a `construido`, con lo medido y no con lo planeado, mas las
tres preguntas que el video dice que van a hacer. Y `pitch.md`, que estaba vacio, ya
tiene el guion hablado literal, la frase de cada pantalla, once preguntas de jueces con
su respuesta y que hacer si algo falla en vivo.

**`marcar-estable.sh` ya no commitea nada.** Llamaba a `sync.sh`, que hace `git add -A`:
con cuatro sesiones sobre el mismo arbol, marcar estable habria publicado el trabajo a
medio hacer de los demas (issue #8). Ahora etiqueta un commit, comprueba que ese commit
este en `origin/main` y avisa si el arbol esta sucio en vez de barrerlo.

**Lo que sigue y no es mio:** el primer turno sigue siendo el mas lento y variable; y la
sesion que trabaja las tools compuestas (`analizar_gasto`, `analizar_ahorro`,
`ejecutar_decision`) tiene que volver a tocar dos puntos del prompt cuando existan.


### 08:55 · hecho — Primer ensayo completo del guion contra producción, y el reinicio que mentía

Corrí los cinco pasos del viaje contra `https://maya.157.173.204.174.sslip.io` con el
modelo real, encadenando el estado de la superficie como lo hace el cliente (mensajes,
`superficie`, `dataModel` y la acción con su `idempotencyKey`). **Pasan los cinco.** Dos
de ellos nunca se habían verificado.

| Paso | Tools | Pinta | Tiempo |
|---|---|---|---|
| Beto: "Quiero pagar menos intereses de mi tarjeta" | `panorama_inicial` → `simular_reestructura` | `ResumenTarjeta` + `PlanDePago` | 10.5 s |
| Beto aplica 18 meses | `aplicar_plan_pago` → `consultar_plan` | `Confirmacion` + **`ResumenTarjeta` con `planActivo: true` y saldo 0** + `Calendario` | 5.8 s |
| **Beto: "¿y en qué se me está yendo el dinero?"** (nuevo) | `comparar_periodos` | `GastoPorCategoria` | 3.6 s |
| Ana, la misma primera frase | `panorama_inicial` → `consultar_tarjeta` → `consultar_creditos` → `proyectar_ahorro` | `SimuladorMeta` | 5.8 s |
| **Ana crea el apartado** (nunca verificado) | `crear_apartado` | `Confirmacion` + `MetaActiva` | 2.9 s |

Tres cosas que corrigen lo que yo mismo había escrito:

- **La tarjeta sí vuelve cambiada.** Yo había dado por hecho que tras aplicar el plan el
  agente solo repinta `Confirmacion` + `Calendario`, porque así salió en la corrida de
  las 05:30. En esta vino también `ResumenTarjeta` con `planActivo: true`, saldo cero y
  sin el chip de atraso. **No está roto: es no determinista.** Es el momento más fuerte
  del guion y hoy sale o no sale según el turno. Vale fijarlo en el prompt.
- **El segundo ciclo de Beto refleja el plan**, pero solo en la línea `razon` del stream
  ("intereses que ahora comenzarán a bajar con tu plan"). La `razon` de la propia tarjeta
  no lo menciona, y `GastoPorCategoria` no tiene campo donde poner esa nota. El guion la
  promete "en la misma tarjeta".
- **El viaje de Ana cierra entero.** Crear el apartado devuelve `MetaActiva` con su avance
  y la fecha objetivo. Es la segunda acción con cambio real del ADR 0004.

**Lo que encontré de paso, y es lo más grave del día: `pnpm reiniciar-estado` no borra
nada y dice que sí.** Sin `DATABASE_URL` exportada en el shell, `reiniciarEstado()` se
salta el `truncate` y solo limpia una copia en memoria del proceso que está a punto de
morir; el script imprime igual "quedo vacia" y sale con 0. `pnpm` no carga el `.env`, y
este script —al revés que `migrar.mjs`, `restaurar.mjs` y `volcar-fixture.mjs`— tampoco
lo lee a mano. Lo reproduje contra producción: mismo comando, dos filas antes y dos filas
después; con `set -a; . ./.env; set +a` delante, cero. Es el **primer paso del checklist
previo a cada ensayo y al pitch**: un ensayo que arranca sin reiniciar de verdad le da a
Beto el plan ya aplicado, y la primera pantalla del guion deja de ser `PlanDePago`.
Issue #9, severidad crítica.

Dejé el estado de producción limpio y verificado por HTTP: `consultar_plan` devuelve
`hayPlan: false` para Beto y para Ana.

**Dos cosas más que vi y no toqué** (son de `web` y de `contrato`, y el frontend lo
rediseña otra sesión): el hook `usarAgente` no atiende las líneas `estado` ni `tool` del
stream —los badges LLM · MCP · A2UI y el "pensando" del guion no existen, y el turno más
lento son 10.5 s sin más señal que el spinner del botón—; y la `razon` sale en tercera
persona ("Alberto tiene la tarjeta al 96.7 %", "Ana no tiene tarjeta") en tres de cuatro
turnos, contra la regla de tutear del propio prompt.


### 06:10 · hecho — Los 8 componentes a móvil de verdad, y un error propio en `main`

**Lo que se pidió:** `GastoPorCategoria` no gustaba. El problema no era estético: **los
montos vivían en el tooltip de Recharts, y un tooltip no existe en móvil.** Una tarjeta
financiera donde no se puede leer una cifra sin pasar el mouse rompe la regla central del
sistema ("el número manda") justo en el dispositivo donde se va a ver. Y el área tocable
era la barra —unos píxeles de alto—, de donde sale la acción `ver_categoria`.

Ahora es una lista: cada fila con su monto siempre visible, su variación cuando pasa del
5 %, una barra (`progress` de shadcn) medida **contra la categoría más grande** —no contra
el total, o con seis categorías todas salen cortas— y la fila completa como botón de 48 px.

De paso, los ocho a móvil de verdad. Lo que encontré revisando contra la skill:

- **`Card` de shadcn ya trae su propio padding** (`--card-spacing`) y mis `p-5` lo estaban
  **duplicando**. Ahora `CLASES_TARJETA` mueve esa variable (`p-4` móvil, `p-5` escritorio)
  en un solo lugar y apaga el `ring` por defecto.
- **`Calendario` y `DetalleCategoria` tenían tablas de 4 columnas**: a 360 px eso obliga a
  scroll horizontal, que es justo lo que el sistema prohíbe. Pasaron a 2.
- **`PlanDePago` no tenía número grande.** Ahora es el **ahorro** del plazo elegido, que es
  el dato que decide la conversación y cambia al mover la selección. En `SimuladorMeta`, la
  **fecha**, que es lo que cambia al arrastrar.

Cinco pruebas nuevas verifican las reglas sobre el HTML, no la intención: los seis montos
de `GastoPorCategoria` están en el HTML (el bug del tooltip no puede volver), ninguna tabla
pasa de dos columnas, todo `<button>`/`<label>` lleva `min-h-12`, cero hex, y las ocho
tarjetas comparten densidad.

**Y el error, que importa más que lo anterior:** mi `git commit` se llevó **35 archivos que
no eran míos** y dejó `main` sin arrancar. Hice `git add packages/catalogo/src` creyendo
que eso aislaba mi trabajo. No aísla: las cuatro sesiones comparten el árbol **y el
`.git/index`**, y `git commit` commitea el índice completo. Otra sesión tenía los CSV de
`db/datos/`, los generadores de `scripts/` y `datos/{csv,memoria}.ts` **borrados y ya en el
índice** para su migración a PostgreSQL; el `postgres.ts` que los reemplaza no estaba. Se
publicó a medias: typecheck, build y el arranque del MCP, los tres roto.

Lo arreglé en `ee11afc` restaurando los 35 archivos como estaban (`git checkout 8cdaabc --
<rutas>`), sin `--force` sobre `main` y sin tocar el trabajo de nadie; la migración vuelve
a ser de quien la está haciendo. Verificado: `origin/main` typechequea limpio en un árbol
aislado.

Queda el issue **#8** con el detalle. Lo corto: en este repo **un commit manual va por
rutas** (`git commit -- <rutas>`), y para publicar sin tocar el árbol compartido,
`git worktree` + `cherry-pick` + `push origin HEAD:main`, que es lo que usé al final y
funciona bien. Mi guardia de marcadores de conflicto de `255c3ff` tapaba otro caso, no
este.


### 05:30 · hecho — Prod estaba caído; los tres pasos del guion ya corren con el modelo real

El CI quedó verde en `typecheck, tests y build` (mi arreglo del humo), el deploy se publicó
bien, y falló el paso siguiente: `un prompt del guion contra la URL publica`. No era el CI:
**era el producto, caído en producción.** El stream lo dijo completo:

```
{"tipo":"error","codigo":"tool","mensaje":"no pude conectar al MCP en http://a7ld8…:3100/mcp: fetch failed"}
```

Ese mensaje es de la auditoría de la mañana —antes esto salía como `codigo: "modelo"`, que
manda a buscar el problema al lugar equivocado—. Con la URL dentro del mensaje, el
diagnóstico fue inmediato: el hostname no resolvía.

Dos hallazgos que cuestan tiempo si no están escritos, y quedaron en el issue #5:

1. **Desde dentro de un contenedor, la IP pública del propio VPS no es alcanzable**
   (hairpin NAT). Mi primer arreglo fue apuntar `MCP_URL` a la URL pública del MCP —que
   responde 200 con token y 401 sin él desde fuera— y falló igual: hasta un HTTP simple al
   puerto 80 se cuelga. Verificar una URL con `curl` desde tu máquina **no prueba** que la
   app pueda usarla.
2. **El alias de red entre apps de Coolify se pone en `custom_network_aliases`.** La opción
   `--network-alias maya-mcp` ya estaba en `custom_docker_run_options` y no se aplicaba: dos
   deploys con el contenedor conservando un solo alias, su nombre con el timestamp. Puse el
   otro campo y el siguiente deploy sí lo trajo.

Y lo importante: **el nivel 4 de `probar` ya pasó, en producción.** La llave de Gemini está
puesta en Coolify, así que el bloqueo que yo llevaba media sesión repitiendo —"falta una
llave"— ya no existía; lo corregí en el tablero. Los tres pasos del guion, medidos:

| Paso | Tools | Componentes | Pasos · tiempo |
|---|---|---|---|
| Beto: bajar intereses | `panorama_inicial`, `simular_reestructura`, `consultar_tarjeta` | `Column`, `ResumenTarjeta`, `PlanDePago` | 4 · 6.4 s |
| Beto aplica 18 meses | `aplicar_plan_pago`, `consultar_plan` | `Column`, `Confirmacion`, `Calendario` | 3 · 4.5 s |
| **Ana, la misma frase** | `panorama_inicial`, `consultar_tarjeta`, `consultar_creditos`, `proyectar_ahorro` | **`SimuladorMeta`** | 5 · 18 s |

Los componentes que construí hace dos horas son los que el modelo eligió solo, y la `razon`
trae los números de `db/datos/` ($132,065 de ahorro, 96.7 % del límite, 12 días de mora):
coinciden con el guion, que era la condición para no llamarlo bug.

**Lo que hay que mirar:** el turno de Ana tarda **18 s**. El guion dice "~2 s por pantalla".
No lo toqué —son 5 pasos y cuatro tools— pero queda medido para quien optimice; bajar el
tope de pasos o apoyarse más en `panorama_inicial` es por donde yo empezaría.

Reinicié el estado de producción después de probar: un ensayo no debe arrancar con el plan
de Beto ya aplicado.

### 05:00 · hecho — Que no se pueda commitear un conflicto a medias

El issue #4 (`CLAUDE.md` con marcadores de conflicto en `main`, que encontró la otra
sesión) terminaba con "vale la pena un chequeo en el hook `Stop`". Lo implementé:
`scripts/sync.sh` revisa el índice antes de commitear y, si algún archivo trae
`<<<<<<< ` o `>>>>>>> `, no commitea — avisa cuáles son y deja el trabajo en el árbol.

Cubre las dos puertas por donde sale el código (el `--auto` del hook y la skill
`guardar`), que es lo que importa con cuatro sesiones escribiendo sobre el mismo árbol.
Busca solo esos dos marcadores y no el `=======` solo: en Markdown es el subrayado de un
título, y un falso positivo que bloquee el commit de todos sería peor que el bug.

Probado con el remoto desconectado para que no hubiera forma de que un fallo del guardia
subiera basura: el archivo con marcadores no commitea, `HEAD` no se mueve, el título
Markdown pasa sin ruido.

### 04:40 · hecho — Galería `/catalogo` y el CI desbloqueado

**El CI estaba rojo desde cuatro commits y bloqueaba el deploy a prod.** Typecheck, tests
y build pasaban; fallaba el paso `humo del MCP`, y la culpa era mía: `scripts/humo.sh`
afirmaba `tools publicadas = 12` contra un número cableado, y `aldair` y `luis` metieron
sus paquetes (15 tools ahora). La aserción castigaba trabajo bien hecho de otro.

Ahora comprueba que **estén** las 9 tools del viaje del ADR 0004, por nombre, e imprime el
total sin juzgarlo. Lo que tiene que fallar es que FALTE una, no que aparezca una nueva.
Verificado en local contra el MCP al día: humo completo en verde, incluidas las
aserciones que ellos agregaron (panorama, salud, créditos).

**Galería `/catalogo`**: cada componente del catálogo pintado con `procesarVarios` +
`<Superficie>` —el renderer de verdad— desde el mismo `.jsonl` que validan las pruebas y
que va al prompt. Nada maquetado a mano: si se ve bien aquí, es porque el renderer y el
componente funcionan. Cada ficha trae el `cuandoUsarlo`, la tabla de props del schema, el
`.jsonl` desplegable, el render con datos y **el estado de carga al lado** (los tres
estados de la skill `ui-generativa`, de un vistazo).

Lo mejor para el pitch: al tocar el botón de un componente, el pie muestra el mensaje
`{ version, action }` de `client_to_server.json` con su `idempotencyKey`. El ciclo cerrado
explicado sin gastar un turno de modelo.

Vive **fuera** del grupo `(app)`, sin shell ni navegación, y no toca `components/`: el
frontend del producto lo rediseña otra sesión y no me meto. Verificado en el dev server:
los 8 componentes, cero "componente desconocido", cero errores de render, 25 skeletons en
los estados de carga, la gráfica de Recharts y el `data-ancho=amplio` respetado.

### 04:10 · hecho — Los 7 componentes que faltaban y lo demás de la lista del A2UI

Lo que quedaba de "¿qué falta para el A2UI?", cerrado:

- **Los 7 componentes del catálogo** (`9d5351e`): `ResumenTarjeta`, `PlanDePago`,
  `Calendario`, `GastoPorCategoria`, `DetalleCategoria`, `SimuladorMeta`, `MetaActiva`.
  Sobre shadcn, cero hex, tres estados, props alineadas con las tools. Cada uno con su
  `.jsonl` validado contra los schemas oficiales y una prueba nueva que **pinta** cada
  ejemplo con `react-dom/server` (`render.spec.tsx`): un componente que truena al recibir
  sus props no lo detecta ningún schema. La `Confirmacion` de referencia usaba divs a mano
  para el skeleton; ahora usa el de shadcn. Doc en `docs/como-funciona/catalogo.md`.
- **Ejemplos en el prompt** como few-shot, solo los que usan componentes que existen.
- **`mensajeClienteAServidor()`** en a2ui: nuestra acción envuelta como manda
  `client_to_server.json` pasa el validador oficial sin un error (test).
- Frontera de error por componente, canal `VALIDATION_FAILED` de ida y vuelta y
  `GET /api/agente` con capacidades: los empecé yo y los terminó y commiteó la otra sesión
  (`0568d25`), incluida una prueba en DOM real de la frontera. Bien.
- **Panel de transparencia: NO lo hice.** Lo tenía escrito y lo descarté: es frontend del
  producto, y el frontend lo está rediseñando otra sesión. Los datos que necesita ya están
  en el stream y `usarAgente` los guarda en `transparencia` (las líneas `tool`, `a2ui`,
  `error` y `fin` con pasos y ms); armar el panel es leer ese arreglo. Queda para `web`.
  De paso: el placeholder del lienzo (`components/maya/lienzo.tsx`) dice que los
  componentes del catálogo "se conectan en el siguiente paso", y eso ya no es cierto
  desde `9d5351e`: los 8 existen. Es una línea de texto, de `web`.

Decisiones de diseño de los componentes que vale la pena defender: la **selección del plazo
y la posición del slider viven en el componente** (estado de interfaz), y solo la
confirmación viaja al agente; ir por cada clic sería un turno por toque. El `SimuladorMeta`
recalcula la fecha localmente con la misma aritmética que `proyectar_ahorro` (división sin
rendimiento) para que el slider se sienta; el número autoritativo vuelve de la tool.


> Aviso sobre las horas: las entradas de más abajo de este mismo día (05:20 a 09:45)
> están en hora del servidor (UTC+2), no de Monterrey. Réstales 8 horas. De aquí en
> adelante, hora de Monterrey como manda el repo.

### 03:55 — Conflicto con el rediseño de la interfaz al subir lo anterior

`sync.sh` reportó CONFLICTO: el rediseño movió la shell (`components/shell/lienzo.tsx` →
`components/maya/lienzo.tsx`, `app/page.tsx` → `app/(app)/...` con `consola-maya.tsx`,
`usar-agente` → `lib/agente/`). Dominio `web`, así que ganó GitHub: borré mis dos archivos
viejos y reapliqué solo la prop `alFallar` en el lienzo nuevo y en la consola. Git detectó
el rename de `usar-agente.ts` solo.

Trampa al verificar: `pnpm typecheck` de `web` falló por `.next/types/validator.ts`, un
archivo **generado** que aún apuntaba a la página vieja. No es código de nadie: `npx next
typegen` lo regenera. Para que no le pase al siguiente, el script `typecheck` de `web`
ahora corre `next typegen` antes de `tsc`.

### 03:40 · hecho — El ciclo de error A2UI cerrado y una frontera de error por componente

Retomé el árbol con cambios sin commitear de la sesión anterior (el canal
`VALIDATION_FAILED` conectado al agente, `GET /api/agente` con `server_capabilities`,
rechazo con 400 de un cliente que declare otro catálogo, y `FronteraDeError` en
`Superficie`). Lo primero fue comprobar que `main` siguiera arrancando antes de que el
hook lo subiera solo: **no arrancaba**. Dos cosas:

- `@types/react-dom` se había agregado a `packages/catalogo`, pero el test que importa
  `react-dom/server` vive en `packages/a2ui`. El typecheck del paquete fallaba. Ahora
  `react-dom` y sus tipos son devDependencies de `a2ui`.
- El test de la frontera de error usaba `renderToStaticMarkup` y **no puede pasar así**:
  React no ejecuta error boundaries en render de servidor, el error se propaga tal cual.
  El componente estaba bien; la prueba estaba mal planteada. Lo moví a su propio archivo
  (`frontera-de-error.test.tsx`) con `happy-dom` + `createRoot` + `act`, que es un DOM de
  verdad. Sí metí una dependencia de pruebas a las 3 am, al contrario de lo que dije a las
  02:10: sin ella la frontera se quedaba sin prueba, y es justo lo que evita que un
  componente roto tumbe la pantalla en la demo.

Resultado: typecheck en verde en los 5 paquetes, 222 pruebas (112 a2ui, 42 catálogo,
42 mcp, 26 web). Docs al día: `contrato-agente-cliente.md` (campos `error` y
`clientCapabilities`, el `GET`, quién dispara el turno), `renderer-a2ui.md` (el canal ya
no está "medio conectado"; sección nueva de la frontera), y las cifras del mapa en
`CLAUDE.md`, que decían 1 de 8 componentes cuando ya son 8 de 8.

**Lo que NO hice:** no probé el ciclo de error con llave de modelo real (que el agente
efectivamente repinte sin el componente al recibir `error`). El prompt lo pide en
`historial.ts`; falta verlo en la página viva. Va junto con el guion.

### 09:50 · nota — Conflicto en el tablero con luis, resuelto

`sync.sh` choco en `docs/tablero.md`: luis habia tomado el rol `contrato` mientras yo
trabajaba. Resuelto como dice la skill — su fila intacta, la mia (demo) con lo nuevo, y le
pegue el dato del ensayo de las 08:55 que traia la version de GitHub para no perderlo.

Aproveche para corregir una linea del "Siguiente" de `contrato` que **mi propio cambio de
anoche dejo mintiendo**: decia que el canal `VALIDATION_FAILED` "nadie lo escucha", y a esa
hora ya estaba conectado de punta a punta. Ahora dice eso y dice el tope.

Barri todo el repo buscando marcadores de conflicto antes de continuar el rebase (por el
issue #11, `main` roto por marcadores): cero.

### 09:40 · arreglado — La consola no pintaba nada: el registro del renderer estaba vacio

Me llego una captura con la consola llena de burbujas rojas: *"la interfaz no pudo pintar
/root/component: El componente X no esta en el catalogo de esta superficie"*, una por cada
componente — `Column`, `ResumenTarjeta`, `Calendario`, `Confirmacion`, `Text`,
`GastoPorCategoria`, `PlanDePago`, `SimuladorMeta`, `DetalleCategoria`, `MetaActiva`.

**El sintoma engañaba y mucho.** Doce mensajes distintos parecen doce problemas de
catalogo; son uno solo: si falla `Column`, que es de layout, y falla `Confirmacion`, que
llevaba horas construida, entonces no falta ningun componente — **esta vacio el registro**.
`registrarLayout()` y `registrarCatalogo()` solo se llamaban en `galeria.tsx`, la pagina
`/catalogo`. La galeria se veia perfecta y la demo no pintaba una sola tarjeta.

Tres cosas, no una:

1. **Una sola funcion de registro** (`apps/web/src/lib/registrar-componentes.ts`),
   idempotente, que llaman el lienzo y la galeria. Dos listas que se podian separar eran
   dos listas de mas.
2. **El canal de fallos tenia que tener tope.** Yo habia dejado en `<Superficie>` que el
   mismo fallo no se reportara dos veces, y me parecio suficiente: no lo era. El agente
   reintentaba con OTRO componente, que tampoco se podia pintar, y cada intento era un
   fallo *distinto*: once turnos de modelo seguidos. Ahora son dos por conversacion como
   maximo, nada se reporta con un turno en vuelo, y el fallo va al panel de transparencia
   en vez de al hilo, donde decia "Tocaste:" algo que nadie toco.
3. **`Text` con `razon` era culpa mia.** Al publicar los cuatro de layout en
   `catalogo.json` (que estaba bien: el agente puede emitirlos y el catalogo tenia que
   describirlos) volvi ambigua la regla del prompt "razon es obligatoria en cada
   componente del catalogo". El modelo le ponia `razon` a un `Text` y mi
   `unevaluatedProperties: false` tumbaba la pantalla completa por una frase decorativa.
   Los de layout ahora la aceptan y la ignoran, y el prompt lo dice explicito.

**Lo que me deja pensando** es por que ninguna de las 290 pruebas lo cazo. Porque todas
probaban *mensajes*: que validen, que el reducer los aplique, que el catalogo los describa.
Ninguna probaba que la pantalla **se pinte**. Y un mensaje valido que nadie sabe pintar se
ve exactamente igual que un mensaje roto. Agregue tres pruebas en
`apps/web/src/lib/__tests__/`: que importar el lienzo deje los 12 nombres registrados, que
registrar dos veces no reemplace nada, y una que **renderiza el lienzo de verdad** con
`renderToStaticMarkup` y exige HTML con el saldo formateado, la razon y cero "Componente
desconocido". Sin DOM, sin testing-library, 40 lineas.

Tambien le puse a `<Superficie>` un grito en consola para el caso "registro vacio", con la
instruccion exacta. Ese aviso habria convertido una mañana en dos minutos.

**Verificado con llave y MCP arriba** (y `pnpm reiniciar-estado` primero, porque el estado
traia planes de las pruebas de humo y por eso el agente contestaba "ya tienes un plan
activo" a todo): "Quiero pagar menos intereses" para Beto da `ResumenTarjeta` + `PlanDePago`
en 5.0 s, y la accion `aplicar_plan_pago` devuelve `Confirmacion` + `ResumenTarjeta` con
`planActivo: true` y `diasMora: 0` + `Calendario` en 4.6 s. Los tres pasos del reto.

### 01:45 · hecho — El motor A2UI terminado: ajv contra la spec y los 76 casos oficiales

Cerré el último pendiente de `contrato` (`packages/a2ui`), que es dominio ajeno otra vez.
El tablero decía "falta ajv contra `spec/v0_9_1/json/` y los 8 casos de conformidad" y eso
es justo lo que faltaba para que el resto del equipo pueda trabajar sin tocar el motor.

**El hallazgo que lo hizo fácil.** `server_to_client.json` referencia los componentes con
`catalog.json#/$defs/anyComponent`: una ref **relativa y sin resolver**, contra un archivo
que no existe en la spec. O sea que la especificación deja un hueco con forma de catálogo y
quien compila los schemas decide qué entra ahí. Registrando el catálogo básico oficial
corren los 76 casos de conformidad; registrando el nuestro, el mismo validador oficial
valida `Confirmacion`. Un validador, dos catálogos, cero reglas escritas a mano. Por eso
`catalogo.json` ahora se genera con la forma de un catálogo A2UI real.

**Lo que costó trabajo de verdad no fue validar, fue el mensaje de error.** El schema es un
`oneOf` de los cuatro verbos y cada componente es otro `oneOf` sobre los 18 del catálogo:
un `variant` mal escrito da **81 errores** (lo medí). Para un modelo que tiene que
corregirse en el paso siguiente, eso es ruido. La salida fue no entrar por arriba: el JSON
ya dice qué es, así que se valida contra el `$defs` del verbo que trae y contra el schema
del componente que dice ser. Mismos schemas oficiales, leídos más adentro. Para conformidad
hay otro validador que sí entra por arriba y no recorta nada.

**Tres cosas que encontré de paso y arreglé:**

- `ancho` no hacía nada. La prop existía en `comunes.ts` y la rejilla bento buscaba
  `[data-ancho=amplio]`, pero nadie ponía el atributo: ningún componente lo spreadeaba.
  Lo puse en el renderer (`Superficie.tsx`), que es donde debe estar — si cada autor de
  componente tiene que acordarse, el séptimo se olvida. Igual con `weight` (flex-grow) y
  `accessibility` (aria), que estaban en la lista de llaves reservadas y no se usaban.
- `updateDataModel` **sin** `value` debe borrar la llave según la spec, y nosotros
  escribíamos `undefined`. Y `path` es opcional. Arreglados los dos, con prueba.
- El `catalogId` del catálogo publicado salía con `localhost`. Ahora el route lo reescribe
  con `URL_CATALOGO` al servirlo, y el archivo del repo se genera siempre con la URL de
  desarrollo para que el CI pueda exigir que no cambie (si el generador leyera la variable
  de entorno, el diff del CI fallaría según quién lo corra).

**La pieza que le sirve al equipo** son las 12 pruebas nuevas de `packages/catalogo`: si
alguien agrega un componente y olvida registrarlo, regenerar el catálogo o escribir su
`.jsonl`, falla ahí con el mensaje de qué falta. El motor ya no es algo que haya que
entender para trabajar: es algo que te dice qué te falta.

**Choque de sesiones.** Trabajando a la vez en el mismo árbol, la otra sesión y yo
escribimos `componentesVisibles` las dos. Lo vi al compilar (`Multiple exports with the
same name`), quité el mío, y la otra sesión acabó reconciliando las dos versiones. Lección:
con dos sesiones en el mismo checkout, antes de escribir una función nueva conviene
`grep` del nombre. No basta con `git pull`, porque el trabajo del otro aún no está
commiteado.

**Lo que NO hice:** el canal de error de vuelta (`VALIDATION_FAILED` de
`client_to_server.json`) quedó a medias a propósito: `<Superficie alFallar>` lo emite, pero
nadie lo escucha todavía. Conectarlo al agente le permitiría corregirse en el mismo turno,
y es la mejor respuesta a "¿y si el modelo se equivoca?". Queda anotado, no empezado.

**02:10 — corregido lo que la auditoría de la otra sesión encontró en eso mismo:** yo
llamaba `alFallar` **durante el render**, y quien lo escuche con un `setState` habría
entrado en bucle. Ahora sale en un `useEffect` y cada fallo se avisa una sola vez por vida
del componente, así que un reintento que falla igual tampoco cicla. Dejar una trampa justo
debajo de lo que estoy recomendando como siguiente paso no tenía sentido. El render no
tiene prueba unitaria (no hay testing-library en el paquete y no la voy a meter a las 2 am);
se verificó con la página viva.

### 01:55 · hecho — Auditoría del backend, el MCP y el A2UI: 12 huecos cerrados

Pasada con ojos frescos sobre todo lo que existe, archivo por archivo. Lo que se
encontró y se arregló, con prueba cada uno (`auditoria.spec.ts` en el MCP y `cortes del
turno` / `esquemaPeticion` en el agente):

**Agente**
- **El timeout no se reportaba como timeout.** El AI SDK no lanza al abortar: emite una
  parte `abort` y cierra el stream. Sin ese `case`, un turno de 30 s salía como "el
  modelo no entregó pantalla". Lo comprobé con un mock que respeta el `abortSignal`.
- **Cerrar la pestaña no cortaba nada**: el turno seguía llamando tools (y podía aplicar
  una acción) para nadie. `route.ts` pasa `request.signal` y se combina con el timeout.
- **La petición no se validaba**: `mensajes` ausente tronaba dentro del stream. Ahora
  `esquemaPeticion` (Zod) devuelve 400 con detalle, con topes y `usuarioId` con patrón.
- **MCP caído se reportaba como error del modelo**; ahora `codigo: "tool"` con la URL.
- **Un proveedor caído producía dos errores** (el suyo y "no entregó pantalla"); ahora uno.
- `datosJson` aceptaba `null`, un arreglo o un texto como data model; y con `"null"` el
  modelo recibía una lista de errores **vacía**. Ahora exige objeto y siempre dice por qué.
- La regla "un solo `heroe` por pantalla" estaba en el prompt y en ningún validador.
- `revisarArbol` duplicaba lo que `validar.ts` ya sabía hacer (`arbolCompleto`).

**MCP**
- `consultar_tarjeta` con el id de una **tarjeta de débito** la devolvía como de crédito
  (límite 0, tasa 0 → "saludable"). Se rechaza con motivo.
- El plan era por persona, no por tarjeta: `aplicar_plan_pago` rechazaba una segunda
  tarjeta. Ahora `planAplicado(usuarioId, tarjetaId)`.
- La escritura del estado no era atómica: ahora temporal + `rename`.
- `comparar_periodos` sin `periodo` tomaba el **mes en curso a medias** (12 días contra
  meses completos: todo "bajaba"). Default: el último mes cerrado.
- `sumarMeses` con meses negativos daba un mes negativo; `MCP_HOY` con un typo se usaba
  tal cual; `desde > hasta` devolvía vacío en silencio; `crear_apartado` aceptaba una
  `cuentaOrigenId` **de otra persona**. Los cuatro, cerrados. Dos helpers muertos, fuera.

**A2UI (obra de la otra sesión, ya en `main`)**: revisé `esquema.ts`, `validar.ts`,
`procesar.ts`, `bindings.ts`, `Superficie.tsx` y la conformidad. Sólido. Un riesgo que
no toqué por ser suyo y estar en vuelo: `Superficie` llama `alFallar` **durante el
render**; si quien lo escuche hace `setState` con una referencia nueva, se cicla. Hoy
nadie lo escucha (a propósito), así que no muerde; que lo tenga en cuenta quien lo conecte.

**Nota de historia:** los cambios de esta auditoría entraron en `b2a19f8` (el commit de
la otra sesión sobre el motor A2UI): su hook `Stop` hace `git add -A` y barrió mi árbol
de trabajo a medio camino. El contenido es el descrito aquí; el mensaje de ese commit no
lo menciona. 189 pruebas en verde.

### 01:20 · hecho — Backend completo: las 9 tools del MCP y el agente real

Tomé el backend entero de un jalón, que es dominio de los roles `mcp` y `contrato`
(están sin dueño en el tablero). Tres commits de dominio ajeno bien marcados, y aquí
queda qué toqué y por qué.

**`packages/schemas` (9 de 9).** Un archivo por tool con `EntradaX`/`SalidaX`. Las
acciones comparten `LlaveIdempotencia` y devuelven `aplicado` / `yaEstaba` / `mensaje`.

**`apps/mcp` (9 de 9 tools).** Lectura: `consultar_perfil`, `consultar_tarjeta`,
`consultar_movimientos`, `simular_reestructura`, `consultar_plan`, `comparar_periodos`,
`proyectar_ahorro`. Acción: `aplicar_plan_pago`, `crear_apartado`. Tres módulos nuevos en
`src/dominio/`: `finanzas.ts` (puerto a TS de `scripts/lib/finanzas.mjs`), `consultas.ts`
(lo que más de una tool necesita) y `tiempo.ts`.

Decisiones que vale la pena defender frente a un juez:

- **Una sola función decide cuánto debe alguien** (`tarjetaConEstado`). Con un plan
  aplicado, el saldo revolvente queda en **cero**, el límite se libera, el pago mínimo
  desaparece y la mora se cura. Ese es el "cambio real": dos llamadas idénticas a
  `consultar_tarjeta` contestan distinto porque los datos son otros.
- **La tasa de un plan es un dato del banco, no una fórmula.** Sale de
  `planes_reestructura.csv`; la fórmula es solo el respaldo para un plazo que nadie
  cotizó. Documentado en `docs/algoritmos/oferta-de-reestructura.md`.
- **La categoría atípica no es la más grande.** Es la que más se salió de su propio
  patrón (base de 3 meses, ≥ 40 % y ≥ $500). Señalar la renta no le sirve a nadie.
  `docs/algoritmos/categoria-atipica.md`.
- **"Hoy" no es `new Date()`.** Los CSV terminan el 2026-09-12; si el pitch se corre el
  13, "los últimos 30 días" saldrían vacíos. `hoy()` usa `MCP_HOY` o la fecha del
  movimiento más reciente. Variable nueva, ya en `.env.example`.

**Bug propio arreglado de paso:** `MCP_ESTADO=apps/mcp/estado.json` se resolvía contra el
`cwd`, y el servidor arranca con `cwd` en `apps/mcp` → el estado se escribía en
`apps/mcp/apps/mcp/estado.json`. O sea: **ninguna acción habría sobrevivido a un
reinicio**, y `reiniciar-estado` limpiaba otro archivo. Ahora se resuelve contra la raíz
del repo (`raizDelRepo()` en `datos/memoria.ts`). No abrí issue porque cayó dentro de la
tarea y quedó arreglado en el mismo commit.

**Segundo bug propio, encontrado al verificar el primero:** `pnpm reiniciar-estado`
escribía el archivo y decía "estado reiniciado", pero el servidor que ya estaba corriendo
seguía contestando desde su caché en memoria. O sea: **el reinicio antes de un ensayo no
servía de nada con el MCP arriba**. Quité la caché (el archivo pesa unos KB). Verificado en
caliente: aplico un plan → el servidor lo ve → `reiniciar-estado` en otro proceso → el
mismo servidor, sin reiniciarlo, ya dice `hayPlan: false`. Hay test.

**`apps/web/src/lib/agente` (el agente real, ya no mock).** Vercel AI SDK 5 con
`streamText`, las tools del MCP traducidas con `dynamicTool` (el schema lo publica el
MCP, así que **agregar una tool no toca el agente**), y el stream JSONL del contrato.

La decisión de diseño del turno: **entregar la interfaz también es una tool**
(`pintar_pantalla`). Con eso el reintento de un JSON inválido sale gratis —es un
resultado de tool con errores y el bucle del SDK ya sabe qué hacer—, el modelo usa un
solo mecanismo para todo, y hay **una sola puerta de salida** para A2UI. Los componentes
viajan como texto JSON dentro de la llamada porque un schema estricto de "props planas y
distintas por componente" no lo aceptan igual los dos proveedores; la validación de
verdad son cuatro capas en `armarMensajes` (estructura A2UI, catálogo, árbol con `root` e
hijos que existan, y props contra el schema Zod del componente, saltándose las
enlazadas).

Dos cosas que el agente **fuerza** y no le pide al modelo: el `usuarioId` es siempre el
del turno (Maya no puede leer los datos de otra persona ni por error del modelo), y las
tools de acción reciben la `idempotencyKey` que puso el renderer.

**Pruebas: 63 en verde, sin llave y sin red.** Lo que más me importa de ellas:

- `finanzas.spec.ts` recalcula las cuatro ofertas de Beto y las compara **campo por
  campo** contra `planes_reestructura.csv`. Si alguien cambia una fórmula, truena: la
  pantalla y los datos tienen que decir lo mismo.
- `acciones.spec.ts` prueba el ciclo completo: antes no hay plan → se aplica → la tarjeta
  queda en cero con `alerta: plan_activo` → el calendario cierra en cero → la misma llave
  dos veces aplica uno solo.
- `agente.spec.ts` corre el bucle con `MockLanguageModelV2`: tool → pantalla → stream, el
  reintento de una pantalla inválida, y el tope de pasos.
- `proveedor.spec.ts` arma el proveedor **real** de Google con las 9 tools e intercepta el
  `fetch`: las declaraciones que iban a salir no llevan `$schema` ni
  `additionalProperties` (Gemini las rechaza) y un 401 deja el turno con `error` + `fin`.
  Es lo más cerca que se puede estar de "funciona con Gemini" sin gastar una llave.

`scripts/humo.sh` ahora cubre las 9 tools y el ciclo de acción por HTTP, con
aserciones de verdad (falla con código distinto de cero). Usa `usr_carmen` para la acción
a propósito: Beto y Ana son los del guion y tienen que quedar como estaban.

**Lo que NO hice, a propósito:** no toqué `packages/catalogo`. El agente solo puede pintar
lo que exista ahí (hoy `Confirmacion` + layout), y meter los 7 schemas sin su `.tsx`
dejaría la pantalla llena de cuadros rojos de "componente desconocido". En cuanto `web`
agregue un componente, el prompt y la validación lo toman solos: los dos leen `CATALOGO`.

**Bloqueo real para el nivel 4 de `probar`:** falta una llave de modelo en el `.env`.
Sin ella el agente sirve la pantalla de ejemplo y no se puede saber si el prompt decide
bien. Es lo primero que hay que conseguir.

- **05:50 · hecho** — Verificada la carga de `db/` en el Postgres de Coolify: 22 tablas
  del esquema `banorte`, 3 690 filas, y cada tabla comparada fila a fila contra los CSV
  del repo (cero diferencias); tipos de columna iguales a `db/schema.sql`;
  `scripts/validar-datos.mjs` en verde. Issue #1 (puerto 5437) subido a GitHub y cerrado.
- **05:35 · hecho** — El 5437 no entraba desde fuera: el VPS tiene un cortafuegos
  para Docker (`yolani-docker-firewall.service`) con lista blanca de puertos. Agregado
  el 5437 al script y reiniciado el servicio. Nota en `docs/arquitectura/deploy.md`.
- **05:25 · hecho** — Coolify en el VPS (`157.173.204.174`): proyecto `reto-banorte`
  y Postgres `postgres-reto-banorte` (Postgres 17 + TimescaleDB, puerto público 5437)
  arriba y verificados desde fuera y desde la red `coolify`. Secretos en `/opt/reto/.env`
  del servidor; todo lo demás en `docs/arquitectura/deploy.md`. Token de la API de
  Coolify creado para scripts. Pendiente: apps web/mcp cuando exista el scaffold, y
  acceso de Coolify al repo privado (GitHub App o deploy key).
- **05:20 · inicio** — Tomo el rol demo. Voy por la infraestructura en Coolify:
  primero Postgres para ir subiendo datos, luego las apps.

## sáb 13 · 05:30–07:45 — Scaffold completo del monorepo

Tomé el scaffold entero (bloque 1 del roadmap, las cuatro columnas) para que los otros
tres roles se sienten y escriban código sin montar nada.

**Lo que quedó arriba y verificado**: `pnpm dev` levanta MCP (3100) y web (3000);
`pnpm typecheck` en verde en los 5 paquetes; `pnpm test` con 19 tests (15 del renderer,
4 del MCP); `pnpm humo` lista la tool y la llama de verdad; `/catalogo/v1.json` se sirve.
El ciclo completo se puede probar HOY sin llave de modelo: escribir en la barra →
`POST /api/agente` → stream JSONL → renderer → pantalla.

**Decisiones que tomé y por qué** (todas reversibles, dejo la razón por si alguien
discrepa):

- **Next 16 + React 19 + Tailwind v4 + shadcn `base-nova`** (Base UI, no Radix). Es el
  default del CLI hoy; pelearme con el CLI a esta hora no compraba nada.
- **Los tokens propios se mapean en `@theme inline`**. En Tailwind v4 el `bg-[--lienzo]`
  que decía la skill `diseno-banorte` **no funciona**. Corregí la skill: se escribe
  `bg-lienzo`, `text-exito`, `border-borde-sutil`.
- **Imports internos sin extensión**. Turbopack no mapea `.js` → `.ts`: el typecheck
  pasa y la web truena en ejecución. Me costó dos arranques; quedó escrito en
  `CLAUDE.md` y en la skill `scaffold` para que no le pase a nadie más.
- **Renderer fiel a la spec vendoreada**: las props van **planas** junto a `id` y
  `component` (no anidadas en `props`), `children` acepta lista o plantilla
  `{ componentId, path }`, y la raíz es el id `root`. Lo verifiqué contra
  `packages/a2ui/spec/v0_9_1/catalogs/basic/catalog.json` antes de escribir los tipos.
  Si hubiera inventado el formato, los 8 casos de conformidad no servirían de nada.
- **`packages/catalogo` importa las primitivas de shadcn desde `apps/web`** con el alias
  `@/components/ui/...`. Un `packages/ui` aparte duplicaba la config de shadcn sin
  comprar nada en 33 horas. Está documentado en el README del paquete.
- **El agente es un mock** que emite `ejemplos/confirmacion.jsonl` ya validado contra el
  catálogo (regla 4: lo que está a medias va detrás de un mock). Es lo primero que
  `contrato` tira a la basura.

**Lo que dejé a medias, con dueño**, en la tabla final de la skill `scaffold`: agente
real y ajv contra la spec (`contrato`), 8 tools de 9 (`mcp`), 7 componentes de 8 con su
encargo escrito en cada carpeta (`web`), origen Postgres y panel de transparencia.

**Nombre**: el usuario me dejó elegirlo y propuse Brújula; a media construcción entró el
cambio a **Maya** (la asistente real de Banorte; la propuesta es "su siguiente
generación"). El rename está aplicado en todo el scaffold. El disclaimer de
"no oficial ni afiliado" ya está en el `README.md`.

## sáb 13 · 08:00–09:00 — Deploy en Coolify con GitHub Actions

`maya-web` y `maya-mcp` están arriba en el Coolify del VPS, en el proyecto
`reto-banorte`, junto al Postgres que ya estaba. **Nadie vuelve a desplegar a mano**:
push a `main` → Actions verifica → Coolify construye y publica.

- URLs: https://maya.157.173.204.174.sslip.io y
  https://maya-mcp.157.173.204.174.sslip.io/mcp. `sslip.io` porque todavía no hay
  `.tech`: resuelve a la IP sin comprar nada y no imita a Banorte. Cambiar al dominio
  real es agregarlo en Coolify y actualizar dos variables del repo.
- Repo privado resuelto con **deploy key de solo lectura** (`coolify-maya`), no con la
  GitHub App. La privada está en `/opt/reto/llaves/maya-deploy-key`.
- **El token de Coolify que vive en GitHub NO es el root.** Creé
  `maya-github-actions` con abilities `["deploy","read"]`: dispara deploys, y da 403
  si intenta crear recursos. El root se queda en el VPS. El mismo Coolify administra
  la producción de otro proyecto del equipo; un token root dentro de un repo de
  hackathon es poder de más, y los secrets de Actions los ve cualquiera que pueda
  editar workflows.
- El workflow no solo despliega: al final **manda un prompt del guion a la URL pública
  y exige mensajes A2UI en la respuesta**. Un deploy que arranca pero no contesta
  cuenta como deploy fallido.
- Los Dockerfiles no usan `output: standalone` a propósito: la web lee `catalogo.json`
  y los `.jsonl` de ejemplo en tiempo de ejecución, y standalone los deja fuera.
  Imagen más grande a cambio de cero sorpresas a las 3 am. Ambas imágenes probadas en
  local antes de tocar Coolify.
- El MCP publicado carga los CSV desde la imagen (origen `memoria`): **no depende de
  que Postgres esté arriba**. Su `estado.json` vive en `/datos`, fuera del repo, para
  que un redeploy no lo arrastre.
- Me topé con que `/opt/reto/.env` tenía el token sin comillas y el `|` de Sanctum lo
  partía: `source` fallaba y la API respondía `Unauthenticated`. Arreglado y registrado
  como issue #2 (cerrado).

Pendiente mío: la llave de Gemini en las variables de `maya-web` está vacía, así que el
agente publicado responde con la pantalla de ejemplo. En cuanto alguien la ponga en
Coolify, la URL pública queda completa.

### 09:30 — Dos fallos del deploy que sólo aparecen bajo carga

El pipeline quedó en verde, pero encontré dos cosas que habrían mordido de madrugada:

1. **Un 502 del panel tumbaba el deploy entero.** Coolify está detrás de un proxy y
   devuelve 502 mientras construye otra cosa. Ahora `deploy.sh` reintenta 5 veces con
   espera creciente; un 4xx no se reintenta, porque un token o un uuid malos no mejoran
   solos.
2. **Peor: el deploy se daba por bueno cuando todavía estaba construyendo.** El script
   esperaba a que `/health` respondiera, y **el contenedor viejo responde igual**. El
   workflow salía en verde, el smoke test pasaba contra la versión anterior, y producción
   seguía con el commit de antes. Lo vi porque `/api/health` reportaba `9d546d5` después
   de un deploy "exitoso" de otro commit.

   Arreglado: ahora espera a que `/health` devuelva **el commit que se está publicando**
   (`SOURCE_COMMIT`, que Coolify inyecta al construir). Le agregué el campo `commit` al
   `/health` del MCP, que no lo tenía. Si un servicio no reporta commit, lo dice en el
   log en vez de mentir.

La lección para el checklist: "el workflow está en verde" no era prueba de que lo
publicado sea lo último. Ahora sí.

### 09:45 — Las variables de entorno nunca se guardaron (y el síntoma engañaba)

Tercer fallo del deploy, el más sucio de los tres: **ninguna variable de entorno se
había creado en Coolify**. La API rechaza el campo `is_build_time` con
`Validation failed`, y yo había mandado la respuesta a `/dev/null`, así que los ocho
POST fallaron en silencio y yo di por hecho que estaban puestas.

El síntoma no apuntaba ahí: el `catalogId` salía con `localhost` (parecía que mi
arreglo del mock no se había desplegado, pero sí estaba en el commit publicado) y el
`/mcp` público respondía **406 en vez de 401 sin token** — o sea, `MCP_TOKEN` vacío,
o sea **el MCP publicado estaba abierto**. Nadie lo habría notado hasta que un juez
se conectara sin token.

Y al recrearlas me equivoqué otra vez: vi cada clave repetida y las tomé por
duplicados, cuando en realidad **Coolify crea un par por variable** (producción +
preview). Borré las de producción y dejé las de preview, que no se inyectan al
contenedor: el redeploy salió "bien" y las variables seguían sin existir. Se ve en el
campo `is_preview` del objeto, que no miré la primera vez.

Las tres trampas quedaron escritas en `deploy.md`. Reglas nuevas: después de tocar
variables por API, leer la lista **con `is_preview`**, no sólo los nombres; comprobar
con `docker exec … env` que llegaron al contenedor; y nunca mandar a `/dev/null` la
respuesta de algo que estás afirmando que quedó hecho.

### 10:30 — Llave de Gemini en produccion, y `CLAUDE.md` estaba roto en `main`

**La llave de Gemini ya está puesta** (en `/opt/reto/.env` del VPS y en las variables de
`maya-web` en Coolify, nunca en el repo). Antes de instalarla la probé contra la API:
es válida, y `gemini-3.8-flash` responde, así que el ADR 0005 se mantiene tal cual. De
paso: `gemini-2.0-flash` ya no existe del lado de Google, por si alguien lo tenía escrito
en algún lado.

**Y me encontré `CLAUDE.md` con marcadores de conflicto commiteados en `main`**
(`<<<<<<< Updated upstream` … `>>>>>>> Stashed changes`), de un `stash pop` a medias que
el commit automático subió. Es el archivo que lee cada agente al abrir sesión, así que
cualquiera que llegara veía dos estados contradictorios del proyecto: una versión decía
"1 de 8 componentes" y la otra "8 de 8".

No elegí un lado: medí el repo. **Ninguna de las dos versiones era correcta.** Lo real
hoy son 15 tools (11 lectura + 4 acción), 15 schemas, 8 de 8 componentes del catálogo, y
272 pruebas en total (112 a2ui, 92 mcp, 42 catálogo, 26 web). Eso es lo que quedó en el
mapa. Issue #4.

Propuesta para que no vuelva a pasar, que dejo escrita en el issue y no implemento por
no tocar el hook de todos sin avisar: que el hook `Stop` rechace el commit si algún
archivo tiene `<<<<<<<`.

### 13:30 — El ciclo completo corriendo en la URL pública

La llave de Gemini quedó puesta (probada antes de instalarla: válida, y
`gemini-3.8-flash` responde, así que el ADR 0005 sigue en pie). Pero con la llave puesta
el agente publicado seguía sin contestar: **no alcanzaba al MCP**.

Dos intentos antes de dar con ello:

1. `MCP_URL` al uuid de la app → no resuelve. El único alias que Coolify pone es el
   nombre del contenedor **con el timestamp del deploy**, que cambia cada vez.
2. `MCP_URL` a la URL pública del MCP → *timeout* desde dentro del contenedor, aunque
   desde fuera responda perfecto. **Hairpin NAT.** Esta es la que más me interesa
   recordar: verificar una URL con `curl` desde mi máquina no prueba que la app pueda
   usarla. Hay que probar desde donde vive el código: `docker exec <web> curl …`.

Lo que funcionó: alias de red estable (`--network-alias maya-mcp`) y
`MCP_URL=http://maya-mcp:3100/mcp`. Necesita deploy **forzado**; el `restart` no aplica
esa opción.

Verificado en producción, los tres pasos del reto:

```
"Quiero pagar menos intereses de mi tarjeta"
  → panorama_inicial · simular_reestructura      (interpretar con datos reales)
  → createSurface + ResumenTarjeta + PlanDePago  (generar la interfaz)
  → razon: "Tienes $47,386 … al 96.7 % de tu límite"
con la accion encima:
  → aplicar_plan_pago · consultar_plan           (ejecutar y que la UI cambie)
  → "Tu plan de pagos a 18 meses quedó activo con éxito."
```

Nota de coordinación: somos al menos tres sesiones sobre el mismo árbol. El issue #5 lo
había documentado otra sesión con el arreglo equivocado (la URL pública); corregí esa
parte del archivo con la medición, dejando intacto su análisis de la causa, que era
bueno. Conviene decir siempre quién toca qué antes de tocarlo.

## sáb 13 · 15:00–16:30 — Los datos salen de Postgres; los CSV se van (ADR 0010)

El usuario notó lo que nadie había visto: **las tools no leían la base, leían los CSV**.
Era cierto y llevaba así desde el principio: el ADR 0007 dejó los CSV como fuente y
Postgres detrás de `FEATURE_POSTGRES`, apagado por omisión. Resultado: una base cargada
que ningún flujo tocaba, y "tenemos Postgres" era una media verdad ante el jurado.

Lo que cambió:

- **El MCP lee de `banorte` al arrancar** y carga el esquema a memoria (~3,700 filas).
  Las lecturas siguen síncronas a propósito: las 15 tools y el dominio no se tocaron.
  Lo único que sabe de Postgres es `datos/postgres.ts`.
- **El estado mutable pasó de `estado.json` a `banorte.acciones_aplicadas`.** La
  idempotencia ahora la garantiza un **índice único** sobre `idempotency_key`, no el
  código: dos llamadas con la misma llave dejan una sola fila aunque lleguen a la vez.
  Migración `0001`, que además amplió los `CHECK` —no contemplaban
  `cancelar_suscripcion`, y esa tool existía desde hace horas—.
- **La web también lee de la base**, con la misma firma que tenía el lector de CSV, así
  que `consultas.ts` y los componentes no cambiaron ni una línea.
- **Los 22 CSV y sus scripts se borraron.**

Tres cosas que me importa dejar escritas:

1. **Las pruebas no pueden pegarle a la base.** `reiniciarEstado` la trunca: un
   `pnpm test` a las 4 am habría borrado el estado de un ensayo. Corren contra un
   volcado (`datos-de-prueba.json`) cargado en un `setupFiles`. 103 pruebas del MCP en
   verde sin abrir una conexión.
2. **Lo mismo vale para el CI**: quité el paso `humo del MCP` del workflow, porque el
   humo aplica una acción y ahora eso escribe en la base de la demo.
3. **Perdimos la demo sin red, y eso hay que ensayarlo.** Antes `pnpm dev` funcionaba en
   un avión. Ahora si la base no responde, el MCP no arranca —a propósito—. El plan B es
   un Postgres local y `pnpm datos:restaurar`; está en el ADR 0010 y en el checklist,
   **pero nadie lo ha probado todavía**. Es el riesgo abierto de este cambio.

De paso: `pnpm typecheck` llevaba roto desde el commit `9d5351e` por un destructuring sin
guarda en `packages/catalogo`, y eso **bloqueaba todos los deploys** (el CI corta antes
del deploy). Issue #7, arreglado.

`.env` local creado con la base y la llave de Gemini; `.env.example` reescrito con el
mínimo para arrancar y de dónde sale cada valor. `scripts/dev.sh` ahora carga el `.env`
de la raíz y lo exporta: Next buscaba `apps/web/.env` y no lo encontraba, así que el
agente decía "sin llave" con la llave puesta.

### 08:04 — El favicon de Banorte, tomado del repo de Open Innovation

`apps/web` traía el favicon genérico de create-next-app. Se tomó el logo circular de
Banorte que usa `Ghekkin/Open-innovation-hack-mty` (`frontend/app/favicon.ico`, que
en realidad es un PNG de 1043×1043) y entró como `src/app/icon.png` y
`src/app/apple-icon.png`, que es la convención de Next 16 para PNG; el `.ico` viejo
se fue. Verificado en la web corriendo: `<link rel="icon">` y `apple-touch-icon`
responden 200 con `image/png`.
