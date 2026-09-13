---
estado: abierto
severidad: media
area: web
encontrado: 2026-09-12 21:05
---

# Un turno perdió una tarjeta y le mostró a la persona un aviso de renderer

**Dónde:** entre `apps/web/src/lib/agente/pantalla.ts` (la validación del árbol) y
`packages/a2ui` (el renderer, que emite el aviso).

**Cómo se vio:** en la verificación con navegador de este bloque, con Ana y la pregunta "¿En qué se me
fue el dinero?". El turno cerró bien (3 pasos, 13.5 s, `panorama_inicial · analizar_gasto`) y el texto
de la respuesta era correcto, pero **encima de la respuesta se pintó un aviso destinado a nosotros**:

```
⚠ root declara el hijo "conclusion", que no esta en la lista; root declara el hijo "gasto", que no esta en la lista
```

Y consistente con eso, **la tarjeta de gasto por categoría nunca apareció**: solo se pintó
`Conclusion`. Buscando `Vivienda|Supermercado|Transporte` en la superficie: nada.

**Por qué es raro y hay que investigarlo:** `armarMensajes` valida el árbol completo con
`validarMensaje(..., { arbolCompleto: true })`, que existe justamente para rechazar un `root` que
declare hijos ausentes de la lista. Si esa validación pasó, el mensaje que llegó al cliente no era el
que se validó; y si no pasó, no debería haberse emitido A2UI. Hay una tercera posibilidad, y es la que
más me cuadra sin datos: que el aviso venga de un `updateComponents` **parcial** aplicado sobre una
superficie que ya tenía otro árbol, con lo que la lista y los `children` quedan desalineados dentro de
`procesar`. No lo pude confirmar porque la cuota de Gemini se agotó antes de poder reproducirlo.

**Dos defectos, y el segundo es independiente del primero:**

1. Se pierde una tarjeta que el turno sí pidió. Con el tope de 3 tarjetas, perder una es perder un
   tercio de la pantalla.
2. **Un aviso de renderer se filtra a la interfaz de la persona.** Eso es del panel de transparencia
   o de la consola, no de la conversación. Un juez viendo la demo lee "root declara el hijo
   conclusion", que no significa nada para él y sí parece que algo se rompió.

**Por dónde empezar:**

- Reproducir con el log del stream a la vista (`apps/web/src/lib/agente/agente.ts` ya emite cada
  línea) y guardar el `updateComponents` exacto que llegó.
- Revisar si `podarAlTope` puede dejar un `root` con `children` que apunten a tarjetas que acaba de
  podar: reconstruye la raíz, y si el orden de las operaciones no es el que creo, ahí está.
- Independientemente de la causa: el canal de avisos del renderer **no** debe pintarse como un
  mensaje del hilo. Eso se arregla solo y es más urgente que la causa raíz.

**No se arregló en este bloque** porque se encontró al final de la verificación, ya sin cuota de
modelo para reproducirlo, y arreglar a ciegas la causa raíz de algo que no se puede volver a ver es
peor que dejarlo anotado. El punto 2 (el aviso filtrado) sí es seguro de arreglar sin reproducción.
