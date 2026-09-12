---
name: desplegar
description: Cómo desplegar apps/web y apps/mcp a un servidor (Vultr) con HTTPS y dominio, variables de entorno fuera del repo, healthchecks y script de despliegue repetible; y cuándo NO desplegar. Invocar cuando el rol demo decida publicar, y antes de cada redeploy.
---

# Desplegar

Dueño: rol `demo`. El deploy da dos cosas: una URL pública del MCP a la que un juez
puede conectar su propio cliente, y el premio de Vultr/.Tech. **No sustituye a la
demo local**: se presenta desde la máquina del equipo; la URL es el respaldo y la
prueba de que es real.

## Arquitectura real (construida 2026-09-13)

Todo vive en el **VPS del equipo** (`157.173.204.174`), administrado con **Coolify**
(panel `https://panel.yolani.co`, proyecto `reto-banorte`). Coolify construye cada
app desde GitHub con su Dockerfile, le pone dominio y HTTPS con Traefik, y corre el
Postgres. Están arriba las tres piezas: `maya-web`, `maya-mcp` y el Postgres. Lo real (uuids,
dominios, deploy key, cómo entrar) está en `docs/arquitectura/deploy.md`. Vultr queda
solo como premio lateral.

```
https://maya.157.173.204.174.sslip.io       → apps/web  :3000  health /api/health
https://maya-mcp.157.173.204.174.sslip.io   → apps/mcp  :3100  health /health, MCP en /mcp
postgres-reto-banorte                        → Postgres :5432 interno, :5437 público
```

Cada app tiene su `Dockerfile` (se construyen **desde la raíz del repo**) y su
`/health`. Coolify clona el repo privado con la deploy key `coolify-maya`, de solo
lectura.

## Nadie despliega a mano

**El deploy lo dispara GitHub Actions**, no una persona:
`.github/workflows/ci-y-deploy.yml` verifica todo push (typecheck, tests, build, humo
del MCP y que `catalogo.json` no esté desfasado) y, si el push fue a `main`, corre
`scripts/deploy.sh`. Al final manda un prompt del guion a la URL pública y **exige
mensajes A2UI en la respuesta**: un deploy que arranca pero no contesta cuenta como
fallido.

`scripts/deploy.sh` también se puede correr a mano desde el VPS (lee
`/opt/reto/.env`). Es el mismo camino, sin pasar por GitHub.

**El token de Coolify que vive en GitHub no es el root**: es `maya-github-actions`,
con abilities `["deploy","read"]`. Si alguna vez hace falta crear o borrar un recurso
por API, eso se hace desde el VPS con el token root, nunca desde Actions.

## Reglas

- **Los secretos viven en Coolify** (variables de cada app) y en `/opt/reto/.env` del
  VPS, nunca en el repo ni en el script.
- **`scripts/deploy.sh`** dispara el deploy por la API de Coolify
  (`POST /api/v1/deploy?uuid=...`; el `GET` responde 405 desde Coolify 4.3) y espera los `/health` hasta 5 minutos. Si no
  responden, falla ruidosamente y **no hace rollback solo**: la versión anterior sigue
  sirviendo hasta que el contenedor nuevo pase su healthcheck, y el rollback a una
  build anterior se hace desde el panel (Deployments → la que funcionaba → Redeploy).
- **Se despliega lo que entra a `main`**, porque el workflow corre ahí. La etiqueta
  `estable` sigue siendo la que se presenta en la demo local; si `main` se rompe
  después de la hora 30, se redespliega desde el panel la build que funcionaba.
- **Después de la hora 30 no se despliega**, salvo hotfix de algo que ya está
  desplegado y roto.
- **`MCP_TOKEN`** obligatorio en producción; el `/mcp` sin token responde 401. Es un
  MCP público de datos falsos, pero un juez que vea un endpoint abierto lo anota.
- **El dominio no imita a Banorte.** Nombre del producto.

## Checklist de cada deploy

- [ ] `scripts/deploy.sh` terminó en verde y los tres `/health` responden desde fuera.
- [ ] Un prompt del guion funciona contra la URL pública.
- [ ] Un cliente MCP externo (Claude Desktop, inspector de MCP) lista las tools contra
      `https://<dominio>/mcp` con el token.
- [ ] URLs, IP, dominio y cómo entrar al servidor, en `docs/arquitectura/deploy.md`.
- [ ] Entrada en `docs/bitacora/equipo.md` con hora y commit desplegado.
