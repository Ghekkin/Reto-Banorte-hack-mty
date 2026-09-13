---
verificado: 2026-09-13 04:00 (hora de Monterrey)
estado: construido
---

# Cada visitante tiene su propio estado: lo que hace en la demo no le cambia la demo a nadie más

## Para cualquiera

La demo tiene tres personas de prueba —Beto, Ana y Carmen— y muchos visitantes a la vez: jueces
en el stand, gente con la liga en su celular. Antes, todos compartían las mismas tres. Si un
juez le aplicaba el plan de pago a Beto, todos veían a Beto ya sin deuda, y el siguiente ya no
podía probar el flujo. Si alguien preguntaba algo en Inicio, a todos se les cambiaba el Inicio.

Ahora **cada navegador es un "dispositivo"** con su propia copia de lo que cambia: los planes
aplicados, los apartados, los gastos guardados y su pantalla de Inicio. Lo que hace un visitante
**se guarda en la base** con su identificador, y cuando vuelve a abrir la liga **sigue donde se
quedó**. Los demás visitantes no ven nada de eso: para ellos Beto sigue con la tarjeta al límite.

No hay que registrarse. El navegador recibe su identificador en la primera visita (una cookie) y
lo conserva un año. Abrir una ventana de incógnito es empezar la demo desde cero, sin tocar a
nadie. Y mientras un visitante no haya hecho nada, ve el Inicio "de la casa", el mismo que los
demás, así que cien visitantes nuevos no cuestan cien portadas del modelo.

## Técnico

### Dónde vive

| Pieza | Archivo |
|---|---|
| El id y sus reglas (`maya_dispositivo`, `comun`, `x-maya-dispositivo`) | `apps/web/src/lib/dispositivo.ts` |
| Leerlo en servidor | `apps/web/src/lib/dispositivo-activo.ts` (`dispositivoActivo()`) |
| Ponerlo en la primera visita | `apps/web/src/proxy.ts` (el `middleware` de Next 16) |
| Mandarlo al MCP | `apps/web/src/lib/agente/mcp-cliente.ts` (`conectarMcp({ dispositivoId })`) |
| Recibirlo en el MCP | `apps/mcp/src/tools/registro.ts` → `apps/mcp/src/datos/dispositivo.ts` (`AsyncLocalStorage`) |
| Acciones por dispositivo | `apps/mcp/src/datos/estado.ts` (`aplicarAccion`, `accionesDe`) |
| Portada por dispositivo | `apps/web/src/lib/inicio/almacen.ts`, `servicio.ts` (`vistaDe`), `huella.ts` |
| Quién hizo qué | `apps/web/src/lib/corridas/grabadora.ts`, `escritor.ts` |
| Esquema | `db/migraciones/0007-estado-por-dispositivo.sql` |
| La decisión | `docs/decisiones/0012-estado-aislado-por-dispositivo.md` |
| Qué portada se ve | `docs/algoritmos/portada-por-dispositivo.md` |

### Flujo paso a paso

1. **Primera visita a cualquier página.** `proxy.ts` no encuentra `maya_dispositivo`, genera
   `dis_` + 24 hex y la pone en la respuesta (httpOnly, `lax`, un año) **y** en la petición que
   sigue hacia la página (`NextResponse.next({ request: { headers } })`): el primer render ya
   lee el estado de ese dispositivo. No corre en `/api`, los estáticos ni los íconos.
2. **Un turno en Maya** (`POST /api/agente`). La ruta lee la cookie con `dispositivoActivo()` y
   se la pasa a `correrTurno` como `opciones.dispositivoId` (nunca del cuerpo de la petición).
   El agente abre el MCP con `conectarMcp({ dispositivoId })`, que agrega la cabecera
   `x-maya-dispositivo`. La corrida y la conversación quedan con `dispositivo_id`.
3. **En el MCP**, `registrarTool` lee la cabecera de `extra.requestInfo.headers`, la valida
   (`/^dis_[a-z0-9]{12,40}$/`, si no `comun`) y corre la tool dentro de
   `conDispositivo(id, …)`. Todo lo que pasa adentro —`refrescarAcciones`, el dominio,
   `ejecutar_decision` llamando a otras tools— ve ese dispositivo con `dispositivoActual()`.
4. **Una acción** (`aplicar_plan_pago`, `crear_apartado`, `cancelar_suscripcion`…) llega a
   `aplicarAccion`, que inserta con `dispositivo_id` y la llave guardada como
   `<dispositivo>:<idempotencyKey>`. `accionesDe(persona)` filtra por el dispositivo actual, así
   que la lectura siguiente de ESTE dispositivo ve el plan y la de otro no.
5. **Al cerrar el turno** con una acción aplicada, `alMutar` pide
   `regenerarSiCambio(persona, "accion", { dispositivoId })`: se rearma la portada de ese
   dispositivo, con sus acciones.
