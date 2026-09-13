---
verificado: 2026-09-13 02:30
estado: construido
---

# Widgets vivos: preguntarle a una tarjeta, con cifras que solo pone el banco

## Para cualquiera

Tu Inicio tiene tres tarjetas: lo que Maya ve hoy y las dos cosas más urgentes de tu cuenta.
Antes, si escribías una pregunta abajo, las tres se borraban y aparecían otras, como pasar a la
siguiente diapositiva. Ahora cada tarjeta se puede **preguntar**.

Debajo de cada tarjeta hay un botón **«Preguntar sobre esto»**. Lo tocas, escribes «¿y si lo
difiero a 24 meses?», y **esa tarjeta** se actualiza en su lugar: las otras no se mueven. Si
preguntas algo de otro tema («¿en qué se me fue el dinero?»), en el hueco de una tarjeta entra
la tarjeta que contesta eso. Si solo quieres entender algo («¿qué es el CAT?»), Maya te lo
explica en una nota pegada a la tarjeta, sin cambiar nada.

Y la parte que no se ve pero importa más: **Maya no escribe los números.** Maya decide qué
preguntarle al banco («el plan de pagos a 24 meses», «el gasto de julio»); el banco contesta; y
un código fijo pone esas cifras en la tarjeta. Después, el sistema **vuelve a preguntarle al
banco** y compara cifra por cifra con lo que vas a ver. Solo si coinciden, la tarjeta cambia; y
la nota lo dice: «Cifras verificadas con el banco». Si Maya escribe un número en su explicación,
ese número también se revisa contra lo que el banco contestó; uno inventado no llega a tu
pantalla.

Mientras Maya contesta (de 2 a 8 segundos, a veces más) no te quedas viendo una pantalla quieta:
sobre la barra aparece **qué está haciendo** («Entendiendo tu pregunta» → «Consultando tus datos» →
«Verificando las cifras con el banco» → «Actualizando la tarjeta»), **tu pregunta** y cuántos
segundos lleva, y la tarjeta que va a cambiar tiene un brillo que la recorre. Cada paso aparece
cuando de verdad ocurre, no antes.

Se enciende con `FEATURE_WIDGETS_VIVOS=1`. Apagado, Inicio es exactamente como antes. **Está
prendido en local y en producción desde el 2026-09-13 04:10** (a pedido del usuario: «no me gusta que
borre todo en el inicio»); `pnpm probar-widgets` pasó 6 de 6 con el modelo real antes de prenderlo.

## Técnico

### Dónde vive

| Pieza | Archivo |
|---|---|
| Fuentes y adaptadores (tool del MCP → props del componente) | `apps/web/src/lib/widgets/fuentes.ts` |
| Consultor: `usuarioId` de la sesión, lista blanca de lectura, caché y huella | `apps/web/src/lib/widgets/consultor.ts` |
| Armado de un widget y de la `Conclusion` por referencia | `apps/web/src/lib/widgets/armar.ts` |
| La portada por fuentes (`pintar_widgets`) | `apps/web/src/lib/widgets/pintar.ts` |
| El turno de una pregunta (`modificar_widget`, `reemplazar_widget`, `responder`) | `apps/web/src/lib/widgets/turno.ts` |
| Verificador de cifras en prosa | `apps/web/src/lib/widgets/cifras.ts` |
| Auditor (re-consulta y compara) | `apps/web/src/lib/widgets/auditar.ts` |
| Fundir un ajuste en la portada guardada | `apps/web/src/lib/widgets/pantalla-viva.ts` |
| Prompt propio (sin las reglas de `pintar_pantalla`) | `apps/web/src/lib/widgets/prompt.ts` |
| Ruta en stream | `apps/web/src/app/api/inicio/widget/route.ts` (líneas en `lib/widgets/linea.ts`) |
| Generador de la portada en modo widgets | `apps/web/src/lib/inicio/generar.ts` (`generarPortadaDeWidgets`, `encargoDeWidgets`) |
| Procedencias en la base | `db/migraciones/0005-procedencia-widgets.sql`, `apps/web/src/lib/inicio/almacen.ts` (`ajustar`) |
| UI | `components/inicio/inicio-vivo.tsx`, `usar-widgets-vivos.ts`, `pie-de-widget.tsx`; `components/maya/lienzo.tsx` (`decorar`); `BarraFlotanteMaya` en modo `vivo` |
| Etiquetas y sugerencias por tarjeta | `apps/web/src/lib/widgets/etiquetas.ts` |
| MCP: `simular_rebalanceo` y `ahorroLiquidoCentavos` | `apps/mcp/src/tools/simular-rebalanceo.ts`, `apps/mcp/src/tools/diagnostico-salud-financiera.ts` |
| Ensayo con el modelo real | `scripts/probar-widgets.mjs` (`pnpm probar-widgets [url]`) |

