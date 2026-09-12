---
name: desplegar
description: Cómo desplegar apps/web y apps/mcp a un servidor (Vultr) con HTTPS y dominio, variables de entorno fuera del repo, healthchecks y script de despliegue repetible; y cuándo NO desplegar. Invocar cuando el rol demo decida publicar, y antes de cada redeploy.
---

# Desplegar

Dueño: rol `demo`. El deploy da dos cosas: una URL pública del MCP a la que un juez
puede conectar su propio cliente, y el premio de Vultr/.Tech. **No sustituye a la
demo local**: se presenta desde la máquina del equipo; la URL es el respaldo y la
prueba de que es real.

## Arquitectura real (decidida 2026-09-12)

Todo vive en el **VPS del equipo** (`157.173.204.174`), administrado con **Coolify**
(panel `https://panel.yolani.co`, proyecto `reto-banorte`). Coolify construye cada
app desde GitHub con su Dockerfile, le pone dominio y HTTPS con Traefik, y corre el
Postgres. Ya está arriba el Postgres (17 + TimescaleDB); las apps se agregan cuando
exista el scaffold. Lo real (uuids, puertos, cómo entrar) está en
`docs/arquitectura/deploy.md`. Vultr queda solo como premio lateral.

```
https://<dominio>/        → apps/web  :3000   (app Coolify, Dockerfile en apps/web)
https://<dominio>/mcp     → apps/mcp  :3100   (app Coolify, Streamable HTTP)
postgres-reto-banorte     → Postgres  :5432 interno, :5437 público para cargar datos
```

Cada app necesita un `Dockerfile` propio y un `/health`. Coolify puede manejarse por
API con el token de `/opt/reto/.env` (`COOLIFY_TOKEN`).

## Reglas

- **Los secretos viven en Coolify** (variables de cada app) y en `/opt/reto/.env` del
  VPS, nunca en el repo ni en el script.
- **`scripts/deploy.sh`** dispara el deploy por la API de Coolify (`POST
  /api/v1/deploy?uuid=...`) y espera los `/health`. Si un `/health` no responde en
  30 s, hace rollback desde el panel y falla ruidosamente.
- **Se despliega desde `estable`**, no desde `main`: `git checkout estable` antes.
  Excepción: un hotfix que `demo` autorice.
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
