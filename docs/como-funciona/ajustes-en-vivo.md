---
verificado: 2026-09-13 03:05
estado: en-progreso
---

# Ajustes en vivo: la tarjeta cambia donde está

## Para cualquiera

Cuando Maya ya te mostró una tarjeta, casi todo lo que preguntas después es la misma tarjeta con
otro número: «¿y si pago $6,000 al mes?», «quiero liquidarlo en 12 meses», «también pago $3,500 de
renta en efectivo». Antes, cada pregunta así construía otra pantalla debajo y la de arriba se
quedaba congelada con el número viejo. Ahora **la tarjeta que ya estás viendo cambia en su lugar**:
los números que se movieron se iluminan un momento y aparece qué cambió («Terminas en 11 meses,
antes 15»; «Pagas $3,470.21 menos de intereses»). Si la tarjeta quedó más arriba en la
conversación, Maya la cambia ahí y te lleva hasta ella.

Los números no los inventa el modelo: los calcula el banco (el servidor MCP) con la misma fórmula
con la que se generó tu tabla de pagos. Si lo que pides no se puede, la tarjeta no se toca y Maya te
dice el mínimo que sí funciona. Si se puede pero es riesgoso (se come tu capacidad de pago), la
tarjeta cambia con un aviso.

Y el cambio puede volverse real: la tarjeta del crédito ofrece **«Programar este pago»**. Al tocarlo,
lo que pagas encima de tu mensualidad queda programado como abono a capital cada mes, y **la misma
tarjeta** pasa a «Abono programado» con tus números nuevos. No aparece otra pantalla de
confirmación: la tarjeta que cambió es la confirmación.

## Técnico

### Qué está construido y qué falta (decisiones del usuario, 2026-09-13 02:40)

| Pieza | Estado |
|---|---|
| Crédito a plazo: simular mensualidad o plazo y ajustar `ProyeccionPagoCredito` | construido |
| Crédito a plazo: «Programar este pago» (abono a capital mensual) en la misma tarjeta | construido |
| Ajustar una tarjeta de una pantalla **anterior** del hilo | construido |
| Gastos fuera del banco (simular en la tarjeta de gasto, botón «Guardar gasto», restan capacidad de pago) | pendiente |
| Meta de ahorro (`SimuladorMeta`: «para diciembre», «que sean $80,000») | pendiente |
| Plan de la tarjeta con cualquier plazo o mensualidad objetivo, y «Aplicar plan» en su lugar | pendiente |

Decisiones que no se vuelven a discutir: los números los calcula una tool MCP (no el componente);
simular y aplicar con botón; señal «antes → después» con resaltado; si es riesgoso se ajusta y se
avisa, si es imposible no se toca y se explica; se ajustan también las tarjetas dependientes
(la `Conclusion`); solo por chat, sin controles nuevos en la tarjeta; entra al guion con Ana
después del paso 3.

### Dónde vive

- Tools: `apps/mcp/src/tools/simular-pago-credito.ts` (lectura) y
  `apps/mcp/src/tools/programar-abono-capital.ts` (acción, despachada por `ejecutar_decision`).
- Schemas: `packages/schemas/src/tools/simular-pago-credito.ts` (`EscenarioDePago`, con los mismos
  nombres que las props de la tarjeta) y `programar-abono-capital.ts`.
- Estado: `banorte.acciones_aplicadas` con `accion = 'programar_abono_capital'`, `objeto_tipo =
  'credito'` (migración `db/migraciones/0005-accion-programar-abono-capital.sql`). `consultar_creditos`
  superpone el abono vigente: gana la última acción de ese crédito.
- Componente: `packages/catalogo/src/proyeccion-pago-credito/` — props `antes`,
  `mensualidadContratoCentavos`, `programado`, `aviso`, `etiquetaBoton`; acción
  `programar_abono_capital`; resaltado en `packages/catalogo/src/resaltado.ts` (`usarCambio`).
- Agente: `ACCIONES_EN_SU_LUGAR` e `ajustar_pantalla` con `pantalla` en
  `apps/web/src/lib/agente/cierre.ts` y `ajustar.ts`; el contexto del turno (pantallas anteriores,
  instrucción por acción) en `historial.ts`; ejemplos en `prompt.ts`.
- Cliente: `numerarPantallas`, `pantallasAnteriores` y `aplicarAPantallaAnterior` en
  `apps/web/src/lib/agente/usar-agente.ts`; `consola-maya.tsx` pasa de qué pantalla salió cada
  acción y desplaza la vista a la pantalla ajustada.

### Flujo paso a paso: «¿y si pago $6,000 al mes?»