Decisión y alternativas: [ADR 0011](../decisiones/0011-cifras-solo-del-mcp.md). Algoritmos:
[adaptadores de widget](../algoritmos/adaptadores-de-widget.md) y
[verificación de cifras](../algoritmos/verificacion-de-cifras.md).

### El camino de un número

```
modelo ──{ fuente: "plan_de_pago", parametros: '{"plazosMeses":[6,24]}' }──▶ armarWidget
   armarWidget: fuente existe? parametros.strict()? variantes.strict()?
        │
        ▼
   consultor.consultar("simular_reestructura", { plazosMeses:[6,24], usuarioId: <cookie> })
        │   (solo tools de lectura de la lista blanca; caché por tool + args canónicos)
        ▼
   MCP ──▶ salida ──▶ adaptar(salida) ──▶ props de PlanDePago ──▶ revisarProps (schema del catálogo)
        │
        ▼
   Procedencia { fuente, tool, argumentos, parametros, variantes, huella: sha256(salida), en }
```

El modelo nunca ve un campo donde escribir `mensualidadCentavos`. Lo único que sí escribe en
texto libre —titular, detalle, la nota— pasa por `verificarCifras` contra las salidas del turno.

### La portada: `pintar_widgets`

Con el flag encendido, `generarPortada` delega en `generarPortadaDeWidgets`:

1. Mismo prefetch (`reunirDatos`), pero cada llamada se **siembra** en el consultor con sus
   argumentos: si la tarjeta de gasto pide `analizar_gasto {}`, no se llama dos veces.
2. El modelo recibe `promptDeWidgets()` + `encargoDeWidgets()` (la escalera de urgencia en
   términos de fuentes) y está forzado a `pintar_widgets` desde el paso 0.
3. `armarPantallaDeWidgets` arma los 2 widgets en paralelo, la `Conclusion` con `datos` por
   referencia (`{etiqueta, widget, campo}` → valor formateado por el servidor), verifica el
   texto, y pasa todo por el **mismo** `armarMensajes` que `pintar_pantalla` (catálogo, árbol,
   tope de 3 tarjetas, JSON Schema oficial, `action` por omisión).
4. Se guardan los tres mensajes **más** `procedencias` y `referencias` (migración 0005).

### Una pregunta: `POST /api/inicio/widget`

Cuerpo `{ pregunta, foco?, historial? }`; la persona sale de la cookie. Responde JSONL:
`estado` → `tool` → `estado: verificando` (antes del auditor) → `a2ui` (solo `updateComponents`) →
`fin`, o `error`.

El turno (`turnoDeWidget`) le da al modelo la pantalla viva compacta (cada tarjeta con su fuente,
parámetros, variantes y datos), el foco, y cierra con una de tres tools:

| Tool | Qué hace el servidor | Qué viaja |
|---|---|---|
| `modificar_widget` | Funde los parámetros/variantes nuevos con los guardados (`null` quita uno), re-consulta **la misma fuente** (o una del mismo componente) y adapta. Rechaza si la tarjeta queda idéntica. Conserva `heroe` y `action`. | `updateComponents` con la tarjeta, y la `Conclusion` si una cifra citada cambió |
| `reemplazar_widget` | Arma otra fuente (otro componente) en el **mismo id**; la raíz no cambia. | ídem; las cifras de la conclusión que apuntaban a un campo que ya no existe se caen |
| `responder` | Nada en pantalla; verifica las cifras del texto. Puede consultar antes con tools de lectura (sus salidas cuentan para el verificador). | nada, solo `fin` |

Después del turno, **con la misma conexión al MCP**, la ruta corre `auditarWidgets` sobre la
tarjeta que cambió: vuelve a llamar la tool con los argumentos guardados, corre el adaptador y
compara con igualdad canónica. `diferencias > 0` → no se emite ni se guarda, y se registra. Si
pasa, se emiten los mensajes y `almacen.ajustar` funde el cambio en la fila de
`pantallas_inicio` con un candado sobre `generada_en` (si el reloj rearmó la portada mientras,
no se pisa). La huella no cambia: recargar conserva lo que la persona pidió.


