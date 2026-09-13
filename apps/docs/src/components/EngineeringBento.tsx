import React from 'react';
import { ShieldCheck, Cpu, Database, LayoutGrid, CheckCircle2, ArrowRight } from 'lucide-react';

export default function EngineeringBento() {
  return (
    <div className="not-content" style={{ margin: '2.5rem 0' }}>
      {/* Título de la sección con ritmo tipográfico */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#171717', letterSpacing: '-0.025em', margin: 0 }}>
          Métricas y Rigor de Ingeniería
        </h2>
        <p style={{ fontSize: '0.95rem', color: '#64748b', margin: '0.35rem 0 0' }}>
          Arquitectura desacoplada, verificada contra la especificación formal y probada con base de datos real.
        </p>
      </div>

      {/* Bento Grid Asimétrico */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Celda 1: Spotlight Principal (A2UI Engine) */}
        <div
          style={{
            gridColumn: '1 / -1',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '0.85rem',
            padding: '1.75rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1.5rem',
          }}
        >
          <div style={{ flex: '1 1 360px', maxWidth: '640px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span
                style={{
                  backgroundColor: '#ffe8ec',
                  color: '#960014',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '999px',
                  letterSpacing: '0.04em',
                }}
              >
                MOTOR PROPIO A2UI v0.9.1
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>spec/ oficial</span>
            </div>

            <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#171717', margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
              76 de 76 Casos de Conformidad Pasados al 100%
            </h3>

            <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
              Desarrollamos un motor A2UI nativo en ~1,310 líneas de TypeScript sin intermediarios ni dependencias opacas. Valida JSON Schemas en caliente mediante <code>ajv</code>, sincroniza el Data Model y garantiza superficies tolerantes a fallos con Error Boundaries granulares.
            </p>
          </div>

          <div
            style={{
              backgroundColor: '#f8f9fa',
              border: '1px solid #e2e8f0',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              minWidth: '220px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#EC0029', fontFamily: 'monospace', lineHeight: 1 }}>
              100%
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#171717', marginTop: '0.35rem' }}>
              Conformidad Oficial
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              76 tests en <code>packages/a2ui</code>
            </div>
          </div>
        </div>

        {/* Celda 2: 18 Tools MCP */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '0.85rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '0.5rem',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Cpu size={18} />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Servidor MCP Streamable HTTP
              </span>
            </div>

            <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#171717', margin: '0 0 0.5rem' }}>
              18 Tools Propias en TypeScript
            </h4>

            <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.55, margin: 0 }}>
              14 de lectura analítica profunda y <strong>4 mutacionales</strong> sobre PostgreSQL con control de concurrencia y registro auditado en <code>banorte.registros</code>.
            </p>
          </div>

          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#EC0029' }}>14 lectura + 4 mutación</span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>103 pruebas unitarias</span>
          </div>
        </div>

        {/* Celda 3: 21 Componentes A2UI */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '0.85rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '0.5rem',
                  backgroundColor: '#ffe8ec',
                  color: '#ec0029',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LayoutGrid size={18} />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Catálogo de Interfaces
              </span>
            </div>

            <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#171717', margin: '0 0 0.5rem' }}>
              21 Widgets Financieros Banorte
            </h4>

            <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.55, margin: 0 }}>
              Diseñados con primitivas shadcn/ui y tokens oficiales Banorte. Validados con Zod y Ajv para evitar renderizados rotos o props incompletas.
            </p>
          </div>

          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#EC0029' }}>Tipado estricto en Zod</span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Táctil &amp; Accesible</span>
          </div>
        </div>

        {/* Celda 4: Integridad Numérica (Full Width Contrast Tile) */}
        <div
          style={{
            gridColumn: '1 / -1',
            backgroundColor: '#f8f9fa',
            border: '1px solid #e2e8f0',
            borderRadius: '0.85rem',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#dcfce7',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#171717' }}>
                Determinismo e Integridad Numérica: Principio de Arquitectura No Negociable
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                El LLM nunca sintetiza saldos, tasas de interés ni plazos de forma arbitraria. Todos los valores numéricos provienen del Data Model poblado por PostgreSQL (22 tablas).
              </div>
            </div>
          </div>

          <a
            href="/arquitectura/vision-general/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#EC0029',
              textDecoration: 'none',
              padding: '0.4rem 0.8rem',
              borderRadius: '0.4rem',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              whiteSpace: 'nowrap',
            }}
          >
            <span>Ver ADR 0008</span>
            <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
