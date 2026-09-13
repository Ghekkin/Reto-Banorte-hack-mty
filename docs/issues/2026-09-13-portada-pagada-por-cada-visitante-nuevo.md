---
estado: abierto
severidad: alta
area: web
encontrado: 2026-09-13 04:40
github: 33
---

# Si el estado común tiene una acción, cada visitante nuevo paga su propia portada de Inicio

**Dónde:** `apps/web/src/lib/inicio/servicio.ts:108` (`vistaDe`, la comparación
`huella === huellaComun`) y `apps/web/src/lib/inicio/huella.ts` (`huellaDe` cuenta las acciones
del dispositivo). Algoritmo en `docs/algoritmos/portada-por-dispositivo.md`.

**Qué esperaba:** lo que promete el comentario de `vistaDe`: *"cien visitantes nuevos no son
cien portadas pagadas"*. Un navegador que nunca aplicó nada ve una portada ya armada y no se
llama al modelo.

**Qué pasa:** el algoritmo da por hecho que el estado `comun` tiene **cero** acciones. Pero
`comun` es el estado de todo lo que llega sin cookie (`pnpm probar-guion`, curl, el CI), y esos
scripts aplican acciones. Con una sola acción en `comun`, la huella común es `a:1:N` y la de un
dispositivo nuevo es `a:0:0`: no coinciden, el paso 4 no aplica, y la portada se rearma **en el
ámbito del dispositivo**, una por visitante. Todas con los mismos datos (cero acciones), así que
todas salen iguales.

**Cómo lo sé (base de producción, `banorte.corridas`):**

- `acciones_aplicadas` con `dispositivo_id = 'comun'`: 1 de `usr_ana` y 1 de `usr_beto`; 0 de
  `usr_carmen`. Carmen no tiene ni una portada por dispositivo; Ana y Beto, 190.
- Entre 04:14 y 04:17 del 13, **156 portadas de Ana con 156 dispositivos distintos**, todas con
  exactamente 17,469 tokens de entrada y 618 de salida (la misma portada, pagada 156 veces). El
  origen fue un navegador sin cookies recargando la página (medición de animaciones), pero
  cualquier cosa sin cookie hace lo mismo: un bot, la vista previa de un enlace compartido, cada
  juez que escanea el QR.
- Durante la ráfaga el pool de la base se saturó: 4 registros `inicio/fallo` con
  `timeout exceeded when trying to connect` (04:14:59–04:15:21).
- Sigue pasando: de 04:18 a 04:34, 20 portadas de Beto más, cada una con un dispositivo nuevo y
  6,548 o ~13,500 tokens.

**Impacto en la demo:** alto. Cada primera visita espera 2–6 s a que "Maya arme tu inicio" en
vez de ver la portada al instante, cuesta ~$0.006 USD, y una ráfaga (un grupo de jueces abriendo
la liga a la vez) satura la base y la cuota de Gemini. En dinero fue el 39 % de todo lo
registrado (≈ $1.14 de $2.93 entre 02:12 y 04:35).

**Arreglos posibles** (el primero basta):

1. Comparar contra la portada **sin acciones** de esa persona y no contra la común: guardar (o
   buscar en `pantallas_inicio`) una portada con huella `a:0:0` y copiarla al dispositivo sin
   llamar al modelo. En general: cualquier portada de la misma persona con la **misma huella**
   sirve, venga del ámbito que venga.
2. Que los scripts sin cookie usen un dispositivo propio (`dis_scripts…`) en vez de `comun`, para
   que `comun` se quede en cero acciones.
3. Mitigación inmediata sin código: `pnpm reiniciar-estado` después de cada ensayo del guion.
   Ojo: `db/reiniciar.sql` trunca `acciones_aplicadas` completa y borra
   `pantallas_por_dispositivo`, así que también borra el estado de **todos** los visitantes; solo
   antes de un ensayo o de la demo, no con jueces usando la liga.
