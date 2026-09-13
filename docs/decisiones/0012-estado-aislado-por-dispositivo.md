---
estado: aceptada
fecha: 2026-09-13
---

# 0012 — Lo que muta en la demo se guarda por dispositivo: cada visitante tiene su propio estado

> Complementa el ADR 0010 (PostgreSQL es la única fuente): el estado sigue viviendo en la
> base, pero ya no es uno solo para todos. Detalle en `docs/como-funciona/estado-por-dispositivo.md`.

## Contexto

La demo tiene **tres personas** (Beto, Ana, Carmen) y, en el stand y con la liga publicada,
**muchos visitantes a la vez** abriendo las mismas tres. Todo lo que muta estaba guardado por
persona, no por visitante:

- `banorte.acciones_aplicadas`: el plan que un juez aplicaba a Beto desde su celular le
  aparecía aplicado a todos los que abrían a Beto. El siguiente ya no podía "aplicar el plan":
  estaba aplicado.
- `banorte.pantallas_inicio`: la pregunta que alguien hacía en la barra de Inicio **reemplazaba
  la portada de todos**, y el ajuste de una tarjeta con widgets vivos, igual.

El 2026-09-13 a las 03:40 la base tenía un plan de Beto y un apartado de Ana aplicados en el
estado compartido: cualquiera que abriera la demo veía a Beto ya sin deuda.

Lo que se quería: que cada quien pruebe sin pisar a nadie, que lo que hizo **se guarde en la
base** y que al volver **siga donde se quedó**, sin login (datos sintéticos, prototipo).

## Decisión

1. **Cada navegador es un dispositivo.** `apps/web/src/proxy.ts` le pone la cookie httpOnly
   `maya_dispositivo` (`dis_` + 24 hex, un año) en la primera visita, en la respuesta **y** en
   la petición que sigue a la página, para que el primer render ya la vea. No corre en `/api`:
   un script sin cookie usa el estado comun en vez de estrenar dispositivo en cada petición.
2. **El dispositivo viaja en la conexión MCP, no en los argumentos.** `conectarMcp({
   dispositivoId })` manda la cabecera `x-maya-dispositivo`; `registro.ts` del MCP abre un
   `AsyncLocalStorage` alrededor de cada tool. Ninguna de las tools cambia su schema y el
   modelo nunca ve ni puede cambiar el dispositivo.
3. **Las acciones se guardan y se leen por dispositivo.** `acciones_aplicadas.dispositivo_id`
   (default `comun`); `accionesDe` filtra por el de la llamada; la llave de idempotencia se
   guarda prefijada con el dispositivo, así el índice único de siempre sirve y dos visitantes
   con la misma llave no chocan.
4. **La portada de Inicio es común hasta que el dispositivo se aparta.** Un visitante que no ha
   hecho nada ve la portada común (la del reloj) y no cuesta modelo. En cuanto aplica algo,
   pregunta en Inicio o ajusta una tarjeta, su portada vive en `pantallas_por_dispositivo`.
   Algoritmo en `docs/algoritmos/portada-por-dispositivo.md`.
5. **Sin dispositivo es `comun`**: el reloj, `pnpm humo`, `pnpm probar-guion`, curl y el código
   anterior siguen con el estado compartido de siempre.
6. **La migración es aditiva** (0007): columnas con default y una tabla nueva. El código
   anterior, que durante un rato corre contra la misma base (deploys, laptops del equipo),
   sigue funcionando.

## Alternativas descartadas

- **Login o elegir un nombre al entrar.** Fricción para un juez con 5 minutos y nada que
  proteger: los datos son inventados. La cookie da lo mismo sin pedir nada.
- **Clonar a Beto, Ana y Carmen por visitante** (filas nuevas en `usuarios`, `movimientos`…).
  ~3,700 filas por visitante, el MCP carga las tablas en memoria al arrancar y los ids
  estables (`usr_beto`) están en el prompt, los ejemplos y el guion.
- **`dispositivoId` como argumento de cada tool.** Tocaba los schemas de 20+ tools, el modelo
  lo vería y podría escribir otro, y cada llamada de la web (agente, portada, widgets,
  auditor) tendría que acordarse de pasarlo.
- **Cambiar la llave primaria de `pantallas_inicio` a (dispositivo, persona).** Más limpio en
  el papel, pero el `on conflict (usuario_id)` del código anterior deja de funcionar en cuanto
  corre la migración, y la base es compartida con producción y con las laptops del equipo.
- **Estado en `localStorage`.** No llega al servidor ni al MCP, que es donde se decide qué
  pantalla se arma, y no queda en la base.

## Consecuencias

- **Gana la demo**: nadie ve el plan aplicado por otro; cada juez puede recorrer el guion
  completo desde su celular aunque el de al lado lo esté haciendo también.
- **Empezar de cero es trivial**: una ventana de incógnito es un dispositivo nuevo. Quien
  presenta puede ensayar sin borrar lo que hicieron los visitantes.
- **`pnpm reiniciar-estado` sigue siendo global**: borra las acciones de todos los
  dispositivos y sus portadas propias.
- **Costo**: la portada de un dispositivo que se apartó se paga una vez por dispositivo (un
  modelo "lite", ~5 s). El reloj solo rearma las tres comunes: su costo no crece con los
  visitantes. Si el estado **comun** tiene acciones, cada dispositivo nuevo ya no coincide con
  él y arma su propia portada: antes de abrir la liga al público conviene un `reiniciar-estado`.
- **Vigilar**: una tool de acción nueva no necesita nada (pasa por `aplicarAccion`), pero una
  lectura que consulte `acciones_aplicadas` sin `accionesDe` se saltaría el aislamiento.
- **No cubre (todavía)**: al recargar `/maya` la conversación sigue empezando vacía; ya se
  guarda con su `dispositivo_id` (`conversaciones`), pero la interfaz no la restaura.
