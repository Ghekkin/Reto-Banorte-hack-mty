import React, { useState } from 'react';
import {
  Cpu,
  Server,
  Layers,
  Component,
  Database,
  User,
  ArrowRight,
  CheckCircle,
  FileCode,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface NodeDetail {
  id: string;
  name: string;
  icon: any;
  role: string;
  location: string;
  stats: string[];
  responsibilities: string[];
  contracts: string;
  keyHighlight: string;
}

const ARCHITECTURE_NODES: NodeDetail[] = [
  {
    id: 'usuario',
    name: '1. Usuario y Superficie',
    icon: User,
    role: 'Interacción humana en lenguaje natural y retroalimentación de interfaz táctil',
    location: 'apps/web/src/app',
    stats: ['Móvil primero', 'Touch targets 48px', 'Lienzo bento adaptativo'],
    responsibilities: [
      'Ingreso de intenciones financieras en lenguaje natural (texto o voz).',
      'Interacción táctil con componentes generados (sliders, selección de plazos, confirmaciones).',
      'Despacho automático de acciones de vuelta al agente mediante eventos A2UI estándar.',
    ],
    contracts: 'action { name, surfaceId, sourceComponentId, context, idempotencyKey }',
    keyHighlight:
      'La UI no es un chat con texto: es un lienzo vivo donde cada acción del usuario muta la experiencia.',
  },
  {
    id: 'agente',
    name: '2. Agente / LLM Host',
    icon: Cpu,
    role: 'Orquestación de intenciones, llamadas a tools MCP y emisión de A2UI v0.9.1',
    location: 'apps/web/src/lib/agente/',
    stats: ['~1,240 líneas TS', 'Gemini 3.8 Flash (principal)', 'Claude Sonnet 3.5 (respaldo)'],
    responsibilities: [
      'Interpretación de intención según el perfil activo (Beto, Ana, Carmen).',
      'Llamadas autónomas a tools del MCP antes de proponer cualquier interfaz.',
      'Emisión de mensajes A2UI (createSurface, updateComponents, updateDataModel) validados.',
      'Recepción de acciones de la interfaz para cerrar el ciclo de ejecución.',
    ],
    contracts: 'POST /api/agente (Stream JSONL: estado, tool, a2ui, texto, razon, fin)',
    keyHighlight:
      'El modelo nunca inventa cifras financieras: todas provienen del data model poblado por el MCP.',
  },
  {
    id: 'mcp',
    name: '3. Servidor MCP Propio',
    icon: Server,
    role: 'Capa estandarizada de acceso a datos y ejecución de acciones transaccionales',
    location: 'apps/mcp/',
    stats: ['18 Tools (14 lectura + 4 acción)', '103 pruebas vitest', 'Streamable HTTP (:3100)'],
    responsibilities: [
      'Lectura de estados de cuenta, balances, compras por categoría y métricas de salud.',
      'Simulación determinista de reestructuras de tarjeta y planes de ahorro.',
      'Ejecución de cambios reales con idempotencia: aplicar plan, crear apartado, pausar suscripción.',
      'Protección de datos mediante contratos Zod estrictos.',
    ],
    contracts: 'JSON-RPC 2.0 / Model Context Protocol sobre HTTP',
    keyHighlight:
      'Un servidor MCP estándar que cualquier cliente externo puede inspeccionar en /health.',
  },
  {
    id: 'a2ui',
    name: '4. Motor A2UI v0.9.1 Propio',
    icon: Layers,
    role: 'Renderer determinista conforme a la especificación oficial A2UI',
    location: 'packages/a2ui/',
    stats: ['~1,310 líneas TS', '112 pruebas', '76/76 casos de conformidad oficiales'],
    responsibilities: [
      'Validación bidireccional mediante Ajv y JSON Schemas oficiales v0.9.1.',
      'Construcción y actualización del árbol jerárquico de componentes.',
      'Resolución reactiva de JSON Pointers y data bindings dinámicos.',
      'Enrutamiento de eventos táctiles a acciones estructuradas client_to_server.',
    ],
    contracts: 'createSurface · updateComponents · updateDataModel · action',
    keyHighlight:
      'Cero dependencias de librerías propietarias de UI generativa: motor fiel a la especificación abierta.',
  },
  {
    id: 'catalogo',
    name: '5. Catálogo de Componentes',
    icon: Component,
    role: 'Componentes financieros React accesibles y diseñados bajo la identidad Banorte',
    location: 'packages/catalogo/',
    stats: ['21 componentes propios', '4 componentes layout', 'shadcn/ui + Tailwind v4'],
    responsibilities: [
      'Tarjetas de crédito, amortización, sliders de simulación y gráficos Recharts.',
      'Esquemas Zod declarativos para props y acciones permitidas.',
      'Generación automática de catalogo.json servido en /catalogo/v1.json.',
      'Restricción absoluta de alucinación visual: el LLM solo puede componer componentes registrados.',
    ],
    contracts: 'Zod schemas por componente con validación de props en tiempo de render',
    keyHighlight:
      'Si el LLM propone un componente o prop que no existe en el catálogo, es rechazado antes de pintar.',
  },
  {
    id: 'db',
    name: '6. PostgreSQL (Esquema Banorte)',
    icon: Database,
    role: 'Persistencia transaccional de 22 tablas y registro mutable de acciones aplicadas',
    location: 'db/ (schema.sql, migraciones/)',
    stats: ['22 tablas relacionales', '3 perfiles demo completos', 'Índice único sobre idempotency_key'],
    responsibilities: [
      'Persistencia de transacciones, saldos, productos de crédito y metas de ahorro.',
      'Tabla banorte.acciones_aplicadas para garantizar que una acción nunca se duplica.',
      'Aseguramiento de que el cambio realizado en la UI persiste ante reinicios de servidor.',
    ],
    contracts: 'SQL / PostgreSQL con transacciones ACID',
    keyHighlight:
      'No hay mocks en memoria para el estado: el plan aplicado se escribe en Postgres y perdura.',
  },
];

export default function ArchitectureExplorer() {
  const [activeNodeId, setActiveNodeId] = useState<string>('agente');
  const activeNode = ARCHITECTURE_NODES.find((n) => n.id === activeNodeId)!;

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
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <Zap size={20} color="#EC0029" />
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#171717' }}>
            Explorador Interactivo de Arquitectura
          </h3>
        </div>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
          Haz clic en cada componente para inspeccionar sus responsabilidades, código fuente, contratos y pruebas.
        </p>
      </div>

      {/* Grid de Nodos */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}
      >
        {ARCHITECTURE_NODES.map((node) => {
          const isSelected = node.id === activeNodeId;
          const IconComp = node.icon;
          return (
            <button
              key={node.id}
              onClick={() => setActiveNodeId(node.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.75rem 0.9rem',
                borderRadius: '0.75rem',
                textAlign: 'left',
                border: isSelected ? '2px solid #EC0029' : '1px solid #e2e8f0',
                backgroundColor: isSelected ? '#ffffff' : '#f8f9fa',
                color: isSelected ? '#171717' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? '0 2px 8px rgba(236, 0, 41, 0.12)' : 'none',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isSelected ? '#EC0029' : '#e2e8f0',
                  color: isSelected ? '#ffffff' : '#475569',
                  flexShrink: 0,
                }}
              >
                <IconComp size={18} />
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: isSelected ? 700 : 500 }}>
                {node.name.split('. ')[1]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Panel de Detalle del Nodo */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '0.85rem',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          color: '#171717',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1rem',
            borderBottom: '1px solid #f0f0f0',
            paddingBottom: '1rem',
            marginBottom: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  backgroundColor: '#EC0029',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '999px',
                }}
              >
                CAPA ACTIVA
              </span>
              <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>{activeNode.name}</h4>
            </div>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.9rem', color: '#555555' }}>
              {activeNode.role}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#666666' }}>
            <FileCode size={16} color="#EC0029" />
            <code style={{ backgroundColor: '#f5f5f5', padding: '0.2rem 0.5rem', borderRadius: '0.25rem' }}>
              {activeNode.location}
            </code>
          </div>
        </div>

        {/* Métricas rápidas */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {activeNode.stats.map((stat, i) => (
            <span
              key={i}
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                padding: '0.25rem 0.6rem',
                color: '#334155',
              }}
            >
              ✓ {stat}
            </span>
          ))}
        </div>

        {/* Responsabilidades */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#888888', marginBottom: '0.5rem' }}>
            Responsabilidades Clave
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.88rem', lineHeight: '1.6', color: '#333333' }}>
            {activeNode.responsibilities.map((r, i) => (
              <li key={i} style={{ marginBottom: '0.3rem' }}>
                {r}
              </li>
            ))}
          </ul>
        </div>

        {/* Contrato / Protocolo */}
        <div
          style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #EC0029',
            color: '#1e293b',
            borderRadius: '0.6rem',
            padding: '0.75rem 1rem',
            fontSize: '0.82rem',
            fontFamily: 'monospace',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            overflowX: 'auto',
          }}
        >
          <span style={{ color: '#ec0029', fontWeight: 700 }}>CONTRATO:</span>
          <span>{activeNode.contracts}</span>
        </div>

        {/* Highlight de diseño */}
        <div
          style={{
            backgroundColor: '#fff5f6',
            borderLeft: '3px solid #EC0029',
            padding: '0.6rem 0.9rem',
            borderRadius: '0 0.5rem 0.5rem 0',
            fontSize: '0.85rem',
            color: '#960014',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <ShieldCheck size={18} style={{ flexShrink: 0 }} />
          <span>{activeNode.keyHighlight}</span>
        </div>
      </div>
    </div>
  );
}
