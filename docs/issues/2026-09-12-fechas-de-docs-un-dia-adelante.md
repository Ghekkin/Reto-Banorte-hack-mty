---
estado: resuelto
severidad: baja
area: docs
encontrado: 2026-09-12 19:10
resuelto: 2026-09-12 22:56
---

# Los docs fechan el trabajo del sábado como 2026-09-13: la bitácora y el resto no coinciden

**Dónde:** `docs/arquitectura/deploy.md` ("verificado 2026-09-13 08:50 (hora de Monterrey)",
"Último deploy | 2026-09-13 08:50"), `docs/issues/2026-09-13-*.md` (cuatro fichas),
`docs/decisiones/0004-*.md` ("se revirtió el 2026-09-13"), y `docs/tablero.md`, que fecha la
última entrada como "sáb 19:21".

**Qué esperaba:** que la fecha de una entrada y su día de la semana correspondan, porque la regla
de `CLAUDE.md` es explícita: *"todas las horas del repo son de Monterrey (UTC-6)"*.

**Qué pasa:** el **sábado** del reto es **2026-09-12**, no el 13. El 2026-09-13 es domingo, el día
del cierre (el reto arrancó viernes 11 a las 20:00 y dura 36 h). Así que hay material fechado
2026-09-13 describiendo trabajo del sábado, y `docs/bitacora/equipo.md` tiene su sección más
reciente correctamente como `## 2026-09-12` con entradas hasta "sáb 16:40". Las dos convenciones
conviven en el mismo repo.

**Cómo lo reproduje / por qué estoy seguro:** en la máquina de desarrollo, con zona horaria
`Central Standard Time (Mexico)` (UTC-6, o sea Monterrey):

```
Get-Date  ->  2026-09-12 18:53 sábado
UtcNow    ->  2026-09-13 00:53 UTC
```

Es decir, quien escribió esas fechas leyó **UTC** (o el reloj del servidor, que está en UTC+2 y va
8 h adelante) en vez de la hora local. Es exactamente el modo de fallar que `CLAUDE.md` avisa y que
`docs/bitacora/equipo.md` ya documenta en su nota de cabecera para las entradas del 11.

**Impacto en la demo: ninguno.** Es un problema de trazabilidad, y por eso importa igual: el pitch
se arma leyendo la bitácora ("esto lo decidimos a la hora 4 porque…"), y con dos calendarios en
paralelo el orden de los hechos deja de ser confiable. Un `estable` marcado "2026-09-13 08:50" que
en realidad es del sábado por la mañana puede mandar a alguien a buscar el commit equivocado a las
3 am.

**Por qué no lo arreglé de paso:** renombrar cuatro fichas de `docs/issues/` mueve sus rutas y los
`Ficha:` de los issues de GitHub que las citan, y tocar `deploy.md` a la vez que otra sesión puede
estar desplegando es pedir un conflicto. Lo que sí hice fue **no propagarlo**: mis entradas de hoy
en `equipo.md` y los comentarios de código de este cambio usan `2026-09-12` (sáb 18:53), la fecha
real.

**Qué hacer:** lo decide quien lleve `demo` (dueño de la doc). Dos caminos, y el segundo es el
honesto:

1. dejarlo y anotar en `docs/bitacora/README.md` que las fechas 2026-09-13 anteriores al domingo
   por la mañana son en realidad del sábado (como ya se hizo con las del 11);
2. corregirlas, en un commit propio que no mezcle nada más.

Y para que no vuelva a pasar: cualquier fecha que se escriba a mano sale de `date` con
`TZ=America/Monterrey`, no del reloj del servidor ni de `UtcNow`.

**Solución aplicada:**
Se agregó la nota aclaratoria en `docs/bitacora/README.md` explicando que los registros con fecha `2026-09-13` previos al domingo corresponden a la jornada del sábado 12 registrados con hora de servidor UTC/UTC+2, manteniendo la trazabilidad sin alterar rutas existentes.
