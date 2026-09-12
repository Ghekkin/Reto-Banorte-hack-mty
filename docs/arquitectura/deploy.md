---
estado: construido
verificado: 2026-09-13 08:50 (hora de Monterrey)
---

# Deploy (Coolify en el VPS del equipo)

Cómo se despliega en general está en la skill `desplegar`. Este doc guarda **lo
real**: dónde vive el producto, cómo se entra, qué está arriba y qué falta.

## Para cualquiera

El producto vive en el mismo VPS donde ya corre Coolify (el panel que administra
contenedores con dominio y HTTPS automáticos). Ahí hay un proyecto llamado
`reto-banorte` con, por ahora, una sola pieza encendida: la base de datos Postgres
donde se irán cargando los datos del reto. Cuando existan `apps/web` y `apps/mcp`,
se agregan al mismo proyecto y Coolify los construye desde GitHub.

La demo se sigue presentando desde la máquina del equipo. La versión publicada es el
respaldo y la prueba de que el servidor MCP es real.

Cada deploy deja en el servidor una imagen nueva de la web y otra del MCP, una por
commit. Con cuatro personas empujando, el sábado el disco se llenó y los deploys de la
web dejaron de llegar (issue #15). Desde entonces Coolify revisa **cada hora** y, si el
disco pasa del 80 %, borra las imágenes viejas: de cada app deja la que está corriendo
y las dos anteriores. No toca datos ni volúmenes.

## Técnico

| Dato | Valor |
|---|---|
| Proveedor | VPS propio del equipo (no Vultr todavía; ver premios) |
| IP pública | `157.173.204.174` |
| Panel | Coolify 4.3.19, `https://panel.yolani.co` → proyecto **reto-banorte**, ambiente `production` |
| Dominio | `sslip.io` mientras no haya `.tech` (resuelve a la IP sin comprar nada, y no imita a Banorte) |
| URL web | `https://maya.157.173.204.174.sslip.io` |
| URL MCP | `https://maya-mcp.157.173.204.174.sslip.io/mcp` (health en `/health`) |
| Commit desplegado | el último de `main` que haya pasado el workflow |
| Último deploy | 2026-09-13 08:50 (web + mcp) |
| Cómo entrar | SSH como `root` al VPS; secretos en `/opt/reto/.env` (fuera del repo) |

### Postgres (`postgres-reto-banorte`)

| Dato | Valor |
|---|---|
| Recurso Coolify | uuid `zhgeq67vi28v6bhhgt7zjsul`, contenedor con el mismo nombre, red Docker `coolify` |
| Imagen | `timescale/timescaledb:latest-pg17` (Postgres 17.11 + TimescaleDB 2.30, extensión ya creada) |
| Base / usuario | `reto_banorte` / `reto` |
| Desde fuera | `postgres://reto:<password>@157.173.204.174:5437/reto_banorte` |
| Desde otro contenedor de Coolify | `postgres://reto:<password>@zhgeq67vi28v6bhhgt7zjsul:5432/reto_banorte` |
| Password | En el panel de Coolify (recurso → Configuration) o en `/opt/reto/.env` del VPS |
| Datos persistentes | volumen Docker administrado por Coolify (`zhgeq67vi28v6bhhgt7zjsul-data`) |

Por qué esa imagen: es Postgres 17 normal; TimescaleDB viene encima por si el
equipo decide ir por el premio de Tiger Data (movimientos como series de tiempo).
Con la extensión sin usar, es un Postgres estándar.

Por qué está expuesta en un puerto público: para que cualquiera del equipo pueda
cargar datos desde su máquina sin entrar al VPS. Son datos sintéticos; aun así el
password es largo y aleatorio. Si un juez pregunta, se cierra en un clic en Coolify
(`Make it private`).

**Cortafuegos del VPS.** Docker publica puertos saltándose UFW; lo que manda es la
cadena `DOCKER-USER`, que arma el script `/usr/local/sbin/yolani-docker-firewall.sh`
(servicio `yolani-docker-firewall.service`) con una lista de puertos permitidos y
DROP para todo lo demás. El 5437 está en esa lista desde 2026-09-12 05:35. Cualquier
puerto nuevo que se publique nace cerrado hasta agregarlo ahí y reiniciar el servicio.
Al terminar el hackathon se quita el 5437 de la lista.

Comprobación hecha (2026-09-12 05:24): conexión desde fuera por `157.173.204.174:5437`
y desde la red `coolify` por el alias interno, ambas responden; `create extension
timescaledb` en verde.

### Coolify por API (para scripts)

Token con ability `root` llamado `reto-banorte-agente`, guardado en
`/opt/reto/.env` como `COOLIFY_TOKEN`. API en `http://localhost:8000/api/v1` desde
el VPS. Uuids en el mismo archivo: `COOLIFY_PROJECT_UUID`, `COOLIFY_SERVER_UUID`,
`COOLIFY_DB_UUID`.

```bash
. /opt/reto/.env
curl -s -H "Authorization: Bearer $COOLIFY_TOKEN" $COOLIFY_URL/api/v1/databases/$COOLIFY_DB_UUID | jq .status
```

### Las dos aplicaciones

| | `maya-web` | `maya-mcp` |
|---|---|---|
| uuid Coolify | `pyqpejvneeyxzfvpilj5fcxn` | `a7ld8ya2e0g3ye3pjjlz542f` |
| Dockerfile | `apps/web/Dockerfile` | `apps/mcp/Dockerfile` |
| Puerto | 3000 | 3100 |
| Health | `/api/health` | `/health` |
| Dominio | `https://maya.157.173.204.174.sslip.io` | `https://maya-mcp.157.173.204.174.sslip.io` |

Las dos se construyen **desde la raíz del repo** (`base_directory: /`): el Dockerfile
copia los manifiestos del workspace primero y el código después, para que la capa de
`pnpm install` se reuse entre deploys.

El MCP lleva `db/datos` dentro de la imagen y arranca con el origen `memoria`
(ADR 0007): **el MCP publicado no depende de que Postgres esté arriba**. Su estado
mutable vive en `/datos/estado.json`, fuera del árbol del repo, para que un redeploy
no lo arrastre.

### El disco: limpieza automática de imágenes (issue #15)

Coolify etiqueta una imagen por commit (`<uuid>:<sha>`) y no borra la anterior al
desplegar. El sábado 12:45 el disco (242 GB) llegó a 99 % y la web dejó de desplegarse
(`no space left on device` al exportar la imagen). Tras borrar a mano las imágenes
viejas de las dos apps quedó en 75 %, y desde el **12-sep 13:45** el servidor
`localhost` tiene esta configuración (panel: Servers → localhost → Docker Cleanup):

| Ajuste (`server_settings`) | Antes | Ahora | Por qué |
|---|---|---|---|
| `force_docker_cleanup` | `true` (limpia siempre) | `false` (solo sobre el umbral) | limpiar cuando hace falta, no a ciegas |
| `docker_cleanup_frequency` | `0 0 * * *` (una vez al día) | `0 * * * *` (cada hora) | un día de pushes llenó el disco entre dos limpiezas |
| `docker_cleanup_threshold` | 80 | 80 | con 242 GB, el 80 % deja ~48 GB libres |
| `delete_unused_volumes` | `false` | `false` | en los volúmenes viven datos, también de otros proyectos |
| `delete_unused_networks` | `false` | `false` | |

Cuando le toca y el disco está en 80 % o más, la acción
`App\Actions\Server\CleanupDocker` de Coolify:

- **por aplicación** (`maya-web`, `maya-mcp` y las demás del servidor) conserva la
  imagen que corre y las **2** más recientes (`docker_images_to_keep`, default 2), y
  borra el resto;
- borra imágenes sin usar que no sean de ninguna app de Coolify ni lleven la etiqueta
  `coolify.managed`; una imagen que usa un contenedor no se puede borrar;
- vacía la caché de build (`docker builder prune -af`): **el deploy siguiente a una
  limpieza tarda más**, porque reinstala dependencias sin caché de capas;
- no toca contenedores en marcha, volúmenes ni redes.

Lo que eso implica:

- El rollback desde el panel (Deployments → Redeploy) reusa la imagen solo para las dos
  builds anteriores. A una más vieja, como la del tag `estable`, es **build completa**
  de ese commit: cuenta el tiempo de un deploy entero.
- Cada revisión queda en la tabla `docker_cleanup_executions` (en el panel, la lista de
  ejecuciones debajo del formulario). `No cleanup needed` quiere decir que revisó y el
  disco estaba bajo el umbral.

**Leerla, cambiarla o correrla a mano, por la API** (con el token de `/opt/reto/.env`;
`PATCH /servers/{uuid}` no acepta estos campos, tienen su propia ruta):

```bash
set -a; . /opt/reto/.env; set +a
L="$COOLIFY_URL/api/v1/servers/$COOLIFY_SERVER_UUID/docker-cleanup"
curl -s -H "Authorization: Bearer $COOLIFY_TOKEN" "$L" | jq .                  # ajustes
curl -s -H "Authorization: Bearer $COOLIFY_TOKEN" "$L/executions" | jq '.[:5]' # historial
# revertir a como estaba: una vez al día y siempre
curl -s -X PATCH -H "Authorization: Bearer $COOLIFY_TOKEN" -H "Content-Type: application/json" \
  -d '{"force_docker_cleanup":true,"docker_cleanup_frequency":"0 0 * * *"}' "$L"
```

`POST "$L/run"` la corre en el momento, **sin mirar el umbral**; ese `POST` acepta
`delete_unused_volumes` en el cuerpo y **nunca se le pasa**. El job tiene tope de
10 minutos: la del 10-sep se cortó por tiempo. (El cambio del 12-sep se aplicó con
`php artisan tinker` dentro del contenedor `coolify`, con la misma validación del
formulario, antes de dar con esta ruta; el resultado es el mismo.)

### Cómo se hablan la web y el MCP (y por qué no por la URL pública)

`MCP_URL=http://maya-mcp:3100/mcp`, por la red interna de Docker.

`maya-mcp` es un **alias de red estable** que se le puso a la app del MCP con
`custom_docker_run_options: "--network-alias maya-mcp"`. Hace falta porque el único
alias que Coolify pone por su cuenta es el nombre completo del contenedor **con el
timestamp del deploy** (`a7ld…-131445254133`): el uuid pelado no resuelve, y el nombre
completo cambia cada vez. Aplicarlo requiere un **deploy forzado**; un `restart` no
basta.

**Entre apps del mismo VPS no se usa la URL pública.** Responde desde fuera, pero desde
dentro de un contenedor da *timeout*: es hairpin NAT — un contenedor que sale hacia la
IP pública del propio host no vuelve a entrar por Traefik. Comprobarlo con `curl` desde
tu máquina no prueba que la app pueda usarla; hay que probarlo con
`docker exec <contenedor> curl …`. Ver issue #5.

### Variables de entorno de las apps (cuidado con la API)

Se ponen por API en `POST /api/v1/applications/<uuid>/envs` con
`{key, value, is_preview}`. Dos trampas, las dos pagadas ya:

- **`is_build_time` no es un campo permitido**: si va en el cuerpo, la petición falla
  con `{"message":"Validation failed."}` y **la variable no se crea**. Si mandas la
  salida a `/dev/null`, el fallo es invisible y te enteras cuando la app se comporta
  como si no tuviera configuración (el MCP sin `MCP_TOKEN` deja pasar todo, la web
  emite el `catalogId` de desarrollo).
- **Cada POST crea DOS registros**: uno de producción (`is_preview: false`) y otro de
  preview (`is_preview: true`), con uuid distinto. **No son duplicados y no se borran.**
  Si ves la lista con la clave repetida, mira `is_preview` antes de tocar nada: borrar
  "el duplicado" a ciegas puede dejarte sólo la de preview, que **no se inyecta al
  contenedor de producción** — y la app arranca sin configuración, en silencio.

Regla: después de tocar variables por API, `GET` la lista y revisar `is_preview` de cada
una, no sólo los nombres.

Y un cambio de variables **no llega solo**. Peor: si el commit no cambió, un `deploy`
tampoco lo aplica — Coolify ve el mismo sha y no recrea el contenedor, así que el
script ve el `/health` correcto y canta victoria con la configuración vieja dentro.
Para aplicar variables sin commit nuevo:
`POST /api/v1/applications/<uuid>/restart`.

Cómo comprobar que de verdad llegaron, sin creerle a nadie:

```bash
docker exec $(docker ps --format '{{.Names}}' | grep <uuid-de-la-app>) env | grep MCP_TOKEN
```

### Acceso al repo privado

Deploy key **de solo lectura** `coolify-maya`, par generado en el VPS:

| | |
|---|---|
| Privada | `/opt/reto/llaves/maya-deploy-key` (uuid en Coolify `m3qbxk5ja6h52kcrtkawsjcg`) |
| Pública | dada de alta en GitHub → Settings → Deploy keys, sin permiso de escritura |

### GitHub Actions

`.github/workflows/ci-y-deploy.yml`. Dos trabajos:

1. **`verificar`** (todo push y todo PR): `pnpm install`, comprueba que
   `catalogo.json` no esté desfasado de los schemas, `typecheck`, `test`,
   `build` de la web y `scripts/humo.sh` contra el MCP levantado en el runner.
2. **`desplegar`** (solo `main`, y solo si el anterior pasó): corre
   `scripts/deploy.sh`, que dispara el deploy de las dos apps por la API de Coolify
   (con reintentos: el panel devuelve 502 de vez en cuando) y espera a que los dos
   `/health` **devuelvan el commit que se está publicando** — el contenedor viejo
   responde igual, así que esperar "algo vivo" daba por bueno un deploy a medias.
   Por eso los dos `/health` traen el campo `commit`, que sale del `SOURCE_COMMIT`
   que Coolify inyecta al construir y finalmente **manda un prompt del guion a la URL
   pública**.

   Ese último paso clasifica **tres desenlaces**, porque "no salió una pantalla" tiene dos
   causas muy distintas y antes las trataba igual:

   | Lo que devuelve el stream | Qué hace el workflow |
   |---|---|
   | mensajes `a2ui` | **pasa**, y lista los componentes que el agente construyó |
   | `error { codigo: "modelo" }` | **avisa y sigue**: la app llegó al proveedor y reportó el fallo con honestidad. Sin cuota o con el proveedor caído, el deploy no está roto |
   | cualquier otra cosa, o el stream sin `fin` | **falla**: el contrato del stream se rompió, o el problema es nuestro |

   El 2026-09-12 el tope de gasto de Gemini (50 MXN al mes, issue #12) dejó este paso en
   rojo en cada push: el deploy se publicaba igual y ese rojo permanente **tapaba** si algo
   más se rompía. Un CI que no distingue lo externo de lo propio deja de servir como señal.
   El aviso sale con título en el resumen del run y dice explícitamente que el agente
   publicado no está construyendo pantallas, para que nadie lea el verde como "la demo
   funciona".

Secretos y variables del repo (`gh secret list`, `gh variable list`):

| Nombre | Tipo | Qué es |
|---|---|---|
| `COOLIFY_URL` | secret | `https://panel.yolani.co` |
| `COOLIFY_TOKEN` | secret | Token **limitado a `deploy` + `read`**, no root (ver abajo) |
| `COOLIFY_APP_WEB_UUID`, `COOLIFY_APP_MCP_UUID` | secret | Los uuid de arriba |
| `URL_WEB_PUBLICA`, `URL_MCP_PUBLICA` | variable | Para los healthchecks y el smoke test |

**El token de Actions no es el token root.** Se creó uno aparte,
`maya-github-actions` (id 14), con abilities `["deploy","read"]`: puede disparar
deploys y leer, y responde 403 si intenta crear o borrar recursos. El token root
`reto-banorte-agente` se queda en `/opt/reto/.env` del VPS y nunca sale de ahí — el
mismo Coolify administra la producción de otro proyecto, y un token root en un repo
de hackathon es poder de más.

### Verificado desde fuera del VPS (2026-09-13 09:15)

```
https://maya.157.173.204.174.sslip.io/api/health
  {"ok":true,"servicio":"maya-web","version":"0.1.0","commit":"9d546d5…"}
https://maya-mcp.157.173.204.174.sslip.io/health
  {"ok":true,"servicio":"maya-mcp","origenDatos":"memoria","tools":["consultar_perfil"]}
https://maya.157.173.204.174.sslip.io/catalogo/v1.json    → el catálogo, abrible por un juez
POST …/api/agente                                          → stream JSONL con mensajes A2UI,
                                                              con el catalogId público real
POST …/mcp sin Authorization                               → 401
POST …/mcp con el MCP_TOKEN                                → lista las tools
```

Los dos certificados son de **Let's Encrypt** (emitidos el 12-sep, vencen el 11-dic),
no autofirmados: `curl` sin `-k` funciona.

**Cuidado con `sslip.io`**: no está en la Public Suffix List, así que todos sus
subdominios comparten el límite de Let's Encrypt (50 certificados nuevos por semana,
para todo el mundo que use sslip.io). Esta vez emitió; no está garantizado que emita
la próxima. Es la razón de peso para mover esto al dominio `.tech` en cuanto exista,
además del premio.

### Pendiente

- [ ] Dominio `.tech` cuando se compre: se agrega en Coolify (Configuration →
      Domains) y se actualizan las variables `URL_*` del repo. HTTPS lo hace Traefik.
- [ ] Llave de Gemini en las variables de `maya-web`
      (`GOOGLE_GENERATIVE_AI_API_KEY`): hoy está vacía y el agente publicado responde
      con la pantalla de ejemplo. Se pone en Coolify (app → Environment Variables);
      no hace falta redeploy, Coolify reinicia el contenedor.
- [x] `https://maya-mcp.…/mcp` **pide token**: sin `Authorization` responde 401, con
      el `MCP_TOKEN` de `/opt/reto/.env` lista las tools. Verificado 2026-09-13 09:55
      desde fuera del VPS.
- [ ] Probarlo además desde un cliente MCP de verdad (Claude Desktop o el inspector),
      no sólo con `curl`.
- [ ] Decidir si Vultr entra (premio) o si se queda todo en este VPS.

## Entre apps del VPS: alias de red, nunca la IP pública

Dos reglas que costaron un rato y una caída de producción (issue #5):

1. **Desde dentro de un contenedor, la IP pública del propio VPS no es alcanzable.** Es
   hairpin NAT: el paquete sale por el bridge de Docker y no vuelve a entrar por Traefik.
   Así que `curl` a la URL pública desde tu máquina **no prueba** que la app pueda usarla.
   Entre apps del mismo servidor se usa el nombre interno.
2. **El alias de red se pone en `custom_network_aliases`**, no en
   `custom_docker_run_options`. La opción `--network-alias maya-mcp` en el segundo campo
   estuvo puesta dos deploys y no se aplicó nunca; con el primero, el siguiente deploy sí:

   ```bash
   curl -X PATCH "$COOLIFY_URL/api/v1/applications/$COOLIFY_APP_MCP_UUID" \
     -H "Authorization: Bearer $COOLIFY_TOKEN" -H 'content-type: application/json' \
     -d '{"custom_network_aliases":"maya-mcp"}'
   ```

   Requiere un **deploy** (un `restart` no lo aplica). Se comprueba con
   `docker inspect <contenedor> --format '{{range .NetworkSettings.Networks}}{{.Aliases}}{{end}}'`:
   el alias tiene que estar junto al nombre largo.

Con eso, `MCP_URL=http://maya-mcp:3100/mcp` en la app de la web — **en las dos filas de la
variable**, producción y preview, porque Coolify guarda un par por variable y el contenedor
puede arrancar con cualquiera de las dos.

La URL pública del MCP (`https://maya-mcp.…/mcp`) sigue siendo la buena para el mundo: exige
`Authorization: Bearer` (401 sin token) y es la que se le da a un juez que quiera conectar su
propio cliente MCP.

