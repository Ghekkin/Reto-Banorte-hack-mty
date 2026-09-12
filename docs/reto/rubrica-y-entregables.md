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
| 01 · Demo | **Corrida en vivo** | "El flujo completo: intención, UI generada, interacción y la acción que dispara" | `docs/demo/guion-demo.md`, `checklist-previa.md` | plan |
| 02 · Código | **Repositorio** | "Componentes, servidor MCP y capa A2UI, con instrucciones para correrlo" | `apps/web` (componentes + capa A2UI), `apps/mcp`, `README.md` raíz con instrucciones | plan |
| 03 · Datos | **APIs y datasets** | "Los servicios creados por el equipo, aunque los datos sean sintéticos" | `apps/mcp/data/`, `docs/como-funciona/datos-mock.md` | plan |
| 04 · Técnico | **Decisiones** | "Diagrama de arquitectura y los trade-offs: modelo, protocolo, infraestructura" | `docs/arquitectura/vision-general.md` + `docs/arquitectura/trade-offs.md` + `docs/decisiones/` | plan |

### Lo que el repo tiene que tener el domingo, sin excepción

- [ ] `README.md` raíz: qué es, cómo se corre en 5 comandos, dónde está cada cosa,
      qué modelo usa y cómo poner la API key.
- [ ] `docs/arquitectura/vision-general.md` con el diagrama en `construido`.
- [ ] `docs/arquitectura/trade-offs.md`: modelo, protocolo, infraestructura, con la
      alternativa descartada de cada uno.
- [ ] Datos sintéticos commiteados y documentados.
- [ ] Servidor MCP que arranca solo y lista sus tools.
- [ ] Catálogo A2UI documentado: qué componentes existen y qué props aceptan.
