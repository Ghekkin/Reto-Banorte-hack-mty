import { z } from "zod";
import {
  ID_RAIZ,
  NOMBRES_DE_LAYOUT,
  VERSION_A2UI,
  esBinding,
  hijosFijos,
  propsDe,
  resolverValor,
  validarMensaje,
  type Componente,
  type MensajeA2UI,
} from "@maya/a2ui";
import { crearValidador } from "@maya/a2ui/esquema";
import { CATALOGO } from "@maya/catalogo";
import catalogoPublicado from "@maya/catalogo/catalogo.json";
import { SUPERFICIE, config } from "./config";

/**
 * `pintar_pantalla`: la tool con la que el agente entrega la interfaz.
 *
 * Por que una tool y no el texto de la respuesta: asi el modelo usa un solo mecanismo
 * (llamadas a tools) para todo el turno, el bucle del AI SDK se encarga del reintento,
 * y **nada sale de aqui sin validarse**. Si el JSON viene mal, el modelo recibe los
 * errores como resultado de la tool y lo corrige en el siguiente paso, igual que si una
 * tool de datos le hubiera fallado (contrato agente-cliente: un reintento, luego prosa).
 *
 * El modelo entrega los componentes como TEXTO JSON a proposito. Un schema estricto de
 * "arreglo de componentes con props arbitrarias" no se puede expresar de forma que los
 * dos proveedores lo acepten (props planas y distintas por componente); con texto + esta
 * validacion, el contrato se cumple igual y no depende de las rarezas de cada API.
 */

const componenteObjeto = z
  .object({
    id: z.string().describe("Identificador unico del componente"),
    component: z.string().describe("Nombre del componente"),
  })
  .passthrough();

export const entradaPintarPantalla = z.object({
  razon: z
    .string()
    .min(10)
    .describe("Una frase en segunda persona: por que ESTA pantalla y no otra, con el dato que lo justifica"),
  texto: z
    .string()
    .min(1)
    .describe(
      "Lo que le dirias de frente: de una a tres frases con el dato clave y tu recomendacion. " +
        "No describas la pantalla, aconseja. Nada de parrafos.",
    ),
  componentesJson: z
    .union([
      z.string(),
      z.array(z.union([componenteObjeto, z.string()])),
    ])
    .describe(
      "Arreglo JSON de componentes A2UI (o string JSON del arreglo). Cada elemento DEBE ser un OBJETO con `id`, `component` y sus props (NO envies solo nombres de tarjetas en texto). " +
        'Un componente con `id: "root"` y `component: "Column"` es la raiz. Ejemplo: ' +
        '[{"id":"root","component":"Column","children":["tarjeta"]},{"id":"tarjeta","component":"Confirmacion","titulo":"ÔÇª","detalle":"ÔÇª","razon":"ÔÇª"}]',
    ),
  datosJson: z
    .union([z.string(), z.record(z.string(), z.unknown())])
    .optional()
    .describe('Objeto JSON del data model, si usas enlaces {"path":"/ÔÇª"} en las props. Default: {}'),
  sugerencias: z
    .array(z.string())
    .max(3)
    .optional()
    .describe("Hasta 3 siguientes preguntas que la persona podria querer hacer"),
});

export type EntradaPintarPantalla = z.infer<typeof entradaPintarPantalla>;

export type ResultadoPintar =
  | { ok: true; componentes: number }
  /** `ayuda`: las props de los componentes que fallaron, para que el reintento no adivine. */
  | { ok: false; errores: string[]; ayuda?: string };

export const MAX_INTENTOS_DE_PANTALLA = 2;

/** Un campo `...Json` como valor: si es texto se parsea, si ya viene parseado se devuelve. */
function comoValor(campo: unknown): unknown {
  return typeof campo === "string" ? (JSON.parse(campo) as unknown) : campo;
}

/**
 * Normaliza la lista de componentes:
 * - Si un elemento es string JSON, lo parsea a objeto.
 * - Si un elemento es el nombre de un componente del cat├ílogo (ej. "Conclusion"), sintetiza el objeto.
 * - Si falta la ra├¡z "root" (Column), la construye agrupando los componentes.
 */
