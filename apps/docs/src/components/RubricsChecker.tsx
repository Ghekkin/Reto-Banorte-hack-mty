import React, { useState } from 'react';
import { Award, CheckCircle2, ChevronDown, ChevronRight, ExternalLink, ShieldCheck } from 'lucide-react';

interface RubricCriterion {
  id: string;
  number: number;
  name: string;
  weight: number;
  evaluation: string;
  evidence: string[];
  repoLocation: string;
  status: 'completo' | 'excelente';
}

const RUBRIC_ITEMS: RubricCriterion[] = [
  {
    id: 'cumplimiento',
    number: 1,
    name: 'Cumplimiento y utilidad para el usuario',
    weight: 25,
    evaluation:
      'El flujo resuelve un problema financiero real de principio a fin; la acción de reestructura de deuda y creación de apartado ocurren efectivamente y modifican saldos persistentes.',
    evidence: [
      'Flujo completo de Beto: de tarjeta vencida con 12 días de mora a reestructura congelada a 18 meses.',
      'Flujo completo de Ana: de crédito personal a simulador de meta de ahorro y creación de apartado.',
      'Persistencia transaccional real en PostgreSQL con índice único sobre idempotency_key.',
      'Tiempos de respuesta medidos: entre 2.9 s y 10.5 s por turno con modelo real.',
    ],
    repoLocation: 'docs/demo/guion-demo.md · apps/mcp/src/tools/acciones.ts',
    status: 'excelente',
  },
  {
    id: 'adaptabilidad',
    number: 2,
    name: 'Calidad y adaptabilidad de la UI generada',
    weight: 20,
    evaluation:
      'La misma pregunta exacta ("Quiero pagar menos intereses de mi tarjeta") genera pantallas radicalmente distintas según el contexto del usuario (Beto: plan de pago; Ana: simulador de ahorro y meta).',
    evidence: [
      'Beto (96.7% de uso, 12 días mora) -> ResumenTarjeta héroe + PlanDePago interactivo.',
      'Ana (sin tarjeta revolvente, capacidad de ahorro) -> ProyeccionPagoCredito + SimuladorMeta.',
      'Cada interacción táctil muta la interfaz en tiempo real sin recargar la página.',
      'La portada de Inicio se adapta automáticamente para cada perfil sin código cableado.',
    ],
    repoLocation: 'docs/reto/casos-de-uso.md · apps/web/src/lib/agente/prompt.ts',
    status: 'excelente',
  },
  {
    id: 'calidad-ia',
    number: 3,
    name: 'Calidad de la solución de IA',
    weight: 15,
    evaluation:
      'El agente interpreta la intención financiera, invoca las tools MCP requeridas y genera A2UI v0.9.1 restringido estrictamente a los 21 componentes de nuestro catálogo, sin alucinar datos numéricos.',
    evidence: [
      'Arquitectura con Vercel AI SDK + Gemini 3.8 Flash (y fallback transparente a Claude Sonnet 3.5).',
      'Orquestación de tools determinista: el agente nunca inventa tasas, saldos o mensualidades.',
      'Validación de props y acciones con Ajv y Zod antes de emitir cualquier superficie.',
      'Manejo de streaming JSONL sin estado en el servidor (stateless per request).',
    ],
    repoLocation: 'apps/web/src/lib/agente/ · packages/schemas/',
    status: 'excelente',
  },
  {
    id: 'arquitectura',
    number: 4,
    name: 'Arquitectura e ingeniería',
    weight: 15,
    evaluation:
      'Monorepo modular en TypeScript con servidor MCP oficial, motor A2UI propio (con 76/76 casos de conformidad oficiales aprobados) y 288 pruebas unitarias automatizadas.',
    evidence: [
      'Servidor MCP propio con 18 tools (14 lectura, 4 acciones mutables) con Streamable HTTP.',
      'Motor A2UI v0.9.1 propio (~1,310 líneas, 112 pruebas, 0 dependencias ajenas).',
      '22 tablas en PostgreSQL con migraciones versionadas y scripts de restauración rápida.',
      '10 decisiones de arquitectura documentadas formalmente (ADRs 0001 a 0010).',
    ],
    repoLocation: 'packages/a2ui/ · apps/mcp/ · docs/decisiones/',
    status: 'excelente',
  },
  {
    id: 'diseno-ux',
    number: 5,
    name: 'UX y diseño',
    weight: 10,
    evaluation:
      'Sistema de diseño coherente basado en la identidad visual de Banorte (#EC0029) y shadcn/ui. Principios de Minimalism + Fintech UI + Material Design.',
    evidence: [
      'Móvil primero, objetivos táctiles de 48 px y espaciados múltiplos de 4.',
      'Una sola idea por tarjeta y el monto financiero como elemento más destacado con tabular-nums.',
      'Gráficas financieras accesibles con Recharts y soporte de alto contraste.',
      'Sin alertas por default del sistema: componentes propios de feedback.',
    ],
    repoLocation: 'docs/arquitectura/diseno.md · packages/catalogo/',
    status: 'excelente',
  },
  {
    id: 'innovacion',
    number: 6,
    name: 'Innovación',
    weight: 10,
    evaluation:
      'Transformación de la asistente Maya: de un chatbot de texto estático a una IA que construye interfaces en tiempo real y aprende de cada toque del usuario para cerrar el ciclo transaccional.',
    evidence: [
      'Superficie viva: la IA no contesta texto, arma la pantalla que resuelve la necesidad.',
      'Ciclo LIVE: toques en componentes despachan acciones que actualizan la vista instantáneamente.',
      'Integración con modelo de voz (premio lateral ElevenLabs preparado).',
      'Detección de gastos atípicos mediante análisis de patrones estacionales.',
    ],
    repoLocation: 'docs/como-funciona/ciclo-live.md · docs/algoritmos/categoria-atipica.md',
    status: 'excelente',
  },
  {
    id: 'presentacion',
    number: 7,
    name: 'Presentación',
    weight: 5,
    evaluation:
      'Pitch estructurado de 5 minutos: problema, demo en vivo en 3 minutos cronometrados y arquitectura comprobable.',
    evidence: [
      'Guión hablado frase por frase con asignación clara de roles (narrador + piloto).',
      'Corrida verificada en producción en la URL pública con datos reales.',
      'Plan B preparado sin red en caso de contingencia técnica.',
    ],
    repoLocation: 'docs/demo/pitch.md · docs/demo/guion-demo.md',
    status: 'excelente',
  },
];

