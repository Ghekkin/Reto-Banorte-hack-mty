# La API REST de lectura: los datos de la app por HTTP

## Para cualquiera

La app tiene cinco pantallas y cada una necesita datos: tu saldo, tus tarjetas, tus
movimientos. Esas pantallas los piden por dentro, sin pasar por internet, porque se
arman en el servidor.

Esta API existe para **los de fuera**. Si alguien —un juez con `curl`, un compañero con
Postman, otro programa— quiere ver exactamente los mismos números que muestra la
pantalla, aquí los pide, con una dirección web y una respuesta en JSON.

Cinco direcciones, una por cada cosa que alguien querría preguntar:

| Pregunta | Dirección |
|---|---|
| ¿Qué personas hay en la demo? | `GET /api/usuarios` |
| ¿Cómo está parada esta persona? (lo de Inicio) | `GET /api/panorama?usuario=usr_beto` |
| ¿Qué productos tiene? | `GET /api/productos?usuario=usr_beto` |
| ¿En qué se le va el dinero? | `GET /api/movimientos?usuario=usr_beto` |
| ¿Quién es y cuánto debe? | `GET /api/perfil?usuario=usr_beto` |

Dos cosas que sorprenden a quien la usa por primera vez:

- **Los montos vienen en centavos, como enteros.** Un `281940` son $2,819.40. Se hace así
  en todo el proyecto para que no exista un solo redondeo de dinero flotando: quien pinta
  el número decide cómo se ve.
- **Esta API solo lee.** No hay forma de aplicar un plan de pago ni cancelar una
  suscripción por aquí. Eso pasa por el agente y el servidor MCP, que llevan una llave de
  idempotencia para que un reintento no cobre dos veces.

## Detalle técnico

### Dónde vive

| Pieza | Archivo |
|---|---|
| Helpers comunes (validación, respuestas, señal de vida) | `apps/web/src/lib/api/comun.ts` |
| `GET /api/usuarios` | `apps/web/src/app/api/usuarios/route.ts` |
| `GET /api/panorama` | `apps/web/src/app/api/panorama/route.ts` |
| `GET /api/productos` | `apps/web/src/app/api/productos/route.ts` |
| `GET /api/movimientos` | `apps/web/src/app/api/movimientos/route.ts` |
| `GET /api/perfil` | `apps/web/src/app/api/perfil/route.ts` |

Todas son `runtime = "nodejs"` (necesitan `pg`) y `dynamic = "force-dynamic"` (los datos
cambian con las acciones de la demo, no se prerenderizan).

### Las páginas NO consumen esta API

Es la decisión de diseño que más conviene entender. Inicio, Productos, Movimientos y Más
son **componentes de servidor** y llaman `lib/datos/consultas.ts` directo:

```
page.tsx (servidor) ──→ consultas.ts ──→ tablas.ts ──→ PostgreSQL
                             ↑
GET /api/panorama ──→ route.ts ─┘
  (consumidores externos)
```

Un componente de servidor pidiéndose a sí mismo por HTTP agregaría un salto de red por
render, obligaría a construir una URL absoluta, perdería la deduplicación de `cache` de
React, y en `next build` una ruta prerenderizada intentaría llamar a un servidor que
todavía no escucha. Las dos rutas comparten la misma capa (`consultas.ts`), así que no hay
lógica duplicada: lo único que la API agrega es la envoltura HTTP.

### Parámetros

| Ruta | Parámetro | Por omisión | Tope |
|---|---|---|---|
| todas menos `/api/usuarios` | `usuario` | **obligatorio** | — |
| `/api/panorama` | `recientes` | 6 | 50 |
| `/api/movimientos` | `limite` | 300 (`TOPE_MOVIMIENTOS`) | 1000 |
| `/api/movimientos` | `categoria` | sin filtro | — |

Los topes no son decoración: sin ellos un `?limite=999999` pone a la ruta a serializar
todo el historial en cada llamada. Un valor por encima del tope **no es un error**, se
recorta y la respuesta dice en `limite` qué se aplicó de verdad.

### Códigos de estado

| Código | Cuándo | Cuerpo |
|---|---|---|
| `200` | Todo bien | Los datos |
| `400` | Falta `usuario` | `{ error, usuariosValidos }` |
| `404` | `usuario` no existe, o `categoria` que esa persona no usa | `{ error, usuariosValidos }` / `{ error, categoriasValidas }` |
| `503` | La base no responde o está sin poblar | `{ error, revisa: [...] }` |

Los errores llevan la lista de valores válidos a propósito: quien llama descubre los ids
correctos sin abrir el repo ni preguntar en el chat.

Un `usuario` inválido se rechaza **contra `lib/usuarios.ts`, no contra la base**. Los tres
ids demo son conocidos y están en código; validar antes de consultar evita que la ruta sea
un probador de ids gratis.

### El 503 y por qué hace falta

`lib/datos/tablas.ts` **se traga los errores de conexión y devuelve `[]`**. Para las
pantallas eso se decidió a propósito (muestran su estado vacío y la app no se cae), pero
para una API es inaceptable: quien consume no puede distinguir "esta persona no tiene
movimientos" de "la base está muerta", y se llevaría un `200` con arreglos vacíos creyendo
que es la verdad.

Por eso cada ruta llama `baseSinDatos()` antes de contestar, que consulta
`banorte.usuarios`: en una base sana siempre tiene los tres perfiles. Si sale vacía, o la
base no responde o está sin poblar —y los dos casos se arreglan igual, revisando
`DATABASE_URL` y corriendo `pnpm datos:restaurar`.

### Sin autenticación, a propósito

Los datos son sintéticos: tres perfiles inventados, cero conexión con sistemas reales
(ADR 0007, ADR 0010). Es un prototipo de hackathon y la API es de solo lectura sobre datos
que no existen.

**Si algún día hay un dato real detrás, esto necesita token antes de desplegarse.** El MCP
ya tiene el patrón (`MCP_TOKEN`, `Authorization: Bearer`), así que sería copiarlo.

### Probarla

```bash
curl "http://localhost:3000/api/usuarios"
curl "http://localhost:3000/api/panorama?usuario=usr_beto"
curl "http://localhost:3000/api/productos?usuario=usr_carmen"
curl "http://localhost:3000/api/movimientos?usuario=usr_beto&categoria=cat_super&limite=50"
curl "http://localhost:3000/api/perfil?usuario=usr_ana"
```

Comprobado contra el servidor de desarrollo: las cinco en `200`, `400` sin `usuario`,
`404` con `usr_inventado` y con `cat_no_existe`, y `?limite=999999` recortado a 1000 sobre
un total de 683 movimientos de Beto. El portafolio de Beto sale `null`, que **no es un
error**: no invierte, y está puesto así a propósito.

Desde el 2026-09-12 13:00 cada elemento de `tarjetas` (en `/api/productos` y
`/api/panorama`) trae además `cuentaId`, `tasaAnual`, `cat`, `fechaCorte`,
`fechaLimitePago` y `pagoNoInteresesCentavos`, que la pantalla de Productos necesita. Es
un cambio aditivo: nada de lo que había cambió de nombre ni de forma.