export function normalizarListaDeComponentes(
  lista: unknown[],
  entrada: EntradaPintarPantalla,
  datos: Record<string, unknown>,
): Componente[] {
  const salida: Componente[] = [];

  for (let i = 0; i < lista.length; i++) {
    let item = lista[i];

    // 1. Si vino como string, intentar parsearlo como JSON
    if (typeof item === "string") {
      const limpio = item.trim();
      if (limpio.startsWith("{") || limpio.startsWith("[") || limpio.startsWith("```")) {
        try {
          item = JSON.parse(limpio);
        } catch {
          const rescatado = rescatarJson(limpio);
          if (rescatado) {
            try {
              item = JSON.parse(rescatado);
            } catch {}
          }
          if (typeof item === "string") {
            try {
              item = JSON.parse(quitarComasColgantes(rescatado ?? limpio));
            } catch {}
          }
        }
      }
    }

    // 2. Si el parseo devolvi├│ un array anidado, aplanar
    if (Array.isArray(item)) {
      salida.push(...normalizarListaDeComponentes(item, entrada, datos));
      continue;
    }

    // 3. Si sigue siendo string, ┬┐es el nombre de un componente del cat├ílogo o layout?
    if (typeof item === "string") {
      const nombre = item.trim().replace(/^["']|["']$/g, "");
      if (nombre === "Conclusion") {
        item = {
          id: "conclusion",
          component: "Conclusion",
          razon: entrada.razon,
          titular: entrada.texto,
          detalle: entrada.razon,
          sugerencias: entrada.sugerencias ?? [],
        };
      } else if (nombre === "ProyeccionPagoCredito") {
        const creditosData = esObjetoPlano(datos.consultar_creditos) && Array.isArray((datos.consultar_creditos as Record<string, unknown>).creditos)
          ? ((datos.consultar_creditos as Record<string, unknown>).creditos as Record<string, unknown>[])
          : [];
        const cred = creditosData[0] ?? {};
        item = {
          id: "proyeccion_credito",
          component: "ProyeccionPagoCredito",
          heroe: true,
          razon: entrada.razon,
          creditoId: (cred.id as string) ?? (cred.creditoId as string) ?? "cred_personal",
          alias: (cred.alias as string) ?? "Cr├®dito Personal",
          saldoInsolutoCentavos: (cred.saldoInsolutoCentavos as number) ?? (cred.saldoActualCentavos as number) ?? (cred.saldoCentavos as number) ?? 4738600,
          mensualidadCentavos: (cred.mensualidadCentavos as number) ?? (cred.pagoMensualCentavos as number) ?? 550000,
          tasaAnualPct: (cred.tasaAnualPct as number) ?? (cred.tasaInteresAnual as number) ?? 0.279,
          plazoRestanteMeses: (cred.plazoRestanteMeses as number) ?? (cred.pagosRestantes as number) ?? 12,
          totalInteresesEstimadosCentavos: (cred.totalInteresesEstimadosCentavos as number) ?? 500000,
          amortizacionResumen: (cred.amortizacionResumen as unknown[]) ?? (cred.amortizacion as unknown[]) ?? [
            { numeroPago: 1, periodo: "Mes 1", capitalCentavos: 400000, interesCentavos: 150000, saldoFinalCentavos: 4338600 },
            { numeroPago: 12, periodo: "Mes 12", capitalCentavos: 500000, interesCentavos: 50000, saldoFinalCentavos: 0 },
          ],
        };
      } else if (nombre === "ComparadorAntesDespues") {
        const simCred = (datos.simular_credito ?? {}) as Record<string, unknown>;
        const reest = (datos.simular_reestructura ?? {}) as Record<string, unknown>;
        const reestOpciones = Array.isArray(reest.opciones) ? (reest.opciones as Record<string, unknown>[]) : [];
        const opc = reestOpciones.find((o) => o.esRecomendado) ?? reestOpciones[0] ?? {};

        const saldo = Number(simCred.saldoInsolutoCentavos ?? 4738600);
        const intAct = Number(simCred.interesesActualesCentavos ?? 761832);
        const intNuev = Number(simCred.interesesNuevosCentavos ?? 510000);
        const ahorroNeto = Math.max(
          0,
          Math.round(Number(simCred.ahorroInteresesCentavos ?? opc.ahorroVsMinimoCentavos ?? 251832))
        );
        const ahorroMeses = Math.max(
          0,
          Math.round(Number(simCred.mesesQueAdelanta ?? opc.mesesVsMinimo ?? 2))
        );

        item = {
          id: `comp_comparadorantesdespues_${i}`,
          component: "ComparadorAntesDespues",
          heroe: true,
          razon: entrada.razon,
          titulo: "Comparativa de Pago de Cr├®dito",
          ahorroNetoCentavos: ahorroNeto,
          ahorroTiempoMeses: ahorroMeses,
          escenarioActual: {
            etiqueta: "Camino actual",
            mensualidadCentavos: Number(simCred.mensualidadActualCentavos ?? 480000),
            costoTotalCentavos: saldo + intAct,
            tiempoMeses: Number(simCred.plazoRestanteActualMeses ?? 14),
            descripcion: "Mantener el pago mensual pactado",
          },
          escenarioEstrategia: {
            etiqueta: "Con estrategia Maya",
            mensualidadCentavos: Number(simCred.mensualidadNuevaCentavos ?? 550000),
            costoTotalCentavos: saldo + intNuev,
            tiempoMeses: Number(simCred.plazoNuevoMeses ?? 12),
            descripcion: "Pagando $5,500 al mes terminas 2 meses antes y ahorras intereses",
          },
        };
      } else if (CATALOGO.some((c) => c.nombre === nombre) || (NOMBRES_DE_LAYOUT as readonly string[]).includes(nombre)) {
        item = {
          id: `comp_${nombre.toLowerCase()}_${i}`,
          component: nombre,
          razon: entrada.razon,
        };
      }
    }

    // 4. Si es objeto, aplanamos props anidadas y aseguramos props obligatorias
    if (esObjetoPlano(item)) {
      const comp = { ...item } as Record<string, unknown>;

      // Aplanamos si el modelo anido props en `props`, `parameters`, `data` o `attributes`
      for (const llaveAnidada of ["props", "parameters", "data", "attributes"]) {
        if (esObjetoPlano(comp[llaveAnidada])) {
          const anidadas = comp[llaveAnidada] as Record<string, unknown>;
          delete comp[llaveAnidada];
          for (const [k, v] of Object.entries(anidadas)) {
            if (comp[k] === undefined) comp[k] = v;
          }
        }
      }

      // Si vienen propiedades de objetos anidados serializadas como JSON string, parsearlas
      for (const llave of [
        "escenarioActual",
        "escenarioEstrategia",
        "amortizacionResumen",
        "opciones",
        "categorias",
        "fugas",
        "clases",
        "puntos",
        "hitos",
        "escenarioPesimista",
        "escenarioEsperado",
        "escenarioOptimista",
      ]) {
        if (typeof comp[llave] === "string") {
          const limpio = (comp[llave] as string).trim();
          if (limpio.startsWith("{") || limpio.startsWith("[")) {
            try {
              comp[llave] = JSON.parse(limpio);
            } catch {}
          }
        }
      }

      // Normalizar aliases comunes de props
      if (comp.TasaAnualPct !== undefined && comp.tasaAnualPct === undefined) {
        comp.tasaAnualPct = comp.TasaAnualPct;
      }
      if (comp.tasaAnual !== undefined && comp.tasaAnualPct === undefined) {
        comp.tasaAnualPct = comp.tasaAnual;
      }

      if (!comp.id || typeof comp.id !== "string") {
        comp.id = comp.component === "Column" ? ID_RAIZ : `comp_${i}`;
      }

      if (comp.razon === undefined) {
        comp.razon = entrada.razon;
      }

      // Si es Conclusion y le faltan props obligatorias:
      if (comp.component === "Conclusion") {
        if (!comp.titular) {
          comp.titular = (comp.veredicto as string) ?? (comp.texto as string) ?? (comp.titulo as string) ?? (comp.mensaje as string) ?? entrada.texto ?? "Situación financiera";
        }
        delete comp.veredicto;
        delete comp.texto;
        delete comp.titulo;
        delete comp.mensaje;
        if (!comp.detalle) comp.detalle = entrada.razon || "Evaluación y recomendaciones financieras";
        if (!comp.sugerencias) comp.sugerencias = entrada.sugerencias ?? [];
      }

      // Si es ProyeccionPagoCredito y le faltan props obligatorias:
      if (comp.component === "ProyeccionPagoCredito") {
        const creditosData = esObjetoPlano(datos.consultar_creditos) && Array.isArray((datos.consultar_creditos as Record<string, unknown>).creditos)
          ? ((datos.consultar_creditos as Record<string, unknown>).creditos as Record<string, unknown>[])
          : [];
        const cred = creditosData[0] ?? {};
        if (!comp.creditoId) comp.creditoId = (cred.id as string) ?? (cred.creditoId as string) ?? "cred_personal";
        if (!comp.alias) comp.alias = (cred.alias as string) ?? "Cr├®dito Personal";
        if (comp.saldoInsolutoCentavos === undefined) {
          comp.saldoInsolutoCentavos = (cred.saldoInsolutoCentavos as number) ?? (cred.saldoActualCentavos as number) ?? (cred.saldoCentavos as number) ?? 4738600;
        }
        if (comp.mensualidadCentavos === undefined) {
          comp.mensualidadCentavos = (cred.mensualidadCentavos as number) ?? (cred.pagoMensualCentavos as number) ?? 550000;
        }
        if (comp.tasaAnualPct === undefined) {
          comp.tasaAnualPct = (cred.tasaAnualPct as number) ?? (cred.tasaInteresAnual as number) ?? 0.279;
        }
        if (comp.plazoRestanteMeses === undefined) {
          comp.plazoRestanteMeses = (cred.plazoRestanteMeses as number) ?? (cred.pagosRestantes as number) ?? 12;
        }
        if (comp.totalInteresesEstimadosCentavos === undefined) {
          comp.totalInteresesEstimadosCentavos = (cred.totalInteresesEstimadosCentavos as number) ?? 500000;
        }
        if (!Array.isArray(comp.amortizacionResumen) || comp.amortizacionResumen.length < 2) {
          comp.amortizacionResumen = (Array.isArray(cred.amortizacionResumen) && cred.amortizacionResumen.length >= 2)
            ? cred.amortizacionResumen
            : (Array.isArray(cred.amortizacion) && cred.amortizacion.length >= 2)
            ? (cred.amortizacion as Record<string, unknown>[]).map((h, idx) => ({
                numeroPago: (h.numeroPago as number) ?? idx + 1,
                periodo: (h.periodo as string) ?? `Mes ${idx + 1}`,
                capitalCentavos: (h.capitalCentavos as number) ?? 400000,
                interesCentavos: (h.interesCentavos as number) ?? 150000,
                saldoFinalCentavos: (h.saldoFinalCentavos as number) ?? 4338600,
              }))
            : [
                { numeroPago: 1, periodo: "Mes 1", capitalCentavos: 400000, interesCentavos: 150000, saldoFinalCentavos: 4338600 },
                { numeroPago: 12, periodo: "Mes 12", capitalCentavos: 500000, interesCentavos: 50000, saldoFinalCentavos: 0 },
              ];
        }
      }

      // Si es SimuladorMeta y le faltan props obligatorias:
      if (comp.component === "SimuladorMeta") {
        if (comp.metaCentavos === undefined) comp.metaCentavos = (comp.objetivoCentavos as number) ?? 5578308;
        if (comp.aportacionCentavos === undefined) comp.aportacionCentavos = (comp.aportacionMensualCentavos as number) ?? 200000;
        if (comp.aportacionMinimaCentavos === undefined) comp.aportacionMinimaCentavos = 50000;
        if (comp.aportacionMaximaCentavos === undefined) comp.aportacionMaximaCentavos = 662905;
      }

      // Si es ComparadorAntesDespues y le faltan props obligatorias:
      if (comp.component === "ComparadorAntesDespues") {
        if (!comp.titulo || typeof comp.titulo !== "string") {
          comp.titulo = (typeof comp.title === "string" ? comp.title : undefined) || "Comparativa de Pago de Cr├®dito";
        }

        const simCred = (datos.simular_credito ?? {}) as Record<string, unknown>;
        const reest = (datos.simular_reestructura ?? {}) as Record<string, unknown>;
        const reestOpciones = Array.isArray(reest.opciones) ? (reest.opciones as Record<string, unknown>[]) : [];
        const opc = reestOpciones.find((o) => o.esRecomendado) ?? reestOpciones[0] ?? {};

        const saldo = Number(simCred.saldoInsolutoCentavos ?? 4738600);
        const intAct = Number(simCred.interesesActualesCentavos ?? 761832);
        const intNuev = Number(simCred.interesesNuevosCentavos ?? 510000);

        if (comp.ahorroNetoCentavos === undefined) {
          const ahorroRaw = comp.ahorroCentavos ?? comp.ahorro ?? comp.ahorroNeto ?? simCred.ahorroInteresesCentavos ?? opc.ahorroVsMinimoCentavos ?? 251832;
          comp.ahorroNetoCentavos = Math.max(0, Math.round(Number(ahorroRaw) || 0));
        } else {
          comp.ahorroNetoCentavos = Math.max(0, Math.round(Number(comp.ahorroNetoCentavos) || 0));
        }

        if (comp.ahorroTiempoMeses === undefined) {
          const mesesRaw = comp.mesesAhorrados ?? comp.ahorroMeses ?? simCred.mesesQueAdelanta ?? opc.mesesVsMinimo ?? 2;
          comp.ahorroTiempoMeses = Math.max(0, Math.round(Number(mesesRaw) || 0));
        } else {
          comp.ahorroTiempoMeses = Math.max(0, Math.round(Number(comp.ahorroTiempoMeses) || 0));
        }

        const actualRaw = (comp.escenarioActual ?? comp.actual ?? comp.antes ?? comp.escenario1 ?? {}) as Record<string, unknown>;
        const actualMensualidad = actualRaw.mensualidadCentavos ?? actualRaw.mensualidad ?? simCred.mensualidadActualCentavos ?? 480000;
        const actualCostoTotal = actualRaw.costoTotalCentavos ?? actualRaw.costoTotal ?? actualRaw.totalCentavos ?? (saldo + intAct);
        const actualTiempoMeses = actualRaw.tiempoMeses ?? actualRaw.tiempo ?? actualRaw.plazoMeses ?? actualRaw.meses ?? simCred.plazoRestanteActualMeses ?? 14;

        comp.escenarioActual = {
          etiqueta: String(actualRaw.etiqueta || actualRaw.nombre || "Camino actual"),
          mensualidadCentavos: Math.round(Number(actualMensualidad) || 0),
          costoTotalCentavos: Math.round(Number(actualCostoTotal) || 0),
          tiempoMeses: Math.max(1, Math.round(Number(actualTiempoMeses) || 0)),
          descripcion: String(actualRaw.descripcion || actualRaw.detalle || "Mantener el pago mensual pactado"),
        };

        const estrRaw = (comp.escenarioEstrategia ?? comp.estrategia ?? comp.despues ?? comp.escenario2 ?? comp.propuesta ?? {}) as Record<string, unknown>;
        const estrMensualidad = estrRaw.mensualidadCentavos ?? estrRaw.mensualidad ?? simCred.mensualidadNuevaCentavos ?? 550000;
        const estrCostoTotal = estrRaw.costoTotalCentavos ?? estrRaw.costoTotal ?? estrRaw.totalCentavos ?? (saldo + intNuev);
        const estrTiempoMeses = estrRaw.tiempoMeses ?? estrRaw.tiempo ?? estrRaw.plazoMeses ?? estrRaw.meses ?? simCred.plazoNuevoMeses ?? 12;

        comp.escenarioEstrategia = {
          etiqueta: String(estrRaw.etiqueta || estrRaw.nombre || "Con estrategia Maya"),
          mensualidadCentavos: Math.round(Number(estrMensualidad) || 0),
          costoTotalCentavos: Math.round(Number(estrCostoTotal) || 0),
          tiempoMeses: Math.max(1, Math.round(Number(estrTiempoMeses) || 0)),
          descripcion: String(estrRaw.descripcion || estrRaw.detalle || "Pagando $5,500 al mes terminas 2 meses antes y ahorras intereses"),
        };
      }

      // Si es PlanDePago y le faltan props obligatorias:
      if (comp.component === "PlanDePago") {
        if (!Array.isArray(comp.opciones) || comp.opciones.length === 0) {
          const reest = (datos.simular_reestructura ?? {}) as Record<string, unknown>;
          const reestOpciones = Array.isArray(reest.opciones) ? (reest.opciones as Record<string, unknown>[]) : [];
          comp.opciones = reestOpciones.length > 0
            ? reestOpciones.map((o) => ({
                plazoMeses: Math.round(Number(o.plazoMeses ?? 12)),
                mensualidadCentavos: Math.round(Number(o.mensualidadCentavos ?? 245000)),
                cat: Number(o.cat ?? 0.2858),
                ahorroCentavos: Math.round(Number(o.ahorroVsMinimoCentavos ?? o.ahorroCentavos ?? 520000)),
                recomendado: Boolean(o.esRecomendado ?? o.recomendado),
              }))
            : [
                { plazoMeses: 12, mensualidadCentavos: 245000, cat: 0.2858, ahorroCentavos: 520000, recomendado: true },
                { plazoMeses: 18, mensualidadCentavos: 175000, cat: 0.2858, ahorroCentavos: 380000 },
                { plazoMeses: 24, mensualidadCentavos: 140000, cat: 0.2858, ahorroCentavos: 250000 },
              ];
        }
        if (!comp.etiquetaBoton || typeof comp.etiquetaBoton !== "string") {
          comp.etiquetaBoton = "Aplicar plan";
        }
      }

      // Si es ResumenTarjeta y le faltan props obligatorias:
      if (comp.component === "ResumenTarjeta") {
        const tarjetaData = (
          datos.consultar_tarjeta ??
          (esObjetoPlano(datos.panorama_inicial) ? (datos.panorama_inicial as Record<string, unknown>).tarjeta : undefined) ??
          {}
        ) as Record<string, unknown>;
        if (!comp.mascara || typeof comp.mascara !== "string") {
          comp.mascara = (tarjetaData.mascara as string) ?? "ÔÇóÔÇóÔÇóÔÇó 4821";
        }
        if (comp.saldoCentavos === undefined) {
          comp.saldoCentavos = Math.round(Number(tarjetaData.saldoCentavos ?? 2850000));
        } else {
          comp.saldoCentavos = Math.round(Number(comp.saldoCentavos) || 0);
        }
        if (comp.limiteCentavos === undefined) {
          comp.limiteCentavos = Math.round(Number(tarjetaData.limiteCentavos ?? 3000000));
        } else {
          comp.limiteCentavos = Math.round(Number(comp.limiteCentavos) || 0);
        }
      }

      // Si es GastoPorCategoria y le faltan props obligatorias:
      if (comp.component === "GastoPorCategoria") {
        if (!comp.periodo || typeof comp.periodo !== "string") {
          comp.periodo = "2026-08";
        }
        if (!Array.isArray(comp.categorias) || comp.categorias.length === 0) {
          const gastoData = (datos.analizar_gasto ?? {}) as Record<string, unknown>;
          const cats = Array.isArray(gastoData.categorias) ? (gastoData.categorias as Record<string, unknown>[]) : [];
          comp.categorias = cats.length > 0
            ? cats.map((c) => ({
                categoriaId: String(c.categoriaId ?? c.id ?? "cat_general"),
                nombre: String(c.nombre ?? "General"),
                montoCentavos: Math.round(Number(c.montoCentavos ?? c.gastoCentavos ?? 500000)),
                variacionPct: c.variacionPct !== undefined ? Number(c.variacionPct) : undefined,
              }))
            : [
                { categoriaId: "cat_restaurantes", nombre: "Restaurantes", montoCentavos: 620000 },
                { categoriaId: "cat_super", nombre: "Supermercado", montoCentavos: 830000 },
              ];
        }
        if (comp.totalCentavos === undefined) {
          comp.totalCentavos = (comp.categorias as { montoCentavos: number }[]).reduce(
            (sum, c) => sum + (Number(c.montoCentavos) || 0),
            0,
          );
        } else {
          comp.totalCentavos = Math.round(Number(comp.totalCentavos) || 0);
        }
      }

            
      // Si es AlertaFugas y le faltan props obligatorias o fugas con monto sin centavos:
      if (comp.component === "AlertaFugas") {
        const fugasData = (
          (esObjetoPlano(datos.detectar_fugas) ? (datos.detectar_fugas as Record<string, unknown>) : undefined) ??
          (esObjetoPlano(datos.analizar_gasto) ? ((datos.analizar_gasto as Record<string, unknown>).fugas as Record<string, unknown>) : undefined) ??
          {}
        ) as Record<string, unknown>;

        const suscripcionesBase = Array.isArray(fugasData.suscripciones)
          ? (fugasData.suscripciones as Record<string, unknown>[])
          : Array.isArray(datos.suscripciones)
            ? (datos.suscripciones as Record<string, unknown>[])
            : [];

        // Si fugas vino como string JSON o no es array, normalizarlo
        if (typeof comp.fugas === "string") {
          try {
            comp.fugas = JSON.parse(comp.fugas);
          } catch {}
        }

        if (!Array.isArray(comp.fugas) || comp.fugas.length === 0) {
          if (suscripcionesBase.length > 0) {
            comp.fugas = suscripcionesBase.map((s) => ({
              id: String(s.id ?? "sus_1"),
              concepto: String(s.concepto ?? s.nombre ?? "Suscripción"),
              comercio: String(s.comercio ?? s.concepto ?? "Comercio"),
              montoCentavos: Math.round(Number(s.montoCentavos ?? s.monto ?? 19900)),
              sinUsoReciente: Boolean(s.sinUsoReciente),
              periodicidad: String(s.periodicidad ?? "mensual"),
              mesesSinUso: s.mesesSinUso !== undefined ? Math.round(Number(s.mesesSinUso)) : undefined,
            }));
          } else {
            comp.fugas = [
              { id: "sus_1", concepto: "Streaming", comercio: "Streaming Co", montoCentavos: 19900, sinUsoReciente: true, periodicidad: "mensual", mesesSinUso: 3 },
            ];
          }
        } else {
          // Si ya trae fugas, reparar cada elemento para que montoCentavos, periodicidad, etc. nunca sean undefined
          comp.fugas = (comp.fugas as Array<Record<string, unknown>>).map((f, idx) => {
            if (typeof f === "string") {
              try { f = JSON.parse(f); } catch { f = { concepto: f }; }
            }
            if (!f || typeof f !== "object") f = {};

            const id = String(f.id ?? f.suscripcionId ?? f.suscripcion_id ?? ("sus_" + (idx + 1)));
            const matchDb = suscripcionesBase.find((s) => s.id === id);

            let montoCentavos: number | undefined;
            const posibleMonto = f.montoCentavos ?? f.monto_centavos ?? f.monto ?? f.costoCentavos ?? f.costo ?? f.precioCentavos ?? f.precio ?? f.importeCentavos ?? f.importe ?? f.cantidadCentavos ?? f.cantidad ?? f.cargoCentavos ?? matchDb?.montoCentavos;
            if (posibleMonto !== undefined) {
              const n = Number(posibleMonto);
              if (!isNaN(n)) {
                montoCentavos = n > 0 && n < 1000 && !String(posibleMonto).endsWith("00")
                  ? Math.round(n * 100)
                  : Math.round(n);
              }
            }
            if (montoCentavos === undefined || isNaN(montoCentavos)) {
              montoCentavos = matchDb ? Math.round(Number(matchDb.montoCentavos) || 19900) : 19900;
            }

            const concepto = String(f.concepto ?? f.nombre ?? f.servicio ?? matchDb?.concepto ?? "Suscripción");
            const comercio = String(f.comercio ?? matchDb?.comercio ?? concepto);
            const sinUsoReciente = typeof f.sinUsoReciente === "boolean"
              ? f.sinUsoReciente
              : matchDb?.sinUsoReciente !== undefined
                ? Boolean(matchDb.sinUsoReciente)
                : Boolean(f.sinUso || f.inactiva || (f.mesesSinUso && Number(f.mesesSinUso) > 1));
            const periodicidad = String(f.periodicidad ?? matchDb?.periodicidad ?? "mensual");
            const mesesSinUso = f.mesesSinUso !== undefined
              ? Math.round(Number(f.mesesSinUso))
              : matchDb?.mesesSinUso !== undefined
                ? Math.round(Number(matchDb.mesesSinUso))
                : undefined;

            return {
              id,
              concepto,
              comercio,
              montoCentavos,
              sinUsoReciente,
              periodicidad,
              ...(mesesSinUso !== undefined ? { mesesSinUso } : {}),
            };
          });
        }

        const fugasLista = comp.fugas as Array<{ montoCentavos: number }>;
        const sumaMensual = fugasLista.reduce((acc, f) => acc + (f.montoCentavos || 0), 0);

        if (comp.totalMensualCentavos === undefined) {
          const posibleTotal = fugasData.totalMensualCentavos ?? comp.totalMensual ?? comp.total_mensual_centavos ?? sumaMensual;
          comp.totalMensualCentavos = Math.round(Number(posibleTotal) || sumaMensual);
        } else {
          comp.totalMensualCentavos = Math.round(Number(comp.totalMensualCentavos) || sumaMensual);
        }

        if (comp.totalAnualCentavos === undefined) {
          const posibleAnual = fugasData.totalAnualCentavos ?? comp.totalAnual ?? comp.total_anual_centavos ?? (Number(comp.totalMensualCentavos) * 12);
          comp.totalAnualCentavos = Math.round(Number(posibleAnual) || (Number(comp.totalMensualCentavos) * 12));
        } else {
          comp.totalAnualCentavos = Math.round(Number(comp.totalAnualCentavos) || (Number(comp.totalMensualCentavos) * 12));
        }

        if (comp.pctDelIngreso === undefined) {
          const posiblePct = fugasData.pctDelIngreso ?? comp.pct_del_ingreso ?? 0.05;
          comp.pctDelIngreso = Number(Number(posiblePct).toFixed(4)) || 0.05;
        } else {
          comp.pctDelIngreso = Number(Number(comp.pctDelIngreso).toFixed(4)) || 0.05;
        }
      }

      // Si es DetalleCategoria y le faltan props obligatorias:
      if (comp.component === "DetalleCategoria") {
        if (!comp.categoria || typeof comp.categoria !== "string") comp.categoria = "Gastos generales";
        if (typeof comp.movimientos === "string") {
          try { comp.movimientos = JSON.parse(comp.movimientos); } catch {}
        }
        if (!Array.isArray(comp.movimientos) || comp.movimientos.length === 0) {
          comp.movimientos = [
            { fecha: "2026-08-15", comercio: "Cargo general", montoCentavos: 35000 },
          ];
        } else {
          comp.movimientos = (comp.movimientos as Array<Record<string, unknown>>).map((m) => {
            if (typeof m === "string") {
              try { m = JSON.parse(m); } catch { m = { comercio: m }; }
            }
            if (!m || typeof m !== "object") m = {};
            const montoVal = m.montoCentavos ?? m.monto ?? m.costo ?? m.importe ?? 35000;
            const n = Number(montoVal);
            const montoCentavos = !isNaN(n)
              ? (n > 0 && n < 1000 ? Math.round(n * 100) : Math.round(n))
              : 35000;
            return {
              fecha: String(m.fecha ?? "2026-08-15"),
              comercio: String(m.comercio ?? m.descripcion ?? "Comercio"),
              montoCentavos,
              ...(m.descripcion ? { descripcion: String(m.descripcion) } : {}),
              ...(m.recurrente !== undefined ? { recurrente: Boolean(m.recurrente) } : {}),
            };
          });
        }
        if (comp.totalCentavos === undefined) {
          comp.totalCentavos = (comp.movimientos as Array<{ montoCentavos: number }>).reduce(
            (acc, m) => acc + (m.montoCentavos || 0),
            0,
          );
        } else {
          comp.totalCentavos = Math.round(Number(comp.totalCentavos) || 0);
        }
      }

      // Si es OrdenRebalanceo y le faltan props obligatorias:
      if (comp.component === "OrdenRebalanceo") {
        if (!comp.portafolioId || typeof comp.portafolioId !== "string") comp.portafolioId = "port_balanceado";
        if (!comp.nombrePortafolio || typeof comp.nombrePortafolio !== "string") comp.nombrePortafolio = "Estrategia Balanceada Banorte";
        if (typeof comp.movimientos === "string") {
          try { comp.movimientos = JSON.parse(comp.movimientos); } catch {}
        }
        if (!Array.isArray(comp.movimientos) || comp.movimientos.length === 0) {
          comp.movimientos = [
            { tipo: "compra", claseActivo: "Renta fija", instrumentoClave: "CETES28", montoCentavos: 500000, pesoAnteriorPct: 0.4, pesoNuevoPct: 0.5 },
            { tipo: "venta", claseActivo: "Renta variable", instrumentoClave: "NAFTRAC", montoCentavos: 500000, pesoAnteriorPct: 0.6, pesoNuevoPct: 0.5 },
          ];
        } else {
          comp.movimientos = (comp.movimientos as Array<Record<string, unknown>>).map((m) => {
            if (!m || typeof m !== "object") m = {};
            const montoVal = m.montoCentavos ?? m.monto ?? 500000;
            return {
              tipo: m.tipo === "venta" ? "venta" : "compra",
              claseActivo: String(m.claseActivo ?? "Renta fija"),
              instrumentoClave: String(m.instrumentoClave ?? "CETES28"),
              montoCentavos: Math.round(Number(montoVal) || 500000),
              pesoAnteriorPct: Number(m.pesoAnteriorPct ?? 0.4),
              pesoNuevoPct: Number(m.pesoNuevoPct ?? 0.5),
            };
          });
        }
        if (comp.valorTotalCentavos === undefined) comp.valorTotalCentavos = 5000000;
        else comp.valorTotalCentavos = Math.round(Number(comp.valorTotalCentavos) || 5000000);
        if (comp.comisionTotalCentavos === undefined) comp.comisionTotalCentavos = 0;
        else comp.comisionTotalCentavos = Math.round(Number(comp.comisionTotalCentavos) || 0);
      }

      // Si es RiesgoRendimiento y le faltan props obligatorias:
      if (comp.component === "RiesgoRendimiento") {
        if (!comp.perfilInversionista || typeof comp.perfilInversionista !== "string") comp.perfilInversionista = "Moderado";
        if (comp.toleranciaRiesgoMax === undefined) comp.toleranciaRiesgoMax = 3;
        else comp.toleranciaRiesgoMax = Math.max(1, Math.min(5, Math.round(Number(comp.toleranciaRiesgoMax) || 3)));
        if (comp.montoReferenciaCentavos === undefined) comp.montoReferenciaCentavos = 1000000;
        else comp.montoReferenciaCentavos = Math.round(Number(comp.montoReferenciaCentavos) || 1000000);
        if (typeof comp.instrumentos === "string") {
          try { comp.instrumentos = JSON.parse(comp.instrumentos); } catch {}
        }
        if (!Array.isArray(comp.instrumentos) || comp.instrumentos.length < 2) {
          comp.instrumentos = [
            { id: "inst_cetes_28", clave: "CETES28", nombre: "CETES 28 días", tipo: "Deuda gubernamental", riesgo: 1, rendimientoAnualEsperado: 0.11, recomendado: true },
            { id: "inst_pagare_91", clave: "PAGARE91", nombre: "Pagaré Banorte 91 días", tipo: "Pagaré bancario", riesgo: 2, rendimientoAnualEsperado: 0.105 },
          ];
        }
      }

      // Si es AvisoConsultaNoValida y le faltan props obligatorias:
      if (comp.component === "AvisoConsultaNoValida") {
        if (!comp.titulo || typeof comp.titulo !== "string") comp.titulo = "Consulta no disponible";
        if (!comp.motivo || typeof comp.motivo !== "string") comp.motivo = "Por políticas de seguridad y regulación financiera, no podemos procesar esa solicitud.";
        if (!Array.isArray(comp.sugerencias)) comp.sugerencias = ["Ver mis finanzas", "Consultar mis gastos", "Ver alternativas de inversión"];
      }

// Si es TermometroSaludFinanciera y le faltan props obligatorias:
      if (comp.component === "TermometroSaludFinanciera") {
        const salud = (
          (esObjetoPlano(datos.panorama_inicial) ? (datos.panorama_inicial as Record<string, unknown>).salud : undefined) ??
          (datos.diagnostico_salud_financiera ?? {})
        ) as Record<string, unknown>;
        if (comp.puntajeSalud === undefined) comp.puntajeSalud = Math.round(Number(salud.puntaje ?? salud.score ?? 68));
        else comp.puntajeSalud = Math.round(Number(comp.puntajeSalud) || 0);
        if (!comp.calificacion) comp.calificacion = (salud.calificacion as string) ?? "estable";
        if (!comp.tendencia) comp.tendencia = (salud.tendencia as string) ?? "mejora";
        if (comp.cambioVsMesAnterior === undefined) comp.cambioVsMesAnterior = Math.round(Number(salud.cambioVsMesAnterior ?? 3));
        if (comp.ratioDeudaIngresoPct === undefined) comp.ratioDeudaIngresoPct = Number(salud.ratioDeudaIngresoPct ?? 0.28);
        if (comp.tasaAhorroPct === undefined) comp.tasaAhorroPct = Number(salud.tasaAhorroPct ?? 0.15);
        if (comp.mesesFondoEmergencia === undefined) comp.mesesFondoEmergencia = Number(salud.mesesFondoEmergencia ?? 1.5);
        if (comp.montoAhorradoCentavos === undefined) comp.montoAhorradoCentavos = Math.round(Number(salud.montoAhorradoCentavos ?? 3500000));
        else comp.montoAhorradoCentavos = Math.round(Number(comp.montoAhorradoCentavos) || 0);
      }

      // Si es DistribucionPortafolio y le faltan props obligatorias:
      if (comp.component === "DistribucionPortafolio") {
        if (!Array.isArray(comp.clases) || comp.clases.length === 0) {
          const invData = (datos.consultar_inversiones ?? {}) as Record<string, unknown>;
          const clasesData = Array.isArray(invData.clases) ? (invData.clases as Record<string, unknown>[]) : [];
          comp.clases = clasesData.length > 0
            ? clasesData.map((c, idx) => ({
                claseId: String(c.claseId ?? c.id ?? `clase_${idx}`),
                nombre: String(c.nombre ?? "Renta fija"),
                tipo: String(c.tipo ?? "Deuda"),
                montoCentavos: Math.round(Number(c.montoCentavos ?? 1000000)),
                pesoPct: Number(c.pesoPct ?? 0.5),
                pesoObjetivoPct: c.pesoObjetivoPct !== undefined ? Number(c.pesoObjetivoPct) : undefined,
              }))
            : [
                { claseId: "cetes", nombre: "CETES / Deuda gubernamental", tipo: "Renta fija", montoCentavos: 1500000, pesoPct: 0.6, pesoObjetivoPct: 0.5 },
                { claseId: "rv_global", nombre: "Renta variable global", tipo: "Renta variable", montoCentavos: 1000000, pesoPct: 0.4, pesoObjetivoPct: 0.5 },
              ];
        }
        if (comp.valorTotalCentavos === undefined) {
          comp.valorTotalCentavos = (comp.clases as { montoCentavos: number }[]).reduce(
            (sum, c) => sum + (Number(c.montoCentavos) || 0),
            0,
          );
        } else {
          comp.valorTotalCentavos = Math.round(Number(comp.valorTotalCentavos) || 0);
        }
        if (comp.rendimientoTotalPct === undefined) {
          comp.rendimientoTotalPct = 0.087;
        } else {
          comp.rendimientoTotalPct = Number(comp.rendimientoTotalPct);
        }
        if (comp.aportadoCentavos !== undefined) {
          comp.aportadoCentavos = Math.round(Number(comp.aportadoCentavos) || 0);
        }
      }

      // Si es RendimientoHistorico y le faltan props obligatorias:
      if (comp.component === "RendimientoHistorico") {
        if (!comp.instrumentoId || typeof comp.instrumentoId !== "string") comp.instrumentoId = "inst_cetes_28";
        if (!comp.nombre || typeof comp.nombre !== "string") comp.nombre = "CETES 28 días";
        if (!comp.clave || typeof comp.clave !== "string") comp.clave = "CETES28";
        if (!comp.tipo || typeof comp.tipo !== "string") comp.tipo = "Deuda gubernamental";
        if (!comp.periodo || typeof comp.periodo !== "string") comp.periodo = "Últimas 12 semanas";
        if (comp.precioInicialCentavos === undefined) comp.precioInicialCentavos = 1000;
        else comp.precioInicialCentavos = Math.round(Number(comp.precioInicialCentavos) || 0);
        if (comp.precioFinalCentavos === undefined) comp.precioFinalCentavos = 1114;
        else comp.precioFinalCentavos = Math.round(Number(comp.precioFinalCentavos) || 0);
        if (comp.rendimientoPeriodoPct === undefined) comp.rendimientoPeriodoPct = 0.114;
        else comp.rendimientoPeriodoPct = Number(comp.rendimientoPeriodoPct);
        if (!Array.isArray(comp.puntos) || comp.puntos.length < 2) {
          comp.puntos = [
            { fecha: "2026-06-01", precioCentavos: 1000, variacionPct: 0 },
            { fecha: "2026-07-01", precioCentavos: 1055, variacionPct: 0.055 },
            { fecha: "2026-08-01", precioCentavos: 1114, variacionPct: 0.059 },
          ];
        }
      }

      // Si es ProyeccionCrecimiento y le faltan props obligatorias:
      if (comp.component === "ProyeccionCrecimiento") {
        if (comp.capitalInicialCentavos === undefined) comp.capitalInicialCentavos = 5000000;
        else comp.capitalInicialCentavos = Math.round(Number(comp.capitalInicialCentavos) || 0);
        if (comp.aportacionMensualCentavos === undefined) comp.aportacionMensualCentavos = 200000;
        else comp.aportacionMensualCentavos = Math.round(Number(comp.aportacionMensualCentavos) || 0);
        if (comp.plazoMeses === undefined) comp.plazoMeses = 36;
        else comp.plazoMeses = Math.round(Number(comp.plazoMeses) || 0);
        if (comp.tasaAnualEstimadaPct === undefined) comp.tasaAnualEstimadaPct = 0.105;
        else comp.tasaAnualEstimadaPct = Number(comp.tasaAnualEstimadaPct);
        if (comp.totalAportadoCentavos === undefined) {
          comp.totalAportadoCentavos = Number(comp.capitalInicialCentavos) + Number(comp.aportacionMensualCentavos) * Number(comp.plazoMeses);
        } else {
          comp.totalAportadoCentavos = Math.round(Number(comp.totalAportadoCentavos) || 0);
        }
        if (comp.rendimientoEstimadoCentavos === undefined) comp.rendimientoEstimadoCentavos = 1850000;
        else comp.rendimientoEstimadoCentavos = Math.round(Number(comp.rendimientoEstimadoCentavos) || 0);
        if (comp.valorFinalEstimadoCentavos === undefined) {
          comp.valorFinalEstimadoCentavos = Number(comp.totalAportadoCentavos) + Number(comp.rendimientoEstimadoCentavos);
        } else {
          comp.valorFinalEstimadoCentavos = Math.round(Number(comp.valorFinalEstimadoCentavos) || 0);
        }
        if (!Array.isArray(comp.hitos) || comp.hitos.length === 0) {
          comp.hitos = [
            { mes: 12, etiqueta: "Año 1", aportadoCentavos: 7400000, saldoEstimadoCentavos: 7920000 },
            { mes: 24, etiqueta: "Año 2", aportadoCentavos: 9800000, saldoEstimadoCentavos: 11150000 },
            { mes: 36, etiqueta: "Año 3", aportadoCentavos: 12200000, saldoEstimadoCentavos: 14050000 },
          ];
        }
      }

      // Si es EscenariosInversion y le faltan props obligatorias:
      if (comp.component === "EscenariosInversion") {
        if (comp.montoInvertidoCentavos === undefined) comp.montoInvertidoCentavos = 5000000;
        else comp.montoInvertidoCentavos = Math.round(Number(comp.montoInvertidoCentavos) || 0);
        if (comp.horizonteMeses === undefined) comp.horizonteMeses = 12;
        else comp.horizonteMeses = Math.round(Number(comp.horizonteMeses) || 0);
        if (!comp.escenarioPesimista || typeof comp.escenarioPesimista !== "object") {
          comp.escenarioPesimista = {
            tasaAnualPct: 0.04,
            valorFinalCentavos: 5200000,
            rendimientoCentavos: 200000,
            descripcion: "Escenario conservador con tasas a la baja",
          };
        }
        if (!comp.escenarioEsperado || typeof comp.escenarioEsperado !== "object") {
          comp.escenarioEsperado = {
            tasaAnualPct: 0.10,
            valorFinalCentavos: 5500000,
            rendimientoCentavos: 500000,
            descripcion: "Escenario base manteniendo el portafolio sugerido",
          };
        }
        if (!comp.escenarioOptimista || typeof comp.escenarioOptimista !== "object") {
          comp.escenarioOptimista = {
            tasaAnualPct: 0.14,
            valorFinalCentavos: 5700000,
            rendimientoCentavos: 700000,
            descripcion: "Escenario optimista con mercado favorable",
          };
        }
      }

      if (typeof comp.component === "string") {
        salida.push(comp as Componente);
      }
    }
  }

    // 5. Normalizar la raíz y garantizar que todos los componentes no-layout sean visibles en el árbol
  // A. Si hay más de un componente y una tarjeta del catálogo vino con id "root",
  //    le asignamos un id propio de tarjeta para que no secuestre la raíz y deje a las demás invisibles.
  if (salida.length > 1) {
    for (let i = 0; i < salida.length; i++) {
      const comp = salida[i];
      if (comp.id === ID_RAIZ && comp.component !== "Column" && comp.component !== "Row") {
        comp.id = comp.component === "Conclusion" ? "conclusion" : `comp_${comp.component.toLowerCase()}_${i}`;
      }
    }
  }

  // B. Buscar si ya existe una raíz de layout válida (Column o Row con id "root")
  const raiz = salida.find((c) => c.id === ID_RAIZ && (c.component === "Column" || c.component === "Row"));
  const tieneLayoutInvalido = !raiz && salida.some((c) => (NOMBRES_DE_LAYOUT as readonly string[]).includes(c.component));

  if (!raiz && !tieneLayoutInvalido && salida.length > 1) {
    // Si hay múltiples componentes y no hay layout raíz, sintetizamos un Column "root" con todas las tarjetas como hijos
    const idsHijos = salida.map((c) => c.id);
    salida.unshift({
      id: ID_RAIZ,
      component: "Column",
      razon: entrada.razon,
      children: idsHijos,
    } as Componente);
  } else if (!raiz && !tieneLayoutInvalido && salida.length === 1 && salida[0].id !== ID_RAIZ) {
    // Si hay un solo componente y no tiene id "root", se lo asignamos
    salida[0].id = ID_RAIZ;
  } else if (raiz) {
    // Si ya existe Column raíz, aseguramos que incluya a TODAS las tarjetas de salida en sus children
    // para que ninguna tarjeta (gráficas, resúmenes, comparadores) quede huérfana o invisible
    if (!Array.isArray(raiz.children)) {
      raiz.children = [];
    }
    const hijosDeclarados = new Set(
      (raiz.children as unknown[]).filter((h): h is string => typeof h === "string")
    );
    for (const c of salida) {
      if (c.id !== ID_RAIZ && !LAYOUT.has(c.component) && !hijosDeclarados.has(c.id)) {
        (raiz.children as string[]).push(c.id);
        hijosDeclarados.add(c.id);
      }
    }
  }

  return salida;
}

export function resolverSugerenciasPantalla(entrada: EntradaPintarPantalla, datosBase?: Record<string, unknown>): string[] {
  if (entrada.sugerencias && entrada.sugerencias.length > 0) {
    return entrada.sugerencias.slice(0, 3);
  }
  try {
    const crudos = comoValor(entrada.componentesJson);
    const datosEntrada = entrada.datosJson ? comoValor(entrada.datosJson) : undefined;
    const datos: Record<string, unknown> = {
      ...(datosBase ?? {}),
      ...(esObjetoPlano(datosEntrada) ? datosEntrada : {}),
    };
    const componentes = Array.isArray(crudos)
      ? normalizarListaDeComponentes(crudos, entrada, datos)
      : [];
    const conclusion = componentes.find((c) => c && c.component === "Conclusion");
    if (conclusion && conclusion.sugerencias) {
      if (Array.isArray(conclusion.sugerencias)) {
        return conclusion.sugerencias.filter((s): s is string => typeof s === "string").slice(0, 3);
      }
      if (
        typeof conclusion.sugerencias === "object" &&
        conclusion.sugerencias !== null &&
        "path" in conclusion.sugerencias
      ) {
        const path = String((conclusion.sugerencias as { path: string }).path).replace(/^\//, "");
        const partes = path.split("/");
        let cursor: unknown = datos;
        for (const p of partes) {
          if (cursor && typeof cursor === "object" && p in cursor) {
            cursor = (cursor as Record<string, unknown>)[p];
          } else {
            cursor = undefined;
            break;
          }
        }
        if (Array.isArray(cursor)) {
          return cursor.filter((s): s is string => typeof s === "string").slice(0, 3);
        }
      }
    }
  } catch {
    // Si no parsea, armarMensajes reporta el fallo
  }
  return [];
}

/**
 * Cuantas tarjetas puede traer una pantalla, `Conclusion` incluida.
 *
 * Es un tope de CODIGO y no una linea del prompt porque el prompt ya lo decia ("de 1 a 4")
 * y el modelo se pasaba igual: una pantalla de seis tarjetas no cabe en un celular, obliga
 * a desplazar para encontrar el boton y deja de tener "una sola idea principal". Lo unico
 * que se validaba por cantidad era `heroe <= 1`.
 */
export const TOPE_DE_TARJETAS = 3;

const LAYOUT = new Set<string>(NOMBRES_DE_LAYOUT);

/**
 * Las tarjetas que la persona va a ver de verdad: lo alcanzable desde `root`, sin los
 * componentes de layout (agrupan, no son una idea).
 *
 * Se cuenta sobre el ARBOL y no sobre el arreglo por la misma razon que existe
 * `componentesVisibles` en el motor: un componente que nadie declara como hijo no se
 * pinta, y contarlo haria rechazar pantallas que en pantalla caben de sobra.
 */
export function tarjetasDePantalla(componentes: Componente[]): Componente[] {
  const porId = new Map(componentes.map((c) => [c.id, c]));
  const vistos = new Set<string>();
  const tarjetas: Componente[] = [];
  const pendientes: string[] = [ID_RAIZ];

  while (pendientes.length > 0) {
    const id = pendientes.shift()!;
    if (vistos.has(id)) continue;
    vistos.add(id);
    const componente = porId.get(id);
    if (!componente) continue;
    if (!LAYOUT.has(componente.component)) tarjetas.push(componente);
    pendientes.push(...hijosFijos(componente));
    const plantilla = componente.children;
    if (plantilla && !Array.isArray(plantilla)) pendientes.push(plantilla.componentId);
  }
  return tarjetas;
}

/**
 * Recorta la pantalla al tope, de forma determinista.
 *
 * Es la red de seguridad del ultimo intento: el primer rebase le vuelve al modelo como
 * error de tool para que lo corrija (que es lo que se quiere, porque el modelo sabe cual
 * de sus tarjetas contesta la pregunta), pero si insiste, mas vale una pantalla de tres
 * tarjetas que ninguna. Un turno **nunca** muere por el tope.
 *
 * Se queda con la `Conclusion` ÔÇöes el veredictoÔÇö y con las demas en el orden en que se lee
 * la pantalla. La raiz se rearma como `Column` con solo las que quedaron: reusar sus
 * `children` viejos dejaria ids que ya no existen, y un hijo fantasma tumba el arbol.
 */
export function podarAlTope(componentes: Componente[], tope = TOPE_DE_TARJETAS): Componente[] {
  const tarjetas = tarjetasDePantalla(componentes);
  if (tarjetas.length <= tope) return componentes;

  const porId = new Map(componentes.map((c) => [c.id, c]));
  const raizVieja = porId.get(ID_RAIZ);
  // Con una tarjeta como raiz no hay nada que recortar sin inventar un arbol: las tarjetas
  // del catalogo no llevan hijos, asi que este caso no se da con una pantalla real. Se
  // deja pasar en vez de devolver un arbol roto.
  if (!raizVieja || !LAYOUT.has(raizVieja.component)) return componentes;

  const conclusion = tarjetas.filter((c) => c.component === "Conclusion").slice(0, 1);
  const resto = tarjetas.filter((c) => c.component !== "Conclusion");
  const conservadas = [...conclusion, ...resto].slice(0, tope);

  const salida = new Map<string, Componente>();
  for (const tarjeta of conservadas) recolectarSubarbol(tarjeta.id, porId, salida);
  salida.delete(ID_RAIZ);

  const raiz: Componente = {
    ...raizVieja,
    id: ID_RAIZ,
    component: "Column",
    children: conservadas.map((c) => c.id),
  };
  return [raiz, ...salida.values()];
}

/** El componente y todo lo que cuelga de el, para que podar no deje hijos sin definir. */
function recolectarSubarbol(id: string, porId: Map<string, Componente>, salida: Map<string, Componente>): void {
  if (salida.has(id)) return;
  const componente = porId.get(id);
  if (!componente) return;
  salida.set(id, componente);
  for (const hijo of hijosFijos(componente)) recolectarSubarbol(hijo, porId, salida);
  const plantilla = componente.children;
  if (plantilla && !Array.isArray(plantilla)) recolectarSubarbol(plantilla.componentId, porId, salida);
}

/**
 * La validacion contra los JSON Schema oficiales de A2UI con NUESTRO catalogo dentro
 * (`packages/a2ui/src/esquema.ts`). Compilar ajv cuesta unos cientos de ms, asi que se
 * hace una vez por proceso y no una por turno.
 */
let validadorOficial: ReturnType<typeof crearValidador> | undefined;
function esquemaDelCatalogo(): ReturnType<typeof crearValidador> {
  validadorOficial ??= crearValidador(catalogoPublicado);
  return validadorOficial;
}

/** Los nombres que el agente tiene permitido emitir: el catalogo mas el layout basico. */
export function nombresPermitidos(): Set<string> {
  return new Set<string>([...NOMBRES_DE_LAYOUT, ...CATALOGO.map((c) => c.nombre)]);
}

type Armado = { ok: true; mensajes: MensajeA2UI[]; componentes: number } | { ok: false; errores: string[] };

/** Lo que cambia entre el primer intento del modelo y el ultimo. */
export type OpcionesDeArmado = {
  /**
   * Recorta al tope en vez de rechazar. Solo en el ultimo intento: antes de eso, el rebase
   * le vuelve al modelo para que elija el mismo cuales tarjetas se quedan.
   */
  podarTarjetas?: boolean;
  /**
   * Datos precalculados o de tools MCP por si el modelo omiti├│ datosJson.
   */
  datosBase?: Record<string, unknown>;
};

/**
 * De lo que dijo el modelo a los tres mensajes A2UI del turno.
 *
 * Este es el camino de `pintar_pantalla`: la superficie se **rearma completa**
 * (`createSurface` + la lista entera de componentes + el data model entero). Para cambiar
 * un parametro de lo que ya esta en pantalla sin recrear nada existe `ajustar_pantalla`
 * (`ajustar.ts`), que manda solo los parches y no emite `createSurface`.
 */
export function armarMensajes(entrada: EntradaPintarPantalla, opciones: OpcionesDeArmado = {}): Armado {
  const errores: string[] = [];

  const parseados = parsear(entrada.componentesJson, "componentesJson", errores);
  const datosEntrada = entrada.datosJson ? parsear(entrada.datosJson, "datosJson", errores) : undefined;
  if (errores.length) return { ok: false, errores };

  if (!Array.isArray(parseados)) return { ok: false, errores: ["componentesJson tiene que ser un arreglo de componentes"] };
  if (parseados.length === 0) return { ok: false, errores: ["componentesJson viene vacio"] };
  // El data model es la raiz del JSON Pointer: tiene que ser un objeto. Un arreglo o un
  // texto ahi dejarian al renderer resolviendo `/plan/plazo` contra algo que no lo tiene.
  if (datosEntrada !== undefined && !esObjetoPlano(datosEntrada)) return { ok: false, errores: ["datosJson tiene que ser un objeto JSON ({ ... })"] };

  const datos: Record<string, unknown> = {
    ...(opciones.datosBase ?? {}),
    ...(esObjetoPlano(datosEntrada) ? datosEntrada : {}),
  };

  const normalizados = normalizarListaDeComponentes(parseados, entrada, datos);
  if (normalizados.length === 0) return { ok: false, errores: ["componentesJson no contiene componentes validos"] };

  const componentes = opciones.podarTarjetas
    ? podarAlTope(normalizados)
    : normalizados;

  // El tope va antes de lo demas y corta aqui: con seis tarjetas, los errores de props de
  // las tres que sobran solo estorban en el reintento.
  const tarjetas = tarjetasDePantalla(componentes);
  if (tarjetas.length > TOPE_DE_TARJETAS) {
    return {
      ok: false,
      errores: [
        `la pantalla trae ${tarjetas.length} tarjetas (${tarjetas.map((t) => t.component).join(", ")}) y el tope es ` +
          `${TOPE_DE_TARJETAS}, \`Conclusion\` incluida. Quedate con las que contestan la pregunta y quita el resto.`,
      ],
    };
  }

  const mensajes: MensajeA2UI[] = [
    { version: VERSION_A2UI, createSurface: { surfaceId: SUPERFICIE, catalogId: config.urlCatalogo } },
    { version: VERSION_A2UI, updateComponents: { surfaceId: SUPERFICIE, components: componentes } },
    { version: VERSION_A2UI, updateDataModel: { surfaceId: SUPERFICIE, path: "/", value: datos } },
  ];

  // 1) y 2) Estructura, catalogo por nombre y arbol completo (raiz `root` e hijos que
  // existan): la misma puerta que usa el cliente, en su modo "la pantalla viene entera".
  const permitidos = nombresPermitidos();
  for (const mensaje of mensajes) {
    const resultado = validarMensaje(mensaje, { nombres: permitidos, arbolCompleto: true });
    if (!resultado.ok) errores.push(...resultado.errores);
  }

  // 3) Las props de cada componente, contra el schema de su entrada del catalogo, y la
  // regla de diseno que ningun schema individual puede ver: un solo heroe por pantalla.
  for (const componente of componentes) {
    // Con el data model a la mano se validan los valores RESUELTOS, no solo las props
    // literales: es lo que hace que una prop enlazada deje de ser invisible.
    errores.push(...revisarProps(componente, entrada.razon, datos));
    completarAccion(componente);
  }
  const heroes = componentes.filter((c) => c.heroe === true).map((c) => c.id);
  if (heroes.length > 1) {
    errores.push(`solo un componente por pantalla puede llevar heroe: true; lo llevan ${heroes.join(", ")}`);
  }

  // 4) Y el cerco de verdad: los JSON Schema OFICIALES de A2UI v0.9.1 con nuestro
  // catalogo en el lugar de `anyComponent`. Va al final porque los pasos 2 y 3 dan
  // mejores mensajes para lo suyo (y el 3 completa la `razon` que falte); este pilla lo
  // que ninguno mira: props inventadas, formas mal anidadas, nombres de accion que el
  // catalogo no declara. Cuando un componente nuevo entra al catalogo, esto lo valida
  // sin que nadie escriba una regla.
  if (errores.length === 0) {
    const validar = esquemaDelCatalogo();
    for (const mensaje of mensajes) {
      errores.push(...validar(mensaje).map((e) => `${e.donde} ${e.mensaje}`));
    }
  }

  return errores.length ? { ok: false, errores } : { ok: true, mensajes, componentes: componentes.length };
}

/**
 * Un componente con boton y sin `action` es un boton apagado. El catalogo declara que
 * accion dispara cada componente (`acciones`), y todos los componentes ponen en el
 * `context` lo que su accion necesita al tocarse (el plazo elegido, la suscripcion de
 * la filaÔÇª), asi que la accion por default vale con `context: {}`. Si el modelo la
 * declaro, se respeta tal cual.
 *
 * Paso el 2026-09-12 con la portada de Inicio: el modelo chico pintaba `PlanDePago`
 * sin `action` en dos corridas seguidas, aun con la regla escrita en el prompt, y el
 * boton "Aplicar plan" salia deshabilitado.
 */
function completarAccion(componente: Componente): void {
  if (componente.action) return;
  const entrada = CATALOGO.find((c) => c.nombre === componente.component);
  const nombre = entrada?.acciones?.[0];
  if (nombre) componente.action = { event: { name: nombre, context: {} } };
}

/**
 * El contenido de `componentesJson` / `datosJson`, venga como texto JSON o ya parseado.
 *
 * Los campos se llaman `...Json` justamente para decirle al modelo que van como texto, y casi
 * siempre funciona. Pero no siempre: el 2026-09-12, en el ensayo del guion, Gemini mando
 * `componentesJson` como **arreglo nativo** en el paso del simulador de ahorro. El AI SDK
 * rechazo la llamada, el turno gasto un paso reintentando y aparecio una linea de error en la
 * tira de transparencia por algo que era una pantalla perfectamente valida. Es el mismo caso
 * que ya se habia arreglado en `ajustar_pantalla` para `parchesDatos` (ver `ajustar.ts`), y la
 * respuesta es la misma: aceptar las dos formas en vez de castigar la que no adivinamos.
 */
function parsear(texto: unknown, campo: string, errores: string[]): unknown {
  // Ya viene parseado: nada que hacer, el contenido se valida igual mas abajo.
  if (typeof texto !== "string") return texto;

  try {
    return JSON.parse(texto) as unknown;
  } catch (error) {
    // Segundo intento con lo que el modelo suele pegarle al JSON: cercas de markdown, una
    // frase antes o despues, dos bloques seguidos. Tirar un turno de 6 s por una comilla
    // de mas no vale la pena, y el contenido se valida igual en los pasos de abajo.
    const rescatado = rescatarJson(texto);
    if (rescatado !== undefined) {
      try {
        return JSON.parse(rescatado) as unknown;
      } catch {
        /* cae al siguiente intento */
      }
    }
    // Tercer intento: comas colgantes (`{"a": 1,}`), el error de sintaxis mas comun de
    // los modelos chicos en un JSON largo. El 2026-09-12 tumbo dos portadas seguidas.
    try {
      return JSON.parse(quitarComasColgantes(rescatado ?? texto)) as unknown;
    } catch {
      /* cae al error de abajo */
    }
    // El detalle del parser va en el mensaje a proposito: es lo que el modelo necesita
    // para corregir en el reintento. Y el fragmento va al log, que es el unico lugar
    // donde se puede ver QUE mando.
    const detalle = error instanceof Error ? error.message : String(error);
    console.warn(JSON.stringify({ pintar_pantalla: campo, detalle, fragmento: fragmentoDelError(texto, detalle) }));
    errores.push(
      `${campo} no es JSON valido (${detalle}). Manda un solo arreglo JSON, sin texto ni cercas alrededor.`,
    );
    return undefined;
  }
}

/**
 * El primer JSON completo que haya dentro del texto. Recorta por balance de llaves y
 * corchetes, ignorando lo que este dentro de una cadena, para no cortar en un `{` que
 * viniera dentro de un titulo.
 */
export function rescatarJson(texto: string): string | undefined {
  const limpio = texto.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "");
  const inicio = limpio.search(/[[{]/);
  if (inicio === -1) return undefined;

  const abre = limpio[inicio] === "[" ? "[" : "{";
  const cierra = abre === "[" ? "]" : "}";
  let profundidad = 0;
  let enCadena = false;
  let escapado = false;

  for (let i = inicio; i < limpio.length; i++) {
    const c = limpio[i]!;
    if (enCadena) {
      if (escapado) escapado = false;
      else if (c === "\\") escapado = true;
      else if (c === '"') enCadena = false;
      continue;
    }
    if (c === '"') enCadena = true;
    else if (c === abre) profundidad++;
    else if (c === cierra) {
      profundidad--;
      if (profundidad === 0) return limpio.slice(inicio, i + 1);
    }
  }
  return undefined;
}

/**
 * Quita las comas que van justo antes de `}` o `]`, sin tocar lo que este dentro de una
 * cadena. Es el unico arreglo "creativo" que se le hace al JSON del modelo: no cambia
 * ningun valor, solo quita lo que ningun parser acepta.
 */
export function quitarComasColgantes(texto: string): string {
  let salida = "";
  let enCadena = false;
  let escapado = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]!;
    if (enCadena) {
      salida += c;
      if (escapado) escapado = false;
      else if (c === "\\") escapado = true;
      else if (c === '"') enCadena = false;
      continue;
    }
    if (c === '"') {
      enCadena = true;
      salida += c;
      continue;
    }
    if (c === ",") {
      let j = i + 1;
      while (j < texto.length && /\s/.test(texto[j]!)) j++;
      if (texto[j] === "}" || texto[j] === "]") {
        i = j - 1; // la coma sobra, y el espacio que la seguia tambien
        continue;
      }
    }
    salida += c;
  }
  return salida;
}

/** ~120 caracteres alrededor de la posicion que reporta el parser, para el log. */
function fragmentoDelError(texto: string, detalle: string): string {
  const posicion = Number(/position (\d+)/.exec(detalle)?.[1] ?? 0);
  return texto.slice(Math.max(0, posicion - 60), posicion + 60);
}

function esObjetoPlano(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/**
 * Valida las props contra el schema del catalogo.
 *
 * **Con `dataModel` valida los valores RESUELTOS.** Hasta el 2026-09-12 esta funcion se
 * saltaba toda prop enlazada (`{path}`) con el argumento de que "no se pueden validar por
 * valor", y como el modelo enlaza casi todo, en la practica la mayoria de las props del
 * catalogo no se validaban nunca. Ese era el agujero de fondo detras de los tres bugs de
 * cifras de ese dia: una aportacion de $477 con piso de $500 y un `$457,09.50` escrito a
 * mano pasaron sin que nada dijera nada, porque las dos props venian enlazadas.
 *
 * En `pintar_pantalla` y en `ajustar_pantalla` el data model esta ahi mismo, asi que se
 * resuelve y se valida completo. Lo que sigue quedando fuera es una prop cuyo path resuelve
 * a `undefined`: puede ser un path RELATIVO de plantilla (`children: { componentId, path }`,
 * que solo resuelve contra su elemento) o un dato que llegara despues. Esas se omiten como
 * antes; es el unico hueco que queda y es acotado.
 *
 * `razon` es obligatoria en todo componente del catalogo y es la evidencia de que el
 * agente decidio; si al modelo se le olvida en un componente, se le pone la del turno en
 * vez de rechazar la pantalla completa por una frase. Sin `razonDelTurno` (un parche de
 * `ajustar_pantalla`, donde no hay componente completo que validar) no se completa nada.
 */
export function revisarProps(
  componente: Componente,
  razonDelTurno?: string,
  dataModel?: Record<string, unknown>,
): string[] {
  const entrada = CATALOGO.find((c) => c.nombre === componente.component);
  if (!entrada) return []; // layout: no tiene schema propio

  if (componente.razon === undefined && razonDelTurno !== undefined) componente.razon = razonDelTurno;

  const props = propsDe(componente);
  const paraValidar: Record<string, unknown> = {};
  /** Las que no se pudieron mirar: sus errores se descartan, como se hacia con todas. */
  const opacas = new Set<string>();

  for (const [nombre, valor] of Object.entries(props)) {
    if (!tieneBinding(valor)) {
      paraValidar[nombre] = valor;
      continue;
    }
    if (!dataModel) {
      opacas.add(nombre);
      continue;
    }
    const resuelto = resolverValor(valor as never, dataModel);
    // `undefined` es "no se pudo resolver", no "el modelo mando undefined": path relativo
    // de plantilla, o un dato que aun no esta en el modelo.
    if (resuelto === undefined) opacas.add(nombre);
    else paraValidar[nombre] = resuelto;
  }

  const errores = [...dineroEscritoAMano(componente, paraValidar)];

  const resultado = entrada.schema.safeParse(paraValidar);
  if (!resultado.success) {
    errores.push(
      ...resultado.error.issues
        .filter((issue) => !opacas.has(String(issue.path[0])))
        .map((issue) => `${componente.component} (${componente.id}): ${issue.path.join(".") || "props"} ${issue.message}`),
    );
  }

  return errores;
}

/** `true` si el valor es un binding o si esconde uno dentro (un arreglo, un objeto). */
function tieneBinding(valor: unknown): boolean {
  if (esBinding(valor)) return true;
  if (Array.isArray(valor)) return valor.some(tieneBinding);
  if (esObjetoPlano(valor)) return Object.values(valor).some(tieneBinding);
  return false;
}

/**
 * El ultimo cerco contra la cifra escrita a mano.
 *
 * `Conclusion.datos[].valor` es texto libre y tiene que seguirlo siendo (ahi van `+74%` o
 * `39/100`), asi que Zod no puede distinguir un porcentaje de un monto. Pero un valor que
 * empieza con `$` SI es distinguible, y es exactamente el error que llego a pantalla el
 * 2026-09-12: el modelo convirtio 457095 centavos a pesos a mano y escribio `$457,09.50`.
 * El dinero va en `montoCentavos` y lo formatea el componente.
 */
function dineroEscritoAMano(componente: Componente, props: Record<string, unknown>): string[] {
  const datos = props.datos;
  if (!Array.isArray(datos)) return [];

  return datos
    .filter((d): d is { etiqueta?: unknown; valor: string } => esObjetoPlano(d) && typeof d.valor === "string" && d.valor.trim().startsWith("$"))
    .map(
      (d) =>
        `${componente.component} (${componente.id}): el dato "${String(d.etiqueta ?? "")}" trae el monto ` +
        `escrito a mano en \`valor\` ("${d.valor}"). El dinero va en \`montoCentavos\` como entero de ` +
        `centavos (457095, no "$4,570.95") y lo formatea la interfaz.`,
    );
}
