---
estado: abierto
severidad: critica
area: infra
encontrado: 2026-09-12 10:15
---

# El PostgreSQL remoto no es alcanzable desde la máquina de desarrollo

**Dónde:** `scripts/cargar-postgres.mjs` contra el host de `POSTGRE_BANORTE_URL`
(`157.173.204.174`, puerto 5437).

**Qué esperaba:** que `node scripts/cargar-postgres.mjs --inspeccionar` conectara y
reportara el estado del esquema `banorte`.

**Qué pasa:** `connect ETIMEDOUT 157.173.204.174:5437`. El fallo es de red, antes del
saludo TLS y antes de cualquier autenticación, así que no es un problema de contraseña ni
de `sslmode`.

**Cómo lo reproduje / por qué estoy seguro:**

```
Test-NetConnection 157.173.204.174 -Port 5437   → TcpTestSucceeded: False, PingSucceeded: True
puerto 5432 : cerrado/filtrado
puerto 5437 : cerrado/filtrado
puerto 6432 : cerrado/filtrado
```

El host responde a ICMP pero ningún puerto de Postgres acepta conexión. Es decir: el
servidor está encendido y enrutable, pero el puerto no está expuesto a esta máquina. Las
causas posibles, en orden de probabilidad:

1. El firewall del proveedor o del sistema (ufw / iptables / grupo de seguridad) no permite
   5437 desde esta IP.
2. Postgres escucha solo en `127.0.0.1`; hace falta `listen_addresses = '*'` en
   `postgresql.conf` y reiniciar.
3. Si corre en Docker, el puerto no está publicado (`-p 5437:5432`).
4. `pg_hba.conf` no tiene una línea `host reto_banorte reto <ip>/32 scram-sha-256`. Esto
   daría un error de autenticación, no un timeout, así que por sí solo no explica lo que
   vemos, pero hay que revisarlo igual para el siguiente paso.

**Impacto en la demo:** la rompe **si la demo depende de Postgres**. Hoy no depende: los
datos viven en los 22 CSV commiteados y el ADR 0005 exige que la capa de datos funcione con
`FEATURE_POSTGRES` apagado leyendo los CSV en memoria. Mientras ese fallback exista y esté
probado, esto es un bloqueo de trabajo, no un riesgo de pitch.

**Mitigación aplicada:** `scripts/generar-sql-completo.mjs` produce
`db/cargar-completo.sql`, un archivo autocontenido de 641 KB con el esquema y los 3 690
INSERT. Se puede correr desde el propio servidor o pegarse en una consola SQL web, así que
la carga ya no depende de tener acceso al puerto desde esta máquina.

**Pendiente:** crear el issue en GitHub. `gh` no está instalado en esta máquina, así que la
mitad de GitHub quedó sin hacer y el frontmatter `github:` sigue vacío a propósito.
