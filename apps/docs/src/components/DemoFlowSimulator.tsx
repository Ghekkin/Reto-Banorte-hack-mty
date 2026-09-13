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
              border: '1px solid #fecdd3',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              color: '#171717',
              boxShadow: '0 2px 8px rgba(236, 0, 41, 0.04)',
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', marginBottom: '1rem' }}>
              {[
                { m: 12, pago: '$4,640.10', ahorro: '$8,240' },
                { m: 18, pago: '$3,193.35', ahorro: '$14,650', rec: true },
                { m: 24, pago: '$2,510.40', ahorro: '$11,100' },
              ].map((opt) => {
                const isSel = selectedMonths === opt.m;
                return (
                  <div
                    key={opt.m}
                    onClick={() => setSelectedMonths(opt.m)}
                    style={{
                      border: isSel ? '1.5px solid #EC0029' : '1px solid #e2e8f0',
                      borderRadius: '0.65rem',
                      padding: '0.75rem 0.65rem',
                      cursor: 'pointer',
                      backgroundColor: isSel ? '#fff5f6' : '#ffffff',
                      boxShadow: isSel ? '0 0 0 1px #EC0029, 0 2px 6px rgba(236, 0, 41, 0.08)' : 'none',
                      transition: 'all 0.15s ease-out',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '84px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: isSel ? '#960014' : '#1e293b' }}>
                        {opt.m} meses
                      </span>
                      {opt.rec && (
                        <span
                          style={{
                            backgroundColor: '#EC0029',
                            color: '#fff',
                            fontSize: '0.6rem',
                            fontWeight: 800,
                            padding: '0.1rem 0.35rem',
                            borderRadius: '4px',
                            letterSpacing: '0.02em',
                          }}
                        >
                          TOP
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: isSel ? '#EC0029' : '#171717', fontFamily: 'ui-monospace, monospace', fontVariantNumeric: 'tabular-nums', margin: '0.2rem 0' }}>
                      {opt.pago}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 600 }}>
                      Ahorras {opt.ahorro}
                    </div>
                  </div>
                );
              })}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, marginBottom: '0.65rem' }}>
              <Calendar size={16} color="#EC0029" />
              <span>Próximas amortizaciones fijas</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0', borderBottom: '1px solid #e2e8f0' }}>
              <span>Pago 1 de 18 (12 Oct 2026)</span>
              <strong style={{ fontFamily: 'ui-monospace, monospace', fontVariantNumeric: 'tabular-nums', fontSize: '0.92rem' }}>$3,193.35</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0' }}>
              <span>Pago 2 de 18 (12 Nov 2026)</span>
              <strong style={{ fontFamily: 'ui-monospace, monospace', fontVariantNumeric: 'tabular-nums', fontSize: '0.92rem' }}>$3,193.35</strong>
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
          {/* Encabezado oficial GastoPorCategoria */}
          <div style={{ marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.95rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Gasto Total de Agosto 2026
              </span>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#b91c1c', backgroundColor: '#fee2e2', border: '1px solid #fecdd3', padding: '0.2rem 0.55rem', borderRadius: '999px' }}>
                +7.2% vs. mes anterior
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '2rem', fontWeight: 900, color: '#171717', fontFamily: 'ui-monospace, monospace', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', lineHeight: 1 }}>
                $28,450.00
              </span>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                Periodo 2026-08 · 4 categorías
              </span>
            </div>
          </div>

          {/* Lista estructurada con números perfectamente tabulados y barras de progreso */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1rem' }}>
            {/* Categoría 1: Retiros de efectivo (Atípica) */}
            <div
              style={{
                backgroundColor: '#fff5f6',
                border: '1px solid #fecdd3',
                borderRadius: '0.65rem',
                padding: '0.75rem 0.9rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#991b1b' }}>
                      Retiros de efectivo
                    </span>
                    <span style={{ backgroundColor: '#EC0029', color: '#ffffff', fontSize: '0.62rem', fontWeight: 800, padding: '0.1rem 0.45rem', borderRadius: '999px', letterSpacing: '0.03em' }}>
                      ATÍPICO +74.7%
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#7f1d1d' }}>
                    Mayor fuga detectada vs. promedio histórico ($2,634.00)
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'ui-monospace, monospace', fontVariantNumeric: 'tabular-nums', fontWeight: 900, fontSize: '1.05rem', color: '#991b1b', lineHeight: 1.1 }}>
                    $9,500.00
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#991b1b', fontWeight: 600, marginTop: '0.15rem' }}>
                    33.4% del gasto
                  </div>
                </div>
              </div>
              <div style={{ width: '100%', height: '5px', backgroundColor: '#fed7d7', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ width: '33.4%', height: '100%', backgroundColor: '#EC0029', borderRadius: '999px' }}></div>
              </div>
            </div>

            {/* Categoría 2: Intereses financieros (Pactados en paso anterior) */}
            <div
              style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '0.65rem',
                padding: '0.75rem 0.9rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#166534' }}>
                      Intereses financieros
                    </span>
                    <span style={{ backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac', fontSize: '0.62rem', fontWeight: 800, padding: '0.1rem 0.45rem', borderRadius: '999px', letterSpacing: '0.03em' }}>
                      CONGELADO
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#166534' }}>
                    Tasa bajó a 22.5% por el plan pactado en paso 2 (-$14,650)
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'ui-monospace, monospace', fontVariantNumeric: 'tabular-nums', fontWeight: 900, fontSize: '1.05rem', color: '#15803d', lineHeight: 1.1 }}>
                    $0.00
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>
                    Antes <span style={{ textDecoration: 'line-through' }}>$7,400.00</span>
                  </div>
                </div>
              </div>
              <div style={{ width: '100%', height: '5px', backgroundColor: '#dcfce7', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ width: '26%', height: '100%', backgroundColor: '#16a34a', borderRadius: '999px' }}></div>
              </div>
            </div>

            {/* Categoría 3: Alimentos y supermercado */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '0.65rem',
                padding: '0.75rem 0.9rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>
                      Alimentos y despensa
                    </span>
                    <span style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontSize: '0.62rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: '999px' }}>
                      RECURRENTE
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Supermercado, tiendas y abarrotes (+3.1% vs mes previo)
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'ui-monospace, monospace', fontVariantNumeric: 'tabular-nums', fontWeight: 900, fontSize: '1.05rem', color: '#1e293b', lineHeight: 1.1 }}>
                    $7,200.00
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>
                    25.3% del gasto
                  </div>
                </div>
              </div>
              <div style={{ width: '100%', height: '5px', backgroundColor: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ width: '25.3%', height: '100%', backgroundColor: '#94a3b8', borderRadius: '999px' }}></div>
              </div>
            </div>

            {/* Categoría 4: Servicios y suscripciones */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '0.65rem',
                padding: '0.75rem 0.9rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>
                      Servicios y suscripciones
                    </span>
                    <span style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontSize: '0.62rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: '999px' }}>
                      FIJO
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Luz, agua, internet y streaming (-1.4% vs mes previo)
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'ui-monospace, monospace', fontVariantNumeric: 'tabular-nums', fontWeight: 900, fontSize: '1.05rem', color: '#1e293b', lineHeight: 1.1 }}>
                    $4,350.00
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>
                    15.3% del gasto
                  </div>
                </div>
              </div>
              <div style={{ width: '100%', height: '5px', backgroundColor: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ width: '15.3%', height: '100%', backgroundColor: '#94a3b8', borderRadius: '999px' }}></div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.82rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.75rem 0.9rem', borderRadius: '0.5rem', color: '#334155', lineHeight: 1.5 }}>
            <strong style={{ color: '#0f172a' }}>Conclusión de Maya:</strong> "El 33% de tus egresos fueron retiros de cajero. Al haber congelado tu deuda a 18 meses en el paso anterior, liberaste <strong>$1,442 al mes</strong> que puedes destinar a amortiguar estos imprevistos."
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
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #fecdd3', borderRadius: '0.75rem', padding: '1.25rem', color: '#171717', boxShadow: '0 2px 8px rgba(236, 0, 41, 0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              <Target size={18} color="#EC0029" />
              <span>Simulador de Meta de Ahorro / Fondo de Emergencia</span>
            </div>
            <div style={{ margin: '1rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                <span style={{ color: '#475569', fontWeight: 600 }}>Aportación mensual seleccionada:</span>
                <strong style={{ color: '#EC0029', fontSize: '1.25rem', fontFamily: 'ui-monospace, monospace', fontVariantNumeric: 'tabular-nums', fontWeight: 900 }}>
                  ${savingsAmount.toLocaleString()}.00 <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>MXN</span>
                </strong>
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
      className="not-content"
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

        {/* Selector de pasos tipo Segmented Control / Tabs */}
        <div
          className="not-content"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: '#f1f5f9',
            padding: '0.25rem',
            borderRadius: '0.65rem',
            border: '1px solid #e2e8f0',
            gap: '0.2rem',
          }}
        >
          {[
            { num: 1, label: 'Paso 1' },
            { num: 2, label: 'Paso 2' },
            { num: 3, label: 'Paso 3' },
            { num: 4, label: 'Paso 4' },
          ].map((step) => {
            const isActive = currentStep === step.num;
            return (
              <button
                key={step.num}
                type="button"
                onClick={() => setCurrentStep(step.num)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  margin: 0,
                  marginTop: 0,
                  marginBottom: 0,
                  backgroundColor: isActive ? '#EC0029' : 'transparent',
                  color: isActive ? '#ffffff' : '#64748b',
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '0.82rem',
                  lineHeight: 1,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease-out',
                  boxShadow: isActive ? '0 1px 4px rgba(236, 0, 41, 0.25)' : 'none',
                  verticalAlign: 'middle',
                }}
              >
                <span
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: isActive ? 'rgba(255, 255, 255, 0.25)' : '#e2e8f0',
                    color: isActive ? '#ffffff' : '#475569',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'monospace',
                    lineHeight: 1,
                  }}
                >
                  {step.num}
                </span>
                <span style={{ lineHeight: 1 }}>{step.label}</span>
              </button>
            );
          })}
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

        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #fed7aa',
            padding: '0.25rem 0.65rem',
            borderRadius: '999px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: '#b45309',
            fontWeight: 700,
            fontSize: '0.78rem',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
          }}
        >
          <Clock size={13} color="#b45309" />
          <span style={{ fontFamily: 'ui-monospace, monospace', fontVariantNumeric: 'tabular-nums' }}>
            {current.duration}
          </span>
        </div>
      </div>

      {/* Contenido principal en 2 columnas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        {/* Columna Izquierda: Prompt y Explicación Técnica */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.5rem', letterSpacing: '0.03em', lineHeight: 1.2 }}>
            Entrada & Razonamiento del Agente
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Prompt del usuario */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)', padding: '1.25rem', color: '#171717' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.3rem' }}>
                Perfil & Entrada del Usuario
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#334155', marginBottom: '0.5rem' }}>
                👤 {current.user}
              </div>
              <div
                style={{
                  backgroundColor: '#f8f9fa',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '0.5rem',
                  fontFamily: 'monospace',
                  fontSize: '0.88rem',
                  color: '#0f172a',
                  border: '1px solid #e2e8f0',
                }}
              >
                "{current.userPrompt}"
              </div>
            </div>

            {/* Explicación de la decisión de IA */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)', padding: '1.25rem', color: '#171717' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.3rem' }}>
                Lógica del Agente & MCP
              </div>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.88rem', lineHeight: '1.5', color: '#334155' }}>
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
            <div style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)', padding: '1.25rem', color: '#171717' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.5rem' }}>
                Componentes del Catálogo Emitidos
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {current.uiEmitted.map((comp, idx) => (
                  <span
                    key={idx}
                    style={{
                      backgroundColor: '#f1f5f9',
                      border: '1px solid #e2e8f0',
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
        </div>

        {/* Columna Derecha: Vista previa de la UI generada */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.5rem', letterSpacing: '0.03em', lineHeight: 1.2 }}>
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
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <button
          onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
          style={{
            backgroundColor: currentStep === 1 ? 'transparent' : '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '0.5rem',
            padding: '0.5rem 1rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
            opacity: currentStep === 1 ? 0.4 : 1,
            color: '#171717',
          }}
        >
          ← Paso anterior
        </button>

        <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 700 }}>
          Paso {currentStep} de 4
        </span>

        <button
          onClick={() => setCurrentStep((prev) => Math.min(4, prev + 1))}
          disabled={currentStep === 4}
          style={{
            backgroundColor: currentStep === 4 ? 'transparent' : '#EC0029',
            color: currentStep === 4 ? '#94a3b8' : '#ffffff',
            border: currentStep === 4 ? '1px solid #e2e8f0' : 'none',
            borderRadius: '0.5rem',
            padding: '0.5rem 1rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: currentStep === 4 ? 'not-allowed' : 'pointer',
            opacity: currentStep === 4 ? 0.4 : 1,
            boxShadow: currentStep === 4 ? 'none' : '0 2px 6px rgba(236, 0, 41, 0.2)',
          }}
        >
          Siguiente paso →
        </button>
      </div>
    </div>
  );
}
