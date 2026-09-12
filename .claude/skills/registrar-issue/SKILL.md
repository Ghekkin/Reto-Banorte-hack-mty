---
name: registrar-issue
description: Registra un bug o riesgo encontrado (ajeno a la tarea actual, o propio que no se va a arreglar ahora) en docs/issues Y en GitHub con gh issue create, en el mismo momento. Invocar en cuanto se detecta el fallo, antes de seguir con la tarea.
---

# Registrar un issue

Se hace **en el momento**, no al final de la sesión, y **siempre en los dos lugares**:
archivo en `docs/issues/` y issue en GitHub. Crear issues en GitHub está autorizado de
forma permanente por el usuario (`CLAUDE.md`, regla 2); no hace falta preguntar.

Repo: `Ghekkin/Reto-Banorte-hack-mty`. `gh` está autenticado; si `gh auth status`
falla, avisa al usuario y deja el archivo sin `github:` para completarlo después.

## Pasos

1. Confirma que es un hallazgo, no una idea de feature (las ideas van a `bitacora.md`).
2. Crea `docs/issues/YYYY-MM-DD-slug-corto.md` con el formato de
   `docs/issues/index.md`. Obligatorio: **archivo y línea**, qué esperabas, qué pasa,
   cómo lo reprodujiste o por qué estás seguro, impacto en la demo. Todavía **sin** el
   campo `github:`.
3. Severidad honesta: `critica` solo si rompe la demo; `alta` si se nota en la demo;
   `media` si está mal pero no se ve; `baja` si es deuda.
4. Sube el issue a GitHub:
   ```bash
   # cuerpo = archivo sin frontmatter + línea "Ficha: docs/issues/<archivo>"
   gh issue create --repo Ghekkin/Reto-Banorte-hack-mty \
     --title "<mismo título del archivo>" \
     --label <severidad> --label <area> \
     --body-file <cuerpo>
   ```
   Si una etiqueta no existe, créala antes con `gh label create <nombre>` y reintenta.
   Toma el número de la URL que devuelve.
5. Escribe `github: <N>` en el frontmatter del archivo.
6. Agrega la fila a la tabla de `docs/issues/index.md`, con el número.
7. Menciónalo al usuario en una línea (título + `#N`) y **sigue con tu tarea
   original**. No lo arregles de paso salvo que el usuario lo pida o sea `critica`.
8. Si lo resuelves en la misma sesión: `estado: resuelto`, `resuelto-en:` con el hash,
   fila actualizada, y el commit lleva `Fixes #N`. No cierres el issue a mano: lo
   cierra el push. Solo si el arreglo vive fuera del código, `gh issue close N
   --comment "<por qué>"`.

## Qué NO hacer

- Arreglarlo "rápido" en el mismo commit de otra cosa sin registrarlo.
- Registrarlo sin archivo y línea ("algo falla en el MCP" no es un issue).
- Dejar el archivo sin `github:` "para subirlo luego": el luego no llega.
- Escribir `github:` vacío o con guión cuando no hay número: se omite el campo.
- Guardarlo para "al final".
