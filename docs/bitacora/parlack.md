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

## sáb 13 · 05:30–07:45 — Scaffold completo del monorepo

Tomé el scaffold entero (bloque 1 del roadmap, las cuatro columnas) para que los otros
tres roles se sienten y escriban código sin montar nada.

**Lo que quedó arriba y verificado**: `pnpm dev` levanta MCP (3100) y web (3000);
`pnpm typecheck` en verde en los 5 paquetes; `pnpm test` con 19 tests (15 del renderer,
4 del MCP); `pnpm humo` lista la tool y la llama de verdad; `/catalogo/v1.json` se sirve.
El ciclo completo se puede probar HOY sin llave de modelo: escribir en la barra →
`POST /api/agente` → stream JSONL → renderer → pantalla.

**Decisiones que tomé y por qué** (todas reversibles, dejo la razón por si alguien
discrepa):

- **Next 16 + React 19 + Tailwind v4 + shadcn `base-nova`** (Base UI, no Radix). Es el
  default del CLI hoy; pelearme con el CLI a esta hora no compraba nada.
- **Los tokens propios se mapean en `@theme inline`**. En Tailwind v4 el `bg-[--lienzo]`
  que decía la skill `diseno-banorte` **no funciona**. Corregí la skill: se escribe
  `bg-lienzo`, `text-exito`, `border-borde-sutil`.
- **Imports internos sin extensión**. Turbopack no mapea `.js` → `.ts`: el typecheck
  pasa y la web truena en ejecución. Me costó dos arranques; quedó escrito en
  `CLAUDE.md` y en la skill `scaffold` para que no le pase a nadie más.
- **Renderer fiel a la spec vendoreada**: las props van **planas** junto a `id` y
  `component` (no anidadas en `props`), `children` acepta lista o plantilla
  `{ componentId, path }`, y la raíz es el id `root`. Lo verifiqué contra
  `packages/a2ui/spec/v0_9_1/catalogs/basic/catalog.json` antes de escribir los tipos.
  Si hubiera inventado el formato, los 8 casos de conformidad no servirían de nada.
- **`packages/catalogo` importa las primitivas de shadcn desde `apps/web`** con el alias
  `@/components/ui/...`. Un `packages/ui` aparte duplicaba la config de shadcn sin
  comprar nada en 33 horas. Está documentado en el README del paquete.
- **El agente es un mock** que emite `ejemplos/confirmacion.jsonl` ya validado contra el
  catálogo (regla 4: lo que está a medias va detrás de un mock). Es lo primero que
  `contrato` tira a la basura.

**Lo que dejé a medias, con dueño**, en la tabla final de la skill `scaffold`: agente
real y ajv contra la spec (`contrato`), 8 tools de 9 (`mcp`), 7 componentes de 8 con su
encargo escrito en cada carpeta (`web`), origen Postgres y panel de transparencia.

**Nombre**: el usuario me dejó elegirlo y propuse Brújula; a media construcción entró el
cambio a **Maya** (la asistente real de Banorte; la propuesta es "su siguiente
generación"). El rename está aplicado en todo el scaffold. El disclaimer de
"no oficial ni afiliado" ya está en el `README.md`.

## sáb 13 · 08:00–09:00 — Deploy en Coolify con GitHub Actions

`maya-web` y `maya-mcp` están arriba en el Coolify del VPS, en el proyecto
`reto-banorte`, junto al Postgres que ya estaba. **Nadie vuelve a desplegar a mano**:
push a `main` → Actions verifica → Coolify construye y publica.

- URLs: https://maya.157.173.204.174.sslip.io y
  https://maya-mcp.157.173.204.174.sslip.io/mcp. `sslip.io` porque todavía no hay
  `.tech`: resuelve a la IP sin comprar nada y no imita a Banorte. Cambiar al dominio
  real es agregarlo en Coolify y actualizar dos variables del repo.
- Repo privado resuelto con **deploy key de solo lectura** (`coolify-maya`), no con la
  GitHub App. La privada está en `/opt/reto/llaves/maya-deploy-key`.
- **El token de Coolify que vive en GitHub NO es el root.** Creé
  `maya-github-actions` con abilities `["deploy","read"]`: dispara deploys, y da 403
  si intenta crear recursos. El root se queda en el VPS. El mismo Coolify administra
  la producción de otro proyecto del equipo; un token root dentro de un repo de
  hackathon es poder de más, y los secrets de Actions los ve cualquiera que pueda
  editar workflows.
- El workflow no solo despliega: al final **manda un prompt del guion a la URL pública
  y exige mensajes A2UI en la respuesta**. Un deploy que arranca pero no contesta
  cuenta como deploy fallido.
- Los Dockerfiles no usan `output: standalone` a propósito: la web lee `catalogo.json`
  y los `.jsonl` de ejemplo en tiempo de ejecución, y standalone los deja fuera.
  Imagen más grande a cambio de cero sorpresas a las 3 am. Ambas imágenes probadas en
  local antes de tocar Coolify.
- El MCP publicado carga los CSV desde la imagen (origen `memoria`): **no depende de
  que Postgres esté arriba**. Su `estado.json` vive en `/datos`, fuera del repo, para
  que un redeploy no lo arrastre.
- Me topé con que `/opt/reto/.env` tenía el token sin comillas y el `|` de Sanctum lo
  partía: `source` fallaba y la API respondía `Unauthenticated`. Arreglado y registrado
  como issue #2 (cerrado).

Pendiente mío: la llave de Gemini en las variables de `maya-web` está vacía, así que el
agente publicado responde con la pantalla de ejemplo. En cuanto alguien la ponga en
Coolify, la URL pública queda completa.
