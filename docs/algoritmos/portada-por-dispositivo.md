---
verificado: 2026-09-13 06:25
implementado-en: apps/web/src/lib/inicio/servicio.ts   # vistaDe, regenerarSiCambio, regenerarDeDispositivo
lenguaje: typescript
---

# Qué portada de Inicio ve cada dispositivo, y cuál se rearma

## Para cualquiera

Hay una portada de Inicio "de la casa" por persona demo: la que ve todo el que llega. En
cuanto un visitante hace algo suyo —aplica un plan, pregunta algo en la barra, le pide un
cambio a una tarjeta— su Inicio deja de ser el de la casa y se guarda aparte, solo para él.

La regla para no gastar de más: si tus datos siguen siendo los de la casa (no has aplicado
nada), te toca la de la casa, y si hay que rearmarla se rearma **esa**, que les sirve a todos.
Solo cuando tus datos ya son distintos se arma una portada tuya.

Hay un caso más: que la de la casa ya tenga algo aplicado (un ensayo por script aplicó un plan
sin cookie). Entonces un visitante nuevo no puede verla —le mostraría un plan que él no
aplicó— y tampoco se le arma una a cada uno —costaría una portada por visitante—. Se usa una
tercera: la portada **sin nada aplicado**, que se arma una vez por persona y comparten todos los
visitantes que no han hecho nada.

## La idea

La **huella** (`docs/algoritmos/portada-de-maya.md`) dice con qué datos se armó una portada:
cuántas acciones hay y la última, y la fecha del último movimiento. Desde el ADR 0012 las
acciones que cuentan son las **del dispositivo**. Como `acciones_aplicadas.id` es un serial de
toda la tabla, dos ámbitos distintos solo pueden tener la misma huella si **los dos tienen cero
acciones**. Así, "misma huella que la común" significa exactamente "ni este dispositivo ni la
común han aplicado nada", y en ese caso la portada común le sirve tal cual.

