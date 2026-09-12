---
verificado: 2026-09-13 17:10 (hora de Monterrey)
estado: construido
---

# Arrancar en tu máquina, en cinco minutos

Para quien acaba de clonar el repo y quiere empezar a escribir código.

## Para cualquiera

Necesitas tres cosas: el código, un archivo con las llaves (`.env`, que **no** está en
el repo porque lleva contraseñas) y dos comandos. Los datos no se descargan: viven en
una base de datos en el servidor del equipo, y tu máquina se conecta a ella.

Pídele el `.env` a quien te pasó este repo. Llega por mensaje directo, nunca por un
canal público ni un pegado en un chat de grupo grande.

## Los cinco minutos

```bash
git clone https://github.com/Ghekkin/Reto-Banorte-hack-mty.git
cd Reto-Banorte-hack-mty

# 1. El .env que te pasaron, en la RAIZ del repo (no dentro de apps/)
cp ~/Descargas/env-equipo.txt .env

# 2. Dependencias (Node 22 y pnpm 10; si no tienes pnpm: corepack enable)
pnpm install

# 3. Arriba
pnpm dev
```

Abre **http://localhost:3000** y escribe *"Quiero pagar menos intereses de mi tarjeta"*.
Si responde con una pantalla y no con una disculpa, estás listo.

## Qué acabas de levantar

| | Dónde | Qué es |
|---|---|---|
| Web | http://localhost:3000 | La cara del producto y el agente (`/api/agente`) |
| MCP | http://localhost:3100/mcp | Las 15 tools. `/health` para ver que vive |
| Catálogo | http://localhost:3000/catalogo/v1.json | Los componentes que el agente puede pintar |
| Datos | PostgreSQL en el servidor | El esquema `banorte`. **Compartido: lo que escribas lo ven los demás** |

## Lo que más confunde al empezar

- **El `.env` va en la raíz del repo**, no en `apps/web/` ni en `apps/mcp/`.
  `scripts/dev.sh` lo carga y se lo pasa a los dos procesos.
- **Sin `DATABASE_URL` el MCP no arranca.** Es a propósito (ADR 0010): un servidor que
  contesta sin datos se descubre en la demo, no antes.
- **El MCP pide `Authorization: Bearer`.** El token está en tu `.env` como `MCP_TOKEN`;
  la web lo usa sola. Si llamas al MCP a mano, acuérdate de la cabecera.
- **La base es compartida.** Si aplicas un plan probando, queda ahí para todos. Antes de
  un ensayo, `pnpm reiniciar-estado` la deja limpia.
- **Sin llave de Gemini la web abre igual**, pero el agente responde con una pantalla de
  ejemplo y lo dice en el stream. Si ves eso, revisa `GOOGLE_GENERATIVE_AI_API_KEY`.

## Comandos que vas a usar

```bash
pnpm dev               # levanta mcp (3100) y web (3000)
pnpm typecheck         # tsc en los 5 paquetes
pnpm test              # 288 pruebas; no tocan la base
pnpm humo              # llama al MCP de verdad (necesita pnpm dev corriendo)
pnpm reiniciar-estado  # vacia las acciones: ANTES de cada ensayo
```

## Antes de escribir código

1. **Invoca la skill `inicio`**: pregunta tu nombre y rol, y deja tu fila del tablero
   puesta. Sin eso, tus commits no dicen quién los hizo.
2. Lee `docs/tablero.md` (quién está en qué) y tu columna en `docs/equipo/roadmap.md`.
3. Antes de tocar algo, mira qué skill lo cubre: hay una por dominio (`tool-mcp`,
   `ui-generativa`, `agente-host`, `diseno-banorte`…). Están listadas en `CLAUDE.md`.

## Cuidado con el árbol compartido

Si varias sesiones de Claude trabajan sobre **la misma carpeta**, comparten el índice de
git: un `git add -A` recoge el trabajo a medias de los demás y un `git commit` lo sube.
Ya nos costó un `main` que no arrancaba (issue #8). Commitea acotado:

```bash
git commit -m "mensaje" -- ruta/que/tocaste
```

## Si algo no levanta

| Síntoma | Qué mirar |
|---|---|
| `FALTA .env` | El archivo va en la raíz, con ese nombre exacto |
| `falta DATABASE_URL` | Te pasaron un `.env` incompleto; pídelo otra vez |
| `getaddrinfo` / timeout al arrancar el MCP | No alcanzas la base: revisa tu red, o el puerto 5437 del servidor |
| La web abre pero el agente se disculpa | Mira el stream: si dice `codigo: "tool"`, el MCP no responde; si dice `modelo`, falta la llave |
| `ERR_PNPM_OUTDATED_LOCKFILE` | `pnpm install` sin `--frozen-lockfile`, y avisa: alguien subió un `package.json` sin su lockfile |
