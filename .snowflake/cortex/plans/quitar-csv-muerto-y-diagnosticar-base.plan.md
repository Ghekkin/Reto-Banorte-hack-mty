# Quitar el CSV muerto y diagnosticar la base

## Lo que ya está hecho (y por qué esto es más chico de lo que parece)

El ADR 0010 (13-sep) ya decidió y ejecutó lo que pides: **Postgres es la única fuente de datos**. La migración en código está completa:

| Pieza | Estado |
|---|---|
| `apps/web/src/lib/datos/tablas.ts` | Lee Postgres con `pg` y `DATABASE_URL`. Es el que usa `consultas.ts` |
| `apps/mcp/src/datos/postgres.ts` | Carga el esquema entero al arrancar; **lanza** si no hay base |
| `apps/mcp/src/config.ts:16` | `origenDatos: "postgres" as const` — sin flag, sin alternativa |
| `db/datos/` (los 22 CSV) | Ya borrado del repo |
| `FEATURE_POSTGRES`, `DATOS_CSV` | Ya no existen en código ni en `.env.example` |

Queda **un solo** lector de CSV: `apps/web/src/lib/datos/leer-csv.ts`, 114 líneas, apuntando a `db/datos` (que ya no existe). **Nadie lo importa** — verificado por grep sobre todo `apps/web/**/*.{ts,tsx}`. Borrarlo no cambia ningún comportamiento.

## Por qué ves todo vacío

No es falta de API. Es que `tablas.ts:67-71` traga el error y devuelve `[]`, así que un fallo de conexión y una base vacía se ven idénticos a "este usuario no tiene cuentas". Decidiste dejar ese comportamiento como está, así que el arreglo es de diagnóstico, no de código: hay que averiguar cuál de los dos es.

Las dos causas posibles:

1. **La base no es alcanzable.** `DATABASE_URL` apunta a `157.173.204.174:5437`, y hay un issue abierto justo por eso (`docs/issues/2026-09-12-postgres-remoto-inalcanzable.md`).
2. **Conecta pero el esquema `banorte` está vacío.** Los datos ya no viven en el repo; se repueblan con `pnpm datos:restaurar` desde el volcado `apps/mcp/src/__tests__/datos-de-prueba.json`.

Un detalle que apunta a que esto ya le pasó a alguien: `apps/mcp/src/datos/postgres.ts:79`, cuando encuentra el esquema vacío, dice *"corre `pnpm datos:cargar`"* — un script que **no existe** en `package.json`. El que existe es `datos:restaurar`.

## Los pasos

### 1. Diagnosticar (antes de tocar nada)

Un script de un solo uso, de solo lectura, con `pg` y la `DATABASE_URL` de tu `.env`: conectar, y si conecta, `select count(*)` sobre `banorte.usuarios`, `banorte.cuentas` y `banorte.movimientos` más el conteo de tablas del esquema. Eso separa las dos causas en una corrida.

- Si **no conecta** → el problema es de red/credenciales, no de código. Te digo el error exacto y decides (VPS caído, firewall, o levantar un Postgres local como plantea el ADR 0010).
- Si **conecta y está vacío** → `pnpm datos:restaurar` y listo.
- Si **conecta y tiene filas** → entonces el vacío viene de otra parte y hay que mirar `consultas.ts` (por ejemplo el `usuarioId` de la cookie no coincidiendo con ningún `usuarios.id`). Ese caso abre un issue.

No ejecuto nada que escriba en la base sin confirmarlo contigo primero.

### 2. Borrar `apps/web/src/lib/datos/leer-csv.ts`

El archivo completo. Sin sustituto: `tablas.ts` ya expone la misma firma (`leerTabla`, `entero`, `fraccion`, `booleano`) y es de donde `consultas.ts` ya importa.

### 3. Arreglar `postgres.ts:79`

`pnpm datos:cargar` → `pnpm datos:restaurar`. Es un mensaje que se lee justo en el momento de más frustración (base vacía) y hoy manda a un comando que falla.

### 4. Comentarios de código que siguen citando CSV

- `apps/web/src/lib/usuarios.ts:7` — quedó una frase a medio editar ("Los ids coinciden con `la base/usuarios.csv`") que ya no se lee bien.
- `packages/schemas/src/tools/consultar-perfil.ts:6` — "Dueno del dato: rol `mcp` (db/datos/usuarios.csv)".
- `db/reiniciar.sql:21` — comentario sobre los CSV.
- `apps/mcp/src/__tests__/finanzas.spec.ts:26` — nombre de test "reproduce las cuatro ofertas de planes_reestructura.csv". Cosmético, pero es el nombre que sale en la salida de `pnpm test`.

### 5. Docs

Prioridad a lo que se lee para trabajar, no al archivo histórico:

- **`CLAUDE.md`** se contradice consigo mismo: la línea 130 dice que el MCP tiene "capa de datos sobre los CSV" y la 102 ya dice Postgres. Se corrige la 130 y la fila de `db/` del mapa del repositorio.
- **`docs/como-funciona/shell-web.md`** (10 menciones), **`scaffold-y-arranque.md`**, **`datos-mock.md`**: describen los CSV como la fuente. El ADR 0010 ya se comprometió a corregirlos.
- **Skills `datos-mock` y `tool-mcp`**: mismo motivo, y son lo que lee el siguiente agente antes de tocar datos.

**Fuera de alcance a propósito:** las bitácoras (`docs/bitacora/*`) son un registro de lo que pasó y no se reescriben; los ADR 0006 y 0007 quedan como están porque el 0010 ya dice que los reemplaza; `docs/algoritmos/generacion-de-datos.md` describe un generador que ya no existe y merece su propia decisión (¿se borra o se marca como histórico?), no un parche de paso.

### 6. Verificar

`pnpm typecheck` (5 paquetes) y `pnpm test`. Los tests no tocan la base — corren contra el volcado, así que deben pasar igual. Y con la base resuelta, abrir la app y confirmar que Inicio, Productos y Movimientos traen datos de verdad.

## Riesgos

- **Si la base no es alcanzable desde tu máquina, el paso 1 no lo arregla ningún cambio de código.** El ADR 0010 asumió explícitamente ese riesgo ("ya no hay demo sin red") y su salida es un Postgres local + `pnpm datos:restaurar`. Si es el caso, te lo digo y decidimos; no voy a inventar un fallback a CSV, que es exactamente lo que el 0010 descartó.
- Borrar `leer-csv.ts` es irreversible sin git, pero está en el historial y no tiene importadores.
