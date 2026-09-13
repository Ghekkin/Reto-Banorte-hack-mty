import React, { useState } from 'react';
import {
  CreditCard,
  Target,
  PieChart,
  TrendingUp,
  CheckCircle,
  Code,
  Tag,
  Search,
} from 'lucide-react';

interface CatalogComponent {
  id: string;
  name: string;
  category: 'credito' | 'ahorro' | 'gastos' | 'inversion' | 'feedback';
  description: string;
  propsKey: string[];
  dispatchedAction?: string;
  schemaFile: string;
  keyFeature: string;
}

const CATALOG_ITEMS: CatalogComponent[] = [
  {
    id: 'ResumenTarjeta',
    name: 'ResumenTarjeta',
    category: 'credito',
    description: 'Tarjeta héroe para crédito revolvente con semaforización de atraso, saldo y uso.',
    propsKey: ['limite', 'saldo', 'tasa', 'pagoMinimo', 'diasAtraso', 'planActivo'],
    dispatchedAction: 'elegir_tarjeta',
    schemaFile: 'packages/catalogo/src/componentes/credito/resumen-tarjeta.tsx',
    keyFeature: 'Monto con tabular-nums como elemento principal y badge rojo en caso de mora.',
  },
  {
    id: 'PlanDePago',
    name: 'PlanDePago',
    category: 'credito',
    description: 'Comparativa de plazos (12, 18, 24 meses) con mensualidad, CAT y ahorro garantizado.',
    propsKey: ['opciones: Array<{ meses, mensualidad, cat, ahorroVsMinimo }>', 'mesSeleccionado'],
    dispatchedAction: 'aplicar_plan_pago',
    schemaFile: 'packages/catalogo/src/componentes/credito/plan-de-pago.tsx',
    keyFeature: 'Acción directa que viaja al agente para mutar el estado en PostgreSQL.',
  },
  {
    id: 'ProyeccionPagoCredito',
    name: 'ProyeccionPagoCredito',
    category: 'credito',
    description: 'Visualización de crédito de nómina o personal sin mora, amortización fija.',
    propsKey: ['saldoPendiente', 'tasaAnual', 'mensualidad', 'pagosRestantes', 'interesesPorPagar'],
    schemaFile: 'packages/catalogo/src/componentes/credito/proyeccion-pago-credito.tsx',
    keyFeature: 'Permite al usuario contrastar costo financiero contra capacidad de ahorro.',
  },
  {
    id: 'Calendario',
    name: 'Calendario',
    category: 'credito',
    description: 'Cronograma visual de amortizaciones tras la activación de un plan de reestructura.',
    propsKey: ['pagos: Array<{ numero, fecha, monto, saldoRestante }>'],
    schemaFile: 'packages/catalogo/src/componentes/credito/calendario.tsx',
    keyFeature: 'Renderizado reactivo una vez que la tool confirma la activación del plan.',
  },
  {
    id: 'SimuladorMeta',
    name: 'SimuladorMeta',
    category: 'ahorro',
    description: 'Control interactivo de slider para proyectar horizontes de ahorro y fondos de emergencia.',
    propsKey: ['montoObjetivo', 'aportacionSugerida', 'capacidadMaxima', 'plazoMeses'],
    dispatchedAction: 'crear_apartado',
    schemaFile: 'packages/catalogo/src/componentes/ahorro/simulador-meta.tsx',
    keyFeature: 'Slider táctil de 48px que recalcula meses restantes en vivo sin recargar.',
  },
  {
    id: 'MetaActiva',
    name: 'MetaActiva',
    category: 'ahorro',
    description: 'Superficie de seguimiento con barra de progreso, saldo acumulado y fecha meta.',
    propsKey: ['nombre', 'montoObjetivo', 'montoActual', 'porcentaje', 'fechaEstimada'],
    schemaFile: 'packages/catalogo/src/componentes/ahorro/meta-activa.tsx',
    keyFeature: 'Pintada automáticamente cuando se completa la acción crear_apartado.',
  },
  {
    id: 'TermometroSaludFinanciera',
    name: 'TermometroSaludFinanciera',
    category: 'ahorro',
    description: 'Medidor cuantitativo de salud financiera (0 a 100) calibrado contra ingresos.',
    propsKey: ['puntaje', 'nivel', 'factoresPositivos', 'factoresDeAtencion'],
    schemaFile: 'packages/catalogo/src/componentes/salud/termometro-salud.tsx',
    keyFeature: 'Bandas cromáticas accesibles con semáforo Banorte.',
  },
  {
    id: 'GastoPorCategoria',
    name: 'GastoPorCategoria',
    category: 'gastos',
    description: 'Gráfico de barras apiladas o barras Recharts con montos reales por categoría.',
    propsKey: ['periodo', 'totalGasto', 'categorias: Array<{ nombre, monto, porcentaje, atipico }>'],
    schemaFile: 'packages/catalogo/src/componentes/gastos/gasto-por-categoria.tsx',
    keyFeature: 'Resalta en rojo Banorte la categoría que superó su desviación histórica.',
  },
  {
    id: 'AlertaGastoAtipico',
    name: 'AlertaGastoAtipico',
    category: 'gastos',
    description: 'Tarjeta de atención ante gastos hormiga o retiros no habituales en cajeros.',
    propsKey: ['categoria', 'desviacionPorcentaje', 'montoExcedente', 'recomendacion'],
    schemaFile: 'packages/catalogo/src/componentes/gastos/alerta-gasto-atipico.tsx',
    keyFeature: 'Detecta anomalías estadísticas en vez de reportar simplemente el gasto más alto.',
  },
  {
    id: 'Conclusion',
    name: 'Conclusion',
    category: 'feedback',
    description: 'Tarjeta de cierre de Maya con el consejo accionable y la justificación financiera.',
    propsKey: ['resumen', 'accionRecomendada', 'impactoMensualEstimado'],
    schemaFile: 'packages/catalogo/src/componentes/general/conclusion.tsx',
    keyFeature: 'Transforma el típico texto largo del LLM en una tarjeta táctil legible de un vistazo.',
  },
  {
    id: 'DistribucionPortafolio',
    name: 'DistribucionPortafolio',
    category: 'inversion',
    description: 'Gráfico de dona de activos de inversión (Cetes, Fondos, Renta Variable).',
    propsKey: ['saldoTotal', 'activos: Array<{ clase, monto, porcentaje, rendimiento }>'],
    schemaFile: 'packages/catalogo/src/componentes/inversion/distribucion-portafolio.tsx',
    keyFeature: 'Utilizado en la portada de clientes de alto patrimonio (Perfil Carmen).',
  },
  {
    id: 'Confirmacion',
    name: 'Confirmacion',
    category: 'feedback',
    description: 'Banner de verificación que atestigua la persistencia de una mutación en PostgreSQL.',
    propsKey: ['titulo', 'folio', 'fechaOperacion', 'montoInvolucrado'],
    schemaFile: 'packages/catalogo/src/componentes/feedback/confirmacion.tsx',
    keyFeature: 'Evita alertas invasivas del navegador; feedback integrado en el lienzo.',
  },
];

