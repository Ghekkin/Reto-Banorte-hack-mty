# Bitácora de andres

## 2026-09-13

- **05:31 · inicio** — Tomo el rol `web`. Tarea: correr la web en local (`@maya/web` en `:3000` y servicios requeridos).
- **05:46 · cambio de usuario y limpieza de chat** — Al cambiar de usuario:
  - Se añade `redirect("/")` a `cambiarUsuario` en `apps/web/src/app/(app)/acciones.ts` y navegación `router.push("/")` en `SelectorUsuario` y `CambiarPersona`.
  - Se monta `ConsolaMaya` con `key={usuario.id}` para reset total de componentes.
  - En `usarAgente`, al detectar cambio de `usuarioId` se invoca `reiniciar()`, se aborta cualquier petición en vuelo y se resetea el hilo, estado A2UI, transparencia y voz.
  - Pruebas añadidas y en verde (`acciones.spec.ts`, `consola-maya.spec.ts`, `selector-usuario.spec.ts`, `cambiar-persona.spec.ts`).

