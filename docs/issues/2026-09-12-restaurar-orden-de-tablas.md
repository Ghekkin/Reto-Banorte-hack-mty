---
estado: resuelto
severidad: alta
area: infra
encontrado: 2026-09-12 10:30
github: 10
---

# `pnpm datos:restaurar` no puede repoblar una base vacía: el orden de tablas viola una llave foránea

**Dónde:** `scripts/restaurar.mjs`, el arreglo `ORDEN`

**Qué esperaba:** que el volcado del repo repueble un PostgreSQL vacío. Es la red de
seguridad del ADR 0010 y **el plan B para presentar sin red**: levantar Postgres local,
`pnpm datos:migrar`, `pnpm datos:restaurar` y seguir con la demo.

**Qué pasa:** `ORDEN` listaba `modelos_portafolio` **antes** que `instrumentos`, y
`modelos_portafolio.instrumento_id` es una llave foránea a `instrumentos`. Contra una
base vacía el script muere a la mitad:

```
error: insert or update on table "modelos_portafolio" violates foreign key
constraint "modelos_portafolio_instrumento_id_fkey"
detail: 'Key (instrumento_id)=(inst_cetes_28) is not present in table "instrumentos".'
```

**Por qué nadie lo vio:** contra la base de la demo, que ya tiene los datos, cada insert
cae en `on conflict do nothing` y devuelve cero filas sin error. El script "funciona"
siempre que la base ya esté llena, que es justo cuando no hace falta. Solo falla en el
único escenario para el que existe.

Además el fallo salía como un volcado crudo del driver de `pg`, sin decir en qué tabla.

**Cómo lo reproduje:** Postgres 17 limpio en un contenedor, `db/schema.sql`,
`pnpm datos:migrar`, `pnpm datos:restaurar`.

**Impacto en la demo:** alto pero indirecto. La demo normal no lo toca; **el plan B sí**,
y el plan B es lo que se usa si el stand no tiene red. Habríamos descubierto esto con el
proyector encendido.

## Cómo quedó

`ORDEN` se rehízo desde el grafo real de llaves foráneas (consultado a
`information_schema`), agrupado por nivel de dependencia y con el porqué escrito encima.
Un fallo de insert ahora nombra la tabla, imprime el `detail` de Postgres y sugiere que
la dependencia va después en `ORDEN`.

**Verificado de punta a punta**, que es lo que faltaba desde el ADR 0010: contenedor
Postgres 17 vacío → `schema.sql` → `pnpm datos:migrar` → `pnpm datos:restaurar`
(**3,690 filas**, el total esperado) → el MCP arranca contra esa base y `/health` reporta
`origenDatos: postgres`, 18 tools y 22 tablas → `consultar_tarjeta` devuelve a Beto con
sus $47,386 y su 96.71 % de uso.