export default function ComponentCatalogExplorer() {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredItems = CATALOG_ITEMS.filter((item) => {
    const matchesCat = selectedCategory === 'todos' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

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
      <div style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#171717' }}>
          Catálogo Oficial de Componentes A2UI (@maya/catalogo)
        </h3>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.88rem', color: '#64748b' }}>
          21 componentes diseñados con primitivas shadcn/ui y tokens Banorte, validados con Zod y Ajv.
        </p>
      </div>

      {/* Filtros y Buscador */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {[
            { id: 'todos', label: 'Todos (21)' },
            { id: 'credito', label: 'Crédito & Deuda' },
            { id: 'ahorro', label: 'Ahorro & Metas' },
            { id: 'gastos', label: 'Gastos & Fugas' },
            { id: 'inversion', label: 'Inversiones' },
            { id: 'feedback', label: 'Feedback' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                backgroundColor: selectedCategory === cat.id ? '#EC0029' : '#f8f9fa',
                color: selectedCategory === cat.id ? '#ffffff' : '#334155',
                border: selectedCategory === cat.id ? 'none' : '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                padding: '0.4rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', minWidth: '220px' }}>
          <input
            type="text"
            placeholder="Buscar componente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.4rem 0.75rem 0.4rem 2rem',
              borderRadius: '0.5rem',
              border: '1px solid #e2e8f0',
              fontSize: '0.82rem',
              backgroundColor: '#ffffff',
              color: '#171717',
            }}
          />
          <Search size={14} color="#888" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
      </div>

      {/* Grid de Componentes */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem',
        }}
      >
        {filteredItems.map((comp) => (
          <div
            key={comp.id}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.75rem',
              border: '1px solid #e2e8f0',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <span
                  style={{
                    backgroundColor: '#fff0f2',
                    color: '#EC0029',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                  }}
                >
                  {comp.category.toUpperCase()}
                </span>
                {comp.dispatchedAction && (
                  <span
                    style={{
                      backgroundColor: '#f1f5f9',
                      color: '#334155',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                    }}
                  >
                    ⚡ {comp.dispatchedAction}
                  </span>
                )}
              </div>

              <h4 style={{ margin: '0 0 0.4rem', fontSize: '1.05rem', fontWeight: 700, color: '#171717' }}>
                {comp.name}
              </h4>
              <p style={{ margin: '0 0 0.85rem', fontSize: '0.82rem', color: '#555', lineHeight: '1.4' }}>
                {comp.description}
              </p>

              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  Props declaradas en Zod:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                  {comp.propsKey.map((prop, idx) => (
                    <code
                      key={idx}
                      style={{
                        backgroundColor: '#f1f5f9',
                        color: '#334155',
                        fontSize: '0.7rem',
                        padding: '0.15rem 0.35rem',
                        borderRadius: '3px',
                      }}
                    >
                      {prop}
                    </code>
                  ))}
                </div>
              </div>
            </div>

            <div
              style={{
                borderTop: '1px solid #f0f0f0',
                paddingTop: '0.6rem',
                fontSize: '0.75rem',
                color: '#666',
              }}
            >
              💡 {comp.keyFeature}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