6. **Al abrir Inicio**, `page.tsx` pide `estadoDelInicio(persona, { dispositivoId })`, que
   devuelve la portada propia si está al día; la común si ni el dispositivo ni la común han
   aplicado nada; la **sin acciones** (`DISPOSITIVO_SIN_ACCIONES`, una por persona) si el
   dispositivo no ha aplicado nada pero la común sí; o la mejor disponible marcada como vencida.
   La página pinta la que haya y, si está vencida, la manda rearmar con `after()`.
7. **Preguntar en Inicio** (`preguntarEnInicio`) y **ajustar una tarjeta**
   (`POST /api/inicio/widget`) escriben siempre en la portada del dispositivo, nunca en la común.

### Qué es de cada quién

| Dato | Dónde | Por dispositivo |
|---|---|---|
| Qué persona demo está activa | cookie `maya_usuario` | ya lo era (es del navegador) |
| Acciones aplicadas | `acciones_aplicadas.dispositivo_id` | **sí** |
| Portada de Inicio | `pantallas_inicio` (común) + `pantallas_por_dispositivo` | **sí**, cuando se aparta de la común |
| Corridas del modelo | `corridas.dispositivo_id` | se registra |
| Conversaciones de Maya | `conversaciones.dispositivo_id` | se registra; la interfaz aún no la restaura al recargar |
| Datos base (movimientos, tarjetas…) | tablas de `banorte` | no: son de la persona, nadie los muta |

`null` en `corridas` y `conversaciones` es el estado común; en `acciones_aplicadas` es `'comun'`.

### Entradas y salidas

- Cookie: `maya_dispositivo=dis_3f9a0c41b2e84d7a9c1f0e62`.
- Cabecera MCP: `x-maya-dispositivo: dis_3f9a0c41b2e84d7a9c1f0e62`. Sin ella, `comun`.
- Fila de acción: `dispositivo_id = 'dis_3f9a…'`, `idempotency_key = 'dis_3f9a…:inicio:2026-09-13T09:00:00.000Z'`.
- Portada propia: `pantallas_por_dispositivo (dispositivo_id, usuario_id, huella, pantalla JSONB, generada_en, ajustada_en)`.

### Casos límite conocidos

- **Scripts y curl** (`pnpm humo`, `pnpm probar-guion`, `pnpm probar-inicio`, la API REST) no
  mandan cookie: trabajan sobre `comun`, como siempre. Lo que un script aplique ahí **no lo ve
  ningún navegador**.
- **Estado común con acciones.** Si `comun` tiene acciones (un ensayo por script, o lo que había
  antes de esta migración), la común no le sirve a un visitante nuevo: le mostraría lo que
  aplicó el script. Todos los visitantes sin acciones comparten la portada **sin acciones** de
  la persona (ámbito reservado `dis_sinacciones00`), que se arma una sola vez (issues #33 y #37).
  Correr `pnpm reiniciar-estado` antes de abrir la liga sigue siendo lo más limpio: la común
  vuelve a servirle a todos y el reloj la mantiene al día.
- **`pnpm reiniciar-estado` es de todos**: trunca `acciones_aplicadas` (todos los dispositivos)
  y borra `pantallas_por_dispositivo`. Para empezar de cero **solo tú**, abre una ventana de
  incógnito o borra la cookie `maya_dispositivo`.
- **Código anterior contra la misma base** (una laptop sin `git pull`, el contenedor antes del
  deploy): la migración es aditiva, así que sigue funcionando, pero ve todas las acciones
  mezcladas como antes. Se arregla solo al actualizar.
- **Cookies bloqueadas**: el navegador recibe un dispositivo nuevo en cada visita; la demo
  funciona, pero no conserva lo que hizo.
- **Un visitante no puede leer el estado de otro**: el id sale de una cookie httpOnly que el
  servidor pone, el cuerpo de `/api/agente` no lo acepta y el MCP valida el formato. Adivinar un
  id de 96 bits no es realista; tampoco hay nada que proteger (datos sintéticos).

### Cómo probarlo

```bash
pnpm --filter @maya/mcp exec vitest run dispositivos           # aislamiento de acciones e idempotencia (5 pruebas)
pnpm --filter @maya/web exec vitest run servicio dispositivo   # qué portada ve cada quien, y el proxy (32 pruebas)
```

A mano, con `pnpm dev`: abre Beto en una ventana normal y en una de incógnito. En la normal,
"Aplicar plan" desde Inicio o Maya. La normal ve la tarjeta en $0 y su Inicio se rearma; la de
incógnito sigue viendo a Beto al 96.7 % con su Inicio intacto. Recarga la normal: el plan sigue.

Verificado en vivo (2026-09-13 03:57) con el MCP de este cambio contra la base real y dos
dispositivos: plan aplicado en uno → `saldoCentavos` 0 en ese, 4,738,600 en el otro; reintento
`yaEstaba: true`; la misma llave en el otro dispositivo, `aplicado: true`.

### Algoritmos involucrados

- [`portada-por-dispositivo.md`](../algoritmos/portada-por-dispositivo.md): qué portada ve cada
  dispositivo y cuál se rearma.
- [`portada-de-maya.md`](../algoritmos/portada-de-maya.md): la huella, que ahora cuenta las
  acciones del dispositivo.
