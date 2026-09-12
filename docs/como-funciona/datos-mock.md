---
verificado: 2026-09-12 09:40
estado: construido
---

# Datos mock

## Para cualquiera

Todo lo que el agente va a mostrar en la demo son datos inventados de tres clientes que
no existen. No hay ninguna conexión con un banco real: no hay APIs, no hay cuentas
reales, no hay dinero. Lo que sí hay es un año entero de historia financiera para cada
uno de los tres, construida para que se sienta real y para que cada pregunta que le
hagamos al agente tenga una respuesta interesante.

Son tres personas porque la gracia de la demo es que **la misma pregunta produce una
pantalla distinta según a quién se le pregunte**:

- **Ana**, 28 años, diseñadora. Gana bien y no le falta nada, pero se le va todo: no
  ahorra de forma sistemática, tiene siete suscripciones y su colchón de emergencia no
  le alcanzaría ni dos meses. Si le preguntas "¿en qué se me fue el dinero?", la
  respuesta útil son sus hábitos.
- **Beto**, 41 años, dos hijos en escuela privada. Trae la tarjeta de crédito al 97 %
  de su límite, lleva doce días de atraso y cada mes paga el mínimo, que apenas cubre
  los intereses. La misma pregunta, en su caso, tiene que llevar a un plan para salir
  de la deuda.
- **Carmen**, 52 años, arquitecta independiente. Ingresos altos pero irregulares,
  patrimonio invertido, hipoteca y auto al corriente. La atiende un ejecutivo de cuenta,
  y a ella el agente no le habla de gastos sino de su portafolio: qué tan lejos está de
  la mezcla que le corresponde por su perfil de riesgo.

La historia de cada uno está en sus movimientos, no en una etiqueta: si sumas lo que le
entra y lo que le sale a Beto mes con mes, ves que no le cierra. Ese detalle es lo que
hace que un juez crea lo que está viendo, y por eso los tres perfiles están calibrados
para que su flujo de dinero cuadre.

Los datos viven en 22 archivos de texto dentro del repositorio, y de ahí se cargan a una
base de datos. Se generan con un programa que siempre produce exactamente lo mismo, así
que nadie va a ver cifras distintas a las del ensayo.

## Técnico

### Dónde vive

| Ruta | Qué es |
|---|---|
| `db/datos/*.csv` | Los 22 archivos. **Son la fuente de verdad** y se commitean |
| `db/schema.sql` | DDL: 22 tablas, FKs, `CHECK` de negocio, índices |
| `db/cargar.sql` | Los 22 `\copy` en orden de dependencia + conteo final (**necesita psql**) |
| `db/cargar-completo.sql` | Generado: esquema + 3 690 `INSERT` en un solo archivo, 641 KB |
| `db/reiniciar.sql` | Deja la demo limpia entre ensayos |
| `scripts/cargar-postgres.mjs` | Cargador con el driver `pg`: crea el esquema y sube los CSV |
| `scripts/generar-sql-completo.mjs` | Produce `db/cargar-completo.sql` |
| `scripts/generar-datos.mjs` | Generador determinista |
| `scripts/lib/catalogos.mjs` | Catálogos escritos a mano (categorías, comercios, productos, instrumentos, modelos) |
| `scripts/lib/perfiles.mjs` | Los tres perfiles, sus cuentas, tarjetas y patrones de gasto |
| `scripts/lib/finanzas.mjs` | Amortización, CAT, pago mínimo, ofertas de reestructura |
| `scripts/validar-datos.mjs` | Integridad referencial y de negocio |
| `scripts/verificar-orden-columnas.mjs` | Orden de columnas del CSV contra `schema.sql` |

### Los 22 archivos

**Núcleo** — `usuarios` (3), `cuentas` (10), `tarjetas` (4).

**Banca personal** — `categorias` (18), `comercios` (53), `movimientos` (2 265),
`suscripciones` (15).

**Crédito** — `productos_credito` (8), `creditos` (5), `amortizaciones` (348),
`planes_reestructura` (7), `buro` (3).

