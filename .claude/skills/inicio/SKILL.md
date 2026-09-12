---
name: inicio
description: Ritual de inicio de sesión - pregunta quién eres y qué rol tomas, guarda la identidad para los commits, te pone al día con GitHub, el tablero y tu bitácora, y actualiza tu fila del tablero. Invocar al abrir cualquier sesión, o cuando el hook de inicio diga que no hay identidad.
---

# Inicio de sesión

El hook `SessionStart` ya hizo `git pull` y mostró el tablero. Esta skill completa lo
que un script no puede: saber quién eres y qué vas a hacer.

## Pasos

1. **Pregunta nombre y rol** con `AskUserQuestion`, en una sola pregunta de dos
   partes. Opciones de rol: `web`, `mcp`, `contrato`, `demo` (definidos en
   `docs/equipo/roles.md`; si el usuario no los conoce, resúmelos en una línea cada
   uno). Si ya existe `.sesion`, ofrece sus valores como default y solo confirma.
2. **Guarda la identidad** en `.sesion` (está en `.gitignore`), formato exacto:
   ```
   NOMBRE=ana
   ROL=web
   ```
   Nombre en kebab-case, minúsculas, sin acentos. Los commits automáticos llevarán
   `[ana/web]` como prefijo.
3. **Bitácora personal**: si no existe `docs/bitacora/<nombre>.md`, créala con el
   formato de `docs/bitacora/README.md`. Lee sus **últimas 3 entradas** y las
   últimas 4 de `docs/bitacora/equipo.md`.
4. **Sigue la skill `contexto-reto`** (reglas, contexto del reto, issues críticos).
   Si el usuario ya trabajó hoy en el repo, basta con el tablero y las bitácoras.
5. **Actualiza tu fila** de `docs/tablero.md` (solo la tuya): quién, en qué, desde
   cuándo. Si retomas algo que otro dejó `a-medias`, dilo en "En qué".
6. **Escribe la entrada `inicio`** en tu bitácora personal: qué tomas.
7. Di en **tres líneas** qué entendiste del estado actual, qué hay bloqueado y qué
   vas a hacer. Luego empieza.

## Lo que NO haces aquí

- No haces commit ni push a mano: el hook `Stop` sincroniza al final de cada turno.
- No arreglas nada que veas roto en el camino: issue (skill `registrar-issue`) y sigues.
