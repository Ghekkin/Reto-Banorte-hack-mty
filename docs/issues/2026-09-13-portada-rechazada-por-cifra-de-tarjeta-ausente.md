---
estado: resuelto
severidad: media
area: web
encontrado: 2026-09-13 04:40
github: 34
resuelto-en: e4ca8e7
---

# 8 de cada 10 portadas con widgets vivos pagan dos peticiones: la primera cita una tarjeta que no pintó

**Dónde:** `apps/web/src/lib/widgets/armar.ts:281` (`armarConclusion` rechaza la portada entera si
un dato de apoyo nombra una tarjeta que no está) y `apps/web/src/lib/inicio/generar.ts:699` (el
encargo le ofrece `salud` como tarjeta de contexto).

**Qué esperaba:** que la portada salga en una sola petición al modelo, como dice el encargo
("Llama `pintar_widgets` exactamente una vez").

**Qué pasa:** el modelo arma bien las 2 tarjetas, pero en `conclusion.datos` cita una cifra de
una tarjeta que **no eligió** (casi siempre `salud`, porque el encargo la menciona y
`panorama_inicial` trae el puntaje). `armarConclusion` convierte eso en error, `pintar_widgets`
devuelve `ok: false` y el modelo repite la llamada completa, con los ~8–17k tokens de entrada
otra vez, solo para quitar ese dato.

**Cómo lo sé (base de producción, `banorte.corrida_tools`, 02:12–04:35 del 13):**

- 183 de 222 portadas tuvieron al menos un `pintar_widgets` rechazado.
- 154 rechazos con el mismo texto:
  `conclusion.datos[0]: no hay una tarjeta "salud"; las que hay: portafolio, rebalanceo`.
- Los demás: `la tarjeta "tarjeta" no tiene una cifra en "usoDelLimite"` (4),
  `... en "saldoDiferidoCentavos"` (1), `la tarjeta "gasto" no tiene una cifra en "gastoCentavos"`
  (1, y esa portada terminó en `error`), `variantes no es JSON valido` (2).
- El segundo paso de esas portadas costó ≈ $0.75 USD: el 26 % de todo lo registrado.

**Impacto en la demo:** medio. No se ve un error (el reintento sale bien), pero cada portada
tarda 1–3 s más y cuesta el doble.

**Arreglos posibles:**

1. En `armarConclusion`, **descartar** el dato de apoyo que no se puede resolver (y anotarlo en la
   razón o en el log) en vez de rechazar la portada: son cifras opcionales, la tarjeta y el
   titular ya están bien. Quita el paso extra de raíz.
2. En el encargo, decir que `datos` solo puede citar las 2 tarjetas elegidas y listar sus campos
   citables; y no ofrecer `salud` como contexto si no se va a pintar.

## Actualización (2026-09-13 06:15): arreglado a medias en `36a1c09`

`forzarFuentes` (`apps/web/src/lib/widgets/pintar.ts`) descarta las cifras de la conclusión que
citan una tarjeta que no está. Eso quitó la causa principal, pero **no** la otra mitad del mismo
síntoma: una cifra que cita una tarjeta que sí está, con un campo que esa tarjeta no tiene, se sigue
rechazando en `armar.ts:287`.

Portadas en `banorte.corridas`, antes y después de que `36a1c09` llegara a producción (05:13):

| Tramo | Portadas | Con reintento | «no hay una tarjeta» | «no tiene una cifra en» | Pasos promedio |
|---|---|---|---|---|---|
| 02:12–05:12 | 271 | 207 (76 %) | 160 | 20 | 1.81 |
| 05:13–06:02 | 46 | 18 (39 %) | 1 | 7 | 1.43 |

Los reintentos que quedan: `la tarjeta "credito"/"meta" no tiene una cifra en "puntajeSalud"` (la
misma causa: el modelo quiere citar la salud), `"faltanteCentavos"`/`"montoObjetivoCentavos"` en
`meta`, tools que fallan en la portada de Beto (`simular_reestructura` con plan activo,
`proyectar_ahorro` sin capacidad), una cifra de texto que no sale del MCP (`"96%"`) y un typo de
llave (`nombre:`). Ojo: la base mezcla producción y servidores locales, así que parte de eso puede
venir de código viejo.

**Faltaba** (hecho abajo): tratar «no tiene una cifra en» igual que la tarjeta ausente (descartar el dato de apoyo
en vez de rechazar la portada).

## Resolución (2026-09-13)

**Arreglo 1, completo.** `armarConclusion` (`apps/web/src/lib/widgets/armar.ts`) ya no rechaza:
una cifra de apoyo que cita una tarjeta que no está **o un campo que la tarjeta no tiene** se
descarta y la portada sale en la misma petición. Devuelve `{ componente, referencias, descartados }`:

- `referencias` son solo las de las cifras que quedaron (antes `referenciasDe` guardaba también las
  inválidas, y `recalcularConclusion` podía mostrarlas después si la tarjeta cambiaba de fuente).
- `descartados` viaja como `datosDescartados` en `PantallaDeWidgets`, en el resultado de la tool
  `pintar_widgets` (queda en `corrida_tools`) y en un `console.warn`.
- Sin mínimo: si no queda ninguna cifra, la `Conclusion` sale sin `datos`; el titular basta.
- Ninguna cifra inventada entra por aquí: el valor sigue saliendo solo de la tarjeta armada.

`turno.ts` (preguntas por tarjeta) no llama `armarConclusion`; solo `recalcularConclusion`, que ya
descartaba referencias que no se pueden leer. No hizo falta tocarlo.

**Arreglo 2, no se hizo.** Listar en el encargo los campos citables de cada tarjeta exige armar las
tarjetas (consultar y adaptar) antes de llamar al modelo; con el descarte ya no cuesta un
reintento, así que no vale la complejidad.

**Evidencia.**

- Pruebas en `apps/web/src/lib/widgets/__tests__/pintar.spec.ts`: el caso real de
  `corrida_tools` 2227 (Beto, campo ausente + tarjeta ausente), un campo ausente y una conclusión
  sin ninguna cifra válida. Las tres fallaban con el código anterior (`ok: false` con los mismos
  errores de producción) y pasan con el arreglo. `@maya/web`: 385 pruebas en verde, typecheck limpio.
- Repetición de los **19 rechazos reales** de `pintar_widgets` posteriores a 05:13 (11:13 UTC), con
  sus argumentos tal cual y las salidas capturadas del MCP:
  - **10 eran solo de la conclusión** (`no tiene una cifra en` / `no hay una tarjeta`): 8 pasan a la
    primera. Los otros 2 (2218, 2658) caen en la repetición en la verificación de texto por un
    `74` que es el `puntajeSalud` de `panorama_inicial`: en producción ese dato llega en el prefetch
    y la verificación pasa. Es decir, los **10 habrían salido en una sola petición**.
  - **9 tienen otra causa y siguen fallando igual**: 4 `proyectar_ahorro` que falla en la portada de
    Beto (sin capacidad de ahorro / sin objetivo), 2 cifras de texto sin respaldo (`"96%"`), 2 llaves
    con typo en `parametros` (`nombre:`), 1 `parametros` con JSON cortado.

