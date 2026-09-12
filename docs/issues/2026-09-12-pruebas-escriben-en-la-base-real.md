---
estado: mitigado
severidad: alta
area: mcp
encontrado: 2026-09-12 08:05
---

# El aislamiento de las pruebas depende de que `DATABASE_URL` esté vacía: cargar el `.env` hace que `pnpm test` escriba en la base de la demo

**Dónde:** `apps/mcp/src/datos/estado.ts:52-54`

```ts
function sinBase(): boolean {
  return config.urlPostgres === "";
}
```

Ese `sinBase()` decide tres cosas: si `aplicarAccion` inserta en
`banorte.acciones_aplicadas` o solo en un arreglo en memoria (`:97-103`), si
`refrescarAcciones` consulta la base (`:79`), y —la peligrosa— si `reiniciarEstado`
ejecuta `truncate table banorte.acciones_aplicadas restart identity` (`:134-136`).

**Qué esperaba:** que las pruebas no pudieran tocar la base pase lo que pase. Es lo que
promete el ADR 0010, punto 6: *"Las pruebas no tocan la base. […] Sin red y sin riesgo de
truncar la tabla de la demo con un `pnpm test`."*

**Qué pasa:** ese aislamiento no lo garantiza nada del código de pruebas. Lo garantiza,
por accidente, que `apps/mcp/src/config.ts` hacía `import "dotenv/config"` con `cwd` en
`apps/mcp`, donde **no hay** `.env`. O sea: las pruebas estaban aisladas porque la carga
del entorno estaba rota.

En cuanto alguien arregla la carga del `.env` —que es un arreglo necesario, porque sin él
el MCP no levanta en Windows, donde `scripts/dev.sh` no corre— las 103 pruebas de
`apps/mcp` empiezan a hablarle a la base real. Verificado: 12 fallaron (`acciones`,
`auditoria`, `suscripciones`, `topes`, `salud`) y en esa corrida se ejecutó
`reiniciarEstado()` contra la base de la demo. **No se perdió nada solo porque la tabla
estaba en cero.** Con un plan aplicado a media demo, se lo lleva.

Basta con exportar `DATABASE_URL` en la terminal antes de `pnpm test` para reproducirlo,
sin tocar una línea de código.

**Mitigación aplicada:** `apps/mcp/src/config.ts` no carga el `.env` cuando
`process.env.VITEST` está definido, con el motivo escrito arriba de la condición.

**Por qué sigue abierto como hallazgo:** la mitigación protege el camino conocido
(`pnpm test`), no la causa. La causa es que "estoy en pruebas" y "no tengo base
configurada" son la misma señal, y siguen siendo la misma. Sigue rompiéndose si alguien
corre vitest con `DATABASE_URL` exportada, si otro runner no define `VITEST`, o si mañana
hay una prueba de integración que sí necesita base y otra que no.

**Arreglo de fondo (no aplicado, es cambio de contrato):** que el origen sea explícito en
vez de inferido. Un `config.modoPruebas` o un parámetro de `crearEstado()` que las
pruebas pasan a propósito, y que `reiniciarEstado` se niegue a truncar si no está en modo
demo. Es tocar `estado.ts`, `config.ts` y el `preparar.ts` de vitest a la vez: no es un
arreglo de paso a las 3 am.

**No se subió a GitHub:** no hay `gh` en el PATH de esta máquina (mismo caso que
`2026-09-12-catalogo-sin-types-react-dom.md`). Falta correr `gh issue create` y poner el
número en el frontmatter `github:`.