Si el dispositivo no ha aplicado nada (`a:0:0`) pero la común sí, la común no le sirve (sería
mostrarle las acciones de otro, issue #37) y una propia costaría modelo por visitante (issue
#33). Para eso existe un tercer ámbito, `DISPOSITIVO_SIN_ACCIONES` (`dis_sinacciones00`): un
dispositivo reservado que nunca tiene acciones, donde vive **la** portada sin acciones de cada
persona. Su huella también es `a:0:0`, así que todos los visitantes sin acciones coinciden con
ella.

## Paso a paso

`vistaDe(persona, dispositivo)`:

1. Si el dispositivo es `comun` (el reloj, un script): la portada común, vencida si su huella
   no es la de hoy (o, con widgets vivos, si no tiene procedencias válidas).
2. Lee en paralelo: la huella del dispositivo, la huella común, su portada propia y la común.
3. **Propia al día** → esa. Destino: el dispositivo.
4. **Huella del dispositivo = huella común** (ninguno de los dos ha aplicado nada) → la común;
   vencida si la común lo está. Destino: **común**. Una propia vieja (de antes de un reinicio)
   queda tapada.
5. **Huella del dispositivo sin acciones (`a:0:0`) y la común con acciones** → lee la portada
   del ámbito `DISPOSITIVO_SIN_ACCIONES` y usa esa; vencida si no existe o si su huella no es la
   de hoy. Destino: **`DISPOSITIVO_SIN_ACCIONES`**. Mientras no existe, `pantalla` es la propia
   vieja o nada (nunca la común).
6. Si no (ya aplicó algo) → su propia (o la común mientras tanto), **vencida**. Destino: el
   dispositivo.

`regenerarSiCambio(persona, motivo, { dispositivoId })`:

- Común: igual que siempre, con la generación en vuelo compartida por `comun|persona`.
- Dispositivo: calcula `vistaDe`; si no está vencida, `sin-cambios`. Si lo está, rearma el
  **destino** con la generación en vuelo compartida por `destino|persona`: dos visitantes
  nuevos que abren a Beto a la vez esperan la misma portada (la común o la sin acciones).
- Al generar, el MCP se abre con el dispositivo del destino: la portada de un dispositivo se
  arma con **sus** acciones, y la sin acciones con cero.
- **Espera entre intentos por visita.** Con motivo `visita` o `consulta` (nada cambió en los
  datos), la misma portada —(ámbito, persona, huella)— se intenta como mucho una vez cada
  `ESPERA_ENTRE_INTENTOS_MS`. Si la generación falla o sale sin procedencias, la portada sigue
  vencida, y sin esta espera cada visita pagaría otro intento. `accion`, `reloj`, `manual` y
  `forzar` no esperan; datos nuevos son otra huella y tampoco.

La página (`app/(app)/page.tsx`) pinta la portada que haya, aunque esté vencida, y si está
vencida (o no hay) manda `regenerarSiCambio(persona, "visita", { dispositivoId })` con `after()`.

Escrituras que siempre van a la portada propia, sin pasar por el destino:

- `preguntarEnInicio` (la barra de Inicio): guarda la respuesta como portada del dispositivo con
  su huella; queda al día y gana en el paso 3.
- `POST /api/inicio/widget`: si el visitante veía la común (o la sin acciones), `almacen.ajustar`
  copia esa portada con la tarjeta cambiada a su portada propia, **con la misma `generada_en`** (la página la usa de
  `key` y así no se remonta lo que ya ve). Si ya tenía una propia vencida, la reemplaza; si
  tenía una al día (otra petición se adelantó), no la pisa.

## Entradas y salidas

| Entrada | Tipo | Ejemplo |
|---|---|---|
| `usuarioId` | `string` | `usr_beto` |
| `dispositivoId` | `string` | `dis_3f9a0c...` o `comun` |
| huellas | `string` | `v1|c18|a:0:0|m:812:2026-09-10` |

| Salida (`vistaDe`) | Tipo | Ejemplo |
|---|---|---|
| `pantalla` | `PantallaDeInicio?` | la común, con `dispositivoId: "comun"` |
| `vencida` | `boolean` | `false` |
| `destino` | `string` | `comun`, `dis_sinacciones00` o el dispositivo |

## Parámetros y umbrales

- El literal `comun` es el mismo en la web (`lib/dispositivo.ts`), el MCP
  (`datos/dispositivo.ts`) y el default de la columna (migración 0007).
- `DISPOSITIVO_SIN_ACCIONES = "dis_sinacciones00"` (`lib/dispositivo.ts`): cumple el patrón del MCP
  (`/^dis_[a-z0-9]{12,40}$/`) para que la generación lea un estado sin acciones; no es
  hexadecimal, así que `nuevoIdDeDispositivo` nunca lo produce, y `esIdDeDispositivo` lo rechaza:
  ningún navegador puede tomarlo como cookie.
- `ESPERA_ENTRE_INTENTOS_MS = 5 min` (`servicio.ts`): el reintento por visita de una portada que no
  se pudo armar. Más corto gasta en fallas repetidas; más largo deja más tiempo la programada.

## Límites y supuestos

- **Movimientos nuevos** cambian la huella de todos a la vez (son de la persona, no del
  dispositivo): la común y las propias quedan vencidas y se rearman al volver cada visitante.
- **Estado común con acciones** (un script aplicó algo sin dispositivo): ningún dispositivo
  nuevo coincide con él; todos comparten la portada sin acciones (paso 5), que cuesta **una**
  generación por persona. El primer visitante ve la programada unos segundos mientras se arma.
- **La espera vive en memoria del proceso**: cada réplica y cada reinicio de la web empiezan sin
  intentos registrados. Con una réplica, a lo más un intento cada 5 min por portada que falla.
- **`dis_sinacciones00` sí lo acepta el MCP**: un cliente MCP con el token podría mandarlo en la
  cabecera y aplicar acciones ahí. Su huella dejaría de ser `a:0:0` y la portada compartida
  quedaría vencida para todos; la siguiente generación leería esas acciones. La web nunca lo
  hace; `reiniciar-estado` lo limpia.
- **Una pregunta en Inicio sin acciones** queda al día indefinidamente con huella `a:0:0`, como
  antes: "donde se quedó". `reiniciar-estado` borra las portadas propias.
- Leer cuatro cosas en vez de dos por visita a Inicio (cinco en el paso 5): subconsultas con
  índice y lecturas por llave primaria.

## Cómo se probó

`apps/web/src/lib/inicio/__tests__/servicio.spec.ts`, bloque "por dispositivo":

- un dispositivo sin acciones ve la común y `regenerarSiCambio` no llama al modelo;
- con acciones, su portada se arma aparte (el generador recibe su `dispositivoId`), la común
  queda intacta y otro dispositivo sigue viendo la común al día;
- con la común vencida, dos dispositivos a la vez producen **una** generación, en `comun`;
- una propia al día gana solo en ese dispositivo;
- tras un reinicio, la propia vieja queda tapada y no se paga otra.

Bloque "visitantes sin acciones cuando el comun tiene acciones (#37)":

- común con una acción y 100 visitantes nuevos, uno tras otro: **1** generación, en
  `DISPOSITIVO_SIN_ACCIONES`; ninguno ve la común y todos terminan con huella `a:0:0`;
- los mismos 100 a la vez: 1 generación;
- común sin acciones: 100 visitantes, 0 generaciones, ven la común;
- un dispositivo con acciones propias ve la suya;
- una propia vencida se pinta mientras tanto y se rearma al visitar, en su ámbito;
- si la generación falla, 20 visitas pagan 1 intento; pasada la espera, otro; una acción no espera.

Contra el `servicio.ts` anterior (`6cefc30`) fallan tres: los 100 veían la común armada con la
acción de otro, y cada visita reintentaba una generación fallida.

Del lado del MCP, `apps/mcp/src/__tests__/dispositivos.spec.ts`; y en vivo contra el MCP y la
base reales (2026-09-13 03:57): plan aplicado en un dispositivo → su tarjeta en $0, el otro la
sigue viendo en $47,386; reintento `yaEstaba`; la misma llave en el otro, `aplicado`.
