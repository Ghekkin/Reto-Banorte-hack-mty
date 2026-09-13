---
estado: resuelto
severidad: media
area: web
encontrado: 2026-09-13 06:48
github: 41
resuelto-en: a4134cd
---

# `orientar_consulta_no_valida` devuelve `tipoInvalidez: incompatible_con_politica`, que `AvisoConsultaNoValida` no acepta

**Dónde:** `packages/schemas/src/tools/orientar-consulta-no-valida.ts:29-34` (`TipoInvalidez` incluye
`incompatible_con_politica`) contra `packages/catalogo/src/aviso-consulta-no-valida/schema.ts:15` (el enum
del componente solo tiene `producto_no_aplica | deuda_prioritaria | fuera_de_alcance | sin_datos_suficientes`).

**Qué esperaba:** que el valor que devuelve la tool se pueda pintar tal cual en el componente que existe
para mostrarla.

**Qué pasa:** cuando la tool clasifica una consulta como `incompatible_con_politica` y el modelo copia el
valor, la pantalla se rechaza: `AvisoConsultaNoValida (aviso): tipoInvalidez Invalid option`. Paga un
paso extra o termina sin pantalla.

**Cómo lo sé:** 2 rechazos con ese error en `banorte.corrida_tools` (05:35 y 05:39 del 13, Beto,
portada con pregunta). Lo encontró el agente que arregló #40 (`8060918`); con #40 resuelto el aviso ya
pinta, así que este es el siguiente tropiezo del mismo flujo.

**Impacto en la demo:** medio: una consulta fuera de política (cripto, apuestas) puede quedarse sin
pantalla.

**Arreglo:** alinear el contrato (skill `cambiar-schema`): un solo enum compartido, el componente sabe
pintar cada valor, `catalogo.json` regenerado y prueba de que todo valor de la tool valida en el componente.

## Resolución

Resuelto en `a4134cd`. `incompatible_con_politica` salió de `TipoInvalidez` (`packages/schemas/src/tools/orientar-consulta-no-valida.ts`): ningún caso del dominio lo devolvía (lo que la política o la regulación no permite ya es `fuera_de_alcance`) y `AvisoConsultaNoValida` no lo aceptaba; como el host copia el valor de la tool al componente cuando el modelo lo omite (`8060918`), un valor fuera del enum lo habría rechazado en cada intento. Los dos enums siguen en paquetes separados y los amarra `apps/web/src/lib/agente/__tests__/contrato-aviso-consulta.spec.ts` (3; fallan contra el schema anterior). Tabla de tipos en el README del componente. **Corrección al diagnóstico:** los 2 rechazos de las 05:35 y 05:39 no fueron por este valor sino por el modelo omitiendo `tipoInvalidez` tras el relleno roto de #40.
