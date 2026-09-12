---
estado: resuelto
severidad: media
area: docs
encontrado: 2026-09-12 10:55
resuelto: 2026-09-12 11:40
---

# Los datos mock incluyen un tercer perfil e Inversiones, que el ADR 0004 excluía

> **Resuelto el 2026-09-12**: se adoptó la opción 2. El ADR 0004 quedó **enmendado** para
> admitir a Carmen como tercer perfil e Inversiones como pestaña de consulta en Productos.
> El límite acordado: Inversiones es **solo lectura**, el agente no genera flujos de
> inversión, y la demo se sigue contando con Beto. Carmen es contraste, no una cuarta
> intención.
>
> Implementado en `apps/web/src/lib/usuarios.ts` (tres perfiles) y
> `apps/web/src/app/(app)/productos/page.tsx` (pestaña Inversiones).
>
> **Actualización 2026-09-13**: el límite de "el agente no genera flujos de
> inversión" se mantiene (no hay acción sobre el portafolio), pero "Inversiones es
> solo lectura, **no un flujo accionable del agente**" se revirtió — el agente sí
> consulta Inversiones, vía tools de lectura del MCP, para completar el viaje de
> Carmen. Ver la enmienda del 2026-09-13 en `docs/decisiones/0004-caso-de-uso.md` y
> `docs/issues/2026-09-13-tools-inversiones-contradicen-adr-0004.md`.

**Dónde:** `db/datos/` (22 CSV), `db/schema.sql`, `scripts/lib/perfiles.mjs` contra
`docs/decisiones/0004-caso-de-uso.md` líneas 84–85.

**Qué esperaba:** que el alcance de los datos coincidiera con el caso de uso decidido.

**Qué pasa:** el ADR 0004, aceptado, cierra su sección "Qué NO entra" con:

> Tope de gasto salvo tiempo sobrante. Inversiones con rendimiento variable. **Más de dos
> usuarios demo.** Cualquier cuarta intención.

Los datos generados tienen **tres** perfiles (Ana, Beto y **Carmen**) y **seis** tablas de
Inversiones con rendimiento variable: `instrumentos`, `perfiles_inversion`,
`modelos_portafolio`, `portafolios`, `posiciones` y `precios_historicos` (848 filas de
precios semanales generados con movimiento browniano).

**Cómo lo reproduje / por qué estoy seguro:** `SELECT count(*) FROM banorte.usuarios` da 3;
`docs/decisiones/0004-caso-de-uso.md:28` dice "Dos usuarios demo" y `:84` excluye
explícitamente más de dos y las inversiones con rendimiento variable.

El origen del desajuste: los datos se generaron tomando como insumo
`docs/reto/casos-de-uso.md`, que es material para decidir y no la decisión, y se eligió
Inversiones para tener un escenario de **ejecutivo de cuenta** (una audiencia que no es el
usuario retail). El ADR 0004 se decidió con otro criterio: tres intenciones del mismo viaje
para un solo usuario, construidas en orden estricto.

**Impacto en la demo:** ninguno hoy, y es importante entender por qué. Las seis tablas de
Inversiones y el tercer perfil son **filas, no código**: ninguna de las tools que el ADR 0004
lista (`consultar_tarjeta`, `consultar_movimientos`, `simular_reestructura`,
`comparar_periodos`, `proyectar_ahorro`, `crear_apartado`…) las lee. No hay riesgo de que
aparezcan en pantalla por accidente.

El costo es otro: son ~890 filas y 6 tablas que hay que mantener coherentes en cada
regeneración, y un perfil que la demo no va a usar. Antes de la hora 30 eso es peso muerto,
y el `CLAUDE.md` prohíbe refactors después de la hora 30.

**Decisión tomada** (2026-09-12, al reestructurar el shell web): **opción 2**, enmendar el
ADR 0004.

1. ~~**Dejarlo.**~~ Costo cero hoy; el esquema queda más grande de lo que la demo usa.
2. **Enmendar el ADR 0004** para admitir a Carmen e Inversiones. ← **elegida**. Aprovecha
   los datos ya generados y suma el escenario del ejecutivo de cuenta, que ningún otro
   equipo va a traer.
3. ~~**Recortar**~~ a dos perfiles y quitar las seis tablas.

**Pendiente:** crear el issue en GitHub. `gh` no está instalado en esta máquina (tampoco
`git` ni `psql`), así que la mitad de GitHub quedó sin hacer y el frontmatter `github:` sigue
vacío a propósito.
