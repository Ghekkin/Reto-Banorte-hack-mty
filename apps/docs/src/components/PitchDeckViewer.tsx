import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Layers,
  CheckCircle2,
  Users,
  Shield,
  Presentation,
} from 'lucide-react';

interface SlideData {
  number: number;
  timeRange: string;
  title: string;
  subtitle: string;
  content: React.ReactNode;
  speakerNotes: string;
}

export default function PitchDeckViewer() {
  const [currentSlide, setCurrentSlide] = useState<number>(1);

  const slides: SlideData[] = [
    {
      number: 1,
      timeRange: '0:00 – 1:00',
      title: 'El Problema: A Maya le falta superficie',
      subtitle: '300+ consultas y 17 operaciones bancarias atrapadas en muros de texto',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            style={{
              backgroundColor: '#fff5f6',
              border: '1px solid #fecdd3',
              padding: '1.25rem',
              borderRadius: '0.75rem',
            }}
          >
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#960014', marginBottom: '0.5rem' }}>
              "Maya ya sabe hacer las cosas. Lo que le falta no es capacidad: es superficie."
            </div>
            <p style={{ margin: 0, fontSize: '0.95rem', color: '#4a040d', lineHeight: '1.5' }}>
              Hoy en Banorte, si le pides a Maya bajar intereses, te explica con un párrafo largo cómo funciona y te manda a buscar otra opción en un menú estático. El usuario abandona o se confunde.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem', color: '#171717' }}>
              <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: '0.25rem' }}>❌ El Paradigma Actual</div>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>Chatbot tradicional de texto: respuestas planas, navegación rota y cero resolución visual inmediata.</div>
            </div>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #fecdd3', borderRadius: '0.75rem', padding: '1rem', color: '#171717', boxShadow: '0 2px 8px rgba(236, 0, 41, 0.05)' }}>
              <div style={{ fontWeight: 700, color: '#EC0029', marginBottom: '0.25rem' }}>✨ Nuestra Tesis</div>
              <div style={{ fontSize: '0.85rem', color: '#333' }}>La IA no contesta: <strong>arma la pantalla</strong> que resuelve el problema en el instante en que preguntas.</div>
            </div>
          </div>
        </div>
      ),
      speakerNotes:
        'Abre con firmeza: Banorte ya tiene a Maya, es buena, pero entrega texto y menús. Nuestra solución no es programar otra pantalla, sino darle a Maya la capacidad de construirla.',
    },
    {
      number: 2,
      timeRange: '1:00 – 1:50',
      title: 'Demo Paso 1: Intención → Pantalla Generada',
      subtitle: 'Beto pide pagar menos intereses de su tarjeta (96.7% de uso, 12 días de mora)',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.25rem', color: '#171717' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.95rem', color: '#EC0029' }}>
                "Quiero pagar menos intereses de mi tarjeta"
              </span>
              <span style={{ backgroundColor: '#10b981', color: '#fff', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '999px' }}>
                10.5 s en vivo
              </span>
            </div>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.88rem', color: '#444' }}>
              Maya llama a las tools <code>panorama_inicial</code> y <code>simular_reestructura</code>. En vez de decir "ve a la sucursal", emite la especificación A2UI y pinta:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                <strong>ResumenTarjeta:</strong> $47,386 de $49,000 con badge de 12 días de atraso.
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                <strong>PlanDePago:</strong> Comparativa de 12, 18 y 24 meses con mensualidad y ahorro en pesos.
              </div>
            </div>
          </div>
        </div>
      ),
      speakerNotes:
        'Resalta que la pantalla no estaba guardada en el front: Maya pidió los datos al MCP, decidió los componentes y los emitió en A2UI. Todo tipado y restringido.',
    },
    {
      number: 3,
      timeRange: '1:50 – 2:40',
      title: 'Demo Paso 2: El Ciclo Cerrado de Acción Real',
      subtitle: 'Beto toca "Aplicar plan a 18 meses" y la base de datos se transforma',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: '0.75rem', padding: '1rem', color: '#065f46' }}>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.25rem' }}>
              ✓ Mutación Real en PostgreSQL (esquema banorte)
            </div>
            <div style={{ fontSize: '0.88rem' }}>
              El toque no es decorativo: viaja como evento A2UI estándar, el MCP inserta en <code>banorte.acciones_aplicadas</code> con llave de idempotencia, y el agente vuelve a pintar la pantalla.
            </div>
          </div>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem', color: '#171717' }}>
            <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>La pantalla vuelve cambiada:</div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.88rem', lineHeight: '1.6' }}>
              <li><strong>ResumenTarjeta:</strong> Saldo revolvente baja a $0.00 y el atraso desaparece.</li>
              <li><strong>Confirmacion:</strong> Mensualidad fija de $3,193.35 a partir del 12 de octubre.</li>
              <li><strong>Calendario:</strong> 18 amortizaciones visuales generadas en tiempo real.</li>
            </ul>
          </div>
        </div>
      ),
      speakerNotes:
        'Muestra énfasis: "Miren la tarjeta de arriba: es la misma de hace diez segundos y ya no dice lo mismo. El cambio está en la base de datos. El ciclo se cierra."',
    },
    {
      number: 4,
      timeRange: '2:40 – 3:40',
      title: 'Demo Paso 3: Adaptabilidad Demostrada',
      subtitle: 'Ana hace exactamente la misma pregunta: resultado 100% distinto',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #fecdd3', borderRadius: '0.75rem', padding: '1.25rem', color: '#171717' }}>
            <div style={{ fontWeight: 700, color: '#EC0029', marginBottom: '0.4rem' }}>
              Misma frase: "Quiero pagar menos intereses de mi tarjeta"
            </div>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.88rem', color: '#444' }}>
              Ana no tiene tarjeta de crédito revolvente: tiene un crédito de nómina al 27.9% y $6,629 de capacidad de ahorro mensual. Maya se adapta al contexto real:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ backgroundColor: '#fff5f6', padding: '0.75rem', borderRadius: '0.5rem' }}>
                <strong>ProyeccionPagoCredito:</strong> Desglose honesto del crédito y ahorro adelantado.
              </div>
              <div style={{ backgroundColor: '#fff5f6', padding: '0.75rem', borderRadius: '0.5rem' }}>
                <strong>SimuladorMeta:</strong> Slider interactivo para apartar $2,500/mes y crear fondo.
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#666', fontStyle: 'italic', textAlign: 'center' }}>
            "Dos personas, la misma pregunta, dos interfaces distintas, y dos acciones que de verdad cambiaron algo."
          </div>
        </div>
      ),
      speakerNotes:
        'Aquí te ganas el Criterio 2 (20%). Enfatiza que si la app solo tuviera una plantilla fija, a Ana le saldría un error o una tarjeta vacía. Maya compuso la interfaz que Ana necesitaba.',
    },
    {
      number: 5,
      timeRange: '3:40 – 4:30',
      title: 'Arquitectura e Ingeniería Comprobable',
      subtitle: 'Sin trucos, sin mocks en memoria, interfaz 100% tipada y verificada',
      content: (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem', color: '#171717' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#EC0029' }}>18 Tools</div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', margin: '0.2rem 0' }}>Servidor MCP Propio</div>
            <div style={{ fontSize: '0.75rem', color: '#666' }}>14 de lectura y 4 de acción mutable sobre Postgres.</div>
          </div>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem', color: '#171717' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#EC0029' }}>21 Widgets</div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', margin: '0.2rem 0' }}>Catálogo A2UI Propio</div>
            <div style={{ fontSize: '0.75rem', color: '#666' }}>Primitivas shadcn/ui con tokens Banorte y Zod schemas.</div>
          </div>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem', color: '#171717' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#EC0029' }}>100% v0.9.1</div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', margin: '0.2rem 0' }}>Motor A2UI Propio</div>
            <div style={{ fontSize: '0.75rem', color: '#666' }}>~1,310 líneas, 112 pruebas, 76/76 casos oficiales de conformidad.</div>
          </div>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem', color: '#171717' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#EC0029' }}>288 Tests</div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', margin: '0.2rem 0' }}>Pruebas en Verde</div>
            <div style={{ fontSize: '0.75rem', color: '#666' }}>Pruebas unitarias en los 5 paquetes del monorepo.</div>
          </div>
        </div>
      ),
      speakerNotes:
        'Cierra la ingeniería técnica: los números no los inventa el LLM, vienen del MCP. El catálogo está publicado en JSON y el MCP público para ser consumido.',
    },
    {
      number: 6,
      timeRange: '4:30 – 5:00',
      title: 'Cierre: El Futuro de la Banca Generativa',
      subtitle: 'Maya ya hacía diecisiete operaciones. Nosotros le dimos dónde mostrarlas.',
      content: (
        <div style={{ textAlign: 'center', padding: '1.5rem', backgroundColor: '#ffffff', borderRadius: '0.75rem', border: '1px solid #fecdd3', color: '#171717', boxShadow: '0 4px 14px rgba(236, 0, 41, 0.06)' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#EC0029', marginBottom: '0.75rem' }}>
            Maya · Interfaces en Tiempo Real
          </div>
          <p style={{ fontSize: '1rem', color: '#333', maxWidth: '550px', margin: '0 auto 1.5rem', lineHeight: '1.6' }}>
            Un agente al centro, un protocolo abierto (A2UI), un servidor de herramientas estándar (MCP) y un sistema de diseño institucional que protege la experiencia del cliente.
          </p>
          <div style={{ display: 'inline-block', backgroundColor: '#171717', color: '#fff', padding: '0.5rem 1.25rem', borderRadius: '999px', fontWeight: 700, fontSize: '0.9rem' }}>
            ¡Muchas gracias! ¿Preguntas?
          </div>
        </div>
      ),
      speakerNotes:
        'Termina con impacto y abre a preguntas con seguridad: "Maya ya hacía diecisiete operaciones. Nosotros le dimos dónde mostrarlas. Gracias."',
    },
  ];

  const slide = slides.find((s) => s.number === currentSlide)!;

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
      {/* Header del visor de diapositivas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Presentation size={20} color="#EC0029" />
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#171717' }}>
            Presentador de Diapositivas · Pitch 5 Minutos
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#EC0029', fontWeight: 700, fontSize: '0.85rem' }}>
          <Clock size={16} />
          <span>{slide.timeRange}</span>
        </div>
      </div>

      {/* Contenedor de Slide */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '0.85rem',
          padding: '1.75rem',
          minHeight: '340px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          marginBottom: '1rem',
        }}
      >
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#888', marginBottom: '0.25rem' }}>
            Diapositiva {slide.number} de {slides.length}
          </div>
          <h2 style={{ margin: '0 0 0.35rem', fontSize: '1.4rem', fontWeight: 800, color: '#171717' }}>
            {slide.title}
          </h2>
          <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1.25rem' }}>
            {slide.subtitle}
          </div>

          <div>{slide.content}</div>
        </div>

        {/* Notas del Presentador */}
        <div
          style={{
            marginTop: '1.5rem',
            backgroundColor: '#ffffff',
            border: '1px dashed #cbd5e1',
            borderRadius: '0.5rem',
            padding: '0.75rem 1rem',
            fontSize: '0.82rem',
            color: '#334155',
          }}
        >
          <strong>🎤 Guión hablado del orador:</strong> {slide.speakerNotes}
        </div>
      </div>

      {/* Controles del Pitch Deck */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => setCurrentSlide((prev) => Math.max(1, prev - 1))}
          disabled={currentSlide === 1}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            backgroundColor: currentSlide === 1 ? 'transparent' : '#ffffff',
            border: '1px solid var(--sl-color-gray-2)',
            borderRadius: '0.5rem',
            padding: '0.5rem 1rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: currentSlide === 1 ? 'not-allowed' : 'pointer',
            opacity: currentSlide === 1 ? 0.4 : 1,
          }}
        >
          <ChevronLeft size={16} />
          <span>Anterior</span>
        </button>

        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {slides.map((s) => (
            <button
              key={s.number}
              onClick={() => setCurrentSlide(s.number)}
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: currentSlide === s.number ? '#EC0029' : 'var(--sl-color-gray-3)',
                cursor: 'pointer',
                padding: 0,
              }}
            />
          ))}
        </div>

        <button
          onClick={() => setCurrentSlide((prev) => Math.min(slides.length, prev + 1))}
          disabled={currentSlide === slides.length}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            backgroundColor: currentSlide === slides.length ? 'transparent' : '#EC0029',
            color: currentSlide === slides.length ? 'inherit' : '#ffffff',
            border: currentSlide === slides.length ? '1px solid var(--sl-color-gray-2)' : 'none',
            borderRadius: '0.5rem',
            padding: '0.5rem 1rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: currentSlide === slides.length ? 'not-allowed' : 'pointer',
            opacity: currentSlide === slides.length ? 0.4 : 1,
          }}
        >
          <span>Siguiente</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
