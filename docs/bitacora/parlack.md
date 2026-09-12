# Bitácora de parlack

## 2026-09-12

### 15:45 · hecho — Inicio ya lo arma Maya: una portada por persona, con un modelo chico y solo cuando algo cambió

El usuario lo pidió así: "que se pueda hacer dependiendo del usuario, que un llm pequeño y
barato corra cada cierto tiempo para poder mostrar una interfaz completamente personalizada
con los widgets ya hechos". Pregunté antes de construir; las respuestas: todo lo arma el
modelo (sin marco fijo), se rearma cada N minutos **y** justo después de una acción,
`gemini-3.5-flash-lite`, y los botones mandan a Maya. Con una nota suya que se volvió la
regla central: "si la cuenta está algo inactiva no tiene caso correr el modelo".

**Lo que hay** (`docs/como-funciona/inicio-personalizado.md`, `docs/algoritmos/portada-de-maya.md`):

- `apps/web/src/lib/inicio/`: el generador es el mismo motor del turno (system prompt,
  tools del MCP, `pintar_pantalla` con sus validaciones) con otro modelo, con los datos
  reunidos ANTES por el servidor según la situación, y sin tools de acción en el conjunto.
- La **huella** (`acciones_aplicadas` + `movimientos` + versión del generador) decide si se
  rearma; un reloj cada 10 min revisa a los tres y pasa de largo si nada cambió. Una
  generación en vuelo por persona.
- La portada vive en `banorte.pantallas_inicio` (migración 0002, aplicada a la base
  compartida a las 15:05). Inicio la pinta con el mismo `Lienzo`; si está desactualizada,
  muestra la programada con "Maya está armando tu inicio…" y se refresca sola.
- Un botón en la portada manda a `/maya?accion=…`; el turno ejecuta la acción y, al cerrar,
  `alMutar` rearma la portada en segundo plano.

**Lo que costó, en orden:**

1. Con el paquete de datos básico, el modelo chico elegía lo que podía llenar (el
   portafolio de Ana) y no lo que resolvía su situación (su crédito): 1 de 3. Con el
   prefetch situacional (amortización si no hay tarjeta, `simular_reestructura` si está al
   límite, `proyectar_ahorro` si no hay meta) y una escalera de urgencia en el encargo:
   3 de 3, dos corridas.
2. Dos portadas seguidas de Carmen se cayeron por **comas colgantes** en 2 000 tokens de
   data model. Tercer intento de `parsear` que las quita sin tocar cadenas.
3. El modelo omitía la `action` de `PlanDePago` aun con la regla escrita: el botón salía
   apagado. `armarMensajes` ahora pone la acción que declara el catálogo cuando falta
   (`context: {}`; todos los componentes mandan sus ids al tocarse). Vale también para la
   conversación.

**Medido** (local, modelo real): Beto 7.7 s, Ana 11.6 s, Carmen 11.0 s; ~22 000 tokens de
entrada por portada de los que ~16 300 vienen del caché (el system prompt compartido).
En el navegador, el ciclo completo: portada → "Aplicar plan" → Maya ejecuta → de vuelta,
la portada rearmada con "Plan activo" a los 4 s. Sin errores de consola. 151 pruebas en
verde en la web (31 nuevas de `lib/inicio`, 6 del agente).

**Lo que no hice**: no reinicié el `next dev` de la otra sesión, así que el reloj local
arranca hasta el siguiente arranque (la ruta y la página sí corren con el código nuevo);
en producción arranca con el deploy. Y no puse las variables nuevas en Coolify: los
defaults son los que queremos.

### 15:10 · hallazgo — El agente confirma un rebalanceo que no ocurrió (#16)

El usuario preguntó qué sigue y si faltan widgets. Antes de contestar revisé que cada botón
de los 18 tenga destino: `ejecutar_decision` solo atiende cuatro acciones y seis widgets
disparan otras. Lo probé con el modelo real como Carmen: "Confirmar rebalanceo" terminó en
`Confirmacion` "Tu rebalanceo quedó ejecutado" sin ninguna tool de acción, con
`acciones_aplicadas` en 0 filas. "Mejorar mi salud financiera", en cambio, lo llevó bien al
portafolio. Issue #16 con los cuatro arreglos posibles.

Dato para decidir si agregar widgets: el prompt del agente mide 51,308 caracteres y el
81 % son el catálogo (20,839) y sus ejemplos (20,726). Cada widget nuevo suma su
descripción y su ejemplo a todos los turnos.

### 14:35 · hecho — Widgets responsivos a su propio ancho y tarjetas lado a lado

El usuario: "cuando pones los widgets de saldo diferido de tu tarjeta y crédito de nómina
aparece uno encima de otro… que esté uno al lado de otro… que no haya tanto espacio vacío…
que no haya tanto rollo dentro de los widgets en la parte de abajo… que funcione bien en el
dashboard a futuro".

