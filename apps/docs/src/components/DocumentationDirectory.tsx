import React from 'react';
import { Presentation, Shield, Layers, Palette, ArrowRight, Clock, Award, Terminal, Code2 } from 'lucide-react';

interface DirectoryCardProps {
  title: string;
  description: string;
  href: string;
  badge: string;
  targetAudience: string;
  meta: string;
  icon: React.ComponentType<{ size: number; color?: string }>;
  featured?: boolean;
}

const SECTIONS: DirectoryCardProps[] = [
  {
    title: 'Presentación Ejecutiva & Pitch',
    description: 'Guión cronometrado de 5 minutos, diapositivas interactivas en vivo y la matriz oficial de rúbrica calificada punto a punto.',
    href: '/presentacion/pitch/',
    badge: '5 MINUTOS',
    targetAudience: 'Para Jueces y Evaluadores',
    meta: 'Pitch · Guión · Rúbrica 100 pts',
    icon: Presentation,
    featured: true,
  },
  {
    title: 'El Reto Banorte',
    description: 'Contexto oficial del hackathon, objetivos de transformación de Maya y demostración de adaptabilidad con perfiles contrastantes.',
    href: '/reto/contexto/',
    badge: 'ESTRATEGIA',
    targetAudience: 'Para Negocio e Innovación',
    meta: 'Entregables · Rúbrica · Perfiles',
    icon: Award,
  },
  {
    title: 'Arquitectura Técnica & ADRs',
    description: 'Detalle a fondo del motor A2UI propio, servidor MCP Streamable HTTP, esquema relacional PostgreSQL y los 10 ADRs de diseño.',
    href: '/arquitectura/vision-general/',
    badge: 'SISTEMA',
    targetAudience: 'Para Arquitectos & Tech Leads',
    meta: 'A2UI · MCP Server · PostgreSQL',
    icon: Layers,
    featured: true,
  },
  {
    title: 'Catálogo de Componentes A2UI',
    description: '21 widgets interactivos financieros con tokens Banorte, esquemas Zod, eventos táctiles y garantías de renderizado determinista.',
    href: '/catalogo/resumen/',
    badge: 'UI / UX',
    targetAudience: 'Para Diseñadores & Frontend',
    meta: '21 Componentes · Zod · Shadcn',
    icon: Palette,
  },
];

export default function DocumentationDirectory() {
  return (
    <div className="not-content" style={{ margin: '3rem 0 1rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#171717', letterSpacing: '-0.025em', margin: 0 }}>
          Exploración de la Documentación
        </h2>
        <p style={{ fontSize: '0.95rem', color: '#64748b', margin: '0.35rem 0 0' }}>
          Guías completas, especificaciones técnicas y material de evaluación estructurado por rol de lectura.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
        }}
      >
        {SECTIONS.map((sec) => {
          const IconComp = sec.icon;
          return (
            <a
              key={sec.href}
              href={sec.href}
              style={{
                textDecoration: 'none',
                color: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                backgroundColor: '#ffffff',
                border: sec.featured ? '1.5px solid #cbd5e1' : '1px solid #e2e8f0',
                borderRadius: '0.85rem',
                padding: '1.4rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                transition: 'all 0.15s ease-out',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#EC0029';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(236, 0, 41, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = sec.featured ? '#cbd5e1' : '#e2e8f0';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.03)';
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '0.5rem',
                      backgroundColor: sec.featured ? '#ffe8ec' : '#f8f9fa',
                      color: sec.featured ? '#EC0029' : '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IconComp size={18} />
                  </div>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      color: sec.featured ? '#960014' : '#64748b',
                      backgroundColor: sec.featured ? '#ffe8ec' : '#f1f5f9',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {sec.badge}
                  </span>
                </div>

                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ec0029', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.25rem' }}>
                  {sec.targetAudience}
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#171717', margin: '0 0 0.5rem', letterSpacing: '-0.015em' }}>
                  {sec.title}
                </h3>

                <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.55, margin: 0 }}>
                  {sec.description}
                </p>
              </div>

              <div
                style={{
                  marginTop: '1.25rem',
                  paddingTop: '0.85rem',
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                  {sec.meta}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#EC0029', fontWeight: 700, fontSize: '0.82rem' }}>
                  <span>Abrir</span>
                  <ArrowRight size={14} />
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