1. Ana ya tiene en pantalla `ProyeccionPagoCredito` (pintada con `consultar_creditos`).
2. Escribe la pregunta. El cliente manda la pantalla actual (`superficie.arbol`, `dataModel`,
   `pantalla: "p2"`) y hasta 3 anteriores.
3. El modelo llama `simular_pago_credito { creditoId, mensualidadCentavos: 600000 }`.
4. Cierra con `ajustar_pantalla`: parchea `mensualidadCentavos`, `plazoRestanteMeses`,
   `totalInteresesEstimadosCentavos` y `amortizacionResumen` con `simulado`; `antes` con `actual`;
   `aviso`, `mensualidadContratoCentavos`, `programado: false`; y el `titular` de la `Conclusion` si
   decía el plazo viejo. Si la tarjeta está en una pantalla de arriba, con `pantalla: "p1"`.
5. El stream manda `updateDataModel`/`updateComponents` **sin `createSurface`**; la tarjeta no se
   remonta, re-resuelve sus props, y `usarCambio` resalta lo que cambió.
6. Ana toca «Programar este pago» → acción `programar_abono_capital { creditoId, mensualidadCentavos,
   idempotencyKey }`. El contexto del turno le dice al modelo que es *en su lugar*: `ejecutar_decision`
   y `ajustar_pantalla` sobre la misma tarjeta con `programado: true` y `resultadoAccion.despues`. Si
   en esa pantalla está `SimuladorMeta`, en la misma llamada baja su `aportacionMaximaCentavos` a
   `resultadoAccion.capacidadAhorro.despuesCentavos`: el abono ya no está libre para ahorrar
   (`proyectar_ahorro` también lo descuenta).

### Entradas y salidas

`simular_pago_credito` recibe `usuarioId`, `creditoId` y **uno** de `mensualidadCentavos` (total al
mes) o `plazoMeses` (pagos desde hoy). Devuelve `actual`, `simulado`, `posible`, `motivo`,
`abonoMensualCentavos`, `ahorroInteresesCentavos`, `mesesMenos`, `capacidadPagoMensualCentavos`,
`mensualidadDeudaTotalCentavos`, `pctDelIngreso` y `aviso`. Cifras de Ana (`cred_ana_personal`,
$55,783.08 al 27.9 %, contrato $4,570.95, 15 pagos): con $6,000 al mes, **11 pagos** y $9,310.94 de
intereses con IVA contra $12,781.15 → ahorra **$3,470.21** y 4 meses.

La matemática, sus límites y por qué es abono a capital: `docs/algoritmos/abono-a-capital.md`.

### Casos límite conocidos

- **Menos que el contrato o más meses de los que faltan**: `posible: false`. Con abonos no se puede
  bajar la mensualidad; eso es una reestructura, que para créditos a plazo no existe. El agente
  contesta con `responder` y no toca la tarjeta.
- **Rebasa la capacidad de pago de buró**: `posible: true` con `aviso`; la tarjeta lo muestra en ámbar.
- **Reprogramar**: gana la última acción de ese crédito; programar la mensualidad del contrato quita
  el abono.
- **Pantalla anterior que ya no viaja** (más de 3 pantallas arriba): `ajustar_pantalla` la rechaza
  con la lista de las que sí hay y el modelo repinta.
- **Varias tarjetas con el mismo id en pantallas distintas** (`conclusion` en p1 y en p2): no chocan,
  porque el parche se valida y se aplica contra la pantalla nombrada.

### Cómo probarlo

```bash
pnpm --filter @maya/mcp test        # simular-pago-credito, programar-abono-capital, ejecutar_decision
pnpm --filter @maya/catalogo test   # la tarjeta: antes/después, botón, programado, resaltado
pnpm --filter @maya/web test        # ajustes-en-vivo.spec.ts, hilo.spec.ts
pnpm reiniciar-estado               # antes de ensayar: un abono de la corrida anterior falsea todo
```

A mano, con `pnpm dev` y Ana: «Quiero pagar menos intereses» → «¿y si pago $6,000 al mes?» (la
misma tarjeta cambia, sin pantalla nueva) → «Programar este pago» (badge «Abono programado») →
«¿cuánto debo?» (otra pantalla) → «¿y si fueran $7,000?» (cambia la tarjeta de arriba y la vista sube).

### Algoritmos involucrados

- `docs/algoritmos/abono-a-capital.md`
- `docs/algoritmos/intencion-y-parcheo.md` (cuándo ajustar y cuándo repintar)
- `docs/como-funciona/ciclo-live.md` (las tres salidas del turno, sobre las que esto se monta)
