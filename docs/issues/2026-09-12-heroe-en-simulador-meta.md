---
estado: resuelto
severidad: media
area: web
encontrado: 2026-09-12 12:22
github: 14
resuelto-en: commit con Fixes #14 (SimuladorMeta soporta heroe, salida 1)
---

# El agente le pone heroe a SimuladorMeta, que no lo declara, y el turno gasta un paso en reintentar

**Dónde:** `packages/catalogo/src/simulador-meta/schema.ts` (no declara `heroe`) contra `packages/catalogo/src/comunes.ts:27` (`Heroe`), y la regla del prompt en `apps/web/src/lib/agente/prompt.ts`.

**Qué esperaba:** que el agente no le ponga `heroe: true` a un componente que no lo declara.

**Qué pasa:** se lo pone, la validación contra el catálogo lo rechaza (`unevaluatedProperties: false`) y el turno gasta un paso en reintentar:

```
{"tipo":"error","codigo":"a2ui","mensaje":"/updateComponents/components/1 SimuladorMeta: la propiedad \"heroe\" no existe en este componente"}
{"tipo":"fin","pasos":3,"ms":5763,...}
```

Visto hoy dos veces con Ana ("Quiero pagar menos intereses de mi tarjeta"). El turno **se recupera** —pinta al tercer paso—, pero cuesta un paso completo: ~7,000 tokens de entrada y 1–2 s.

**Por qué el modelo insiste, y no es descuido:** **13 componentes del catálogo aceptan `heroe`** (`ResumenTarjeta`, `MetaActiva`, `GastoPorCategoria`, `TermometroSaludFinanciera`, `AlertaFugas`, `ProyeccionCrecimiento`… ) y `SimuladorMeta` es de los pocos que no. Para el modelo, `heroe` es una prop general. Y para Ana, sin deuda, el simulador **es** la tarjeta principal de su pantalla, así que tiene sentido que quiera ponérsela. La regla del prompt ("heroe solo en los que lo tienen en sus props") no alcanza contra ese patrón.

**Dos salidas, y la decisión es de diseño:**

1. **Que `SimuladorMeta` soporte `heroe` de verdad.** Es lo que el modelo está pidiendo. Pero ojo: el slider y el botón son rojos, y sobre el degradado de marca serían rojo sobre rojo. Hace falta la variante clara de los controles (skill `diseno-banorte`: botones píldora `bg-white/90 text-primary` en el héroe).
2. **Aceptar e ignorar `heroe` en los componentes que no lo implementan**, subiéndolo a `PropsBase` como opcional. Es lo mismo que se decidió con `razon` en los de layout: rechazar la pantalla completa por una bandera visual no vale un paso. Barato, pero pierde la señal de que ese componente no tiene versión héroe.

**Impacto en la demo:** se nota como 1–2 s de más en la pantalla de Ana, que es la de adaptabilidad (20 % de la rúbrica). No la rompe.

**Por qué no lo arreglé:** el catálogo está en obra (el fork de componentes de banca personal y educación está agregando componentes ahora mismo) y la salida 1 es de diseño. Encontrado mientras probaba el caché.

