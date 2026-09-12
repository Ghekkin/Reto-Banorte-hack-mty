---
verificado: 2026-09-12 15:40
implementado-en: apps/web/src/lib/inicio/huella.ts, apps/web/src/lib/inicio/generar.ts
lenguaje: typescript
---

# La portada de Maya: cuándo se rearma y con qué orden se arma

## Para cualquiera

Es como el corcho de avisos de una oficina: no vale la pena reimprimirlo cada hora si
nadie colgó nada nuevo. Cada portada guarda una "huella" de los datos con los que se hizo;
cuando el reloj pasa, compara la huella de hoy con la guardada, y si es la misma no toca
nada. Y cuando sí hay que rearmarla, las tarjetas se eligen con una escalera fija de
urgencia: lo que más duele va primero.

## La idea

Dos problemas, dos reglas chicas.

**Cuándo rearmar.** Un modelo, aunque sea barato, cuesta y tarda. Lo que hace que una
portada cambie son pocas cosas y todas dejan rastro en la base: una acción aplicada
(`acciones_aplicadas`), movimientos nuevos (`movimientos`), o que cambió el generador (el
prompt, el catálogo). La huella junta esas señales en una línea legible; comparar dos
líneas cuesta nada.

**Con qué orden armar.** Un modelo chico, si lo dejas, arma con lo que tiene a la mano
(medido: el portafolio de Ana en vez de su crédito al 27.9 %). La escalera le dice qué es
urgente para un banco: deuda revolvente, luego deuda a plazo, luego un portafolio
desviado, luego el gasto que se salió, luego el ahorro. Y el prefetch le pone en la mano
los datos de cada peldaño que aplica, para que "lo que tiene a la mano" sea lo correcto.

## Paso a paso

### La huella (`huella.ts`)

1. Dos subconsultas con índice para la persona: `count(*) || ':' || max(id)` de
   `acciones_aplicadas`, y `count(*) || ':' || max(fecha)` de `movimientos`.
2. Se arma `v{VERSION_DEL_GENERADOR}|c{componentes del catálogo}|a:{acciones}|m:{movimientos}`.
   Ejemplo: `v1|c18|a:1:7|m:683:2026-09-12`.
3. Se compara con la `huella` guardada junto a la portada: iguales → `sin-cambios`;
   distintas o sin portada → se rearma. `forzar` salta la comparación (el ensayo).
4. Se guarda la huella de **antes** de generar, no la de después: describe los datos con
   los que se armó. Si algo cambió mientras el modelo pensaba, la siguiente revisión lo nota.

### La escalera y el prefetch (`generar.ts`)

1. `panorama_inicial` primero: dice si hay tarjeta, si ya tiene plan, cuánto puede ahorrar.
2. Con eso se decide la segunda ola, en paralelo: `analizar_gasto`, `analizar_ahorro`,
   `consultar_creditos` (con `incluirAmortizacion` y 12 pagos si **no** hay tarjeta),
   `consultar_tarjeta` si la hay, y `simular_reestructura` si `usoDelLimite >= 0.5` y no
   hay plan activo.
3. Tercera ola: `proyectar_ahorro` si no hay meta activa (`analizar_ahorro.ahorro === null`),
   la capacidad es positiva y hay gasto: objetivo = 3 × gasto mensual (un fondo de
   emergencia; la misma regla que el prompt del agente).
4. El encargo le da al modelo la escalera: (a) tarjeta al límite o en mora →
   `ResumenTarjeta` héroe + `PlanDePago` (con plan activo, sin `PlanDePago`); (b) sin
   tarjeta pero con crédito → `ProyeccionPagoCredito` héroe + `SimuladorMeta`; (c)
   portafolio desviado → `DistribucionPortafolio` héroe + `OrdenRebalanceo`; (d) topes o
   fugas → `AlertaFugas` / `GastoPorCategoria`; (e) meta activa → `MetaActiva`, sin meta y
   con capacidad → `SimuladorMeta`. Después, contexto hasta llegar a 3 o 4:
   `GastoPorCategoria` y `TermometroSaludFinanciera`, que siempre tienen datos.

