---
estado: resuelto
severidad: alta
area: web
encontrado: 2026-09-13 06:59
github: 43
resuelto-en: 108e722
---

# El schema de entrada de `pintar_pantalla` rechaza componentes sin `id` antes de que el host los normalice: un paso extra en el primer turno del guion

**Dónde:** `apps/web/src/lib/agente/pantalla.ts:42` (`entradaPintarPantalla`, el `inputSchema` que valida el AI SDK
antes de llamar `execute`). `normalizarListaDeComponentes` ya sabe poner el `id` que falta, pero nunca llega a correr.

**Qué esperaba:** que un componente sin `id` (o con otra omisión que el host corrige) pase a la normalización, y que
lo que el host no pueda corregir vuelva al modelo como un error corto de validación del catálogo.

**Qué pasa:** el SDK rechaza la llamada con `Invalid input for tool pintar_pantalla: Type validation failed` y un
`invalid_union` de decenas de líneas; el modelo reintenta completo. En los argumentos reales los componentes traen
`component` pero les falta `id` (ej. `["id|children|component", "id|heroe|razon|mascara|…", …]` con uno sin `id` o
sin `component`).

**Cómo lo sé:** 23 llamadas con ese error en `banorte.corrida_tools` el 13 (02 h: 1, 03 h: 12, 04 h: 2, 05 h: 5,
06 h: 3). El ensayo del guion contra producción (`8060918`, 06:54) marcó FALLA en «Beto · deuda: intención →
interfaz», el primer paso del guion: pintó en 3 pasos y 7.4 s en vez de 2.

**Impacto en la demo:** alto: el primer paso del guion a veces tarda un paso más.

**Arreglo:** relajar el `inputSchema` de los componentes (objetos con `component` y el resto abierto; `id`
opcional) para que la normalización y la validación del catálogo decidan, con un mensaje corto si falta `component`.

## Resolución

Resuelto en `108e722`. El `inputSchema` de `pintar_pantalla` acepta componentes sin `id` y sin `component`, y `razon` sin mínimo; lo que falta lo corrige `normalizarListaDeComponentes`: pone el `id`, limpia llaves con comillas de sobra, infiere `component` cuando las props caben claramente en uno solo (`inferirComponente`: 2 o más props propias, 60 % declaradas, ventaja de 2 sobre el segundo) y, si no puede, devuelve un error corto. Además la razón del turno cae al `texto` si la del modelo no sirve, `Conclusion.sugerencias` se recorta a 3 y `completarAccion` cambia una acción no permitida por la parecida o por la de por defecto (el aviso de «quiero invertir» con `ver_plan_pago`). Pruebas: `entrada-pintar-pantalla.spec.ts` (13, con llamadas reales; fallan todas contra el código anterior). De las 23 llamadas rechazadas por el SDK el 13 pasan 16 (antes 1); de las 170 `pintar_pantalla`, 153 (antes 137), sin regresiones.
