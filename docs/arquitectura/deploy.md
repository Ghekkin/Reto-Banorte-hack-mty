---
estado: construido
verificado: 2026-09-12
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
| Dominio | (pendiente, `.tech`, no imita a Banorte) |
| URL web | — (apps/web aún no existe) |
| URL MCP | — (apps/mcp aún no existe) |
| Commit desplegado | — |
| Último deploy | 2026-09-12 05:23 (solo Postgres) |
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

### Pendiente

- [ ] `apps/web` y `apps/mcp` como aplicaciones del proyecto `reto-banorte` (build
      desde `Ghekkin/Reto-Banorte-hack-mty`, repo privado: hay que dar acceso a
      Coolify con una GitHub App o deploy key; la que existe, `Public GitHub`, solo
      sirve para repos públicos).
- [ ] Dominio `.tech` apuntando al VPS y HTTPS por Traefik (Coolify lo hace solo).
- [ ] `MCP_TOKEN` en producción; `/mcp` sin token responde 401.
- [ ] Decidir si Vultr entra (premio) o si se queda todo en este VPS.
