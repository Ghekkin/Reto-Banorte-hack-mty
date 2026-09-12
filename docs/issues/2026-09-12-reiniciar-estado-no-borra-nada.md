---
estado: abierto
severidad: critica
area: mcp
encontrado: 2026-09-12 08:50
github: 9
---

# `pnpm reiniciar-estado` dice que vació la tabla y no borró nada

**Dónde:** `apps/mcp/src/datos/estado.ts:133` (`reiniciarEstado`) y
`apps/mcp/scripts/reiniciar-estado.ts`

**Qué esperaba:** que `pnpm reiniciar-estado` deje `banorte.acciones_aplicadas`
vacía, que es lo que imprime y lo que promete la skill `checklist-demo` como primer
paso funcional de todo ensayo y del pitch.

**Qué pasa:** si `DATABASE_URL` no está **exportada en el entorno del shell**, el
script no toca la base. `reiniciarEstado()` consulta `sinBase()`
(`config.urlPostgres === ""`), se salta el `truncate` y solo vacía la copia en
memoria de su propio proceso, que muere enseguida. El script imprime igual
`estado reiniciado: banorte.acciones_aplicadas quedo vacia` y sale con código 0.

El detalle que lo hace fácil de pisar: `scripts/migrar.mjs`, `scripts/restaurar.mjs`
y `scripts/volcar-fixture.mjs` **sí leen el `.env` de la raíz** a mano cuando la
variable no está en el entorno. `apps/mcp/scripts/reiniciar-estado.ts` no lo hace, y
`pnpm` tampoco carga `.env`. Quien corra el comando tal como está documentado en el
`README.md` y en el `CLAUDE.md`, sin `source .env` previo, no reinicia nada.

**Cómo lo reproduje:** contra la base de producción, el mismo comando dos veces.

```
$ pnpm reiniciar-estado
estado reiniciado: banorte.acciones_aplicadas quedo vacia
$ psql -tAc "select count(*) from banorte.acciones_aplicadas"
2

$ set -a; . ./.env; set +a
$ pnpm reiniciar-estado
estado reiniciado: banorte.acciones_aplicadas quedo vacia
$ psql -tAc "select count(*) from banorte.acciones_aplicadas"
0
```

**Impacto en la demo: la rompe.** Es el primer paso del checklist previo. Un ensayo
que arranca sin reiniciar de verdad le da a Beto un plan ya aplicado, y entonces la
primera pantalla del guion no es `PlanDePago` sino la tarjeta con "Plan activo": se
pierde el momento de aplicar el plan, que es el flujo accionable del reto. El mensaje
de éxito hace que nadie sospeche.

**Arreglo sugerido:** que el script cargue el `.env` de la raíz igual que sus tres
hermanos, y que `reiniciarEstado()` falle ruidosamente en vez de callar cuando no hay
base. El mensaje de salida debería decir cuántas filas borró y contra qué base.
