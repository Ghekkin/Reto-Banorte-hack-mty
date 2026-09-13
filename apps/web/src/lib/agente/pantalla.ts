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
import { fuentesDe } from "@/lib/widgets/fuentes";
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

/**
 * Un componente, tal como lo puede mandar el modelo. `id` y `component` son OPCIONALES aqui a
 * proposito (#43): este schema lo valida el AI SDK **antes** de `execute`, y si exigiera `id`, un
 * componente sin el se rechazaba con un `invalid_union` de decenas de lineas sin que la
 * normalizacion —que ya sabe ponerle uno— llegara a correr. Paso 23 veces el 2026-09-13, incluido
 * el primer paso del guion. Lo que falte lo completa `normalizarListaDeComponentes` o lo reporta
 * con un error corto; las descripciones siguen diciendole al modelo que los mande.
 */
const componenteObjeto = z
  .object({
    id: z.string().optional().describe("Identificador unico del componente. Mandalo siempre"),
    component: z.string().optional().describe("Nombre del componente del catalogo. Mandalo siempre"),
  })
  .passthrough();

export const entradaPintarPantalla = z.object({
  // Sin `min(10)`: una razon corta (el modelo llego a mandar la palabra "razon") no debe tumbar
  // la llamada en el SDK. `armarMensajes` usa el `texto` como razon de las tarjetas si esta no
  // alcanza, y la validacion del catalogo sigue exigiendo una razon real en cada tarjeta (#43).
  razon: z
    .string()
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
        '[{"id":"root","component":"Column","children":["tarjeta"]},{"id":"tarjeta","component":"Confirmacion","titulo":"…","detalle":"…","razon":"…"}]',
    ),
  datosJson: z
    .union([z.string(), z.record(z.string(), z.unknown())])
    .optional()
    .describe('Objeto JSON del data model, si usas enlaces {"path":"/…"} en las props. Default: {}'),
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
 * - Si un elemento es el nombre de un componente del catálogo (ej. "Conclusion"), sintetiza el objeto.
 * - Si falta la raíz "root" (Column), la construye agrupando los componentes.
 */
export function normalizarListaDeComponentes(
  lista: unknown[],
  entrada: EntradaPintarPantalla,
  datos: Record<string, unknown>,
  /** Donde van los componentes que no se pudieron salvar, con un mensaje corto para el modelo. */
  errores?: string[],
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

    // 2. Si el parseo devolvió un array anidado, aplanar
    if (Array.isArray(item)) {
      salida.push(...normalizarListaDeComponentes(item, entrada, datos, errores));
      continue;
    }

    // 3. Si sigue siendo string, ¿es el nombre de un componente del catálogo o layout?
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
      } else if (nombre === "ProyeccionPagoCredito" || nombre === "ComparadorAntesDespues") {
        // Solo el esqueleto: las cifras las pone el paso 4 con lo que devolvio el MCP (issue #23).
        item = {
          id: nombre === "ProyeccionPagoCredito" ? "proyeccion_credito" : `comp_comparadorantesdespues_${i}`,
          component: nombre,
          heroe: true,
          razon: entrada.razon,
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

      // Llaves con comillas o espacios de sobra (`"\"component"`, paso el 2026-09-13): se limpian,
      // sin pisar una llave limpia que ya exista.
      limpiarLlaves(comp);

      // Sin `component`: si sus props solo caben en UN componente del catalogo, es ese (#43).
      if (typeof comp.component !== "string") {
        const inferido = inferirComponente(comp);
        if (inferido) comp.component = inferido;
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

      // Los alias que se reconocen llenan la prop real y se quitan: la validacion oficial es
      // estricta y un alias que se queda rechaza la pantalla aunque la prop ya este puesta (#42).
      // `quitadas` evita que el paso de los enlaces los vuelva a poner al final.
      const quitadas = new Set<string>();
      adoptarAlias(comp, "tasaAnualPct", ["TasaAnualPct", "tasaAnual"], quitadas);

      if (!comp.id || typeof comp.id !== "string") {
        comp.id = comp.component === "Column" ? ID_RAIZ : `comp_${i}`;
      }

      if (comp.razon === undefined) {
        comp.razon = entrada.razon;
      }

      // Un binding {"path": "..."} es la forma correcta y documentada de mandar una prop (los
      // ejemplos few-shot enlazan casi todo a datosJson), y se resuelve despues, en revisarProps.
      // Las reparaciones de abajo miran el valor CRUDO: un binding no es `undefined` ni arreglo,
      // y `Number({path})` es NaN. Se guardan aqui y se reponen tal cual al final, para todos los
      // componentes a la vez, en vez de cuidarlos bloque por bloque (#39).
      const enlazadas = Object.entries(comp).filter(([, valor]) => esBinding(valor));

      // Si es Conclusion y le faltan props obligatorias:
      if (comp.component === "Conclusion") {
        if (!comp.titular) {
          comp.titular = (comp.veredicto as string) ?? (comp.texto as string) ?? (comp.titulo as string) ?? (comp.mensaje as string) ?? entrada.texto ?? "Situación financiera";
        }
        quitarAlias(comp, ["veredicto", "texto", "titulo", "mensaje"], quitadas);
        if (!comp.detalle) comp.detalle = entrada.razon || "Evaluación y recomendaciones financieras";
        if (!comp.sugerencias) comp.sugerencias = entrada.sugerencias ?? [];
        // El schema acepta hasta 3; una cuarta pregunta sugerida no vale un paso de reintento (#43).
        if (Array.isArray(comp.sugerencias) && comp.sugerencias.length > 3) comp.sugerencias = comp.sugerencias.slice(0, 3);
      }

      // Si es ProyeccionPagoCredito y le faltan props obligatorias:
      if (comp.component === "ProyeccionPagoCredito") {
        // Las cifras que falten salen del adaptador de widgets sobre `consultar_creditos`; sin la
        // tool en el turno no hay de donde, y la validacion le pide al modelo consultarla (#23).
        const mcp = propsDelMcp("ProyeccionPagoCredito", datos, typeof comp.creditoId === "string" ? { creditoId: comp.creditoId } : {});
        for (const prop of ["creditoId", "alias", "saldoInsolutoCentavos", "mensualidadCentavos", "tasaAnualPct", "plazoRestanteMeses", "totalInteresesEstimadosCentavos"]) {
          completar(comp, prop, mcp[prop]);
        }
        if ((!Array.isArray(comp.amortizacionResumen) || comp.amortizacionResumen.length < 2) && Array.isArray(mcp.amortizacionResumen)) {
          comp.amortizacionResumen = mcp.amortizacionResumen;
        }
      }

      // Si es SimuladorMeta y le faltan props obligatorias:
      if (comp.component === "SimuladorMeta") {
        adoptarAlias(comp, "metaCentavos", ["objetivoCentavos"], quitadas);
        adoptarAlias(comp, "aportacionCentavos", ["aportacionMensualCentavos"], quitadas);
        const mcp = propsDelMcp("SimuladorMeta", datos);
        for (const prop of ["metaCentavos", "aportacionCentavos", "aportacionMinimaCentavos", "aportacionMaximaCentavos"]) {
          completar(comp, prop, mcp[prop]);
        }
        // Sin `proyectar_ahorro`, el tope del slider sigue siendo un dato real: su capacidad de pago.
        const panorama = esObjetoPlano(datos.panorama_inicial) ? datos.panorama_inicial : {};
        completar(comp, "aportacionMaximaCentavos", panorama.capacidadPagoMensualCentavos);
      }

      // Si es ComparadorAntesDespues y le faltan props obligatorias:
      if (comp.component === "ComparadorAntesDespues") {
        if (!comp.titulo || typeof comp.titulo !== "string") {
          comp.titulo = (typeof comp.title === "string" ? comp.title : undefined) || "Comparativa de pago";
        }
        quitarAlias(comp, ["title"], quitadas);

        // Los dos caminos salen de una simulacion real del turno, o no salen (#23).
        const mcp = comparacionDelMcp(datos);

        adoptarAlias(comp, "ahorroNetoCentavos", ["ahorroCentavos", "ahorro", "ahorroNeto"], quitadas);
        completar(comp, "ahorroNetoCentavos", mcp.ahorroNetoCentavos);
        if (comp.ahorroNetoCentavos !== undefined && !esBinding(comp.ahorroNetoCentavos)) {
          comp.ahorroNetoCentavos = Math.max(0, Math.round(Number(comp.ahorroNetoCentavos) || 0));
        }

        adoptarAlias(comp, "ahorroTiempoMeses", ["mesesAhorrados", "ahorroMeses"], quitadas);
        completar(comp, "ahorroTiempoMeses", mcp.ahorroTiempoMeses);
        if (comp.ahorroTiempoMeses !== undefined && !esBinding(comp.ahorroTiempoMeses)) {
          comp.ahorroTiempoMeses = Math.max(0, Math.round(Number(comp.ahorroTiempoMeses) || 0));
        }

        const actualRaw = (comp.escenarioActual ?? comp.actual ?? comp.antes ?? comp.escenario1 ?? {}) as Record<string, unknown>;
        comp.escenarioActual = escenarioComparado(
          actualRaw,
          mcp.actual,
          String(actualRaw.etiqueta || actualRaw.nombre || "Camino actual"),
          String(actualRaw.descripcion || actualRaw.detalle || "Seguir pagando como hasta hoy"),
        );

        const estrRaw = (comp.escenarioEstrategia ?? comp.estrategia ?? comp.despues ?? comp.escenario2 ?? comp.propuesta ?? {}) as Record<string, unknown>;
        comp.escenarioEstrategia = escenarioComparado(
          estrRaw,
          mcp.estrategia,
          String(estrRaw.etiqueta || estrRaw.nombre || "Con estrategia Maya"),
          String(estrRaw.descripcion || estrRaw.detalle || "Con la estrategia que te propone Maya"),
        );
        quitarAlias(comp, ["actual", "antes", "escenario1", "estrategia", "despues", "escenario2", "propuesta"], quitadas);
      }

      // Si es PlanDePago y le faltan props obligatorias:
      if (comp.component === "PlanDePago") {
        const mcp = propsDelMcp("PlanDePago", datos);
        if ((!Array.isArray(comp.opciones) || comp.opciones.length === 0) && Array.isArray(mcp.opciones)) {
          comp.opciones = mcp.opciones;
        }
        // Sin `tarjetaId`, el boton «Aplicar plan» no sabe que tarjeta diferir.
        completar(comp, "tarjetaId", mcp.tarjetaId);
        if (!comp.etiquetaBoton || typeof comp.etiquetaBoton !== "string") {
          comp.etiquetaBoton = "Aplicar plan";
        }
      }

      // Si es ResumenTarjeta y le faltan props obligatorias:
      if (comp.component === "ResumenTarjeta") {
        // `consultar_tarjeta` trae la tarjeta ANIDADA (`{ tarjeta: {...} }`): el adaptador de
        // widgets la lee bien. Sin esa tool, la del prefetch de `panorama_inicial` (#23, #28).
        const mcp = propsDelMcp("ResumenTarjeta", datos);
        const panorama = esObjetoPlano(datos.panorama_inicial) && esObjetoPlano(datos.panorama_inicial.tarjeta) ? datos.panorama_inicial.tarjeta : {};
        if (!comp.mascara || typeof comp.mascara !== "string") {
          const mascara = mcp.mascara ?? panorama.mascara;
          if (typeof mascara === "string") comp.mascara = mascara;
        }
        if (comp.saldoCentavos === undefined) {
          completar(comp, "saldoCentavos", mcp.saldoCentavos ?? panorama.saldoCentavos);
        } else {
          comp.saldoCentavos = Math.round(Number(comp.saldoCentavos) || 0);
        }
        if (comp.limiteCentavos === undefined) {
          completar(comp, "limiteCentavos", mcp.limiteCentavos ?? panorama.limiteCentavos);
        } else {
          comp.limiteCentavos = Math.round(Number(comp.limiteCentavos) || 0);
        }
      }

      // Si es GastoPorCategoria y le faltan props obligatorias:
      if (comp.component === "GastoPorCategoria") {
        // `analizar_gasto` trae el mes ANIDADO en `gasto`: lo lee el adaptador de widgets (#23).
        const mcp = propsDelMcp("GastoPorCategoria", datos);
        if ((!comp.periodo || typeof comp.periodo !== "string") && typeof mcp.periodo === "string") {
          comp.periodo = mcp.periodo;
        }
        if (!esBinding(comp.categorias) && (!Array.isArray(comp.categorias) || comp.categorias.length === 0) && Array.isArray(mcp.categorias)) {
          comp.categorias = mcp.categorias;
          completar(comp, "totalCentavos", mcp.totalCentavos);
        }
        // Un binding {"path": "..."} es la forma correcta y documentada de mandar el total
        // (los ejemplos few-shot lo enlazan a datosJson): se deja intacto y se resuelve
        // despues, en revisarProps/resolverValor. Tratarlo como numero aqui daba NaN -> 0.
        if (esBinding(comp.totalCentavos)) {
          // no tocar: es un binding legitimo
        } else if (comp.totalCentavos === undefined) {
          if (Array.isArray(comp.categorias)) {
            comp.totalCentavos = (comp.categorias as { montoCentavos: number }[]).reduce(
              (sum, c) => sum + (Number(c.montoCentavos) || 0),
              0,
            );
          }
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
          // Sin suscripciones de una tool no hay fugas que mostrar: nada de una de ejemplo (#23).
          if (suscripcionesBase.length > 0) {
            comp.fugas = suscripcionesBase.map((s) => ({
              id: String(s.id ?? "sus_1"),
              concepto: String(s.concepto ?? s.nombre ?? "Suscripción"),
              comercio: String(s.comercio ?? s.concepto ?? "Comercio"),
              montoCentavos: typeof (s.montoCentavos ?? s.monto) === "number" ? Math.round(Number(s.montoCentavos ?? s.monto)) : undefined,
              sinUsoReciente: Boolean(s.sinUsoReciente),
              periodicidad: String(s.periodicidad ?? "mensual"),
              mesesSinUso: s.mesesSinUso !== undefined ? Math.round(Number(s.mesesSinUso)) : undefined,
            }));
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
            if ((montoCentavos === undefined || isNaN(montoCentavos)) && typeof matchDb?.montoCentavos === "number") {
              montoCentavos = Math.round(matchDb.montoCentavos);
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

        const fugasLista = (Array.isArray(comp.fugas) ? comp.fugas : []) as Array<{ montoCentavos: number }>;
        const sumaMensual = fugasLista.reduce((acc, f) => acc + (f.montoCentavos || 0), 0);

        // Sin fugas ni totales de una tool no hay nada que sumar: un total de $0 tambien seria inventado (#23).
        if (comp.totalMensualCentavos === undefined) {
          const posibleTotal = fugasData.totalMensualCentavos ?? comp.totalMensual ?? comp.total_mensual_centavos ?? (fugasLista.length > 0 ? sumaMensual : undefined);
          if (posibleTotal !== undefined) comp.totalMensualCentavos = Math.round(Number(posibleTotal) || sumaMensual);
        } else {
          comp.totalMensualCentavos = Math.round(Number(comp.totalMensualCentavos) || sumaMensual);
        }

        if (comp.totalAnualCentavos === undefined) {
          const posibleAnual = fugasData.totalAnualCentavos ?? comp.totalAnual ?? comp.total_anual_centavos ??
            (comp.totalMensualCentavos !== undefined ? Number(comp.totalMensualCentavos) * 12 : undefined);
          if (posibleAnual !== undefined) comp.totalAnualCentavos = Math.round(Number(posibleAnual) || (Number(comp.totalMensualCentavos) * 12));
        } else {
          comp.totalAnualCentavos = Math.round(Number(comp.totalAnualCentavos) || (Number(comp.totalMensualCentavos) * 12));
        }

        // El porcentaje sale de la tool o de su ingreso real (`panorama_inicial`); nunca un 5 % fijo (#23).
        if (comp.pctDelIngreso === undefined) {
          const perfil = esObjetoPlano(datos.panorama_inicial) && esObjetoPlano(datos.panorama_inicial.perfil) ? datos.panorama_inicial.perfil : {};
          const ingreso = Number(perfil.ingresoMensualCentavos);
          const posiblePct =
            fugasData.pctDelIngreso ??
            comp.pct_del_ingreso ??
            (ingreso > 0 && Number(comp.totalMensualCentavos) > 0 ? Number(comp.totalMensualCentavos) / ingreso : undefined);
          if (posiblePct !== undefined && Number.isFinite(Number(posiblePct))) comp.pctDelIngreso = Number(Number(posiblePct).toFixed(4));
        } else if (!esBinding(comp.pctDelIngreso) && Number.isFinite(Number(comp.pctDelIngreso))) {
          comp.pctDelIngreso = Number(Number(comp.pctDelIngreso).toFixed(4));
        }
        quitarAlias(comp, ["totalMensual", "total_mensual_centavos", "totalAnual", "total_anual_centavos", "pct_del_ingreso"], quitadas);
      }

      // Si es DetalleCategoria y le faltan props obligatorias:
      if (comp.component === "DetalleCategoria") {
        const mcp = propsDelMcp("DetalleCategoria", datos);
        if ((!comp.categoria || typeof comp.categoria !== "string") && typeof mcp.categoria === "string") comp.categoria = mcp.categoria;
        if (typeof comp.movimientos === "string") {
          try { comp.movimientos = JSON.parse(comp.movimientos); } catch {}
        }
        if (!esBinding(comp.movimientos) && (!Array.isArray(comp.movimientos) || comp.movimientos.length === 0)) {
          // Los movimientos salen de `consultar_movimientos` o no salen: nada de un cargo de ejemplo (#23).
          if (Array.isArray(mcp.movimientos)) {
            comp.movimientos = mcp.movimientos;
            completar(comp, "totalCentavos", mcp.totalCentavos);
          }
        } else if (Array.isArray(comp.movimientos)) {
          comp.movimientos = (comp.movimientos as Array<Record<string, unknown>>).map((m) => {
            if (typeof m === "string") {
              try { m = JSON.parse(m); } catch { m = { comercio: m }; }
            }
            if (!m || typeof m !== "object") m = {};
            const montoVal = m.montoCentavos ?? m.monto ?? m.costo ?? m.importe;
            const n = Number(montoVal);
            const montoCentavos = montoVal !== undefined && !isNaN(n)
              ? (n > 0 && n < 1000 ? Math.round(n * 100) : Math.round(n))
              : undefined;
            return {
              ...(m.fecha !== undefined ? { fecha: String(m.fecha) } : {}),
              comercio: String(m.comercio ?? m.descripcion ?? "Comercio"),
              ...(montoCentavos !== undefined ? { montoCentavos } : {}),
              ...(m.descripcion ? { descripcion: String(m.descripcion) } : {}),
              ...(m.recurrente !== undefined ? { recurrente: Boolean(m.recurrente) } : {}),
            };
          });
        }
        if (esBinding(comp.totalCentavos)) {
          // no tocar: es un binding legitimo, ver comentario igual en GastoPorCategoria
        } else if (comp.totalCentavos === undefined) {
          if (Array.isArray(comp.movimientos)) {
            comp.totalCentavos = (comp.movimientos as Array<{ montoCentavos: number }>).reduce(
              (acc, m) => acc + (m.montoCentavos || 0),
              0,
            );
          }
        } else {
          comp.totalCentavos = Math.round(Number(comp.totalCentavos) || 0);
        }
      }

      // Si es OrdenRebalanceo y le faltan props obligatorias:
      if (comp.component === "OrdenRebalanceo") {
        // Las ordenes salen de `simular_rebalanceo` o no salen: nada de un CETES contra NAFTRAC de ejemplo (#23).
        const mcp = propsDelMcp("OrdenRebalanceo", datos);
        if ((!comp.portafolioId || typeof comp.portafolioId !== "string") && typeof mcp.portafolioId === "string") comp.portafolioId = mcp.portafolioId;
        if ((!comp.nombrePortafolio || typeof comp.nombrePortafolio !== "string") && typeof mcp.nombrePortafolio === "string") comp.nombrePortafolio = mcp.nombrePortafolio;
        if (typeof comp.movimientos === "string") {
          try { comp.movimientos = JSON.parse(comp.movimientos); } catch {}
        }
        if (!Array.isArray(comp.movimientos) || comp.movimientos.length === 0) {
          if (Array.isArray(mcp.movimientos)) comp.movimientos = mcp.movimientos;
        } else {
          comp.movimientos = (comp.movimientos as Array<Record<string, unknown>>).map((m) => {
            if (!m || typeof m !== "object") m = {};
            const montoVal = m.montoCentavos ?? m.monto;
            return {
              tipo: m.tipo === "venta" ? "venta" : "compra",
              ...(m.claseActivo !== undefined ? { claseActivo: String(m.claseActivo) } : {}),
              ...(m.instrumentoClave !== undefined ? { instrumentoClave: String(m.instrumentoClave) } : {}),
              ...(Number.isFinite(Number(montoVal)) && montoVal !== undefined ? { montoCentavos: Math.round(Number(montoVal)) } : {}),
              ...(m.pesoAnteriorPct !== undefined ? { pesoAnteriorPct: Number(m.pesoAnteriorPct) } : {}),
              ...(m.pesoNuevoPct !== undefined ? { pesoNuevoPct: Number(m.pesoNuevoPct) } : {}),
            };
          });
        }
        if (comp.valorTotalCentavos === undefined) completar(comp, "valorTotalCentavos", mcp.valorTotalCentavos);
        else if (Number.isFinite(Number(comp.valorTotalCentavos))) comp.valorTotalCentavos = Math.round(Number(comp.valorTotalCentavos));
        if (comp.comisionTotalCentavos === undefined) completar(comp, "comisionTotalCentavos", mcp.comisionTotalCentavos);
        else comp.comisionTotalCentavos = Math.round(Number(comp.comisionTotalCentavos) || 0);
      }

      // Si es RiesgoRendimiento y le faltan props obligatorias:
      if (comp.component === "RiesgoRendimiento") {
        // Ninguna tool arma esta tarjeta todavia: el perfil sale de `consultar_inversiones` y el
        // resto lo tiene que traer el modelo. Nada de un perfil «Moderado» ni CETES de ejemplo (#23).
        const salidaInversiones = datos.consultar_inversiones ?? salidaAnidada("consultar_inversiones", datos);
        const inversiones = esObjetoPlano(salidaInversiones) && esObjetoPlano(salidaInversiones.perfil) ? salidaInversiones.perfil : {};
        if ((!comp.perfilInversionista || typeof comp.perfilInversionista !== "string") && typeof inversiones.tipo === "string") {
          comp.perfilInversionista = inversiones.tipo;
        }
        if (comp.toleranciaRiesgoMax !== undefined && Number.isFinite(Number(comp.toleranciaRiesgoMax))) {
          comp.toleranciaRiesgoMax = Math.max(1, Math.min(5, Math.round(Number(comp.toleranciaRiesgoMax))));
        }
        if (comp.montoReferenciaCentavos !== undefined && Number.isFinite(Number(comp.montoReferenciaCentavos))) {
          comp.montoReferenciaCentavos = Math.round(Number(comp.montoReferenciaCentavos));
        }
        if (typeof comp.instrumentos === "string") {
          try { comp.instrumentos = JSON.parse(comp.instrumentos); } catch {}
        }
      }

      // Si es AvisoConsultaNoValida y le faltan props obligatorias:
      if (comp.component === "AvisoConsultaNoValida") {
        // Solo props que el schema declara, y solo con lo que devolvio `orientar_consulta_no_valida`.
        // Antes se le agregaban `motivo` y `sugerencias`, que el schema no tiene: el validador
        // oficial rechazaba el aviso en cada intento y el turno moria sin pantalla (#40).
        const orientacion = esObjetoPlano(datos.orientar_consulta_no_valida) ? datos.orientar_consulta_no_valida : {};
        for (const prop of ["tipoInvalidez", "titulo", "explicacion", "datoClave", "alternativasSugeridas", "accionSugerida"]) {
          completar(comp, prop, orientacion[prop]);
        }
      }

// Si es TermometroSaludFinanciera y le faltan props obligatorias:
      if (comp.component === "TermometroSaludFinanciera") {
        // El diagnostico completo sale del adaptador de widgets; `panorama_inicial.salud` solo trae
        // puntaje, calificacion y tendencia. Lo que ninguno trae se queda sin llenar (#23).
        const mcp = propsDelMcp("TermometroSaludFinanciera", datos);
        const panorama = esObjetoPlano(datos.panorama_inicial) && esObjetoPlano(datos.panorama_inicial.salud) ? datos.panorama_inicial.salud : {};
        if (comp.puntajeSalud === undefined) completar(comp, "puntajeSalud", mcp.puntajeSalud ?? panorama.puntajeSalud);
        else comp.puntajeSalud = Math.round(Number(comp.puntajeSalud) || 0);
        if (!comp.calificacion) completar(comp, "calificacion", mcp.calificacion ?? panorama.calificacion);
        if (!comp.tendencia) completar(comp, "tendencia", mcp.tendencia ?? panorama.tendencia);
        for (const prop of ["cambioVsMesAnterior", "ratioDeudaIngresoPct", "tasaAhorroPct", "mesesFondoEmergencia"]) {
          completar(comp, prop, mcp[prop]);
        }
        if (comp.montoAhorradoCentavos === undefined) completar(comp, "montoAhorradoCentavos", mcp.montoAhorradoCentavos);
        else comp.montoAhorradoCentavos = Math.round(Number(comp.montoAhorradoCentavos) || 0);
      }

      // Si es DistribucionPortafolio y le faltan props obligatorias:
      if (comp.component === "DistribucionPortafolio") {
        // `consultar_inversiones` trae posiciones, no `clases`: las acomoda el adaptador de widgets (#23).
        const mcp = propsDelMcp("DistribucionPortafolio", datos);
        if ((!Array.isArray(comp.clases) || comp.clases.length === 0) && Array.isArray(mcp.clases)) {
          comp.clases = mcp.clases;
          completar(comp, "valorTotalCentavos", mcp.valorTotalCentavos);
        }
        if (comp.valorTotalCentavos === undefined) {
          if (Array.isArray(comp.clases)) {
            comp.valorTotalCentavos = (comp.clases as { montoCentavos: number }[]).reduce(
              (sum, c) => sum + (Number(c.montoCentavos) || 0),
              0,
            );
          }
        } else {
          comp.valorTotalCentavos = Math.round(Number(comp.valorTotalCentavos) || 0);
        }
        if (comp.rendimientoTotalPct === undefined) {
          completar(comp, "rendimientoTotalPct", mcp.rendimientoTotalPct);
        } else {
          comp.rendimientoTotalPct = Number(comp.rendimientoTotalPct);
        }
        if (comp.aportadoCentavos !== undefined) {
          comp.aportadoCentavos = Math.round(Number(comp.aportadoCentavos) || 0);
        }
      }

      // Si es RendimientoHistorico y le faltan props obligatorias:
      if (comp.component === "RendimientoHistorico") {
        // El historico sale de `consultar_historico_inversion` o no sale: nada de un CETES de ejemplo (#23).
        const mcp = propsDelMcp("RendimientoHistorico", datos);
        for (const prop of ["instrumentoId", "nombre", "clave", "tipo", "periodo"]) {
          if ((!comp[prop] || typeof comp[prop] !== "string") && typeof mcp[prop] === "string") comp[prop] = mcp[prop];
        }
        if (comp.precioInicialCentavos === undefined) completar(comp, "precioInicialCentavos", mcp.precioInicialCentavos);
        else comp.precioInicialCentavos = Math.round(Number(comp.precioInicialCentavos) || 0);
        if (comp.precioFinalCentavos === undefined) completar(comp, "precioFinalCentavos", mcp.precioFinalCentavos);
        else comp.precioFinalCentavos = Math.round(Number(comp.precioFinalCentavos) || 0);
        if (comp.rendimientoPeriodoPct === undefined) completar(comp, "rendimientoPeriodoPct", mcp.rendimientoPeriodoPct);
        else comp.rendimientoPeriodoPct = Number(comp.rendimientoPeriodoPct);
        if ((!Array.isArray(comp.puntos) || comp.puntos.length < 2) && Array.isArray(mcp.puntos)) {
          comp.puntos = mcp.puntos;
        }
      }

      // Si es ProyeccionCrecimiento y le faltan props obligatorias:
      if (comp.component === "ProyeccionCrecimiento") {
        // Ninguna tool la llena todavia (#19): lo que no traiga el modelo se queda sin llenar. Solo
        // se derivan los totales cuando sus sumandos vienen (#23).
        if (comp.capitalInicialCentavos !== undefined) comp.capitalInicialCentavos = Math.round(Number(comp.capitalInicialCentavos) || 0);
        if (comp.aportacionMensualCentavos !== undefined) comp.aportacionMensualCentavos = Math.round(Number(comp.aportacionMensualCentavos) || 0);
        if (comp.plazoMeses !== undefined) comp.plazoMeses = Math.round(Number(comp.plazoMeses) || 0);
        if (comp.tasaAnualEstimadaPct !== undefined) comp.tasaAnualEstimadaPct = Number(comp.tasaAnualEstimadaPct);
        const sumandos = [comp.capitalInicialCentavos, comp.aportacionMensualCentavos, comp.plazoMeses];
        if (comp.totalAportadoCentavos === undefined) {
          if (sumandos.every((v) => typeof v === "number" && Number.isFinite(v))) {
            comp.totalAportadoCentavos = Number(comp.capitalInicialCentavos) + Number(comp.aportacionMensualCentavos) * Number(comp.plazoMeses);
          }
        } else {
          comp.totalAportadoCentavos = Math.round(Number(comp.totalAportadoCentavos) || 0);
        }
        if (comp.rendimientoEstimadoCentavos !== undefined) comp.rendimientoEstimadoCentavos = Math.round(Number(comp.rendimientoEstimadoCentavos) || 0);
        if (comp.valorFinalEstimadoCentavos === undefined) {
          if (typeof comp.totalAportadoCentavos === "number" && typeof comp.rendimientoEstimadoCentavos === "number") {
            comp.valorFinalEstimadoCentavos = comp.totalAportadoCentavos + comp.rendimientoEstimadoCentavos;
          }
        } else {
          comp.valorFinalEstimadoCentavos = Math.round(Number(comp.valorFinalEstimadoCentavos) || 0);
        }
      }

      // Si es EscenariosInversion y le faltan props obligatorias:
      if (comp.component === "EscenariosInversion") {
        // Ninguna tool la llena todavia: sin escenarios del modelo no hay escenarios de ejemplo (#23).
        if (comp.montoInvertidoCentavos !== undefined) comp.montoInvertidoCentavos = Math.round(Number(comp.montoInvertidoCentavos) || 0);
        if (comp.horizonteMeses !== undefined) comp.horizonteMeses = Math.round(Number(comp.horizonteMeses) || 0);
      }

      for (const [prop, valor] of enlazadas) {
        if (!quitadas.has(prop)) comp[prop] = valor;
      }
      // Y una cuenta hecha sobre un binding o un texto da NaN: se quita en vez de pintarla. La
      // validacion la reporta como faltante y el modelo la corrige (#39).
      for (const [prop, valor] of Object.entries(comp)) {
        if (typeof valor === "number" && Number.isNaN(valor)) delete comp[prop];
      }
      quitarPropsNoDeclaradas(comp);

      if (typeof comp.component === "string") {
        salida.push(comp as Componente);
      } else if (errores && propsEspecificas(comp).length > 0) {
        // Antes se tiraba en silencio y la pantalla salia sin esa tarjeta. Mejor decirselo al
        // modelo en una linea: es la tarjeta que quiso pintar (#43).
        const id = typeof comp.id === "string" && !comp.id.startsWith("comp_") ? ` (id "${comp.id}")` : "";
        errores.push(
          `componentesJson[${i}]${id} no dice que componente es: falta \`component\`, y sus props ` +
            `(${propsEspecificas(comp).slice(0, 6).join(", ")}) no alcanzan para saberlo. Pon \`component\` con el nombre del catalogo.`,
        );
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
 * Se queda con la `Conclusion` —es el veredicto— y con las demas en el orden en que se lee
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
   * Datos precalculados o de tools MCP por si el modelo omitió datosJson.
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
export function armarMensajes(pedida: EntradaPintarPantalla, opciones: OpcionesDeArmado = {}): Armado {
  const errores: string[] = [];
  // La razon del turno es la que hereda cada tarjeta que no trae la suya. Si la del modelo no
  // alcanza (vacia, o la palabra "razon": paso tres veces el 2026-09-13), va el `texto`, que
  // tambien es una frase con el dato; la validacion del catalogo sigue exigiendo 10 caracteres.
  const entrada = razonUtil(pedida.razon) || !razonUtil(pedida.texto) ? pedida : { ...pedida, razon: pedida.texto };

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

  const normalizados = normalizarListaDeComponentes(parseados, entrada, datos, errores);
  if (errores.length) return { ok: false, errores };
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
 * la fila…), asi que la accion por default vale con `context: {}`. Si el modelo la
 * declaro, se respeta tal cual.
 *
 * Paso el 2026-09-12 con la portada de Inicio: el modelo chico pintaba `PlanDePago`
 * sin `action` en dos corridas seguidas, aun con la regla escrita en el prompt, y el
 * boton "Aplicar plan" salia deshabilitado.
 */
export function completarAccion(componente: Componente): void {
  const entrada = CATALOGO.find((c) => c.nombre === componente.component);
  const permitidas = entrada?.acciones ?? [];
  if (componente.action) {
    // Una accion que el catalogo no declara para este componente la rechaza el validador oficial
    // con `must be equal to one of the allowed values` y el turno paga un paso (#43: el aviso de
    // «quiero invertir» con `ver_plan_pago`). Se cambia por la permitida que se le parece o, si
    // no hay una clara, por la de por defecto. La de un componente sin acciones la quita
    // `quitarPropsNoDeclaradas`, porque su schema no declara `action`.
    const nombre = (componente.action as { event?: { name?: unknown } }).event?.name;
    if (typeof nombre !== "string" || permitidas.length === 0 || permitidas.includes(nombre)) return;
    componente.action = { event: { name: accionParecida(nombre, permitidas) ?? permitidas[0], context: {} } };
    return;
  }
  if (permitidas[0]) componente.action = { event: { name: permitidas[0], context: {} } };
}

/** Verbos que no distinguen una accion de otra: `ver_plan_pago` y `simular_plan` hablan del mismo plan. */
const VERBOS_DE_ACCION = new Set(["ver", "simular", "consultar", "aplicar", "elegir", "crear", "confirmar", "programar", "registrar", "cancelar", "rebalancear", "orden", "preguntar"]);

/** La unica accion permitida que comparte un sustantivo con la pedida (`ver_plan_pago` -> `simular_plan`). */
export function accionParecida(pedida: string, permitidas: readonly string[]): string | undefined {
  const sustantivos = (nombre: string) => nombre.toLowerCase().split(/[_\s-]+/).filter((p) => p.length > 2 && !VERBOS_DE_ACCION.has(p));
  const buscadas = new Set(sustantivos(pedida));
  const parecidas = permitidas.filter((permitida) => sustantivos(permitida).some((p) => buscadas.has(p)));
  return parecidas.length === 1 ? parecidas[0] : undefined;
}

/** Una razon que sirve para una tarjeta: texto de al menos 10 caracteres que no es el nombre del campo. */
function razonUtil(razon: unknown): boolean {
  return typeof razon === "string" && razon.trim().length >= 10 && razon.trim().toLowerCase() !== "razon";
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
 * Las props de DATOS de un componente, sacadas de lo que devolvio una tool del MCP en el turno
 * con el mismo adaptador que arma los widgets de Inicio (`widgets/fuentes.ts`, ADR 0011).
 *
 * Es la unica fuente de cifras con la que la normalizacion completa lo que el modelo omitio
 * (issue #23). Hasta el 2026-09-13 ese hueco se llenaba con literales (el saldo de la tarjeta
 * de Beto, una tasa de 27.9 %, un portafolio de CETES de ejemplo) y la pantalla pasaba la
 * validacion con cifras que no eran de nadie. Si la tool no esta en `datos`, o su salida no
 * tiene la forma del schema, no hay cifras: la prop se queda sin llenar y la validacion le
 * pide al modelo que consulte y corrija.
 */
function propsDelMcp(componente: string, datos: Record<string, unknown>, parametros: Record<string, unknown> = {}): Record<string, unknown> {
  for (const definicion of fuentesDe(componente)) {
    const salida = datos[definicion.tool] ?? salidaAnidada(definicion.tool, datos);
    if (salida === undefined) continue;
    try {
      const adaptado = definicion.adaptar(salida, parametros);
      if (adaptado.ok) return adaptado.props;
    } catch {
      // Una salida con otra forma (otra version del MCP, un campo que no se pidio): sin cifras.
    }
  }
  return {};
}

/**
 * Las tools compuestas del MCP devuelven, dentro, la salida entera de otra tool de lectura
 * (`analizar_ahorro.ahorro` es la de `proyectar_ahorro`; `.inversion`, la de
 * `consultar_inversiones`). La portada del Inicio las recibe asi, sin la tool suelta.
 */
const SALIDAS_ANIDADAS: Record<string, ReadonlyArray<readonly [tool: string, campo: string]>> = {
  proyectar_ahorro: [["analizar_ahorro", "ahorro"]],
  consultar_inversiones: [["analizar_ahorro", "inversion"]],
  detectar_fugas: [["analizar_gasto", "fugas"]],
};

function salidaAnidada(tool: string, datos: Record<string, unknown>): unknown {
  for (const [compuesta, campo] of SALIDAS_ANIDADAS[tool] ?? []) {
    const salida = datos[compuesta];
    if (esObjetoPlano(salida) && esObjetoPlano(salida[campo])) return salida[campo];
  }
  return undefined;
}

/** Pone `valor` en `prop` solo si el modelo no la mando y hay un valor real que poner. */
function completar(comp: Record<string, unknown>, prop: string, valor: unknown): void {
  if (comp[prop] === undefined && valor !== undefined && valor !== null) comp[prop] = valor;
}

/** Las que todo componente puede llevar: `ComponentCommon` de A2UI y `CatalogComponentCommon` nuestro. */
const PROPS_COMUNES = ["id", "component", "accessibility", "weight"];
/** Estructura del arbol: si sobran, que las reporte la validacion del arbol, no se tiran aqui. */
const PROPS_DE_ESTRUCTURA = new Set(["children", "child"]);

const declaradasPorComponente = new Map<string, Set<string> | undefined>();

/**
 * Las props que el catalogo PUBLICADO le permite a un componente: exactamente lo que acepta el
 * validador oficial (`unevaluatedProperties: false` sobre las ramas del `allOf`). `undefined` para
 * lo que no es tarjeta del catalogo (layout): eso no se toca aqui.
 */
function propsDeclaradas(nombre: unknown): Set<string> | undefined {
  if (typeof nombre !== "string" || !CATALOGO.some((c) => c.nombre === nombre)) return undefined;
  if (!declaradasPorComponente.has(nombre)) {
    const componentes = catalogoPublicado.components as unknown as Record<string, { allOf?: Array<{ properties?: Record<string, unknown> }> }>;
    const ramas = componentes[nombre]?.allOf;
    declaradasPorComponente.set(nombre, ramas ? new Set([...PROPS_COMUNES, ...ramas.flatMap((r) => Object.keys(r.properties ?? {}))]) : undefined);
  }
  return declaradasPorComponente.get(nombre);
}

/** Las props que no dicen nada de QUE componente es: las lleva cualquiera. */
const PROPS_GENERICAS = new Set([...PROPS_COMUNES, ...PROPS_DE_ESTRUCTURA, "razon", "ancho", "heroe", "action"]);

/** Las props de un objeto que si distinguen a un componente de otro. */
function propsEspecificas(comp: Record<string, unknown>): string[] {
  return Object.keys(comp).filter((prop) => !PROPS_GENERICAS.has(prop));
}

/**
 * El componente de un objeto que llego sin `component` (#43), solo si no hay duda:
 *
 * 1. Sin props propias y con `children`: es la `Column` del arbol.
 * 2. Con menos de dos props propias no se infiere nada: `{id, razon, titulo}` puede ser media docena.
 * 3. Cada componente del catalogo se puntua con cuantas props propias del objeto declara. Gana el
 *    mejor solo si declara al menos el 60 % de ellas y le saca 2 o mas al segundo; si no, no se
 *    adivina y el modelo recibe el error corto.
 *
 * No se exige que traiga todas las obligatorias: la normalizacion llena varias desde el MCP (el
 * `alias` de un credito) y la validacion reporta las que sigan faltando.
 */
export function inferirComponente(comp: Record<string, unknown>): string | undefined {
  const propias = propsEspecificas(comp);
  if (propias.length === 0) return Array.isArray(comp.children) ? "Column" : undefined;
  if (propias.length < 2) return undefined;

  const puntuados = CATALOGO.map((entrada) => {
    const declaradas = propsDeclaradas(entrada.nombre);
    return { nombre: entrada.nombre, coinciden: declaradas ? propias.filter((prop) => declaradas.has(prop)).length : 0 };
  }).sort((a, b) => b.coinciden - a.coinciden);

  const [mejor, segundo] = puntuados;
  if (!mejor || mejor.coinciden < Math.max(2, Math.ceil(propias.length * 0.6))) return undefined;
  if (segundo && segundo.coinciden > mejor.coinciden - 2) return undefined;
  return mejor.nombre;
}

/** `"\"component"` -> `component`: quita comillas y espacios de sobra en las llaves, sin pisar una limpia. */
function limpiarLlaves(comp: Record<string, unknown>): void {
  for (const llave of Object.keys(comp)) {
    const limpia = llave.trim().replace(/^["'`]+|["'`]+$/g, "").trim();
    if (limpia === llave || limpia === "") continue;
    if (comp[limpia] === undefined) comp[limpia] = comp[llave];
    delete comp[llave];
  }
}

/**
 * Un alias que manda el modelo (`tasaAnual` por `tasaAnualPct`) llena la prop real si falta y el
 * componente la declara, y se quita siempre que el alias no sea tambien una prop del componente
 * (#42). En el orden en que vienen: el primero con valor gana.
 */
function adoptarAlias(comp: Record<string, unknown>, prop: string, alias: readonly string[], quitadas: Set<string>): void {
  const declaradas = propsDeclaradas(comp.component);
  if (!declaradas) return;
  if (declaradas.has(prop)) {
    for (const nombre of alias) completar(comp, prop, comp[nombre]);
  }
  quitarAlias(comp, alias, quitadas);
}

/** Quita los alias ya leidos, salvo el que el componente declare como prop propia. */
function quitarAlias(comp: Record<string, unknown>, alias: readonly string[], quitadas: Set<string>): void {
  const declaradas = propsDeclaradas(comp.component);
  if (!declaradas) return;
  for (const nombre of alias) {
    if (declaradas.has(nombre) || !(nombre in comp)) continue;
    delete comp[nombre];
    quitadas.add(nombre);
  }
}

/**
 * El ultimo paso de la normalizacion: una prop que el schema del componente no declara no se pinta
 * nunca, y el validador oficial rechaza la pantalla entera por ella (hoy: `portafolioId` en
 * `DistribucionPortafolio`, `heroe` en `PlanDePago`). Se quita, **salvo** que se parezca a una prop
 * declarada que falta: eso es un nombre mal escrito que el modelo tiene que corregir, y se deja
 * para que la validacion lo nombre («la propiedad "tasaAnual" no existe») en vez de desaparecerlo
 * en silencio. Una obligatoria mal escrita se reporta igual como faltante (#42).
 */
function quitarPropsNoDeclaradas(comp: Record<string, unknown>): void {
  const declaradas = propsDeclaradas(comp.component);
  if (!declaradas) return;
  const faltantes = [...declaradas].filter((prop) => comp[prop] === undefined);
  for (const prop of Object.keys(comp)) {
    if (declaradas.has(prop) || PROPS_DE_ESTRUCTURA.has(prop)) continue;
    if (faltantes.some((faltante) => nombresParecidos(prop, faltante))) continue;
    delete comp[prop];
  }
}

/**
 * `true` si dos nombres de prop parecen el mismo mal escrito: iguales sin mayusculas ni `_`/`-`,
 * uno prefijo del otro (`tasaAnual` / `tasaAnualPct`, `tipo` / `tipoInvalidez`), o a dos ediciones
 * o menos (`metaCentavo` / `metaCentavos`). Umbrales en `docs/algoritmos/normalizacion-de-pantalla.md`.
 */
export function nombresParecidos(a: string, b: string): boolean {
  const x = a.toLowerCase().replace(/[_-]/g, "");
  const y = b.toLowerCase().replace(/[_-]/g, "");
  if (x === y) return true;
  const corto = Math.min(x.length, y.length);
  if (corto >= 4 && (x.startsWith(y) || y.startsWith(x))) return true;
  return corto >= 5 && distanciaDeEdicion(x, y) <= 2;
}

function distanciaDeEdicion(a: string, b: string): number {
  let previa = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const actual = [i];
    for (let j = 1; j <= b.length; j++) {
      actual[j] = Math.min(previa[j] + 1, actual[j - 1] + 1, previa[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previa = actual;
  }
  return previa[b.length];
}

type Escenario = { mensualidadCentavos?: number; costoTotalCentavos?: number; tiempoMeses?: number };

/**
 * Los dos caminos de `ComparadorAntesDespues`, de una simulacion real del turno:
 * `simular_pago_credito` (lo `actual` contra lo `simulado`) o, si no esta, `simular_reestructura`
 * (seguir con el minimo contra la opcion recomendada). El costo total es saldo + intereses, la
 * misma cuenta que usaba el relleno viejo, solo que con los numeros de la tool.
 */
function comparacionDelMcp(datos: Record<string, unknown>): {
  ahorroNetoCentavos?: number;
  ahorroTiempoMeses?: number;
  actual: Escenario;
  estrategia: Escenario;
} {
  const numero = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
  const pago = datos.simular_pago_credito;
  if (esObjetoPlano(pago) && esObjetoPlano(pago.actual) && esObjetoPlano(pago.simulado)) {
    const saldo = numero(pago.saldoInsolutoCentavos);
    const camino = (e: Record<string, unknown>): Escenario => ({
      mensualidadCentavos: numero(e.mensualidadCentavos),
      costoTotalCentavos: saldo !== undefined && numero(e.totalInteresesEstimadosCentavos) !== undefined
        ? saldo + Number(e.totalInteresesEstimadosCentavos)
        : undefined,
      tiempoMeses: numero(e.plazoRestanteMeses),
    });
    return {
      ahorroNetoCentavos: numero(pago.ahorroInteresesCentavos),
      ahorroTiempoMeses: numero(pago.mesesMenos),
      actual: camino(pago.actual),
      estrategia: camino(pago.simulado),
    };
  }
  const reestructura = datos.simular_reestructura;
  if (esObjetoPlano(reestructura) && Array.isArray(reestructura.opciones) && reestructura.opciones.length > 0) {
    const opciones = reestructura.opciones.filter(esObjetoPlano);
    const opcion = opciones.find((o) => o.esRecomendado === true) ?? opciones[0];
    const minimo = esObjetoPlano(reestructura.escenarioMinimo) ? reestructura.escenarioMinimo : {};
    const tarjeta = esObjetoPlano(datos.consultar_tarjeta) && esObjetoPlano(datos.consultar_tarjeta.tarjeta) ? datos.consultar_tarjeta.tarjeta : {};
    return {
      ahorroNetoCentavos: numero(opcion?.ahorroVsMinimoCentavos),
      ahorroTiempoMeses: numero(opcion?.mesesVsMinimo),
      actual: {
        mensualidadCentavos: numero(tarjeta.pagoMinimoCentavos),
        costoTotalCentavos: numero(minimo.totalPagadoCentavos),
        tiempoMeses: minimo.nuncaLiquida === true ? undefined : numero(minimo.meses),
      },
      estrategia: {
        mensualidadCentavos: numero(opcion?.mensualidadCentavos),
        costoTotalCentavos: numero(opcion?.totalAPagarCentavos),
        tiempoMeses: numero(opcion?.plazoMeses),
      },
    };
  }
  return { actual: {}, estrategia: {} };
}

/**
 * Un escenario de `ComparadorAntesDespues`: lo que mando el modelo (con sus alias de nombre), y lo
 * que falte, de la simulacion. Un binding se queda como binding (#39). Lo que no venga de ningun
 * lado no se escribe: antes salia un 0 o un «1 mes» y la tarjeta mentia (#23).
 */
function escenarioComparado(
  crudo: Record<string, unknown>,
  delMcp: Escenario,
  etiqueta: string,
  descripcion: string,
): Record<string, unknown> {
  const valor = (v: unknown, minimo = 0): unknown => {
    if (esBinding(v)) return v;
    if (v === undefined || v === null || !Number.isFinite(Number(v))) return undefined;
    return Math.max(minimo, Math.round(Number(v)));
  };
  const escenario: Record<string, unknown> = { etiqueta };
  const mensualidad = valor(crudo.mensualidadCentavos ?? crudo.mensualidad ?? delMcp.mensualidadCentavos);
  const costoTotal = valor(crudo.costoTotalCentavos ?? crudo.costoTotal ?? crudo.totalCentavos ?? delMcp.costoTotalCentavos);
  const tiempo = valor(crudo.tiempoMeses ?? crudo.tiempo ?? crudo.plazoMeses ?? crudo.meses ?? delMcp.tiempoMeses, 1);
  if (mensualidad !== undefined) escenario.mensualidadCentavos = mensualidad;
  if (costoTotal !== undefined) escenario.costoTotalCentavos = costoTotal;
  if (tiempo !== undefined) escenario.tiempoMeses = tiempo;
  escenario.descripcion = descripcion;
  return escenario;
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

  // Aqui corria `dineroEscritoAMano`, que rechazaba un `$` en `Conclusion.datos[].valor` y pedia
  // `montoCentavos`. Esa prop llego con el trabajo que se revirtio el 2026-09-12 y el schema de
  // `main` no la tiene: exige `valor` como texto. Con las dos reglas juntas ninguna pantalla con
  // montos podia pasar, y el turno moria sin pantalla (issue #21).
  const errores: string[] = [];

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