**De quién es el ajuste** (ADR 0012): la ruta lee la portada que la página le pintó a ESTE
dispositivo (`estadoDelInicio(persona, { dispositivoId })`) y abre el MCP con su cabecera. Si
estaba viendo la común, `almacen.ajustar` no la toca: copia la común con la tarjeta cambiada a
`pantallas_por_dispositivo`, con la misma `generada_en`, y ese dispositivo sigue desde ahí.
### El cliente

`InicioVivo` guarda la superficie en estado y aplica cada `a2ui` con `procesar` (el reducer puro
del motor): React re-renderiza solo la tarjeta que cambió. No hay `router.refresh()`. El lienzo
recibe `decorar(pieza)` para envolver cada tarjeta con:

- mientras se consulta, **en la tarjeta en foco** (o la que resultó cambiar) un brillo que la
  recorre y una barra en su borde de arriba, sin taparla (ver «Mientras Maya piensa»);
- un anillo `ring-primary/40` de 1.6 s cuando cambió;
- el pie: nota de Maya con «Cifras verificadas con el banco · `<tool>` · `<s>`», el botón
  «Preguntar sobre esto» (`aria-pressed`, 48 px en móvil) y, con foco, las preguntas sugeridas
  en el flujo (no flotando: en un celular tapaban la nota).

La tarjeta que responde se desplaza a la vista (`scrollIntoView({ block: "nearest" })`). Los
botones de acción siguen yendo a `/maya?accion=`. Los errores se dicen para la persona
(`paraLaPersona`); el motivo técnico queda en el log.

### Mientras Maya piensa

Pedido del usuario (2026-09-13): «se tarda muchísimo en procesar; en ese inter mostrar algo que sí
está cargando, y que no se quede tan vacío». Los jueces lo verán en un celular.

**Lo que había** (medido con Playwright, iPhone 13, `usr_ana`): sin foco, solo el placeholder gris
de la barra cambiaba a «Maya está pensando…» y la pregunta escrita desaparecía; con foco, un velo
`bg-card/80` lavaba la tarjeta entera y el aviso quedaba centrado en su borde de arriba, fuera de la
pantalla del celular.

**Lo que hay:**

| Pieza | Qué muestra | Dónde |
|---|---|---|
| `PensandoMaya` | Sobre la barra: la etapa, «Sobre tu crédito · «¿y si pago $6,000 al mes?»», los segundos desde los 3 s («tarda más de lo normal» desde los 12 s) y tres segmentos (entender · consultar · responder) | `components/inicio/pensando-maya.tsx`, por el slot `pensando` de `BarraFlotanteMaya` |
| Brillo de la tarjeta | Una franja de tinte que cruza la tarjeta cada 1.6 s y una barra que corre en su borde de arriba; la tarjeta se sigue leyendo | `PiezaDecorada` en `components/maya/lienzo.tsx`, clases `pensando-brillo` y `pensando-segmento` de `globals.css` |
| Las etapas | Salen de las líneas del stream: `estado: pensando` → «Entendiendo tu pregunta», `tool`/`consultando` → «Consultando tus datos», `armando` → «Preparando el cambio» (o «tu respuesta»), `verificando` → «Verificando las cifras con el banco», `a2ui` → «Actualizando la tarjeta» | `lib/widgets/etapas.ts` (`avanzarProgreso`, `textoDeEtapa`, `segmentosDe`, `paraLaEspera`) |

**Sin mentir.** Ninguna etapa avanza con un temporizador: si el stream no manda nada, el texto no
cambia. Lo único que corre con el reloj son los segundos, que son verdad. Nunca retrocede (un
reintento del modelo vuelve a mandar `pensando`) y «listo» solo existe con `fin` o `error`, cuando el
panel ya se fue. `verificando` es una etapa nueva que emite la ruta justo antes de `auditarWidgets`:
la re-consulta al MCP es una espera real.

**Por qué sobre la barra.** En el celular la tarjeta suele quedar arriba o abajo de lo que se ve, y
la pregunta se escribió en la barra: ahí están los ojos. La tarjeta lleva su brillo para decir CUÁL
va a cambiar.

**Movimiento y Safari.** Las tres animaciones (`pensando-barrido`, `pensando-brillo`,
`pensando-latido`) mueven solo `transform` y `opacity`, van dentro de
`@media (prefers-reduced-motion: no-preference)` y no se llaman `widget-*` (esas son la entrada de
los widgets y tienen su prueba). Con «reducir movimiento», el segmento actual queda lleno a medias y
quieto. Para Safari: `backdrop-blur` sale con `-webkit-backdrop-filter` (Tailwind lo prefija, visto
en el CSS compilado), el `::after` y las capas de la tarjeta usan `top/right/bottom/left` y no `inset` (que
no existe antes de Safari 14.1), la barra de la tarjeta usa `left-6 right-6`, y no se agregó `100vh`, `scrollIntoView` en contenedores ni `randomUUID` en el
cliente.

