---
name: ui-generativa
description: Cómo se crea o modifica un componente del catálogo A2UI propio (packages/catalogo) - schema de props, implementación React, registro en el renderer propio (packages/a2ui), bindings al data model, acciones que regresan al agente, tres estados, y doc. Invocar antes de tocar packages/catalogo o el renderer en apps/web.
---

# Componentes del catálogo A2UI

El principio, ahora con protocolo estándar (ADR 0003): **el agente no escribe HTML;
describe la interfaz en A2UI usando solo los componentes de nuestro catálogo, y los
llena con datos.** La regla 1 del reto dice que el sistema de componentes lo diseña y
programa el equipo: este catálogo *es* nuestra entrega de "componentes".

## Se construyen sobre shadcn

**Obligatorio**: cada componente del catálogo es una composición de primitivas de
shadcn/ui (`card`, `button`, `radio-group`, `chart`, `table`…) con nuestras props y
nuestras acciones A2UI. Nada escrito a mano, ningún hex suelto: invoca
**`diseno-banorte`** para la paleta y las reglas, y la skill **`shadcn`** para agregar
el componente con su CLI. La regla 1 del reto se sigue cumpliendo: shadcn son
primitivas sin opinión; **el catálogo financiero es nuestro**.

## Qué es un componente del catálogo

Tres archivos en `packages/catalogo/src/<nombre>/`:

| Archivo | Qué contiene |
|---|---|
| `schema.ts` | Schema de props (Zod → JSON Schema) que el agente ve. Cada prop con descripción: es lo que el modelo lee para decidir cómo usarlo. Props enlazables aceptan `{ path }` (JSON Pointer al data model). Acciones se declaran con el tipo `Action` común del catálogo. |
| `componente.tsx` | La implementación React. Recibe props ya resueltas por el renderer. |
| `README.md` | Para qué sirve, cuándo el agente debe elegirlo, ejemplo de mensaje `updateComponents` que lo usa. |

Y una línea en `packages/catalogo/src/index.ts` que lo registra en el registro de
`packages/a2ui` (`registrar("PlanDePago", PlanDePago)`); el `catalogId`
(`https://<dominio>/catalogo/v1.json`) lo sirve `apps/web` desde los schemas.

## Orden obligatorio

1. **Parte de la intención, no del diseño.** ¿Qué pregunta del usuario hace que el
   agente elija este componente? Si no puedes decirlo en una frase, no va.
2. **Schema primero.** Props mínimas, cada una con `.describe()`. Montos en centavos
   con moneda. Lo que cambia con el usuario es binding al data model (`{ path }`), no
   literal. Toda tarjeta declara `ancho: "normal" | "amplio"` (una o dos columnas de
   la rejilla bento) y, si aplica, `heroe: boolean` — **solo una por pantalla**.
3. **Acciones = eventos A2UI.** Un botón declara `action: { event: { name,
   context } }`. El `context` resuelve paths del data model (ej. el plazo elegido). El
   componente **nunca** hace fetch ni llama al MCP: dispara la acción y el agente
   decide. Nombres según la convención de `docs/arquitectura/contrato-agente-cliente.md`:
   mutación = nombre de la tool (`aplicar_plan_pago`); solo vista = `ver_*`; elegir sin
   confirmar = `elegir_*`.
4. **Tres estados siempre**: cargando (skeleton del tamaño final; el data model puede
   llegar después que los componentes), vacío (frase útil, nunca blanco), error
   (mensaje corto + qué puede hacer la persona).
5. **Registro** en `packages/a2ui` (`registrar`) y en el JSON del catálogo que se le
   pasa al agente (el mismo schema sirve para los dos: nada se escribe dos veces).
6. **Prueba** con un mensaje A2UI escrito a mano en
   `packages/catalogo/ejemplos/<nombre>.jsonl` que lo renderiza (skill `probar`,
   nivel 2). Ese archivo es también documentación.
7. **Doc** en `docs/como-funciona/componente-<nombre>.md`, dos niveles.

## Reglas de adaptabilidad (20% de la rúbrica)

- Un componente cubre **una** intención bien. Mejor `PlanDePago`, `TablaMovimientos`,
  `GraficaGasto`, `SimuladorCredito`, `Confirmacion` que un `Panel` genérico.
- Variantes por contexto van como props (`enfasis: "ahorro" | "urgencia"`), para que el
  agente pueda adaptar la misma pantalla a otro perfil sin otro componente.
- Los componentes de layout (Column, Row, Text) pueden venir del catálogo básico de
  A2UI; los que el jurado va a mirar son nuestros.

## Diseño

- Sistema visual único: los tokens viven en `apps/web/app/globals.css` (skill
  `diseno-banorte`), no en el paquete. Un juez ve una pantalla, no un componente.
- Un solo botón primario (rojo) por superficie.
- Legible en proyector: contraste alto, números tabulares, nada menor a 14 px.
- Funciona a 400 px de ancho (la demo puede ir en celular).
- Nada de capturas en la doc: el `.jsonl` de ejemplo es la captura.

## Checklist antes de commitear

- [ ] Construido con primitivas de shadcn; cero hex en el `.tsx`.
- [ ] Schema con descripciones, registrado en `packages/a2ui` y en el JSON del catálogo.
- [ ] Acciones declaradas como eventos A2UI; cero fetch en el componente.
- [ ] Tres estados vistos en pantalla con el `.jsonl` de ejemplo.
- [ ] Sin errores de consola.
- [ ] Doc y README del componente. Entrada en tu bitácora.
