---
estado: abierto
severidad: alta
area: web
encontrado: 2026-09-12 23:56
---

# El rename `responder_conversacion` → `responder` quedó a medias: el prompt manda a una tool que no existe y dos pruebas fallan

**Dónde:** `apps/web/src/lib/agente/prompt.ts` (líneas 15, 49, 51, 78),
`apps/web/src/lib/agente/__tests__/agente.spec.ts:128`,
`apps/web/src/lib/agente/__tests__/proveedor.spec.ts:97`.

**Qué esperaba:** que `pnpm test` pasara en `main`.

**Qué pasa:** falla con dos pruebas en rojo:

```
FAIL src/lib/agente/__tests__/agente.spec.ts > correrTurno > responde cordialmente
  con responder_conversacion sin pantalla visual ni error
  AssertionError: expected [ 'estado', 'estado', 'tool', …(4) ] to not include 'error'

FAIL src/lib/agente/__tests__/proveedor.spec.ts > convierte las 9 tools del MCP en
  declaraciones que Gemini acepta
  AssertionError: expected [...] to deeply equal [ …, 'responder_conversacion' ]
```

La tool de cierre conversacional se llama **`responder`** desde que se introdujeron las
tres salidas del turno (`cierre.ts:72`, `TOOLS_DE_CIERRE`). El rename se hizo en el
código del agente, pero quedaron dos frentes sin actualizar:

1. **`prompt.ts` sigue diciéndole al modelo que llame a `responder_conversacion`** en
   cuatro lugares, incluido un paso numerado ("4. Llama a `responder_conversacion`…").
   Esa tool ya no existe en el registro, así que el modelo pide una herramienta
   inexistente y el turno se cierra con `error` en vez de con texto. Es exactamente lo
   que la primera prueba está detectando.
2. Las dos pruebas siguen afirmando el nombre viejo.

**Impacto:** alto y doble. Por un lado `pnpm test` es uno de los cuatro niveles de
"hecho" (skill `probar`) y es un paso del CI, así que con esto en rojo ningún push llega
al deploy y cualquiera que toque otra cosa se encuentra la suite roja por un archivo que
no tocó. Por otro, **es un bug de la demo, no solo de las pruebas**: un saludo o una
pregunta conversacional ("hola", "gracias") es justo el caso que `responder` atiende, y
con el prompt apuntando al nombre viejo ese turno puede terminar en error delante del
jurado.

**Cómo lo reproduje:** `pnpm test` en la raíz (o
`pnpm --filter @maya/web test src/lib/agente`). Encontrado de paso, corriendo la suite
para verificar un cambio de la sección Movimientos, que no toca `lib/agente`.

**Sospecha de arreglo:** cambiar las cuatro menciones de `prompt.ts` a `responder` y
alinear las dos pruebas con `TOOLS_DE_CIERRE`, que es la fuente única de los nombres.
Mejor todavía: que `prompt.ts` interpole desde `TOOLS_DE_CIERRE` en vez de escribir el
nombre a mano, para que el próximo rename no pueda volver a desincronizarse.

**No lo arreglo aquí** porque es dominio `contrato` y el prompt es un archivo delicado
(su texto es el contrato con el modelo); el cambio es de quien lo tenga tomado en el
tablero.

**GitHub:** no se pudo crear con `gh issue create`: en esta máquina no hay `gh` en el
PATH (ni en `%ProgramFiles%\GitHub CLI` ni en `%LOCALAPPDATA%\GitHubCLI`). El frontmatter
va **sin** el campo `github:` a propósito, como pide `docs/issues/index.md`: quien tenga
`gh` disponible lo sube y anota el número.