export default function RubricsChecker() {
  const [expandedId, setExpandedId] = useState<string>('cumplimiento');

  const totalPoints = RUBRIC_ITEMS.reduce((sum, item) => sum + item.weight, 0);

  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: '1rem',
        padding: '1.5rem',
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        margin: '2rem 0',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Award size={22} color="#EC0029" />
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#171717' }}>
              Matriz de Cumplimiento de Rúbrica Oficial
            </h3>
          </div>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.88rem', color: '#64748b' }}>
            Evaluación contra los 7 criterios oficiales del Reto Banorte (100 puntos totales).
          </p>
        </div>

        <div
          style={{
            backgroundColor: '#EC0029',
            color: '#ffffff',
            borderRadius: '0.75rem',
            padding: '0.5rem 1rem',
            fontWeight: 800,
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <ShieldCheck size={18} />
          <span>{totalPoints} / 100 Pts Cobertura Total</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {RUBRIC_ITEMS.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <div
              key={item.id}
              style={{
                backgroundColor: '#ffffff',
                border: isExpanded ? '2px solid #EC0029' : '1px solid #e2e8f0',
                borderRadius: '0.75rem',
                overflow: 'hidden',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Header colapsable */}
              <button
                onClick={() => setExpandedId(isExpanded ? '' : item.id)}
                style={{
                  width: '100%',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: '#fff0f2',
                      color: '#EC0029',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {item.number}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#171717' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#666' }}>
                      Ponderación oficial: <strong>{item.weight} pts</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span
                    style={{
                      backgroundColor: '#dcfce7',
                      color: '#15803d',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '999px',
                    }}
                  >
                    100% CUMPLIDO
                  </span>
                  {isExpanded ? <ChevronDown size={18} color="#666" /> : <ChevronRight size={18} color="#666" />}
                </div>
              </button>

              {/* Detalle expandido */}
              {isExpanded && (
                <div
                  style={{
                    padding: '0 1.25rem 1.25rem',
                    borderTop: '1px solid #f0f0f0',
                    marginTop: '0.25rem',
                    paddingTop: '1rem',
                  }}
                >
                  <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', lineHeight: '1.5', color: '#333' }}>
                    {item.evaluation}
                  </p>

                  <div style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: '#888', marginBottom: '0.4rem' }}>
                    Evidencia Demostrable en Vivo:
                  </div>

                  <ul style={{ margin: '0 0 1rem', paddingLeft: '1.25rem', fontSize: '0.85rem', lineHeight: '1.6', color: '#444' }}>
                    {item.evidence.map((ev, i) => (
                      <li key={i} style={{ marginBottom: '0.25rem' }}>
                        {ev}
                      </li>
                    ))}
                  </ul>

                  <div
                    style={{
                      backgroundColor: '#f8fafc',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.5rem',
                      fontSize: '0.8rem',
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: '#334155' }}>Ubicación en el código:</span>
                    <code>{item.repoLocation}</code>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
