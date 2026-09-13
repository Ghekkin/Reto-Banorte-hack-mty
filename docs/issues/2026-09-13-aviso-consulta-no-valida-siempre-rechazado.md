---
estado: resuelto
severidad: alta
area: web
encontrado: 2026-09-13 06:35
github: 40
resuelto-en: 8060918
---

# `AvisoConsultaNoValida` nunca pinta: el host le agrega `motivo` y `sugerencias`, que su schema no tiene

**Dónde:** `apps/web/src/lib/agente/pantalla.ts:682-683` (en `origin/main` `e4ca8e7`), dentro de la
normalización de componentes:

```ts
if (!comp.motivo || typeof comp.motivo !== "string") comp.motivo = "Por políticas de seguridad…";
if (!Array.isArray(comp.sugerencias)) comp.sugerencias = ["Ver mis finanzas", …];
```

El schema (`packages/catalogo/src/aviso-consulta-no-valida/schema.ts`) no tiene `motivo` ni
`sugerencias`: usa `explicacion` y `alternativasSugeridas`, y la validación es estricta.

**Qué esperaba:** que «quiero invertir» con deuda cara (Beto) pinte el aviso de orientación con
alternativas, que es para lo que existen `orientar_consulta_no_valida` y el componente.

**Qué pasa:** el modelo arma bien el aviso (sin `motivo`, porque no existe), el host le agrega las
dos props inventadas, la validación lo rechaza con `la propiedad "motivo" no existe en este
componente`, el modelo reintenta, el host las vuelve a agregar, y el turno termina `sin_pantalla`
tras dos rechazos. El modelo no tiene forma de corregirlo.

**Cómo lo sé (base, `banorte.corrida_tools`):** de todos los `pintar_pantalla` que incluyen
`AvisoConsultaNoValida`, **0 de 18** pasaron. Entre 05:31 y 06:03 del 13, 7 turnos de Beto
terminaron `sin_pantalla` por esto (4 en producción, `urlMcp` = `maya-mcp`): «quiero invertir» (5) y
«Quiero pagar menos intereses» dentro de una conversación que empezó con «quiero invertir» (2).
Ejemplo: `cor_8b16275bd37741cdbb601853`.

**Impacto en la demo:** alto. El guion no lo pisa, pero «quiero invertir» es una pregunta natural de un
juez con Beto, y la respuesta es una pantalla vacía con aviso de error después de ~10 s y tres
peticiones pagadas. Y contamina la conversación: la siguiente pregunta del guion también falló.

**Arreglo:** quitar ese relleno (no inventar props que el schema no declara) y, si hace falta llenar
algo obligatorio, usar los nombres reales (`explicacion`, `alternativasSugeridas`) con datos del
resultado de `orientar_consulta_no_valida`.

## Resolución

Resuelto en `8060918`. El host ya no agrega `motivo` ni `sugerencias`; lo que falta se llena solo con props del schema tomadas de `orientar_consulta_no_valida`. Se revisó toda prop que escribe la normalización contra el schema de su componente: ninguna queda fuera. Prueba con los argumentos reales de `cor_8b16275bd37741cdbb601853`. Repetidas las 142 `pintar_pantalla` del día: 15 avisos pasan ahora. **Verificado con el modelo real en producción** (06:57): «quiero invertir» (Beto) pinta `AvisoConsultaNoValida` + `ResumenTarjeta` + `PlanDePago`.
