# Bitácora de parlack

## 2026-09-12

- **05:50 · hecho** — Verificada la carga de `db/` en el Postgres de Coolify: 22 tablas
  del esquema `banorte`, 3 690 filas, y cada tabla comparada fila a fila contra los CSV
  del repo (cero diferencias); tipos de columna iguales a `db/schema.sql`;
  `scripts/validar-datos.mjs` en verde. Issue #1 (puerto 5437) subido a GitHub y cerrado.
- **05:35 · hecho** — El 5437 no entraba desde fuera: el VPS tiene un cortafuegos
  para Docker (`yolani-docker-firewall.service`) con lista blanca de puertos. Agregado
  el 5437 al script y reiniciado el servicio. Nota en `docs/arquitectura/deploy.md`.
- **05:25 · hecho** — Coolify en el VPS (`157.173.204.174`): proyecto `reto-banorte`
  y Postgres `postgres-reto-banorte` (Postgres 17 + TimescaleDB, puerto público 5437)
  arriba y verificados desde fuera y desde la red `coolify`. Secretos en `/opt/reto/.env`
  del servidor; todo lo demás en `docs/arquitectura/deploy.md`. Token de la API de
  Coolify creado para scripts. Pendiente: apps web/mcp cuando exista el scaffold, y
  acceso de Coolify al repo privado (GitHub App o deploy key).
- **05:20 · inicio** — Tomo el rol demo. Voy por la infraestructura en Coolify:
  primero Postgres para ir subiendo datos, luego las apps.