**Lo reproduje con el agente real** (Beto: "¿Cuánto debo entre mi tarjeta y mi crédito de
nómina?") y lo grabé para repetirlo interceptando `/api/agente` sin gastar cuota. Tres causas:

1. **El agente manda un `Column` raíz y la rejilla veía UN hijo.** Lo metía en una columna de
   `md:grid-cols-2 xl:grid-cols-3`: las dos tarjetas apiladas. Y después del rediseño de la
   consola de Chee3mss (columna de chat de 768 px, 13:46) quedó peor: la rejilla seguía
   mirando la PANTALLA, así que a 1,440 px repartía tres columnas dentro de 768 px y cada
   tarjeta medía **245 px**.
2. **Los widgets usaban `sm:`/`md:`**: en una tarjeta de 245 px las fichas del crédito se
   pintaban en cuatro columnas ("$27,…", "interés $61…") y el eje decía "Pago 22 Pago 27
   Pago 3…" encimado.
3. **La razón completa al pie, en banda gris**, en cada tarjeta.

**Lo que hay ahora:**

- `<Superficie disponer>` (commit aparte, dominio contrato): si la raíz es `Column`/`Row`,
  entrega sus hijos ya pintados y el host decide el acomodo.
- `apps/web/src/lib/rejilla.ts` + `lienzo.tsx`: filas flexibles medidas contra el lienzo
  (`@container/lienzo`). Compacta 18rem ×1, amplia 26rem ×2, una sola a todo lo ancho,
  cuatro o más de dos en dos, alturas naturales. El tamaño sale del **ancho natural** del
  componente (default de su schema), no del `ancho` que copia el agente.
  `docs/algoritmos/acomodo-del-lienzo.md`.
- `packages/catalogo/src/tarjeta.tsx`: **`Tarjeta`** (contenedor `@container/tarjeta`) y
  **`PieTarjeta`** (botón + "¿Por qué veo esto?" plegado). Los 18 componentes migrados; cero
  breakpoints de pantalla en el paquete, con prueba que lo cuida. Donde la tarjeta es ancha
  se usa el ancho: crédito y crecimiento en dos paneles, gasto y plan en dos columnas,
  termómetro y escenarios en fila.
- `ProyeccionPagoCredito` con datos reales: la curva arranca en "hoy" (la tool numera los
  pagos desde la contratación), el eje dice "Hoy · En N meses" y una fecha ISO en `periodo`
  se pinta "20 de octubre".
- `/catalogo`: selector "Ver cada ejemplo a" 360 px / 480 px / completo, con el mismo
  `Lienzo` de `/maya`.

**Tres decisiones que probé en el navegador antes de dejarlas:**

- **Amplia a 26rem, no 22rem**: con 22rem el crédito quedaba a 376 px junto a otra tarjeta;
  mejor que baje a su fila a 768 px, donde se pone en dos paneles.
- **Alturas naturales, no estiradas**: estiradas, "Tu plan quedó activo" junto al calendario
  tenía 280 px de blanco adentro, y la héroe junto al crédito era un bloque rojo de 530 px.
- **En vivo el agente marcó el crédito de Ana como héroe** y las fichas salían gris y negro
  sobre rojo. `Ficha` y `Leyenda` ya tienen variante héroe.

Verificado: `pnpm typecheck` en verde y 412 pruebas (117 a2ui, 120 mcp, 93 catálogo, 82
web). Una corrida real con el modelo (Ana, 8.7 s, pantalla válida) y ocho composiciones
repetidas a 1,440, 1,024, 768 y 390 px, en el chat y sin el tope de 768 px.

**No toqué** `consola-maya.tsx` ni `barra-conversacion.tsx`: Chee3mss los rediseñó a las 13:46
(sugerencias al fondo del hilo, ya no encima de las tarjetas, y el botón de voz). Lo del
usuario sobre "las sugerencias estorban" quedó resuelto por ese cambio.

### 14:03 · hecho — Coolify limpia imágenes viejas cada hora (#15 cerrado)

El usuario pidió "actívalo tú" sobre la limpieza automática que propuse tras el disco al
99 %. Lo que encontré: el servidor **ya tenía** la limpieza de Docker de Coolify, pero
forzada y una vez al día (medianoche UTC, 18:00 aquí). Con cuatro personas empujando,
un solo día llenó el disco entre dos limpiezas.

Quedó **cada hora y solo sobre el 80 %** (`force_docker_cleanup: false`,
`docker_cleanup_frequency: "0 * * * *"`, umbral 80). Volúmenes y redes siguen fuera: en
el VPS viven datos de otros proyectos. Leí `CleanupDocker` en el contenedor antes de
tocar nada: de cada app conserva la imagen que corre y las dos anteriores, borra
imágenes sin usar que no sean de Coolify y vacía la caché de build.

Verificado por la API (`GET /servers/{uuid}/docker-cleanup` y `/executions`): revisión a
las 14:00 en punto, `No cleanup needed`, disco en 77 % (56 GB libres), con 8 imágenes de
`maya-web` y 7 de `maya-mcp` esperando su turno.

Dos cosas que me importa dejar escritas:

- **Lo apliqué con `tinker` y había API.** Busqué en `PATCH /servers/{uuid}`, que no
  acepta esos campos, y no vi que existe `PATCH /servers/{uuid}/docker-cleanup`. El
  resultado es el mismo; en `docs/arquitectura/deploy.md` quedaron los `curl` para
  leerla, revertirla o correrla en el momento (ese `POST /run` acepta
  `delete_unused_volumes`: nunca se le pasa).
- **Dos consecuencias para el día de la demo**: la build siguiente a una limpieza va sin
  caché (tarda más), y un rollback a una build más vieja que dos (la del tag `estable`,
  por ejemplo) ya no reusa imagen: reconstruye. Quedó en la skill `desplegar`.

El `df` previo en `scripts/deploy.sh` que pedía el issue no se hizo: el deploy lo
dispara el runner de GitHub, que no ve el disco del VPS, y la API no expone el uso.

No toqué mi fila del tablero: otra sesión mía la tiene tomada con los widgets
responsivos.

### 13:15 · hecho — Los 18 componentes pulidos mirando el navegador; seis con gráfica de verdad

El usuario pidió revisar todos los widgets: "en algunos ni siquiera muestra la gráfica,
en otros se ve muy saturada la información". Capturé los 18 con Playwright a 1280 px y a
390 px, anoté qué fallaba en cada uno y reescribí los diez de inversión, crédito y
diagnóstico (los ocho originales ya estaban en el sistema). Todo se volvió a capturar
después; sin errores de consola.

**Lo que estaba mal, en tres familias:**

1. **Sin gráfica donde el dato es una serie.** `RendimientoHistorico` pintaba barras
   cuya base era el precio mínimo: entre $1,000 y $1,114 la última barra salía cinco
   veces más alta que la primera. `ProyeccionCrecimiento` y `ProyeccionPagoCredito` no
   tenían curva de tiempo; `DistribucionPortafolio` dibujaba la misma proporción dos
   veces (barra apilada arriba, barras rojas por fila abajo).
2. **Saturación.** Títulos en mayúsculas ("SUSCRIPCIONES ACTIVAS", "EVOLUCIÓN EN EL
   TIEMPO"), cajas con borde dentro de la tarjeta (cuarta capa de superficie), iconos de
   chispas y alerta, cajas rosas y verdes para una frase, montos en rojo (el rojo es de la
   marca, no de "esto está mal"), badges rojos sólidos.
3. **Números que se contradecían.** El slider de `ProyeccionCrecimiento` recalculaba el
   encabezado pero no los hitos: $195,827 arriba, $189,456 en "Año 3".

**Lo que hay ahora:**

- `packages/catalogo/src/graficas.tsx`: el módulo compartido sobre `chart` de shadcn
  (Recharts). Colores por token, ejes recesivos, altura fija (160 / 192 px), tooltip
  como extra, `Ficha` para hitos y `Leyenda`. Todo trazo se declara explícito porque
  Recharts mete `#3182bd` / `#ccc` / `#666` por omisión y la prueba "cero hex" truena.
- Curva de área para el histórico (punto final rojo con su etiqueta), área apilada
  aportado / rendimiento para la proyección, curva del saldo con fichas por hito para el
  crédito, dona con el total al centro para el portafolio, medio arco para la salud, dos
  barras en una escala para el comparador.
- `RiesgoRendimiento` usa el mismo `RadioGroup` que `PlanDePago` y cinco puntos de
  riesgo en vez de un cuadrito con "Riesgo" en 8 px. `AlertaFugas` en negro, con el botón
  rojo solo en la suscripción sin uso. `EscenariosInversion` y `OrdenRebalanceo` sin
  iconos ni mayúsculas. Todos con el pie del sistema: botón píldora + razón.
- Esqueletos con los contenedores de `esqueletos.tsx`, del tamaño de la tarjeta final.

**Tres cosas que costaron y conviene recordar:**

- **La paleta de marca no pasa el validador de daltonismo entre rojo y rojo claro**
  (ΔE 6.5 con visión normal). Las series van oscuro → rojo → gris → plata, nunca
  `--chart-2` junto a `--chart-3`. Documentado en `docs/algoritmos/graficas-del-catalogo.md`.
- **`Intl.NumberFormat` compacto no es determinista entre Node y Chrome** (`$86.0 k` vs
  `$86 k`): error de hidratación en cada ficha. El formato corto se calcula a mano.
- **`tailwind-merge` no quita `md:h-48` cuando pasas `h-24`** (variante distinta): el
  medio arco crecía a 192 px en escritorio y se salía de su caja. `Grafica` usa la clase
  fija solo cuando no le dan un tamaño propio.

Verificado: `pnpm typecheck` en verde y 391 pruebas (112 A2UI, 120 MCP, 91 catálogo,
68 web). Docs: `componentes-inversion-y-credito.md` reescrito en la parte visual,
`catalogo.md` ya dice 18, índice de `docs/README.md` y el algoritmo nuevo.

**Ideas de componentes nuevos que salieron de la revisión** (para el equipo; ninguna
empezada): un `TopeDeGasto` que cierre el ciclo de `crear_tope_gasto` (hoy la tool
existe y no tiene pantalla), una `TendenciaMensual` para `comparar_periodos` (barras de
los últimos meses; hoy solo se ve un mes), un `ResumenCreditos` para `consultar_creditos`
(hoy se salta a la proyección de un crédito), y un `Opciones` genérico para que el agente
pregunte con chips en vez de con texto ("¿cuál tarjeta?").

### 13:10 · hecho — Productos ya es una cartera: el plástico de Banorte y el detalle a un lado

`/productos` eran cuatro pestañas con dos o tres tarjetas sueltas y el lienzo vacío; se veía
como una tabla a medio llenar. Ahora es la vista de detalle de lo que Inicio resume:

- **El plástico** (`components/productos/tarjeta-fisica.tsx`): degradado de marca, patrón
  de chevrones en `<pattern>` SVG al 13 %, chip con tokens, `Nfc`, `LogoBanorte` en blanco,
  tipo + producto, número enmascarado en `font-mono`, titular y la red en monocromo. Cero
  hex, cero imágenes. Proporción ISO 1.586, así que en móvil ocupa el ancho y en escritorio
  la mitad de la tarjeta blanca.
- **`TarjetaEnMano`**: plástico + saldo por pagar, uso de la línea, pago mínimo, fecha
  límite y tasa (débito: el disponible de la cuenta ligada). La primera es el héroe: único
  plástico rojo y único botón primario, cuya pregunta a Maya depende de cómo está la
  tarjeta (al límite o con atraso → bajar intereses; si no → en qué se va el dinero).
- **`Cuentas`** con el total arriba; **un `CreditoEnCurso` por crédito** con el avance del
  plazo en oscuro; **`Inversiones`** con cada posición, su riesgo en cinco puntos y su peso
  como barra; **`SinInversiones`** manda a Maya en vez de dejar un hueco (Beto).
- `Tarjeta` en `consultas.ts` creció con seis campos que ya estaban en la base (aditivo;
  `/api/productos` y `/api/panorama` los traen también).

Lo que vi en el navegador y corregí antes de dar por buena la pantalla: el número del
plástico se partía en dos líneas junto a la marca (ahora va en su fila); las celdas de tres
datos truncaban `14 de septiembre` y `$1,650,000.00` (ahora `flex-wrap` +
`formatearFechaCorta`); el alias largo de Carmen se comía el badge "Principal" (ahora la
segunda línea cruza por debajo del monto); el héroe quedaba pegado arriba con hueco cuando
su fila era más alta (`my-auto`). Medido con Playwright en 390 y 1280 px con los tres
perfiles: sin scroll horizontal, sin errores de consola; el esqueleto de
`productos/loading.tsx` mide lo que llega.

Typecheck y las 391 pruebas del monorepo en verde. Doc en `como-funciona/shell-web.md`
(sección "Productos: la cartera") y nota en `api-rest-lectura.md`.

De paso: el árbol traía sin commitear las gráficas del catálogo de mi sesión anterior
(`graficas.tsx` y las tres proyecciones sobre Recharts). Pasan typecheck y pruebas; las
subí en su propio commit para que el historial diga qué es qué. **Les falta su doc.**

**Y una cosa que no quise y que hay que saber:** entre que revisé el árbol y corrí
`sync.sh`, otra sesión modificó **siete componentes más del catálogo** (`alerta-fugas`,
`comparador-antes-despues`, `distribucion-portafolio`, `escenarios-inversion`,
`orden-rebalanceo`, `riesgo-rendimiento`, `termometro-salud-financiera`). `sync.sh` hace
`git add -A`, así que se fueron dentro de mi commit `8d779fa` con mi mensaje de Productos.
Los volví a verificar después del push: typecheck y las 91 pruebas del catálogo pasan, así
que `main` no se rompió. Quien los esté trabajando: su siguiente commit los completa; el
historial dirá que salieron conmigo, y no es cierto. Mientras compartamos un solo árbol de
trabajo, antes de correr `sync.sh` mira `git status` y avisa.

### 13:45 · arreglado — `main` quedó con una prueba del catálogo en rojo, por mi `sync.sh`

Mi commit `3ada924` volvió a llevarse cambios de otra sesión: `ProyeccionPagoCredito` ya no
declaraba la acción `simular_abono_capital` (ninguna tool la atiende), pero el componente
seguía pintando el botón que la manda. Quité el botón y el campo de ahorro estimado del
ejemplo, que el schema ahora pide no inventar. Typecheck y las 91 pruebas del catálogo en
verde.

### 13:35 · arreglado a medias — el disco del VPS estaba al 99 % y los deploys de la web fallaban (#15)

Fui a ver por qué producción seguía sirviendo la web en `0a31335` con `main` dos commits
adelante. El run de `6162bb2` construyó bien y murió exportando la imagen: `no space left
on device`. `df` daba 242 GB de 242. La causa: **Coolify etiqueta una imagen por commit y
no borra ninguna**; había ~40 de `maya-web` (1.35 GB) y ~45 de `maya-mcp` (1.14 GB), una
por cada push del día. El journal ya se había quedado sin disco para escribir y los health
checks de **todo** el servidor (también los de otros proyectos) fallaban con ENOSPC.

Lo que borré, y solo eso: las imágenes de nuestras dos apps de commits viejos, conservando
las dos que corren y la de `estable` (`737f0a1`); `pnpm store prune` (2.6 GB); el journal
a 300 MB. Nada de volúmenes ni de imágenes ajenas. De 1.1 GB libres a **49 GB** mientras
el borrado seguía. Justo a tiempo: el run de `1c8b7b8` (que trae Productos) desplegó bien y
producción ya sirve ese commit; lo verifiqué con capturas de `/productos` contra la URL
pública, tres perfiles, 390 y 1280 px.

Queda **abierto como #15** porque falta la política para que no vuelva a pasar (limpieza
de imágenes en Coolify o un cron con `docker image prune --filter until=6h`, y un `df`
con aviso en `scripts/deploy.sh`). Con cuatro personas empujando cada diez minutos, el
disco se vuelve a llenar en unas horas.

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

### 13:55 · arreglado — Ana: sin tarjeta no es sin deuda, y el disco del VPS al 100 %

**Lo de Ana empezó por entender, no por ajustar.** El guion decía que Ana ve
`SimuladorMeta` y el modelo le armaba `ProyeccionPagoCredito`. Mi primera intuición era
"el modelo se equivoca, hay que forzarlo". No se equivocaba: estaba leyendo el catálogo al
pie de la letra. `SimuladorMeta` decía "la persona **no tiene deuda**", y Ana **sí** la
tiene: un crédito personal al **27.9 % anual, CAT 41.4 %**. Y `ProyeccionPagoCredito`
decía "¿cuánto pagaré de puros intereses?", que es casi la pregunta de Ana. El guion
suponía "no tiene deuda revolvente"; el catálogo decía "no tiene deuda". No es lo mismo.

Y con esos números, **forzar el simulador era darle peor consejo**: mandar a ahorrar a
alguien que carga un crédito al 41 % de CAT. Un juez de banca lo ve en dos segundos.

Lo que salió al jalar el hilo:

- **El botón de `ProyeccionPagoCredito` era una acción muerta.** Disparaba
  `simular_abono_capital` y ninguna tool del MCP lo atiende. Quité la acción del catálogo
  (sin acción declarada, `Superficie` no pasa `alAccionar` y el botón no se pinta) y del
  `.jsonl` de ejemplo. Dos líneas en el schema de Chee3mss, sin tocar su componente.
- **La tarjeta pedía números que ninguna tool devolvía.** La tabla de amortización sí sale
  de `consultar_creditos` con `incluirAmortizacion`, pero con máximo 12 pagos y a Ana le
  quedan 15. El total de intereses sale exacto de una identidad del préstamo amortizable:
  **mensualidad × pagos restantes − saldo** (457,095 × 15 − 5,578,308 = $12,781.17). Lo
  que NO sale de ningún lado es "cuánto ahorra abonando a capital", así que esa cifra se
  queda fuera en vez de estimarla. Ojo: en la pregunta que te hice dije que la tarjeta
  mostraría lo que ahorra abonando; no se puede hacer honestamente sin una tool nueva.
- **El prompt tenía una regla escrita para Ana antes de que existiera el componente de
  crédito**: "con `tarjeta: null`… pinta `SimuladorMeta`… si no pagas intereses, lo que
  sigue es que tu dinero los gane". Ahora dice **"sin tarjeta NO es sin deuda"** y pide la
  pantalla compuesta.

Verificado con el modelo real, 3 de 3: siempre `ProyeccionPagoCredito` + `SimuladorMeta`,
**los números exactos contra la tool en las tres** (incluido el total de intereses), sin
la cifra que nadie calcula, sin botón muerto, y el texto diciendo la verdad. Y "Crear
apartado" desde esa pantalla: `ejecutar_decision` ok → `Confirmacion` + `MetaActiva` en
3.1 s. El ensayo automático ahora exige las dos tarjetas, el saldo exacto y la acción de
Ana: **10 de 10**.

Lo que no arreglé: Ana tarda ~10 s contra ~6 de Beto. Medí y no es desperdicio: son dos
tarjetas con datos, el doble de salida, y el modelo ya las arma compactas (4 hitos). No
arriesgo el prompt por 4 segundos a estas horas; el guion ya dice el tiempo real.

**El disco.** Mientras investigaba, el CI del último commit falló en el deploy: la web no
llegó a servir el commit en 15 minutos. El log de Coolify decía `failed to extract layer ...
write .next/cache/turbopack`. **El disco del VPS estaba al 99 %: 2.5 GB libres de 242.**
Causa, medida: 38 imágenes de maya-web y 45 de maya-mcp, ~1.3 GB cada una, una por cada
push a `main` —hoy hicimos decenas— y **cada una cargando el caché de build de Next**
porque el Dockerfile es de una sola etapa. Con tu autorización borré las viejas de
nuestras dos apps (conservando la que corre y las dos anteriores de cada una; nada de otros
proyectos, ni volúmenes, ni datos): **de 99 % a 76 %, 60 GB libres**, y el siguiente deploy
ya pasó. Y el Dockerfile ahora borra `.next/cache` en la misma capa del build, para que no
vuelva a crecer así.

Quedan dos ideas (no bugs): una tool `simular_abono_capital` de verdad —con ella la tarjeta
de Ana tendría botón y la cifra de ahorro honesta—, y limpiar imágenes viejas en cada
deploy en vez de a mano.

### 12:45 · pulido — Los estados de carga miden lo que va a llegar

Medí antes de tocar: en `/catalogo`, el alto de cada esqueleto contra el de su tarjeta
real. **Casi todos estaban entre el 30 % y el 60 %.** O sea que al llegar los datos cada
tarjeta saltaba a 2–3 veces su altura y la rejilla bento entera se reacomodaba delante de
la persona. El sistema de diseño pide "skeleton del tamaño final del contenido"; nadie lo
cumplía, yo incluido.

La causa era la misma en todos: cada esqueleto dibujaba el encabezado y poco más. Faltaban
el cuerpo (filas, barras), los botones y **el pie "¿Por qué veo esto?"**, que solo él mide
60–90 px.

Hice un módulo compartido, `packages/catalogo/src/esqueletos.tsx`, con dos decisiones que
hacen que las alturas coincidan **por construcción** y no a ojo:

- usa **los mismos contenedores** de la tarjeta real (`CardHeader`, `CardContent`,
  `CardFooter`), con su padding y sus gaps;
- cada `Linea` ocupa **la caja de línea exacta** del texto que reemplaza (`text-sm` = 20
  px, `text-3xl` = 36 px) con el bloque gris centrado. Tres líneas de esqueleto miden lo
  mismo que tres de texto.

Antes de construir medí las partes de cada tarjeta (encabezado, cuerpo, pie, alto de
fila) para tener los números objetivo. Resultado en mis 8: **de 0.30–0.61 a 0.99–1.03**
del alto real. Y lo miré, porque medir bien no es verse bien: el `Calendario` esqueleto
tiene las 6 filas con su borde al mismo ritmo que la real, la línea "y N más" y el pie a
la misma altura.

**Un detalle de producto que salió gratis:** `heroe` es una prop literal, no depende del
data model, así que se conoce antes que los datos. Ahora la tarjeta héroe **ya aparece con
el degradado** mientras carga, con los bloques en blanco translúcido. Antes salía blanca y
se volvía roja: un parpadeo. Para verlo en la galería tuve que hacer que su estado de carga
copie del ejemplo `heroe` y `ancho` (las props que no dependen de datos); antes le pasaba
solo `razon` y siempre mostraba el esqueleto blanco.

Cada esqueleto lleva `aria-busy` y una etiqueta en palabras ("Cargando tus próximas
fechas"), para que un lector de pantalla no lea bloques vacíos. Hay 10 pruebas: que los 8
pinten su esqueleto y lo anuncien, y que el héroe salga rojo desde la carga.

**Lo que NO toqué, a propósito:** los 10 componentes nuevos de Chee3mss (AlertaFugas,
TermometroSaludFinanciera, RiesgoRendimiento…). Siguen en 0.34–0.71 con un esqueleto
genérico copiado en cada uno (`h-4 w-36`, `h-9 w-44`, `h-28 w-full`). Los subió hace 24
minutos y está trabajando en ellos; meterle mano a diez archivos recién commiteados de otra
persona es la receta para un conflicto. Con `esqueletos.tsx` y la nota nueva en la skill
`ui-generativa`, adoptarlo son unas líneas por componente.

Dos tropiezos de medición, anotados porque engañan: el primer "2.26" de `PlanDePago` era mi
script comparando contra la `ResumenTarjeta` que va primero en su ejemplo (la real mide 523
y el esqueleto 523); y el primer par de capturas salió recortado porque un `scrollIntoView`
movió la página entre medir las cajas y recortar.

### 12:40 · arreglado — SimuladorMeta ya puede ser la tarjeta héroe (#14)

Tomé la salida de fondo y no la barata. La barata era aceptar e ignorar `heroe` en todos
los componentes (subirlo a `PropsBase`): quitaba el reintento, pero dejaba al modelo
pidiendo algo que tiene sentido y a la interfaz fingiendo que lo hacía. Para Ana, sin
deuda, el simulador **es** la tarjeta principal de su pantalla —la de adaptabilidad—, así
que el modelo tenía razón en pedirlo.

La parte de diseño era la que importaba: en el degradado, el slider y el botón rojos son
rojo sobre rojo. En la variante héroe todos los controles pasan a blanco —rango y pulgar
del slider, la barra "Ya llevas"— y el botón es la píldora clara del sistema de diseño
(`bg-white/90 text-primary`). Lo verifiqué como hoy se verifica todo: midiendo los colores
computados en el navegador a 1280 y 390 px (rango `rgb(255,255,255)`, pista blanca al 30 %,
botón blanco al 90 % con texto rojo) y mirando la captura.

Esto solo funcionó a la primera por el arreglo del `@source` de esta mañana: los overrides
`[&_[data-slot=slider-range]]:bg-white` son clases que solo existen en `packages/catalogo`.
Sin ese arreglo, habría escrito la variante, se habría visto roja sobre roja, y habría
pasado un buen rato buscando el error en el componente.

Dos turnos reales con Ana: 2 pasos, cero errores. Pero en ninguno el modelo le puso
`heroe` al simulador —en uno eligió `ProyeccionPagoCredito` como héroe, un componente
nuevo del fork—, así que las corridas no ejercitaron el caso exacto. Eso lo cubre una
prueba determinista con el componente tal como lo mandó el modelo en el turno que falló.
No quiero confundir "no falló" con "está probado".

Un susto en el camino: `pnpm catalogo` falló una vez y dejó `catalogo.json` truncado
(`'}' expected` en la línea 2770). Al correrlo solo generó bien. Casi seguro fue el fork
regenerando el mismo archivo al mismo tiempo: dos sesiones escribiendo un artefacto
generado es una carrera. Si vuelve a pasar, `pnpm catalogo` otra vez lo arregla, porque el
archivo sale entero de los schemas.

### 12:15 · medido — Con cuota, el caché pega: 76–87 % de la entrada

Subieron el tope y por fin se pudo medir en vez de razonar. Cuatro turnos reales:

| Turno | Entrada | Desde caché |
|---|---|---|
| Beto, "quiero pagar menos intereses" | 20,336 | **16,276** (80 %) |
| El mismo, repetido | 20,336 | **16,276** (80 %) |
| **Ana**, la misma pregunta | 23,415 | **20,341** (87 %) |
| Beto, **segundo turno** con historial | 21,442 | **16,276** (76 %) |

Lo que confirma: el prefijo compartido (~16k tokens de system + tools) se reusa **entre
personas y entre turnos**. El orden estable arriba / volátil abajo hace exactamente lo que
tenía que hacer.

**Lo que no me cuadraba, y lo probé en vez de suponerlo.** En los 55 turnos de la mañana el
caché dio cero con la misma forma de petición. La única diferencia de código que tocaba la
petición era `allowSystemInMessages`, que puse por un warning. Si ESO hubiera activado el
caché, alguien que borrara el "silenciador" lo apagaría en silencio. Así que hice el A/B:
quité la opción, dos turnos idénticos, y el caché pegó igual (16,276). **Descartado.** El
archivo quedó restaurado y lo verifiqué contra `git diff`. El cambio fue del lado de Google
y la causa no se puede saber desde aquí — por eso el log de cada turno trae `cache`.

**Lo que NO afirmo:** que el caché acelere. Con caché encendido, turnos equivalentes
tardaron 3.3, 5.8, 6.0 y 7.7 s. El 3.3 s del principio parecía un "casi el doble de rápido"
y era ruido. El beneficio medido es de costo.

**Y un bug de paso (#14):** el agente le pone `heroe` a `SimuladorMeta`, que no lo declara, y
el turno de Ana gastó un paso en reintentar. No es descuido del modelo: 13 componentes del
catálogo aceptan `heroe` y `SimuladorMeta` es de los pocos que no, así que para el modelo
es una prop general — y para Ana, sin deuda, el simulador **es** su tarjeta principal. Lo
registré en vez de arreglarlo porque el catálogo está en obra con el fork y una de las dos
salidas es de diseño (el slider y el botón son rojos: sobre el degradado serían rojo sobre
rojo).

Cerré el #12 con la evidencia: el arreglo vive fuera del código, así que a mano y no con
`Fixes`.

### 11:45 · investigado y fijado — El caché: nuestro lado está probado, el de Gemini no depende de nosotros

"Arregla el caché" resultó ser primero un problema de saber **de qué lado está el fallo**,
y eso sí se puede resolver sin cuota.

**Primero descarté mi propia medición.** Si el SDK perdiera los tokens cacheados al sumar
los pasos, yo estaría viendo cero donde hay caché. Fui a leer `addTokenCounts`: trata el
ausente como 0 y solo devuelve `undefined` si los dos lo son. Y `@ai-sdk/google` sí mapea
`cachedContentTokenCount`. Así que el cero de los 55 turnos es real.

**Después probé nuestro lado, sobre los bytes que salen.** Intercepté el `doStream` del
modelo en un turno de dos pasos y comparé los prompts: el system prompt es byte por byte
el mismo, las tools van en el mismo orden, y **la segunda petición arranca con la primera
completa**. Esa última es *la* propiedad del caché y ahora tiene prueba; antes solo estaba
probado `mensajesDelTurno`, que es un nivel más arriba —entre eso y el proveedor están el
bucle de pasos y el propio SDK—.

**Y probé el camino de Claude hasta el cuerpo HTTP**, que es el que de verdad se puede
arreglar: creé el proveedor con un `fetch` propio que captura el cuerpo, y comprobé que el
`cache_control: ephemeral` sale sobre el bloque del system prompt y que `usr_beto` NO está
dentro del prefijo cacheado. Sin llamar a la API y sin gastar un token. O sea: **el día que
haya una llave de Anthropic, el caché funciona**, y eso ya no es una esperanza.

**Lo que NO hice, y por qué:** caching explícito de Gemini (`cachedContent`). Crear el
recurso exige una llamada a la API —o sea cuota, que es justo lo que no hay—, así que sería
maquinaria nueva sin una sola ejecución real, a horas de un pitch, en la ruta crítica del
producto. El mismo dinero rinde más subiendo el tope. Queda anotado como opción, no como
pendiente olvidado.

**Lo que sí queda para que la próxima llamada real cierre el tema:** el log de cada turno
ahora trae `entrada`, `salida` y `cache`. `cache: null` = el proveedor no reporta nada;
`cache: 0` = reporta que no cacheó; `cache: 12000` = está pegando. Una llamada y se sabe.

De paso: el SDK avisaba en cada turno de que un `system` dentro de `messages` es un vector
de inyección. Tiene razón en general y no aquí —lo arma `systemPrompt()`, es una constante
nuestra, y lo que escribe la persona entra como `user`—, así que puse
`allowSystemInMessages: true` **con el por qué en un comentario**: una decisión explícita
vale más que un warning que todos aprenden a ignorar.

Y un tropiezo: llamé `uso` a una variable que ya existía en esa función. `const` sobre un
`let` del mismo scope es SyntaxError, el módulo dejó de cargar y 11 pruebas se cayeron de
golpe. Dos minutos, pero es la tercera vez hoy que el typecheck me habría ahorrado el susto.

### 11:20 · arreglado — El CI vuelve a servir de señal

El único paso rojo era "un prompt del guion contra la URL publica", y no por un bug: el
tope de gasto de Gemini (issue #12) tumbaba la llamada al modelo. El deploy se publicaba
igual, así que el rojo era permanente y **tapaba** cualquier otra cosa que se rompiera.
Un CI que no distingue lo externo de lo propio deja de ser señal y pasa a ser ruido.

Ahora el paso clasifica tres desenlaces:

- salen mensajes `a2ui` → **pasa**, y lista los componentes que el agente construyó;
- el stream trae `codigo: "modelo"` → **avisa y sigue**: la app llegó al proveedor y
  reportó el fallo con honestidad; sin cuota, el deploy no está roto;
- cualquier otra cosa, **o el stream sin `fin`** → **falla**. Ese segundo caso es nuevo y
  vale por sí solo: el contrato dice que el stream siempre termina en `fin`, así que si no
  llega, es un bug nuestro sin importar lo demás.

Probé el bash **aquí**, no en el CI: extraje el cuerpo del paso a un script y lo corrí con
cuatro respuestas de verdad (la buena grabada del ensayo, la de cuota copiada del log del
run que falló, una sin A2UI y una sin `fin`), comprobando el `exit` de cada una. Los cuatro
correctos. La primera vez medí mal —leía el código de salida de `head` en vez del script—
y los cuatro casos me salían 0; si me hubiera fiado, habría subido un paso que nunca falla.
Iterar esto en GitHub habría costado cuatro pushes de tres minutos.

También cambié un `cut -c 34-` que sacaba el motivo del error contando caracteres a ciegas
por un `sed` con grupo de captura: el `cut` se comía los primeros cuatro caracteres del
mensaje.

Y una decisión que vale decir en voz alta: con el aviso, un deploy con el agente muerto
sale **verde**. Para que nadie lo lea como "la demo funciona", el aviso lleva título en el
resumen del run y el log dice literalmente que el agente publicado no está construyendo
pantallas, con el número del issue.

### 11:00 · arreglado — Dos tarjetas se pintaban encima de su propio pie

Siguiendo con las capturas, `Calendario` tenía el texto **encimado**: "… y 1 más,
$57,480.30 en total" y el "¿Por qué veo esto?" quedaban debajo de la fila "12 de marzo".
`DetalleCategoria` tenía lo mismo.

La causa es la misma en las dos y vale saberla: nuestro `ScrollArea` (Base UI) tiene la
raíz en `relative` y el viewport en `size-full`. Con solo `max-h-72` en la raíz —sin
`overflow-hidden`— **nada recorta**: el viewport mide 100 % de una caja sin límite, la
tabla se desborda fuera del box de la raíz y se pinta sobre lo que sigue. El layout ni se
queja: para el navegador todo está en su sitio.

Dos arreglos distintos porque son dos casos distintos:

- **`Calendario`**: fuera el `ScrollArea`. Su prop `maximo` (6 por defecto) ya acota las
  filas y el resto se resume en una línea, así que el scroll era redundante. Menos código
  y el bug desaparece por construcción.
- **`DetalleCategoria`**: ahí el scroll sí sirve (la lista la manda el agente y puede
  traer veinte movimientos), así que lleva `overflow-hidden` para que recorte de verdad.

Verificado midiendo cajas en el navegador, no a ojo: `tablaSolapaResumen`,
`tablaSolapaPie` y `resumenSolapaPie` en `false`, y la tabla dentro de la tarjeta en las
dos. Consola sin errores.

### 10:45 · arreglado — Tailwind no compilaba las clases del catálogo, y no se notaba

Abrí el navegador de verdad (Chromium de Playwright, capturas que pude mirar yo mismo) y
la primera pasada por los 8 componentes de `/catalogo` me dio tres cosas. Una de ellas es
de las que dan miedo.

**Tailwind v4 no escaneaba `packages/*`.** Detecta las fuentes desde la raíz de `apps/web`,
así que una clase usada **únicamente** en `packages/catalogo` no generaba CSS: sin aviso,
sin romper el build, sin fallar una prueba. Lo medí en el CSS servido: `bg-chart-4` →
**cero** reglas. Las clases que sí funcionaban era por casualidad, porque `apps/web` las
usaba también (`bg-tinte`: 4 reglas; `border-borde-sutil`: 1).

Lo que eso significaba en pantalla, y explica una de las capturas de antes:

- **`GastoPorCategoria` pintaba TODAS las barras en rojo.** El diseño dice "lo que más
  duele va en rojo y el resto en plata"; sin `bg-chart-4` la gráfica decía que todo duele,
  que es justo no decir nada. Ahora solo "Retiros de efectivo +74.7 %" va en rojo.
- **La barra de "uso del límite" del héroe era invisible**: indicador rojo sobre tarjeta
  roja con la pista transparente, porque los overrides `[&_[data-slot=progress-*]]`
  tampoco se generaban. Está en `ResumenTarjeta` y en `MetaActiva`.

Dos líneas de `@source` en `globals.css` lo arreglan, y le puse dos pruebas más una nota
en la skill `diseno-banorte`, porque es el tipo de fallo que vuelve: no duele hasta que
alguien mira la pantalla.

**Lo que aprendí de método**: llegué a esto midiendo, no mirando. Mi primera lectura de la
captura fue "falta el degradado de marca en el héroe" — y era falsa: le pregunté al
navegador por el `background-image` computado y el degradado estaba ahí, solo que entre
`#EC0029` y `#C00020` hay poca distancia. Si hubiera "arreglado" lo que creí ver, habría
cambiado la paleta de Banorte sin necesidad. El `getComputedStyle` y el CSS servido
decidieron las tres.

**Los otros dos, más chicos:**

- `PlanDePago`: la opción **recomendada** —justo la que se quiere leer— se partía en "18 /
  meses" porque el badge le robaba el ancho, y la fila quedaba 12 px más alta que las
  otras. `whitespace-nowrap`.
- `SimuladorMeta`: tenía los datos del avance ($48,150 de $96,000) solo en texto. Le puse
  la barra "Ya llevas 50.2 %", el mismo patrón que `MetaActiva` — son la misma meta antes
  y después de crearla.
- Y en la galería, `pb-28` no alcanzaba: el panel de acción es `fixed` y crece a 256 px, así
  que tapaba la última tarjeta.

**Un tropiezo mío que vale anotar:** metí el comentario del `pb-72` como segundo hijo raíz
del `return`, que es JSX inválido, y la galería dejó de renderizar. Lo detecté porque el
script de capturas encontró **0 secciones**. `pnpm typecheck` lo habría dicho en dos
segundos: de aquí en adelante, typecheck antes de capturar.

Verificado a 1280 px y a 390 px: sin desborde horizontal, la etiqueta larga se trunca con
elipsis, y la consola del navegador sin un solo error ni warning. 332 pruebas en verde.

### 10:15 · arreglado — El hilo guarda las pantallas, el caché pega, y el guion entero pasa

Cuatro cosas de una captura y una frase ("el componente no se guarda en el historial, el
prompt caching se tiene que guardar, todo debe ser natural con consejos").

**1. Las pantallas se quedan en el hilo.** Era lo peor de la conversación: cada pregunta
nueva borraba la tarjeta anterior, así que al desplazarse hacia arriba quedaban frases
sueltas —"en agosto tu mayor gasto fue Vivienda"— sin la pantalla que las sostenía. Ahora
`hilo` es **una sola lista en orden** con las dos cosas (lo dicho y lo construido); al
cerrar el turno la superficie se congela ahí con su tira de transparencia. Congelar es
quedarse con la referencia, porque `procesar` nunca muta. El historial que viaja al agente
se **deriva** de esa misma lista: antes eran dos estados paralelos que podían separarse.

La única decisión que se puede equivocar en silencio es cuál pantalla está viva (pintarla
dos veces, o no pintarla), así que salió del hook a `calcularSuperficieViva` y tiene seis
pruebas.

**2. El prompt caching.** Estaba a medias sin que se notara: el system prompt iba en
`system` (no cacheable con Claude) y nada reportaba si pegaba. Ahora va como **primer
mensaje** con el breakpoint `cacheControl: ephemeral` —Gemini cachea el prefijo estable
solo; Claude necesita que se lo pidan— y el orden quedó explícito: lo grande y estable
arriba, el historial que solo crece en medio, y lo volátil del turno (quién pregunta, qué
hay en pantalla, el data model) **al final**, fuera del prefijo. La prueba que lo cuida no
mira el texto: exige que el prefijo sea byte por byte idéntico para otra persona y otro
turno. Y el `fin` del stream ahora reporta `cacheLeido`, porque un caché que no pega no se
nota: solo sale más caro y más lento.

**3. El tono.** El `texto` era una etiqueta descriptiva ("aquí tienes tu gasto"). Ahora son
de una a tres frases con el dato y **la recomendación**. Lo que sale hoy: *"Tus retiros en
efectivo subieron 74.7 % y llegaron a $4,601. Si los moderas a su nivel habitual de $2,600,
liberas casi $2,000 al mes para cubrir tu plan sin presiones."*

**4. El turno que se quedaba sin pasos.** La captura mostraba `proyectar_ahorro` llamada
seis veces, 8 pasos consumidos, 17 segundos y una disculpa. Tres causas, y ninguna era
"el modelo es tonto":

- la tool **rechazaba con razón**: Beto no tiene meta de ahorro, así que hacía falta
  `montoObjetivoCentavos`, y el modelo no tenía cómo saberlo. Quedó en el `.describe()`
  del schema, que es donde el modelo mira al llenar argumentos, y en el prompt: proponer
  un objetivo (tres meses de gastos) **no es inventar un dato**, es una recomendación;
- `aportacionCentavos: 0` también se rechazaba, y ese cero **lo puede mandar el slider**
  del `SimuladorMeta` en su mínimo: era un bug alcanzable desde la interfaz, no solo por
  el modelo. Ahora vale como "no me dijiste nada" y se usa la capacidad calculada;
- no había **reserva de pasos**: si el turno se entretenía consultando, no quedaba paso
  para pintar. Ahora `prepareStep` fuerza `pintar_pantalla` en los dos últimos.

De paso: pedir las tools del mismo paso juntas (se ejecutan en paralelo) bajó el turno de
Carmen de **22.5 s a 4.5 s** y el de Ana de 16.7 s a 2.7 s. Y `armarMensajes` ahora rescata
el JSON cuando el modelo le pega una cerca de markdown o una frase: tirar un turno de 6 s
por una comilla no vale la pena, y el contenido se valida igual después.

**Lo que de verdad cambió mi forma de trabajar aquí: `pnpm probar-guion`.** Las 315 pruebas
del repo usan un modelo simulado —prueban el cableado— y no podían ver nada de esto. El
script recorre los 9 pasos del guion contra el agente real (los tres perfiles, la acción
incluida) y marca el turno que no pintó, el que usó el componente equivocado, el que tardó
más de 15 s y la tool que falló. Encontró los cuatro bugs de arriba en dos minutos, y
distingue lo recuperado (aviso, con su costo en segundos) de lo roto. Ya está en la
checklist previa, después de `reiniciar-estado`.

Estado final: **los 9 pasos pasan**, entre 2.7 s y 5.9 s, sin avisos. 315 pruebas en verde.

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
