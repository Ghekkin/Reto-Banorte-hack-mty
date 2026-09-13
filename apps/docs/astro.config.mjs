import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://docs.ghekkinxmaya.tech',
  integrations: [
    starlight({
      title: 'Maya · Reto Banorte',
      description:
        'Documentación técnica y presentación de Maya — Interfaces financieras generadas por IA en tiempo real (Hack Monterrey 2026 · Reto Banorte).',
      defaultLocale: 'root',
      locales: {
        root: {
          label: 'Español',
          lang: 'es',
        },
      },
      customCss: ['./src/styles/custom.css'],
      components: {
        ThemeProvider: './src/components/ThemeProvider.astro',
        ThemeSelect: './src/components/ThemeSelect.astro',
      },
      head: [
        {
          tag: 'script',
          content: `
            try {
              document.documentElement.dataset.theme = 'light';
              localStorage.setItem('starlight-theme', 'light');
            } catch (e) {}
          `,
        },
      ],
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/Ghekkin/Reto-Banorte-hack-mty',
        },
      ],
      sidebar: [
        {
          label: 'Presentación & Pitch',
          items: [
            { label: 'Pitch Ejecutivo (5 min)', slug: 'presentacion/pitch' },
            { label: 'Guión de Demo en Vivo', slug: 'presentacion/guion-demo' },
            { label: 'Simulador de Demo Interactivo', slug: 'presentacion/simulador-demo' },
            { label: 'Rúbrica y Cumplimiento (100 pts)', slug: 'presentacion/rubrica' },
            { label: 'Equipo y Roles', slug: 'presentacion/equipo' },
          ],
        },
        {
          label: 'Visión & Reto',
          items: [
            { label: 'El Reto Oficial Banorte', slug: 'reto/contexto' },
            { label: 'Solución Propuesta', slug: 'reto/solucion' },
            { label: 'Perfiles y Adaptabilidad', slug: 'reto/perfiles-y-adaptabilidad' },
          ],
        },
        {
          label: 'Arquitectura del Sistema',
          items: [
            { label: 'Visión General y Diagrama', slug: 'arquitectura/vision-general' },
            { label: 'Ciclo Cerrado de Acción', slug: 'arquitectura/ciclo-cerrado' },
            { label: 'Motor A2UI v0.9.1 Propio', slug: 'arquitectura/motor-a2ui' },
            { label: 'Servidor MCP (18 Tools)', slug: 'arquitectura/servidor-mcp' },
            { label: 'Base de Datos PostgreSQL (22 tablas)', slug: 'arquitectura/base-de-datos' },
            { label: 'Trade-offs Técnicos', slug: 'arquitectura/trade-offs' },
          ],
        },
        {
          label: 'Catálogo de Componentes A2UI',
          items: [
            { label: 'Galería e Índice de Componentes', slug: 'catalogo/resumen' },
            { label: 'Crédito y Tarjetas', slug: 'catalogo/credito-y-tarjetas' },
            { label: 'Ahorro y Metas', slug: 'catalogo/ahorro-y-metas' },
            { label: 'Diagnóstico y Salud Financiera', slug: 'catalogo/salud-financiera' },
            { label: 'Inversiones y Portafolio', slug: 'catalogo/inversiones' },
          ],
        },
        {
          label: 'Algoritmos y Lógica Financiera',
          items: [
            { label: 'Resumen de Algoritmos', slug: 'algoritmos/resumen' },
            { label: 'Amortización y Cálculo de CAT', slug: 'algoritmos/amortizacion' },
            { label: 'Gastos Atípicos y Detección de Fugas', slug: 'algoritmos/fugas-y-gastos' },
            { label: 'Proyección Dinámica de Ahorro', slug: 'algoritmos/proyeccion-ahorro' },
            { label: 'Scoring de Salud Financiera', slug: 'algoritmos/puntaje-salud' },
            { label: 'Acomodo Inteligente del Lienzo', slug: 'algoritmos/acomodo-lienzo' },
          ],
        },
        {
          label: 'Decisiones de Arquitectura (ADRs)',
          items: [
            { label: 'Índice de ADRs (0001 - 0010)', slug: 'decisiones/resumen' },
            { label: 'Detalle de Decisiones', slug: 'decisiones/detalle' },
          ],
        },
        {
          label: 'Guía Técnica & Despliegue',
          items: [
            { label: 'Instalación y Arranque Local', slug: 'guia/arranque' },
            { label: 'Despliegue e Infraestructura', slug: 'guia/despliegue' },
            { label: 'Pruebas y Verificación', slug: 'guia/pruebas' },
          ],
        },
      ],
    }),
    react(),
  ],
});
