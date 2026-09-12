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

## Técnico

| Dato | Valor |
|---|---|
| Proveedor | VPS propio del equipo (no Vultr todavía; ver premios) |
| IP pública | `157.173.204.174` |
| Panel | Coolify 4.3.18, `https://panel.yolani.co` → proyecto **reto-banorte**, ambiente `production` |
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

La web habla con el MCP por la red interna de Docker
(`MCP_URL=http://a7ld8ya2e0g3ye3pjjlz542f:3100/mcp`), no por internet.

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
   `scripts/deploy.sh`, que dispara el deploy de las dos apps por la API de Coolify,
   espera los dos `/health` y finalmente **manda un prompt del guion a la URL pública**
   y verifica que la respuesta traiga mensajes A2UI. Si eso falla, el workflow falla.

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
POST …/api/agente                                          → stream JSONL con mensajes A2UI
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
- [ ] Probar `https://maya-mcp.…/mcp` desde un cliente MCP externo con el
      `MCP_TOKEN` (está en `/opt/reto/.env`).
- [ ] Decidir si Vultr entra (premio) o si se queda todo en este VPS.
