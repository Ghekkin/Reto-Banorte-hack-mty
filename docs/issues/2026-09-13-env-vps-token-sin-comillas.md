---
estado: resuelto
severidad: alta
area: infra
encontrado: 2026-09-13 08:10
github: 2
---

# El token de Coolify en `/opt/reto/.env` rompe el `source`: el `|` se interpreta como pipe

**Dónde:** `/opt/reto/.env` (fuera del repo, VPS 157.173.204.174), línea `COOLIFY_TOKEN=`.
El comando afectado está documentado en `docs/arquitectura/deploy.md`, sección
"Coolify por API (para scripts)".

**Qué esperaba:** que `. /opt/reto/.env` cargue las variables y que
`curl -H "Authorization: Bearer $COOLIFY_TOKEN" $COOLIFY_URL/api/v1/...` responda.

**Qué pasa:** los tokens de Coolify tienen la forma `N|cadena`. Sin comillas, bash
interpreta el `|` como una tubería: la línea falla con
`CSWz8...: command not found`, `COOLIFY_TOKEN` queda **vacío** y todas las llamadas a
la API responden `{"message":"Unauthenticated."}`. El síntoma engaña: parece un token
revocado o un problema de permisos, no un problema de comillas. El mismo archivo tiene
`DATABASE_URL` con caracteres que también conviene entrecomillar.

**Cómo lo reproduje:** `. /opt/reto/.env && echo ${#COOLIFY_TOKEN}` imprimía `0` y el
error de bash arriba. Después de entrecomillar, imprime `43` y
`curl $COOLIFY_URL/api/v1/version` devuelve `4.3.18`.

**Impacto en la demo:** ninguno directo, pero bloquea todo el deploy: nadie puede usar
la API de Coolify hasta arreglarlo, y el mensaje de error apunta al lado equivocado.

**Arreglado** el 2026-09-13 08:12: todos los valores del archivo quedaron entre comillas
dobles (respaldo en `/opt/reto/.env.bak-*`). El arreglo vive fuera del repo, así que el
issue se cierra a mano.
