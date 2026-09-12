---
name: desplegar
description: Cómo desplegar apps/web y apps/mcp a un servidor (Vultr) con HTTPS y dominio, variables de entorno fuera del repo, healthchecks y script de despliegue repetible; y cuándo NO desplegar. Invocar cuando el rol demo decida publicar, y antes de cada redeploy.
---

# Desplegar

Dueño: rol `demo`. El deploy da dos cosas: una URL pública del MCP a la que un juez
puede conectar su propio cliente, y el premio de Vultr/.Tech. **No sustituye a la
demo local**: se presenta desde la máquina del equipo; la URL es el respaldo y la
prueba de que es real.

## Arquitectura mínima

Una VM Ubuntu en Vultr (2 vCPU / 4 GB alcanza), Node 22 + pnpm, procesos con `pm2`
(o `systemd`), **Caddy** delante para HTTPS automático con el dominio `.tech`. Sin
Docker salvo que Tiger Data lo pida (entonces `docker compose` solo para Postgres).

```
https://<dominio>/        → apps/web  :3000
https://<dominio>/mcp     → apps/mcp  :3100  (Streamable HTTP)
https://<dominio>/health  → agregador
```

## Reglas

- **`.env` vive en el servidor**, en `/opt/reto/.env`, nunca en el repo ni en el
  script. Se copia una vez a mano.
- **`scripts/deploy.sh`** hace todo y es idempotente: `git pull` (o `rsync` desde el
  clon local si el servidor no tiene acceso al repo privado), `pnpm install --frozen-lockfile`,
  `pnpm build`, `pm2 reload`, y espera los `/health`. Si un `/health` no responde en
  30 s, hace `pm2 reload` a la versión anterior y falla ruidosamente.
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
