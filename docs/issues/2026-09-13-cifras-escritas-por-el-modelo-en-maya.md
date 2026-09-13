---
estado: abierto
severidad: alta
area: web
encontrado: 2026-09-13 01:15
---

# En `/maya` (y en Inicio sin widgets vivos) las cifras de las tarjetas las escribe el modelo y nadie las contrasta con el MCP

**Dónde:** `apps/web/src/lib/agente/pantalla.ts:45` (`componentesJson`) y `:52` (`datosJson`);
`apps/web/src/lib/agente/ajustar.ts:52` (`parchesDatos`) y `:129` (el `value` del parche pasa tal cual).

**Qué esperaba:** que un monto, un porcentaje o un saldo en una tarjeta fuera exactamente lo que
devolvió una tool del MCP.

**Qué pasa:** `pintar_pantalla` recibe las props y el data model **escritos por el modelo**, que
copia —o no— lo que devolvieron las tools; `ajustar_pantalla` recibe el `value` de cada parche de
la misma forma. Las validaciones (Zod del catálogo, JSON Schema oficial, rutas existentes)
revisan la forma, nunca el valor. Un número mal copiado, redondeado de otra forma o inventado
llega a la pantalla.

**Cómo lo reproduje / por qué estoy seguro:** en las portadas guardadas en
`banorte.pantallas_inicio` el 2026-09-13 (modo anterior, `FEATURE_WIDGETS_VIVOS=0`):

- la `Conclusion` de Beto decía «Crédito Nómina (restante) **$2,954,065**»; `consultar_creditos`
  devuelve `saldoInsolutoCentavos: 2954065`, o sea **$29,540.65** (centavos leídos como pesos);
- `TermometroSaludFinanciera.montoAhorradoCentavos` no lo devolvía ninguna tool (el ejemplo del
  catálogo trae `4500000` fijo): cualquier valor era una estimación del modelo.

El segundo ya se resolvió en el MCP (`diagnostico_salud_financiera.ahorroLiquidoCentavos`). En
Inicio con `FEATURE_WIDGETS_VIVOS=1` el problema completo no existe: las tarjetas salen de
adaptadores y el texto pasa por un verificador (ADR 0011, `docs/como-funciona/widgets-vivos.md`).
**La conversación de `/maya` sigue sin esa garantía.**

**Impacto en la demo:** se nota si un juez compara una cifra de `/maya` con la de la pantalla
programada de Productos. Camino propuesto: que `pintar_pantalla` y `ajustar_pantalla` acepten
fuentes (`lib/widgets/fuentes.ts`) en lugar de valores, y aplicar `verificarCifras` al `texto`
del turno; los adaptadores y el auditor ya existen y están probados.
