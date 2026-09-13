---
verificado: 2026-09-13 15:50 (hora de Monterrey)
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

**Los datos viven en PostgreSQL** (esquema `banorte`), no en el repo. Desde el
ADR 0010 no hay CSV: la base es la única fuente, y el MCP no arranca sin ella.

| Ruta | Qué es |
|---|---|
| PostgreSQL, esquema `banorte` | **Las 22 tablas con los datos.** La fuente de verdad |
| `db/schema.sql` | DDL: 22 tablas, FKs, `CHECK` de negocio, índices |
| `db/migraciones/*.sql` | Cambios al esquema, en orden y idempotentes (`pnpm datos:migrar`) |
| `db/reiniciar.sql` | Deja la demo limpia entre ensayos (equivalente SQL de `pnpm reiniciar-estado`) |
| `apps/mcp/src/datos/postgres.ts` | Lo único que habla con la base: carga el esquema a memoria al arrancar |
| `apps/mcp/src/datos/estado.ts` | El estado mutable: `banorte.acciones_aplicadas` |
| `apps/web/src/lib/datos/tablas.ts` | El lector de la web, contra la misma base |
| `apps/mcp/src/__tests__/datos-de-prueba.json` | Volcado para las pruebas. **No es la fuente**: es material de prueba y respaldo |
| `scripts/volcar-fixture.mjs` | Regenera ese volcado desde la base (`pnpm datos:fixture`) |
| `scripts/restaurar.mjs` | Repuebla la base desde el volcado (`pnpm datos:restaurar`) |
| `scripts/migrar.mjs` | Aplica las migraciones |

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

### Convenciones de los datos

- **Montos enteros en centavos** (`BIGINT`), columna `moneda` = `MXN`.
- Porcentajes `NUMERIC(7,4)` en decimal: `0.4890` es 48.90 %.
- Fechas `YYYY-MM-DD`. Los ids son legibles y estables (`usr_ana`, `mov_001869`,
  `cred_beto_tdc`), nunca UUID: en la demo se leen en voz alta.
- CLABE de 18 dígitos que empieza en `000` (rango inexistente en el catálogo del Banco de
  México), tarjetas enmascaradas `•••• 4821`, RFC y CURP con patrón visiblemente falso.

### Invariantes que sostienen la demo

Varias las sostiene el `CHECK` del propio esquema; las que no, viven como pruebas del
dominio en `apps/mcp/src/__tests__/`:

1. **El saldo de cada cuenta cuadra con sus movimientos.** `saldo_posterior_centavos`
   encadena movimiento a movimiento y el último coincide con `cuentas.saldo_centavos`.
   Si esto falla, el encabezado de la cuenta y la tabla de movimientos se contradicen en
   la misma pantalla.
2. **Toda tabla de amortización cierra en cero**, y `creditos.saldo_insoluto_centavos`
   es exactamente el saldo que la tabla deja tras los pagos ya realizados. Además, la fila del
   crédito y su tabla cuentan la misma historia: `pagos_realizados` es el número de filas
   `pagado`, `fecha_proximo_pago` es la primera sin pagar, un crédito sin días de mora no tiene
   filas `vencido`, y `buro.deuda_total_centavos` es la suma de los saldos insolutos
   (`integridad-creditos.spec.ts`). La hipoteca de Carmen lo rompía hasta la migración 0009
   (issue #24).
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
pnpm datos:migrar      # aplica db/migraciones/*.sql; idempotente, se puede repetir
pnpm datos:fixture     # regenera el volcado de pruebas desde la base
pnpm datos:restaurar   # repuebla la base desde el volcado si quedara vacia
pnpm reiniciar-estado  # vacia banorte.acciones_aplicadas: ANTES de cada ensayo
```

La conexión sale de `DATABASE_URL` en `.env` (ver `.env.example`). Ninguno de estos
scripts imprime la URL de conexión.

### El generador ya no existe

Los datos se generaron una vez con un script determinista y hoy viven en la base. El
generador y los validadores de CSV se retiraron con el ADR 0010: mantener dos fuentes
—archivos y base— fue justo lo que hizo que durante un día entero nadie notara que el
producto no estaba leyendo la base.

Lo que queda en su lugar: el volcado del repo es el respaldo del contenido, y
`pnpm datos:restaurar` lo devuelve a la base. Si algún día hay que **cambiar** los datos,
se cambian en la base (con una migración si toca el esquema) y se regenera el volcado.

### Lo que esto cuesta, dicho claro

**Ya no hay demo sin red.** Con los CSV en el repo, `pnpm dev` funcionaba en un avión;
ahora, si la base no responde, el MCP no levanta —a propósito, porque un servidor que
contesta sin datos se descubre en la demo—. El plan si el stand no tiene red fiable es
levantar un Postgres local y `pnpm datos:restaurar`, **y eso hay que ensayarlo antes**,
no descubrirlo el domingo. Está en el ADR 0010 y en el checklist de demo.

### Casos límite conocidos

- **La base es una dependencia dura.** Sin `DATABASE_URL` alcanzable no arranca el MCP
  ni la web muestra datos. Verificado el 2026-09-13: 22 tablas y 3 690 filas en el
  esquema `banorte`, y el ciclo completo (lectura, acción y reinicio) contra esa base.
  El respaldo es el volcado del repo: `pnpm datos:restaurar`.
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
