import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  CheckCircle,
  CreditCard,
  Calendar,
  PieChart,
  Target,
  Sparkles,
  ArrowRight,
  Clock,
  Database,
  Layers,
  Terminal,
} from 'lucide-react';

interface StepData {
  stepNumber: number;
  title: string;
  user: string;
  userPrompt: string;
  mcpTools: string[];
  duration: string;
  uiEmitted: string[];
  explanation: string;
  highlight: string;
  renderedMock: React.ReactNode;
}

export default function DemoFlowSimulator() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedMonths, setSelectedMonths] = useState<number>(18);
  const [savingsAmount, setSavingsAmount] = useState<number>(2500);

  const steps: StepData[] = [
    {
      stepNumber: 1,
      title: 'Paso 1: Intención a Interfaz Generada',
      user: 'Beto (Supervisor de logística, tarjeta al 96.7%, 12 días de mora)',
      userPrompt: 'Quiero pagar menos intereses de mi tarjeta',
      mcpTools: ['panorama_inicial', 'simular_reestructura'],
      duration: '10.5 s (medido con modelo real)',
      uiEmitted: ['ResumenTarjeta (Héroe)', 'PlanDePago (12, 18, 24 meses)', 'BotonAccion'],
      explanation:
        'El agente interpreta la urgencia de deuda revolvente con mora, consulta el MCP y emite A2UI con opciones concretas de reestructura en vez de redactar texto.',
      highlight:
        'Cero pantallas programadas. El LLM compone la vista usando el catálogo registrado y restringe el uso a componentes oficiales.',
      renderedMock: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Tarjeta de Resumen */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '2px solid #EC0029',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              color: '#171717',
              boxShadow: '0 2px 8px rgba(236, 0, 41, 0.08)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CreditCard size={18} color="#EC0029" />
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Banorte Clásica •••• 4821</span>
              </div>
              <span
                style={{
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.5rem',
                  borderRadius: '999px',
                }}
              >
                12 DÍAS DE ATRASO
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>Saldo total a pagar</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#171717' }}>$47,386.00</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>Límite de crédito</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#555' }}>$49,000.00 (96.7% uso)</div>
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#777', borderTop: '1px solid #f0f0f0', paddingTop: '0.5rem' }}>
              Tasa anual: <strong>48.9%</strong> · Pago mínimo: <strong>$2,950.73</strong> (solo intereses)
            </div>
          </div>

          {/* Tarjeta Plan de Pago */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              color: '#171717',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.75rem' }}>
              Alternativas de Reestructura a Tasa Preferencial (22.5%)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
              {[
                { m: 12, pago: '$4,640.10', ahorro: '$8,240' },
                { m: 18, pago: '$3,193.35', ahorro: '$14,650', rec: true },
                { m: 24, pago: '$2,510.40', ahorro: '$11,100' },
              ].map((opt) => (
                <div
                  key={opt.m}
                  onClick={() => setSelectedMonths(opt.m)}
                  style={{
                    border: selectedMonths === opt.m ? '2px solid #EC0029' : '1px solid #cbd5e1',
                    borderRadius: '0.5rem',
                    padding: '0.6rem',
                    cursor: 'pointer',
                    backgroundColor: selectedMonths === opt.m ? '#fff5f6' : '#ffffff',
                    position: 'relative',
                  }}
                >
                  {opt.rec && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '6px',
                        backgroundColor: '#EC0029',
                        color: '#fff',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '0.1rem 0.4rem',
                        borderRadius: '999px',
                      }}
                    >
                      RECOMENDADO
                    </span>
                  )}
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{opt.m} meses</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#EC0029' }}>{opt.pago}</div>
                  <div style={{ fontSize: '0.7rem', color: '#16a34a' }}>Ahorras {opt.ahorro}</div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setCurrentStep(2)}
              style={{
                width: '100%',
                backgroundColor: '#EC0029',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.5rem',
                padding: '0.75rem',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <span>Aplicar plan a {selectedMonths} meses</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      ),
    },
    {
      stepNumber: 2,
      title: 'Paso 2: Interacción -> Acción Real en BD -> Pantalla Cambiada',
      user: 'Beto selecciona 18 meses y presiona "Aplicar plan"',
      userPrompt: '[Toque en botón A2UI: action: aplicar_plan_pago, contexto: { meses: 18 }]',
      mcpTools: ['aplicar_plan_pago', 'consultar_plan'],
      duration: '5.8 s (medido)',
      uiEmitted: ['Confirmacion (Éxito)', 'ResumenTarjeta (Actualizada a $0 saldo)', 'CalendarioPagos'],
      explanation:
        'La acción del usuario viaja de regreso al agente. Maya llama a la tool del MCP, muta la base de datos PostgreSQL en banorte.acciones_aplicadas con idempotencia, y re-renderiza la pantalla con el nuevo estado.',
      highlight:
        '¡El ciclo se cierra! La tarjeta original ahora muestra $0 de saldo revolvente, badge verde "Plan activo" y se pinta el calendario de amortización.',
      renderedMock: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Confirmación */}
          <div
            style={{
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '0.75rem',
              padding: '1rem 1.25rem',
              color: '#065f46',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <CheckCircle size={24} color="#059669" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Plan de reestructura activo con éxito</div>
              <div style={{ fontSize: '0.82rem' }}>
                Tu primer pago de <strong>$3,193.35</strong> será el <strong>12 de octubre de 2026</strong>.
              </div>
            </div>
          </div>

          {/* Tarjeta cambiada en tiempo real */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '2px solid #10b981',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              color: '#171717',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CreditCard size={18} color="#10b981" />
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Banorte Clásica •••• 4821</span>
              </div>
              <span
                style={{
                  backgroundColor: '#d1fae5',
                  color: '#065f46',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.5rem',
                  borderRadius: '999px',
                }}
              >
                PLAN DE PAGO ACTIVO
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>Saldo revolvente pendiente</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>$0.00</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>Monto reestructurado</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#555' }}>$47,386.00 (18 pagos)</div>
              </div>
            </div>
          </div>

          {/* Calendario de pagos */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '0.75rem',
              padding: '1rem',
              color: '#171717',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              <Calendar size={16} color="#EC0029" />
              <span>Próximas amortizaciones</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #eee' }}>
              <span>Pago 1 de 18 (12 Oct 2026)</span>
              <strong>$3,193.35</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0' }}>
              <span>Pago 2 de 18 (12 Nov 2026)</span>
              <strong>$3,193.35</strong>
            </div>
          </div>
        </div>
      ),
    },
    {
      stepNumber: 3,
      title: 'Paso 3: Conversación Continua y Memoria Contextual',
      user: 'Beto continúa en la misma sesión',
      userPrompt: '¿Y en qué se me está yendo el dinero?',
      mcpTools: ['comparar_periodos'],
      duration: '3.6 s (medido)',
      uiEmitted: ['GastoPorCategoria', 'AlertaGastoAtipico', 'ConclusionMaya'],
      explanation:
        'El agente recuerda lo que ocurrió en el turno anterior. Genera un desglose de gastos y en su conclusión explica que los intereses empezarán a bajar inmediatamente debido al plan que se pactó hace instantes.',
      highlight:
        'No es un dashboard frío: es una conversación adaptativa donde cada pantalla sabe qué ocurrió en la anterior.',
      renderedMock: (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.25rem', color: '#171717' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            <PieChart size={18} color="#EC0029" />
            <span>Desglose Mensual por Categoría ($28,450.00)</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff5f6', padding: '0.4rem 0.6rem', borderRadius: '0.4rem', borderLeft: '3px solid #EC0029' }}>
              <div>
                <span style={{ fontWeight: 700, color: '#991b1b' }}>Retiros de efectivo (Atípico +74.7%)</span>
                <div style={{ fontSize: '0.7rem', color: '#666' }}>Mayor fuga detectada respecto a tu promedio</div>
              </div>
              <strong style={{ color: '#991b1b' }}>$9,500.00</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0.6rem' }}>
              <span>Alimentos y supermercado</span>
              <strong>$7,200.00</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0.6rem' }}>
              <span>Servicios y suscripciones</span>
              <strong>$4,350.00</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0.6rem', color: '#16a34a' }}>
              <span>Intereses financieros</span>
              <span>Bajando por tu plan activo ✓</span>
            </div>
          </div>
          <div style={{ fontSize: '0.82rem', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', color: '#334155' }}>
            <strong>Conclusión de Maya:</strong> "El 33% de tus egresos fueron retiros de cajero. Al haber congelado tu deuda a 18 meses en el paso anterior, liberaste <strong>$1,442 al mes</strong> que puedes destinar a amortiguar estos imprevistos."
          </div>
        </div>
      ),
    },
    {
      stepNumber: 4,
      title: 'Paso 4: Prueba de Adaptabilidad (Misma pregunta, diferente perfil)',
      user: 'Ana (Diseñadora, sin tarjeta revolvente, con crédito personal y liquidez)',
      userPrompt: 'Quiero pagar menos intereses de mi tarjeta (¡Misma frase!)',
      mcpTools: ['panorama_inicial', 'consultar_tarjeta', 'consultar_creditos', 'proyectar_ahorro'],
      duration: '5.8 s + 2.9 s',
      uiEmitted: ['ProyeccionPagoCredito', 'SimuladorMeta (Slider interactivo)', 'MetaActiva'],
      explanation:
        'Ana dice exactamente la misma frase que Beto. Pero como no tiene tarjeta de crédito revolvente, Maya NO le ofrece un plan de pago absurdo: detecta su crédito personal al 27.9% y su capacidad de ahorro de $6,629/mes.',
      highlight:
        'Criterio 2 de la Rúbrica (Adaptabilidad - 20%): Misma pregunta, contexto distinto -> Interfaz completamente distinta y relevante.',
      renderedMock: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Tarjeta de crédito personal */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem 1.25rem', color: '#171717' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#555', marginBottom: '0.4rem' }}>
              Maya aclara: No tienes tarjeta de crédito activa con deuda
            </div>
            <div style={{ fontSize: '0.85rem', color: '#333' }}>
              Tus intereses provienen de tu <strong>Crédito Personal Banorte ($55,783 al 27.9% anual)</strong>. Te sobran <strong>$6,629 al mes</strong>: puedes acelerar pagos o crear un fondo de ahorro.
            </div>
          </div>

          {/* Simulador Meta con Slider */}
          <div style={{ backgroundColor: '#ffffff', border: '2px solid #EC0029', borderRadius: '0.75rem', padding: '1.25rem', color: '#171717' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              <Target size={18} color="#EC0029" />
              <span>Simulador de Meta de Ahorro / Fondo de Emergencia</span>
            </div>
            <div style={{ margin: '1rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                <span>Aportación mensual recomendada:</span>
                <strong style={{ color: '#EC0029', fontSize: '1.1rem' }}>${savingsAmount.toLocaleString()} MXN</strong>
              </div>
              <input
                type="range"
                min="1000"
                max="6000"
                step="500"
                value={savingsAmount}
                onChange={(e) => setSavingsAmount(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#EC0029' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#888' }}>
                <span>$1,000</span>
                <span>Capacidad máxima: $6,629</span>
              </div>
            </div>
            <div style={{ backgroundColor: '#fff5f6', padding: '0.6rem', borderRadius: '0.4rem', fontSize: '0.8rem', color: '#991b1b', marginBottom: '0.75rem' }}>
              Con ${savingsAmount.toLocaleString()}/mes alcanzas tu meta de $30,000 en{' '}
              <strong>{Math.ceil(30000 / savingsAmount)} meses</strong> y ahorras <strong>$4,200 en intereses futuros</strong>.
            </div>
            <button
              style={{
                width: '100%',
                backgroundColor: '#EC0029',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                padding: '0.65rem',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
              }}
            >
              Crear apartado con esta regla de ahorro
            </button>
          </div>
        </div>
      ),
    },
  ];

  const current = steps.find((s) => s.stepNumber === currentStep)!;

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
      {/* Header del Simulador */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={20} color="#EC0029" />
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#171717' }}>
              Simulador del Guión de Demo en Vivo
            </h3>
          </div>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.88rem', color: '#64748b' }}>
            Reproduce paso a paso los 3 minutos de corrida verificada en producción.
          </p>
        </div>

        {/* Selector de pasos */}
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {[1, 2, 3, 4].map((stepNum) => (
            <button
              key={stepNum}
              onClick={() => setCurrentStep(stepNum)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '0.5rem',
                border: currentStep === stepNum ? '2px solid #EC0029' : '1px solid #e2e8f0',
                backgroundColor: currentStep === stepNum ? '#EC0029' : '#f8f9fa',
                color: currentStep === stepNum ? '#ffffff' : '#171717',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {stepNum}
            </button>
          ))}
        </div>
      </div>

      {/* Barra de estado del Turno (Simulando la tira LLM - MCP - A2UI) */}
      <div
        style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #e2e8f0',
          color: '#171717',
          borderRadius: '0.75rem',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          fontSize: '0.82rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ backgroundColor: '#EC0029', color: '#ffffff', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
            LLM
          </span>
          <span style={{ color: '#94a3b8' }}>→</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ backgroundColor: '#e2e8f0', color: '#334155', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
              MCP
            </span>
            <span style={{ color: '#475569', fontSize: '0.78rem', fontWeight: 500 }}>
              ({current.mcpTools.join(' · ')})
            </span>
          </div>
          <span style={{ color: '#94a3b8' }}>→</span>
          <span style={{ backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
            A2UI v0.9.1
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#b45309', fontWeight: 700 }}>
          <Clock size={14} />
          <span>{current.duration}</span>
        </div>
      </div>

      {/* Contenido principal en 2 columnas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Columna Izquierda: Prompt y Explicación Técnica */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Prompt del usuario */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', border: '1px solid var(--sl-color-gray-2)', padding: '1rem', color: '#171717' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#888', marginBottom: '0.3rem' }}>
              Perfil & Entrada del Usuario
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#555', marginBottom: '0.5rem' }}>
              👤 {current.user}
            </div>
            <div
              style={{
                backgroundColor: '#f1f5f9',
                padding: '0.6rem 0.85rem',
                borderRadius: '0.5rem',
                fontFamily: 'monospace',
                fontSize: '0.88rem',
                color: '#0f172a',
                borderLeft: '3px solid #EC0029',
              }}
            >
              "{current.userPrompt}"
            </div>
          </div>

          {/* Explicación de la decisión de IA */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', border: '1px solid var(--sl-color-gray-2)', padding: '1rem', color: '#171717' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#888', marginBottom: '0.3rem' }}>
              Lógica del Agente & MCP
            </div>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.88rem', lineHeight: '1.5', color: '#333' }}>
              {current.explanation}
            </p>
            <div
              style={{
                backgroundColor: '#fff5f6',
                border: '1px solid #fed7d7',
                borderRadius: '0.5rem',
                padding: '0.6rem 0.8rem',
                fontSize: '0.82rem',
                color: '#991b1b',
                fontWeight: 500,
              }}
            >
              💡 {current.highlight}
            </div>
          </div>

          {/* Componentes A2UI emitidos */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', border: '1px solid var(--sl-color-gray-2)', padding: '1rem', color: '#171717' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#888', marginBottom: '0.5rem' }}>
              Componentes del Catálogo Emitidos
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {current.uiEmitted.map((comp, idx) => (
                <span
                  key={idx}
                  style={{
                    backgroundColor: '#e2e8f0',
                    color: '#334155',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                  }}
                >
                  {comp}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Vista previa de la UI generada */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--sl-color-gray-4)', marginBottom: '0.5rem' }}>
            Superficie A2UI Renderizada en Tiempo Real
          </div>
          {current.renderedMock}
        </div>
      </div>

      {/* Controles de Navegación del Simulador */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '1.5rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--sl-color-gray-2)',
        }}
      >
        <button
          onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
          style={{
            backgroundColor: currentStep === 1 ? 'transparent' : '#ffffff',
            border: '1px solid var(--sl-color-gray-2)',
            borderRadius: '0.5rem',
            padding: '0.5rem 1rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
            opacity: currentStep === 1 ? 0.4 : 1,
          }}
        >
          ← Paso anterior
        </button>

        <span style={{ fontSize: '0.82rem', color: 'var(--sl-color-gray-4)', fontWeight: 600 }}>
          Paso {currentStep} de 4
        </span>

        <button
          onClick={() => setCurrentStep((prev) => Math.min(4, prev + 1))}
          disabled={currentStep === 4}
          style={{
            backgroundColor: currentStep === 4 ? 'transparent' : '#EC0029',
            color: currentStep === 4 ? 'inherit' : '#ffffff',
            border: currentStep === 4 ? '1px solid var(--sl-color-gray-2)' : 'none',
            borderRadius: '0.5rem',
            padding: '0.5rem 1rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: currentStep === 4 ? 'not-allowed' : 'pointer',
            opacity: currentStep === 4 ? 0.4 : 1,
          }}
        >
          Siguiente paso →
        </button>
      </div>
    </div>
  );
}
