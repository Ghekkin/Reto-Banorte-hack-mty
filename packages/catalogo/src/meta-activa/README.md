# `MetaActiva`

**Cuándo lo elige el agente**: ya existe un apartado (acaba de llamar `crear_apartado`,
o la persona pregunta cómo va su meta): avance, aportación y cuándo cae el siguiente
cargo. Tras la acción va junto a `Confirmacion`.

## Props

| Prop | Para qué |
|---|---|
| `nombre` | "Fondo de emergencia" |
| `metaCentavos`, `acumuladoCentavos` | Objetivo y lo que lleva; con ellos sale el avance (`progress`) |
| `aportacionCentavos`, `frecuencia` | Cuánto se aparta y cada cuánto |
| `proximoCargoFecha` | El siguiente apartado automático (`primeraAportacionFecha` de la tool) |
| `fechaObjetivo` | Cuándo llega |
| `heroe` | Solo si no hay otra héroe en la pantalla |
| `ancho`, `razon` | Comunes |

## Acciones

Ninguna.

## Estados

- **Cargando**: skeleton hasta que llegan meta y acumulado.

Ejemplo: `ejemplos/meta-activa.jsonl`. Primitivas: `card`, `progress`.
