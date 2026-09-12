---
estado: aceptada
fecha: 2026-09-13
---

# 0010 — PostgreSQL es la única fuente de datos; se retiran los CSV

> Reemplaza el mecanismo del ADR 0007 (CSV commiteados como fuente y Postgres como
> copia cargable, con fallback en memoria). Lo que el 0007 decidió sobre **qué** datos
> existen —tres perfiles, doce meses de historial, los territorios de negocio— sigue
> vigente tal cual; lo que cambia es **de dónde salen**.

## Contexto

El 0007 puso los CSV como fuente y Postgres como copia opcional detrás de
`FEATURE_POSTGRES`. Con el flag apagado por defecto, el resultado práctico fue que
**nadie leía la base**: el MCP cargaba los 22 CSV al arrancar, la web leía esos mismos
archivos, y la base del proyecto estaba llena de datos que ningún flujo tocaba.

Eso tenía tres consecuencias que pesan más que la comodidad de no depender de la red:

1. **El estado mutable no se compartía.** Las acciones se escribían en
   `apps/mcp/estado.json`, en el disco de cada proceso. La demo local y la publicada
   tenían estados distintos, y dos instancias de la app publicada no se veían entre sí.
2. **Los datos eran una foto, no una base.** Cualquier cambio exigía regenerar CSV,
   commitearlos y volver a desplegar.
3. **Ante el jurado, "tenemos Postgres" era una media verdad**: estaba desplegado y
   cargado, pero el producto no lo usaba.

## Decisión

**PostgreSQL (esquema `banorte`) es la única fuente de datos del sistema.**

1. **Se borran los 22 CSV de `db/datos/`** y los scripts que existían para generarlos,
   validarlos y cargarlos.
2. **El MCP lee de la base al arrancar** (`apps/mcp/src/datos/postgres.ts`): trae el
   esquema entero a memoria —son ~3,700 filas— y a partir de ahí las lecturas son
   síncronas. Eso es deliberado: mantiene el dominio y las 15 tools como código normal
   en vez de una cascada de `await`, y evita que una consulta lenta arruine un turno del
   agente delante del jurado.
3. **Si la base no responde, el MCP no arranca.** Sin fallback. Un servidor que contesta
   sin datos es peor que uno que no contesta: el primero se descubre en la demo.
4. **El estado mutable vive en `banorte.acciones_aplicadas`**, no en un archivo. La
   idempotencia la garantiza un **índice único** sobre `idempotency_key`: dos llamadas
   con la misma llave dejan una sola fila aunque lleguen a la vez. Reiniciar la demo es
   truncar esa tabla (`pnpm reiniciar-estado`), y el servidor que ya está corriendo lo
   nota sin reiniciarse porque refresca las acciones antes de cada llamada a una tool.
5. **La web también lee de la base** (`apps/web/src/lib/datos/tablas.ts`), con la misma
   firma que tenía el lector de CSV: `consultas.ts` y los componentes no cambiaron.
6. **Las pruebas no tocan la base.** Corren contra un volcado
   (`apps/mcp/src/__tests__/datos-de-prueba.json`, regenerable con `pnpm datos:fixture`)
   que se carga en un `setupFiles` de vitest. Sin red y sin riesgo de truncar la tabla
   de la demo con un `pnpm test`.

## Lo que se pierde, dicho claro

**Ya no hay demo sin red.** Antes, con los CSV en el repo, `pnpm dev` funcionaba en un
avión. Ahora, si el VPS o la conexión del stand caen, el producto no levanta. Es el
riesgo que este ADR acepta a cambio de que el dato sea real y compartido.

Lo que lo hace tolerable, y hay que tenerlo probado antes del pitch:

- **`pnpm datos:restaurar`** repuebla la base desde el volcado si alguien la vacía.
- El volcado sirve además como respaldo del contenido, versionado en el repo.
- Si el stand no tiene red fiable, la salida es levantar un Postgres local
  (`DATABASE_URL=postgres://…@localhost:5432/…`) y `pnpm datos:restaurar`. **Eso hay que
  ensayarlo antes**, no descubrirlo el domingo.

## Alternativas descartadas

- **Dejar el flag `FEATURE_POSTGRES`.** Dos caminos de datos es dos veces la superficie
  de fallo y, en la práctica, el camino apagado es el que nunca se prueba. El origen
  dual fue justo lo que hizo que nadie notara que la base no se usaba.
- **Consultar la base en cada tool en vez de cargar al arrancar.** Más "correcto" y
  peor aquí: convierte 15 tools síncronas en asíncronas, multiplica los puntos donde un
  turno del agente puede colgarse, y no compra nada con 3,700 filas que caben en memoria.
- **Mantener los CSV como respaldo.** Es lo que ya había, y su efecto real fue que la
  base quedara decorativa. El volcado JSON cumple el papel de respaldo sin competir por
  ser la fuente.

## Consecuencias

- `db/` se queda con `schema.sql`, `reiniciar.sql` y `migraciones/`. Los datos no están
  en el repo.
- Los scripts de datos son ahora `datos:migrar`, `datos:fixture` y `datos:restaurar`.
- `DATABASE_URL` es **obligatoria** para levantar el MCP, en local y en producción.
- La migración `0001-acciones-idempotencia.sql` añade `idempotency_key` con índice único
  y amplía los `CHECK` de `acciones_aplicadas`, que no contemplaban
  `cancelar_suscripcion`.
- Las skills `datos-mock` y `tool-mcp` y los docs de `como-funciona/` se corrigen en el
  mismo commit.
