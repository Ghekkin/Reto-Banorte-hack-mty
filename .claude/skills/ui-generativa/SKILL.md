---
name: ui-generativa
description: Cómo se crea o modifica un componente que renderiza el resultado de una tool (UI generada por el agente) - un componente por schema, registro por campo tipo, estados de carga/error/vacío, y doc. Invocar antes de tocar apps/web/src/components/generated.
---

# Componentes de UI generativa

El principio: **el agente no escribe HTML; elige entre interfaces que nosotros
diseñamos, y las llena con datos.** Cada schema de salida de tool tiene exactamente un
componente que lo renderiza. El agente "genera la interfaz" al decidir qué tool llamar,
con qué parámetros, y en qué orden componer los resultados.

## Orden obligatorio

1. **Parte del schema, no del diseño.** Lee el schema en `packages/schemas`. Si el
   componente necesita un dato que el schema no tiene, se cambia el schema (y la tool,
   y su mock) — no se inventa en el front.
2. **Un componente por schema**, en `apps/web/src/components/generated/<slug>.tsx`.
   Recibe `props` tipadas con el tipo inferido del schema. Nada más.
3. **Registro en el mapa `tipo → componente`** (un solo archivo, `registry.ts`). El
   host elige componente por el campo `tipo` del resultado. Sin `switch` sueltos.
4. **Tres estados siempre**: cargando (mientras la tool corre, con el skeleton del
   mismo tamaño que el resultado final), error (mensaje corto + qué puede hacer el
   usuario), vacío (sin datos, con una frase útil, nunca un espacio en blanco).
5. **Acciones = tools.** Si el componente tiene un botón que hace algo ("transferir",
   "aceptar oferta"), ese botón dispara un mensaje al agente o una tool, nunca un fetch
   propio. La UI generada no tiene backdoor al backend.
6. **Doc** en `docs/como-funciona/<slug>.md`, en el mismo doc que la tool si ya
   existe (sección "Componente").

## Streaming

- El resultado puede llegar parcial. El componente debe renderizar con datos
  incompletos sin explotar (campos opcionales en el schema o valores por defecto).
- No bloquear el render del texto del agente por un componente: cada uno se pinta
  cuando su tool termina.

## Diseño

- Consistencia sobre originalidad: mismo sistema de espaciado, tipografía y color en
  todos los componentes. Un juez ve una pantalla, no un componente.
- Colores de datos (gráficas, estados) desde un único archivo de tokens.
- Funciona a 400 px de ancho. Se ensaya en la resolución del proyector.
- Nada de capturas en la doc: describe el flujo y apunta al archivo.

## Checklist antes de commitear

- [ ] Props tipadas desde `packages/schemas`, sin tipos locales duplicados.
- [ ] Registrado en `registry.ts`.
- [ ] Estados cargando / error / vacío implementados y vistos en pantalla.
- [ ] Renderiza con el resultado del mock sin errores de consola.
- [ ] Doc actualizado. Entrada en tu bitácora (`docs/bitacora/<nombre>.md`).
