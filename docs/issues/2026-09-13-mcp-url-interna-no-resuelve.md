---
estado: resuelto
severidad: critica
area: infra
encontrado: 2026-09-13 11:30
github: 5
---

# En producción el agente no alcanzaba el MCP: `MCP_URL` apuntaba a un hostname que no resuelve

**Dónde:** variables de entorno de la app `maya-web` en Coolify (`MCP_URL`), no el repo.

**Qué esperaba:** que un prompt del guion contra `https://maya.157.173.204.174.sslip.io/api/agente`
devolviera mensajes `a2ui`.

**Qué pasa:** devolvía esto, y nada más:

```
{"tipo":"error","codigo":"tool","mensaje":"no pude conectar al MCP en http://a7ld8ya2e0g3ye3pjjlz542f:3100/mcp: fetch failed"}
```

Es decir: **el flujo principal del producto estaba caído en producción.** No el agente ni el
modelo —la llave de Gemini sí está puesta y el turno entraba al camino real—: el agente no
podía pedirle datos a nadie.

**La causa.** Los dos contenedores están en la red `coolify`, pero el único alias de red que
Coolify les pone es el **nombre completo del contenedor con el timestamp del deploy**:

```
a7ld8ya2e0g3ye3pjjlz542f-131445254133   (alias: a7ld8ya2e0g3ye3pjjlz542f-131445254133)
```

El UUID pelón (`a7ld8ya2e0g3ye3pjjlz542f`) **no resuelve**, y el nombre completo no sirve de
nada porque el sufijo cambia en cada deploy. Las dos filas de la variable estaban mal, cada
una a su manera: la de producción decía `http://maya-mcp:3100/mcp` y la de preview
`http://a7ld8ya2e0g3ye3pjjlz542f:3100/mcp`. Ninguno de los dos hostnames existe.

**Y la trampa de siempre:** Coolify guarda **un par por variable** (producción + preview), y
el contenedor arrancó con el valor de la **preview**. Es el mismo pisón que ya nos costó un
deploy en falso (`docs/arquitectura/deploy.md`), así que el arreglo pone el valor correcto en
**las dos filas**: pase lo que pase con cuál inyecta, la URL es buena.

**Primer intento, que NO funcionó:** apuntar `MCP_URL` a la URL pública del MCP
(`https://maya-mcp.157.173.204.174.sslip.io/mcp`). Esa URL responde perfecto **desde fuera**
del VPS, pero **no desde dentro de un contenedor del propio VPS**. Medido desde el contenedor
de la web:

```
getent hosts maya-mcp.157.173.204.174.sslip.io  → 157.173.204.174        (DNS bien)
curl -m 10 https://maya-mcp.…/health            → 000, Connection timed out
curl http://<nombre-completo-del-contenedor>:3100/health → 200
```

Es **hairpin NAT**: un contenedor que sale hacia la IP pública del propio host no vuelve a
entrar por Traefik. El stream seguía diciendo `fetch failed`, ahora con la URL pública en el
mensaje. Verificar esa URL con `curl` desde tu máquina **no prueba** que la app pueda usarla.

**Arreglado de verdad** con el alias de red estable, que era la alternativa descartada:

```
app maya-mcp → custom_network_aliases: "maya-mcp"
app maya-web → MCP_URL = http://maya-mcp:3100/mcp   (en las dos filas, producción y preview)
```

**Ojo con cuál es el campo**, porque cuesta veinte minutos: `custom_docker_run_options` con
`--network-alias maya-mcp` **ya estaba puesto** desde antes, y el alias no aparecía. Dos
deploys con solo esa opción: el contenedor seguía con un único alias, su nombre completo con
el timestamp. En cuanto se puso el otro campo, el siguiente deploy lo aplicó:

```bash
curl -X PATCH "$COOLIFY_URL/api/v1/applications/$COOLIFY_APP_MCP_UUID" \
  -H "Authorization: Bearer $COOLIFY_TOKEN" -H 'content-type: application/json' \
  -d '{"custom_network_aliases":"maya-mcp"}'
```

Al final los dos campos quedaron puestos, así que no se puede *demostrar* que el segundo sea
el único que sirve; lo que sí está medido es que con el primero solo, dos deploys seguidos no
aplicaron el alias, y con el segundo, el primer deploy sí. Si alguien necesita otro alias,
empiece por `custom_network_aliases`.

Requiere un **deploy** del MCP: un `restart` no lo aplica. Comprobado después:
`docker inspect` del contenedor del MCP lista `maya-mcp` entre sus alias, la web lo resuelve,
y `curl http://maya-mcp:3100/health` desde la web devuelve 200.

**Verificado de punta a punta en producción** (2026-09-13 13:25), que es lo que importa:

```
POST https://maya.157.173.204.174.sslip.io/api/agente   "Quiero pagar menos intereses…"
  → tool panorama_inicial ok · tool simular_reestructura ok
  → createSurface + updateComponents (ResumenTarjeta, PlanDePago) + updateDataModel
  → razon: "Tienes $47,386 de saldo revolvente al 96.7 % de tu límite…"
y con una acción encima:
  → tool aplicar_plan_pago ok · tool consultar_plan ok
  → "Tu plan de pagos a 18 meses quedó activo con éxito."
```

Y el tercer paso del guion, que es el 20 % de la rúbrica: **Ana, con la misma frase**, recibe
otra interfaz —`SimuladorMeta`, porque no tiene tarjeta de crédito— después de que el agente
consulta `panorama_inicial`, `consultar_tarjeta`, `consultar_creditos` y `proyectar_ahorro`.
Cinco pasos, 18 s (el más lento de los tres; queda medido para quien optimice).

Los tres pasos del reto, corriendo en la URL pública, con el modelo real.

**Después de probar, el estado de producción se reinició** (`docker exec <mcp> pnpm
reiniciar-estado`): un ensayo no debe arrancar con el plan de Beto ya aplicado.

**Cómo se encontró:** el paso `un prompt del guion contra la URL publica` del workflow, que
hace exactamente eso y exige una línea `"tipo":"a2ui"`. Llevaba fallando y se confundía con
el otro fallo del CI (`humo del MCP`, que sí era del repo). En cuanto el humo se arregló,
este quedó solo y visible.

**Lo que hizo el diagnóstico inmediato** fue un cambio de la auditoría de esa mañana: un MCP
inalcanzable se reporta como `codigo: "tool"` **con la URL dentro**, en vez del genérico
`codigo: "modelo"` de antes. El mensaje del stream dijo el problema completo sin abrir un log.

**Para que no se repita:** el mismo paso del CI es la red de seguridad —si el flujo principal
se cae en producción, el deploy queda rojo—. Y en `deploy.md` queda escrito lo contrario de
lo que parecía: **entre apps del mismo VPS se usa el alias de red interno**
(`http://maya-mcp:3100/mcp`), nunca la URL pública, porque desde dentro no es alcanzable. La
URL pública es para el mundo (y para el juez que conecte su cliente MCP con el token).
