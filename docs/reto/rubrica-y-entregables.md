---
verificado: 2026-09-12 04:30
fuentes: [presentacion-oficial-pdf]
---

# Rúbrica y entregables

Lo que evalúan y con qué se entrega, tal cual lo publicó Banorte, y qué hacemos
nosotros con cada punto. Es el documento que el rol `demo` revisa cada 6 horas.

## Rúbrica (100 puntos)

| # | Criterio | Peso | Qué lo demuestra en nuestra demo | Quién lo cuida |
|---|---|---|---|---|
| 1 | **Cumplimiento y utilidad para el usuario** | 25 | El flujo resuelve un problema financiero real de principio a fin; la acción ocurre y se ve reflejada | todos; `demo` verifica |
| 2 | **Calidad y adaptabilidad de la UI generada** | 20 | La misma pregunta con otro contexto (otro saldo, otro perfil) produce **otra interfaz**; intenciones distintas producen componentes distintos; la UI cambia tras cada interacción | `web`, `contrato` |
| 3 | **Calidad de la solución de IA** | 15 | El agente interpreta bien la intención, usa el contexto que regresa de la UI, no alucina datos, elige las tools correctas | `contrato` |
| 4 | **Arquitectura e ingeniería** | 15 | MCP propio bien hecho, A2UI real, contrato tipado, tests, repo que corre con instrucciones | `mcp`, `contrato` |
| 5 | **UX y diseño** | 10 | Sistema de componentes propio, coherente, legible en proyector | `web` |
| 6 | **Innovación** | 10 | Algo que el jurado no vio en los demás: composición de interfaces, voz, adaptación por perfil | todos |
| 7 | **Presentación** | 5 | Pitch de 5 min, sin trabas | `demo` |

### Lectura estratégica

- **45 puntos (1+2)** dependen de elegir bien el problema y de que la UI *cambie de
  verdad*. Una demo donde siempre sale la misma tabla pierde el criterio 2 completo.
  Por eso el guion debe mostrar **adaptación**: mismo intent, contexto distinto,
  interfaz distinta.
- **30 puntos (3+4)** son ingeniería visible: MCP con tools bien descritas, A2UI con
  catálogo propio, el ciclo cerrado (acción → agente → nueva UI). El repo debe leerse
  bien; los jueces lo van a abrir.
- **20 puntos (5+6)** se ganan con un sistema de componentes cuidado y una idea que
  sorprenda. Los premios laterales (voz, series de tiempo) cuentan aquí si están bien
  integrados.
- **5 puntos** de presentación: no salvan nada, pero un pitch trabado los pierde.

## Entregables (4)

| # | Entregable | Qué piden literal | Dónde vive en nuestro repo | Estado |
|---|---|---|---|---|
| 01 · Demo | **Corrida en vivo** | "El flujo completo: intención, UI generada, interacción y la acción que dispara" | `docs/demo/guion-demo.md`, `pitch.md`, `checklist-previa.md` | **construido** (corrida verificada 2026-09-12 09:00) |
| 02 · Código | **Repositorio** | "Componentes, servidor MCP y capa A2UI, con instrucciones para correrlo" | `packages/catalogo` (8 componentes), `packages/a2ui` (motor), `apps/mcp` (18 tools), `README.md` con los comandos reales | **construido** |
| 03 · Datos | **APIs y datasets** | "Los servicios creados por el equipo, aunque los datos sean sintéticos" | PostgreSQL esquema `banorte`; `db/schema.sql` y `db/migraciones/`; `docs/como-funciona/datos-mock.md` y `base-de-datos.md` (ADR 0010) | **construido** |
| 04 · Técnico | **Decisiones** | "Diagrama de arquitectura y los trade-offs: modelo, protocolo, infraestructura" | `docs/arquitectura/vision-general.md` + `trade-offs.md` + `docs/decisiones/` (10 ADR) | **construido** (2026-09-12 10:00) |

### Lo que el repo tiene que tener el domingo, sin excepción

- [x] `README.md` raíz: qué es, cómo se corre, dónde está cada cosa, qué modelo usa y
      cómo poner la API key.
- [x] `docs/arquitectura/vision-general.md` con el diagrama, en `construido`.
- [x] `docs/arquitectura/trade-offs.md`: modelo, protocolo, infraestructura, con la
      alternativa descartada de cada uno y las tres preguntas que esperamos del jurado.
- [x] Datos sintéticos documentados; esquema y migraciones en `db/` (viven en PostgreSQL,
      ADR 0010).
- [x] Servidor MCP que arranca solo y lista sus tools en `/health`.
- [x] Catálogo A2UI documentado y **publicado** en `/catalogo/v1.json`.
- [ ] Grabación de respaldo de la demo, desde `estable`.
- [x] Plan B sin red ensayado (Postgres local + `pnpm datos:restaurar`). Ensayado entero el
      2026-09-12: 3,690 filas y el MCP arriba contra Postgres local (issue #10).