## Entradas y salidas

| Entrada | Tipo | Ejemplo |
|---|---|---|
| `usuarioId` | `string` | `usr_ana` |
| Huella guardada | `string \| undefined` | `v1|c18|a:0:0|m:821:2026-09-12` |
| Datos del MCP | `Record<tool, resultado>` | `{ panorama_inicial: {...}, analizar_gasto: {...}, … }` |

| Salida | Tipo | Ejemplo |
|---|---|---|
| Decisión | `generada \| sin-cambios \| fallo \| inactivo` | `sin-cambios` (el reloj pasó de largo) |
| Portada | 3 mensajes A2UI + `texto` + `razon` + `sugerencias` | 4 componentes, una héroe |

## Parámetros y umbrales

| Número | Dónde | Por qué | Si se mueve |
|---|---|---|---|
| `USO_ALTO = 0.5` | `generar.ts` | El mismo umbral de `panorama_inicial` para "la tarjeta preocupa"; a partir de ahí conviene tener la simulación de plazos a la mano | Más bajo: se simula para todos con tarjeta (una tool más, ~200 ms); más alto: Beto (0.967) sigue entrando |
| `MESES_DE_FONDO = 3` | `generar.ts` | Tres meses de gasto es la regla de fondo de emergencia que ya usa el prompt del agente | Cambia el objetivo que ve el `SimuladorMeta` de quien no tiene meta |
| `maxPasos = 3` | `config.ts` | 0: pedir o pintar; 1: pintar forzado; 2: reintento | Menos: sin reintento; más: gasto sin beneficio, la portada casi nunca pide tools |
| `VERSION_DEL_GENERADOR = 1` | `huella.ts` | Subirla rearma las tres portadas en la siguiente revisión | Es el "botón" para publicar un cambio de prompt |
| `INICIO_CADA_MINUTOS = 10` | `.env` | Ritmo del reloj; la huella hace que sea barato | Más corto: más consultas SQL (nada de tokens); más largo: una acción tarda más en verse si el gancho `alMutar` fallara |

## Límites y supuestos

- La huella mira `acciones_aplicadas` y `movimientos`. Un cambio hecho a mano en otra
  tabla (una meta editada por SQL) no la mueve; `pnpm datos:restaurar` tampoco si deja
  las mismas cuentas. Para eso está `forzar` y `VERSION_DEL_GENERADOR`.
- La escalera está escrita para tres perfiles y 18 componentes. Un perfil nuevo con otra
  situación (una hipoteca, un seguro) cae en "contexto" hasta que se le dé un peldaño.
- El modelo decide dentro de la escalera, no la ejecuta un `if`: dos corridas pueden
  diferir en la tercera o cuarta tarjeta. Lo que se garantiza es lo que valida
  `pintar_pantalla` (componentes del catálogo, props, una héroe) y lo que completa el
  servidor (`action` por default, `razon`).
- Sin `DATABASE_URL` no hay huella ni portada; el Inicio programado sigue.

## Cómo se probó

- `apps/web/src/lib/inicio/__tests__/huella.spec.ts`: misma huella para los mismos datos;
  cambia con una acción, un movimiento, la versión y el catálogo.
- `apps/web/src/lib/inicio/__tests__/servicio.spec.ts`: `sin-cambios` no llama al modelo;
  otra huella rearma; `forzar`; una generación en vuelo por persona.
- `pnpm probar-inicio` (modelo real, 2026-09-12 15:20): 3 de 3 portadas con la héroe del
  peldaño correcto —Beto tarjeta, Ana crédito, Carmen portafolio— en 7.7 / 11.6 / 11.0 s.
  Antes del prefetch situacional: 1 de 3.