**Inversiones** — `instrumentos` (16), `perfiles_inversion` (3), `modelos_portafolio` (24),
`portafolios` (2), `posiciones` (16), `precios_historicos` (848).

**Educación financiera** — `metas` (5), `topes_gasto` (4), `diagnostico_habitos` (33).

**Estado mutable** — `acciones_aplicadas` (0, solo encabezado).

Total 3 690 filas. **Pagos y Seguros no están** en esta tanda y sus tablas no existen
todavía; el motivo está en el ADR 0007.

### Los tres perfiles

| Id | Nombre | Ingreso/mes | Deuda | Puntaje de salud | Hábito que detecta el diagnóstico |
|---|---|---|---|---|---|
| `usr_ana` | Ana Sofía Treviño Cantú | $32,000 fijo | $55,783 | 74/100 | Fondo de emergencia menor a 3 meses |
| `usr_beto` | Alberto Ramírez Solís | $34,500 fijo | $76,927 | 39/100 | Tarjeta al 97 % de su límite |
| `usr_carmen` | Carmen Elizondo Wong | $115,124 variable | $1,580,516 | 85/100 | Hábitos sanos |

El escenario del ejecutivo de cuenta se apoya en `perfiles_inversion.ejecutivo`: Carmen
tiene asignada una ejecutiva, Ana y Beto son autoservicio (`NULL`).

Beto tiene perfil de inversión pero **no tiene portafolio**, a propósito: es el caso en
que el agente debe decir "primero salgamos de la deuda" en lugar de ofrecer un producto.

### Convenciones de los CSV

- UTF-8 sin BOM, encabezado en la primera línea, separador `,`, comillas dobles solo
  cuando el valor las necesita, `NULL` como campo vacío, booleanos `true`/`false`.
- **Montos enteros en centavos** (`BIGINT`), columna `moneda` = `MXN`.
- Porcentajes `NUMERIC(7,4)` en decimal: `0.4890` es 48.90 %.
- Fechas `YYYY-MM-DD`. Los ids son legibles y estables (`usr_ana`, `mov_001869`,
  `cred_beto_tdc`), nunca UUID: en la demo se leen en voz alta.
- CLABE de 18 dígitos que empieza en `000` (rango inexistente en el catálogo del Banco de
  México), tarjetas enmascaradas `•••• 4821`, RFC y CURP con patrón visiblemente falso.

### Invariantes que sostienen la demo

Cada una la verifica `scripts/validar-datos.mjs`, y varias además el `CHECK` del schema:

1. **El saldo de cada cuenta cuadra con sus movimientos.** `saldo_posterior_centavos`
   encadena movimiento a movimiento y el último coincide con `cuentas.saldo_centavos`.
   Si esto falla, el encabezado de la cuenta y la tabla de movimientos se contradicen en
   la misma pantalla.
2. **Toda tabla de amortización cierra en cero**, y `creditos.saldo_insoluto_centavos`
   es exactamente el saldo que la tabla deja tras los pagos ya realizados.
3. **El pago mínimo de cada tarjeta sigue la misma fórmula** que usa el simulador de
   reestructura, para que la UI no muestre un mínimo y el comparador otro.
4. **Los pesos objetivo de cada perfil suman 1**, y los pesos reales de cada portafolio
   también.
5. **`instrumentos.precio_actual_centavos` es el último cierre** de
   `precios_historicos`, para que la gráfica y la posición no se contradigan.
6. **El canal de pago es coherente con el giro del comercio**: no hay un Mercado Libre
   pagado en efectivo.
7. **El flujo de caja de cada perfil cuadra**: el saldo inicial que se deduce de la
   serie nunca es negativo ni desproporcionado frente al ingreso.
8. **Los datos sembrados llevan prefijo `_base_`**; lo que no lo lleve, `reiniciar.sql`
   lo borra.

### Cómo se usa

```bash
node scripts/generar-datos.mjs             # regenera los 22 CSV (determinista)
node scripts/validar-datos.mjs             # integridad; sale con codigo 1 si algo falla
node scripts/verificar-orden-columnas.mjs  # orden de columnas vs. schema.sql
```

### Las tres rutas para cargar a PostgreSQL

