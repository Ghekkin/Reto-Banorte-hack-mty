---
estado: aceptada
fecha: 2026-09-12
---

# 0007 — PostgreSQL como fuente de los datos mock, con CSV commiteados y fallback en memoria

> Reemplaza al ADR 0006 (estado del MCP en JSON). Se escribió como 0005 en paralelo al
> ADR 0005 del modelo; se renumeró el 2026-09-12 para deshacer la colisión.

## Contexto

Los ADR 0001 y 0002 fijaron el stack (TypeScript de punta a punta, Python solo detrás de
una tool) pero **ninguno menciona base de datos**: el diseño original asumía datos mock
en archivos JSON leídos en memoria por el servidor MCP, como sigue diciendo la skill
`datos-mock`.

Dos cosas cambiaron esa suposición:

1. **El alcance de los datos creció.** Los territorios que el reto pone sobre la mesa
   (banca personal, pagos, inversiones, seguros, crédito, educación financiera) piden
   entidades relacionadas: un crédito tiene su tabla de amortización, un portafolio
   tiene posiciones que apuntan a instrumentos que tienen precios históricos. Resolver
   eso con `Array.prototype.filter` sobre JSON funciona, pero las tools acaban
   reimplementando joins a mano.
2. **Hay quien ya opera el Postgres.** La carga de datos la hace una persona del equipo
   fuera del repo, así que el entregable natural es **CSV**, no JSON.

Contra eso pesa la regla 4 del `CLAUDE.md`: `main` siempre arranca, y la demo no puede
depender de una pieza que se puede caer. Un Postgres es exactamente ese tipo de pieza.

## Decisión

1. **PostgreSQL es la fuente de datos de las tools MCP**, con el esquema en `db/schema.sql`.
2. **Los datos se entregan como CSV en `db/datos/`, y se commitean.** No se commitea ningún
   dump binario ni ningún estado de la base: el CSV es la verdad, la base es una copia
   cargable. `db/cargar.sql` hace los `\copy` en orden de dependencia y
   `db/reiniciar.sql` deja la demo limpia entre ensayos.
3. **Los CSV los produce un generador determinista con semilla fija**
   (`scripts/generar-datos.mjs`). Mismo comando, mismos bytes. La demo **no** depende de
   correr el generador.
4. **Postgres va detrás del flag `FEATURE_POSTGRES`.** Con el flag apagado, la capa de
   datos del MCP lee los mismos CSV en memoria al arrancar y la demo es idéntica. Ese es
   el fallback obligatorio de la regla 4: si el Postgres no levanta cinco minutos antes
   del pitch, se apaga el flag y no se nota.
5. **Ninguna tool escribe SQL a mano.** Todo acceso pasa por una capa de datos única con
   dos implementaciones (`postgres` y `memoria`) detrás de la misma interfaz, para que el
   fallback sea real y no una promesa.

## Alcance de los datos (esta tanda)

Tres territorios con datos ricos, elegidos con la puntuación de `docs/reto/casos-de-uso.md`
y el requisito de tener un escenario que no sea el del usuario retail:

| Territorio | Por qué |
|---|---|
| **Crédito** | Caso 1, 16/18. Es el ejemplo de la portada oficial: reestructura de tarjeta |
| **Banca personal + Educación financiera** | Caso 2, 16/18. Gasto por categoría, topes, metas, hábitos |
| **Inversiones** | El ángulo de **ejecutivo de cuenta**: perfilar a un cliente patrimonial y proponerle portafolio. Otra audiencia, mismo servidor MCP |

**Pagos y Seguros quedan fuera de esta tanda.** Sus casos puntúan 14 y 13, sus datos son
los más laboriosos (conciliación bancaria, catálogos de coberturas y siniestros) y no
aportan una pantalla que los otros tres no den ya. Sus tablas no se diseñan todavía: se
agregan cuando haya un caso que las use, para no cargar el esquema con tablas vacías.

## Consecuencias

- **La skill `datos-mock` queda desactualizada en cuatro puntos** y se corrige en el mismo
  commit que este ADR: JSON → CSV, un usuario → tres perfiles, 6 meses → 12 meses,
  4 archivos → 22 archivos.
- **Tres perfiles demo, no uno.** Un solo usuario no puede ser a la vez creíblemente
  precalificable a crédito, endeudado en mora y cliente patrimonial con portafolio. Los
  tres perfiles son además la evidencia de adaptabilidad que la rúbrica pide (20%): mismo
  intent, tres pantallas distintas.
- **Doce meses de historial en vez de seis.** Habilita comparativas año contra año y la
  estacionalidad mexicana (aguinaldo, Buen Fin, regreso a clases), que es justo lo que
  hace creíble el territorio de educación financiera.
- `db/` es una carpeta nueva y entra al mapa del repositorio en `CLAUDE.md`.
- El generador se escribe en **`.mjs` con Node puro, sin dependencias ni build**, porque
  el scaffold `pnpm` todavía no existe. Cuando exista, se mueve a TypeScript; hoy
  escribirlo en `.ts` lo volvería no ejecutable, que es peor.
- Variables nuevas en `.env.example`: `FEATURE_POSTGRES`, `DATABASE_URL`.

## Alternativas descartadas

- **Seguir con JSON en memoria.** Cero riesgo operativo, pero las tools reimplementan
  joins y el crecimiento de datos se vuelve inmanejable. Sobrevive como el fallback del
  punto 4, que es donde vale.
- **SQLite.** Da SQL sin servidor y sin riesgo de red, pero la persona que opera los
  datos ya tiene un Postgres, y SQLite no aporta nada que el fallback en memoria no dé.
- **Cargar los datos directo desde el generador a la base.** Haría que la demo dependa de
  correr un script contra una base viva. Los CSV commiteados cortan esa dependencia.