### Convivencia con el modo anterior

La base es la misma en local y en producción. El modo **no** entra a la huella: si entrara, un
entorno con el flag y otro sin él se rearmarían la portada en cada tick. En cambio,
`servicio.ts` (`vencida`) considera vencida una portada sin procedencias —o con procedencias que
no nombran sus tarjetas— **solo si el flag está encendido**. El modo anterior pinta una portada
de widgets sin problema: son los mismos tres mensajes A2UI.

### Latencia del modelo

El turno usa `MODELO_WIDGETS` (por omisión el de `MODELO_INICIO`, `gemini-3.5-flash-lite`) con
`thinkingLevel: "minimal"`. Medido el 2026-09-13: `gemini-3.8-flash` tardaba 7–20 s en cerrar
una tool; el lite con pensamiento mínimo, 0.5–0.9 s. El proveedor tuvo esa noche una varianza
alta (el mismo turno trivial en 0.5 s, 8 s y más de 30 s), así que un intento que no cierra en
11 s se repite una vez; todas las tools del turno son de lectura, repetir no cambia nada. Tope
total: 25 s.

### Cómo se prueba

```bash
pnpm --filter @maya/web test     # lib/widgets: 67 pruebas, sin llave ni base
pnpm probar-widgets http://localhost:3000   # con FEATURE_WIDGETS_VIVOS=1 en el servidor
```

- `fuentes.spec.ts` — el `resolver` (clave → id, y una clave que no existe lista las que sí), y cada adaptador contra **salidas reales** del MCP
  (`__tests__/fixtures/salidas-mcp.json`, capturadas el 2026-09-13): props válidas para el
  componente, y **toda cifra es una hoja de la salida de su tool** salvo las fórmulas declaradas.
- `pintar.spec.ts` — la portada y el **modelo tramposo**: cifra en variantes, `usuarioId` en
  parámetros, cifra inventada en el titular, fuente que no aplica, dos héroes.
- `turno.spec.ts` — las tres salidas, que nunca haya `createSurface`, que la conclusión siga a
  su tarjeta, que una acción del MCP no esté entre las tools, y el reintento ante un proveedor
  colgado.
- `auditar.spec.ts` — cero diferencias en lo armado; una cifra alterada se detecta con campo,
  valor visto y valor del MCP; datos que cambiaron no se confunden con una mentira.
- `cifras.spec.ts`, `consultor.spec.ts`, y en `lib/inicio`: el generador en modo widgets y la
  regla de `vencida`.

**Con el modelo real (2026-09-13, local, `pnpm probar-widgets http://localhost:3001`):**
6 de 6 en dos corridas seguidas; la última entre 0.9 y 2.3 s por pregunta. Una corrida intermedia
falló en Carmen porque el modelo mandó la clave «NAFTRAC» donde la fuente pedía el id interno:
de ahí salió el `resolver` de `rendimiento_historico`. Primera corrida: Beto «¿en qué se me fue el dinero?» → `reemplazar` (1.6 s), foco «¿y en julio?» →
`modificar` (1.5 s); Ana «¿cuánto me falta de mi crédito?» → `responder` (1.1 s); Carmen
«¿cómo le ha ido a NAFTRAC?» → `reemplazar` (2.4 s), foco «últimas 26 semanas» → `modificar`
(1.4 s). Auditoría en 0 diferencias en todas las tarjetas que cambiaron.

En el navegador (Chrome, 1 440 px y 390 px): foco, sugerencias, velo solo en la tarjeta en foco,
reemplazo y modificación en su lugar, la nota verificada, la persistencia al recargar y el cambio
de persona.

### Casos límite conocidos

- **Una pregunta que ninguna fuente contesta** («¿cuánto me ahorro con un abono a capital?»):
  `responder` lo dice; ninguna tool calcula abonos, y el verificador impide inventar la cifra.
- **La escalera no siempre se respeta**: en una corrida Ana recibió `portafolio` en vez de
  `simulador_meta`. Las cifras siguen siendo correctas; lo que falla es la elección.
- **Un componente sin fuente** no puede aparecer en una portada de widgets. Para agregarlo:
  su entrada en `FUENTES`, su prueba en `fuentes.spec.ts` y su etiqueta en `etiquetas.ts`.
- **`/maya` no usa esto todavía** (ver el issue `2026-09-13-cifras-escritas-por-el-modelo-en-maya.md`).