Son equivalentes; se usa la que el entorno permita. La conexión sale de
`POSTGRE_BANORTE_URL` en `.env`.

**1. Node con el driver `pg`** — no necesita psql. Es la ruta por omisión:

```bash
npm install
node scripts/cargar-postgres.mjs --inspeccionar   # solo reporta, no toca nada
node scripts/cargar-postgres.mjs                 # crea el esquema y carga
node scripts/cargar-postgres.mjs --recrear       # DESTRUCTIVO: tira el esquema y lo rehace
node scripts/cargar-postgres.mjs --reiniciar     # antes de cada ensayo
```

Aborta si el esquema `banorte` ya existe y no le pasas `--recrear`, carga los 22 archivos
en **una sola transacción** (o entran todos o ninguno) y al final compara el conteo de cada
tabla contra su CSV. Nunca imprime la URL de conexión.

**2. psql**, si lo tienes instalado. Correr desde la raíz del repo:

```bash
psql "$POSTGRE_BANORTE_URL" -f db/schema.sql
psql "$POSTGRE_BANORTE_URL" -f db/cargar.sql
psql "$POSTGRE_BANORTE_URL" -f db/reiniciar.sql
```

**3. Un solo archivo SQL**, cuando no puedes alcanzar el puerto desde donde trabajas. Es la
ruta de escape: se corre desde el propio servidor o se pega en una consola SQL web.

```bash
node scripts/generar-sql-completo.mjs        # regenera db/cargar-completo.sql
psql "$POSTGRE_BANORTE_URL" -f db/cargar-completo.sql
```

La demo **no depende** de correr el generador: los CSV están commiteados. Y no depende del
Postgres: con `FEATURE_POSTGRES` apagado la capa de datos lee los mismos CSV en memoria
(ADR 0007).

**Cuidado al agregar una columna.** La ruta 2 usa `\copy` con `HEADER true`, que ignora los
nombres del encabezado y mapea **por posición**: si el orden del CSV y el de la tabla no
coinciden, no hay error de "columna desconocida", los datos entran en la columna
equivocada. Por eso existe `verificar-orden-columnas.mjs`. Las rutas 1 y 3 no tienen ese
riesgo porque escriben la lista de columnas explícita.

La demo **no depende** de correr el generador: los CSV están commiteados. Y no depende
del Postgres: con `FEATURE_POSTGRES` apagado la capa de datos lee los mismos CSV en
memoria (ADR 0007).

### Casos límite conocidos

- **Al 2026-09-12 10:15 los datos no están cargados en el PostgreSQL remoto.** El puerto
  5437 de `157.173.204.174` no acepta conexión desde la máquina de desarrollo (timeout de
  red, no de autenticación). Ver `docs/issues/2026-09-12-postgres-remoto-inalcanzable.md`.
  Los 22 CSV y `db/cargar-completo.sql` sí están listos.
- **El mes en curso está a medias.** La demo corre con `HOY = 2026-09-12`, así que
  septiembre solo tiene movimientos hasta el día 12. `diagnostico_habitos` cubre los 11
  meses cerrados y **excluye el mes en curso** a propósito: con medio mes de ingreso, el
  cálculo dispara falsas alarmas del tipo "gastas más de lo que ingresas".
- **El saldo de la tarjeta de Beto es una foto, no una serie.** Sus cargos de interés y
  el abono del pago mínimo sí están en el historial, pero el interés se registra con un
  monto aproximado con variación en vez de recalcularse sobre el saldo vivo de cada mes.
  Para las pantallas de la demo es indistinguible; para un simulador de amortización
  revolvente no alcanzaría.
- **`HOY` es fijo.** Si dependiera de la fecha del sistema, los saldos, las moras y los
  puntajes cambiarían entre ensayos.

### Algoritmos involucrados

- `docs/algoritmos/generacion-de-datos.md` — patrones, estacionalidad, anomalías,
  calibración del flujo, puntaje de salud financiera.
- `docs/algoritmos/amortizacion.md` — mensualidad, tabla de amortización, CAT por TIR,
  escenario de pago mínimo y cálculo del ahorro de una reestructura.
