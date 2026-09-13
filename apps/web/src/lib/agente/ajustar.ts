import { z } from "zod";
import { VERSION_A2UI, esBinding, leer, type Componente, type MensajeA2UI } from "@maya/a2ui";
import { CATALOGO } from "@maya/catalogo";
import { SUPERFICIE } from "./config";
import { nombresPermitidos, revisarProps } from "./pantalla";

/**
 * `ajustar_pantalla`: cambiar lo que YA esta en pantalla sin recrearla.
 *
 * ## Por que existe
 *
 * Hasta el 2026-09-12 el agente tenia una sola salida —`pintar_pantalla`— y esa salida
 * rearma la superficie completa: `createSurface` (que **borra** el data model, ver
 * `procesar.ts`) mas la lista entera de componentes mas el data model entero. Consecuencia:
 * "y si fueran 24 meses" costaba un turno completo con sus tools, la pantalla parpadeaba
 * con sus esqueletos de carga, y cualquier estado que la interfaz hubiera acumulado se
 * perdia.
 *
 * Pero el motor A2UI nunca necesito eso. `procesar()` aplica un `updateDataModel` **sin
 * tocar `componentes` ni `raiz`**, y `<Superficie>` re-resuelve todas las props contra el
 * data model en cada render. O sea: cambiar un dato ya re-renderizaba la tarjeta sola. Lo
 * unico que faltaba era una forma de mandar el parche.
 *
 * ## Que emite
 *
 * Un `updateDataModel` por parche, con el path REAL (`/gasto/periodo`), nunca `"/"`, y
 * **sin `createSurface`**: el data model sobrevive, que es todo el punto. Y si hay que
 * cambiar una prop literal (activar una variante), un `updateComponents` con los
 * componentes fusionados.
 *
 * `updateComponents` **reemplaza** el componente por id, no lo fusiona campo por campo
 * (asi lo define la spec y asi lo hace `procesar`). Por eso un parche de props se manda
 * como el componente COMPLETO: las props viejas mas las nuevas. Es la razon por la que la
 * peticion trae el arbol entero y no solo los nombres.
 *
 * ## Lo que NO puede hacer
 *
 * Agregar, quitar ni reordenar tarjetas: solo parchea ids que ya existen. Por eso el tope
 * de `TOPE_DE_TARJETAS` no se revisa aqui —un parche no puede meter una cuarta tarjeta por
 * la puerta de atras— y por eso un cambio de tema es `pintar_pantalla`, no un ajuste.
 */

export const entradaAjustarPantalla = z.object({
  razon: z
    .string()
    .min(10)
    .describe("Una frase en segunda persona: por que este cambio, con el dato que lo justifica"),
  texto: z
    .string()
    .min(1)
    .describe("Una o dos frases: que cambio y que significa. Corto, la pantalla ya lo muestra."),
  parchesDatos: z
    .union([z.string(), z.array(z.unknown())])
    .describe(
      'Arreglo de parches al data model, cada uno { "path": "/ruta/exacta", "value": <lo nuevo> }. ' +
        "El path sale de los enlaces que ves en la pantalla actual. Ejemplo: " +
        '[{"path":"/gasto/periodo","value":"2026-07"},{"path":"/gasto/totalCentavos","value":4310050}]. ' +
        "Si solo cambias props literales, manda []",
    ),
  parchesComponentes: z
    .union([z.string(), z.array(z.unknown())])
    .optional()
    .describe(
      'Arreglo de parches de props, cada uno { "id": "<id de la pantalla>", "props": { ... } }. ' +
        "Solo para props que NO vienen del data model (una variante, un resaltado, una etiqueta): " +
        '[{"id":"gasto","props":{"orden":"variacion"}}]. Las props que no menciones se quedan como estan',
    ),
  sugerencias: z
    .array(z.string())
    .max(3)
    .optional()
    .describe("Hasta 3 siguientes preguntas que la persona podria querer hacer"),
  pantalla: z
    .string()
    .optional()
    .describe(
      "SOLO si la tarjeta que cambias esta en una pantalla ANTERIOR del hilo: su id (p1, p2…), tal como " +
        "aparece en `pantallas anteriores`. Omitelo para ajustar la pantalla actual",
    ),
});

export type EntradaAjustarPantalla = z.infer<typeof entradaAjustarPantalla>;

/** La pantalla contra la que se valida el parche: lo que el cliente reporto que se ve. */
export type PantallaActual = {
  arbol: Componente[];
  dataModel: Record<string, unknown>;
  /** Su id en el hilo (`p3`). Sin id, es la unica que hay. */
  pantalla?: string;
};

export type Ajustado =
  | { ok: true; mensajes: MensajeA2UI[]; parches: number; pantalla?: string }
  | { ok: false; errores: string[] };

/** Las llaves que un parche de props NO puede tocar: cambiar el arbol es repintar. */
const NO_PARCHEABLES = new Set(["id", "component", "children", "child", "action"]);

/**
 * A que pantalla va el parche: la actual, o una de arriba si el modelo la nombro.
 *
 * Nombrar la actual por su id es lo mismo que omitirlo. Nombrar una que no viajo en la
 * peticion es un error con la lista de las que si: el modelo se equivoca de numero mas
 * seguido de lo que se inventa pantallas, y con la lista corrige en el siguiente paso.
 */
export function elegirPantalla(
  pedida: string | undefined,
  actual: PantallaActual,
  anteriores: PantallaActual[] = [],
): { ok: true; pantalla: PantallaActual; esAnterior: boolean } | { ok: false; error: string } {
  if (!pedida || pedida === actual.pantalla) return { ok: true, pantalla: actual, esAnterior: false };
  const anterior = anteriores.find((p) => p.pantalla === pedida);
  if (anterior) return { ok: true, pantalla: anterior, esAnterior: true };
  const hay = [actual.pantalla ? `${actual.pantalla} (la actual)` : "la actual", ...anteriores.map((p) => p.pantalla)];
  return {
    ok: false,
    error:
      `no hay ninguna pantalla "${pedida}" que se pueda ajustar. Las que hay son: ${hay.join(", ")}. ` +
      "Si la tarjeta ya no esta en ninguna, usa `pintar_pantalla`.",
  };
}

/**
 * Los parches que NO se le dejan al modelo, porque la cifra ya la dio una tool en este turno y
 * copiarla mal es inventar un numero.
 *
 * Paso de verdad el 2026-09-13 03:30, ensayando «Programar este pago» con Ana: el modelo bajo
 * bien `aportacionCentavos` del `SimuladorMeta` a lo que devolvio la accion, pero puso
 * `aportacionMaximaCentavos: 520000`, un numero que ninguna tool dijo. Y las listas largas
 * (`categorias`, `amortizacionResumen`) son justo lo que un modelo recorta o redondea al
 * copiarlas (`docs/como-funciona/bug-gasto-total-no-cuadra.md`).
 *
 * Asi que, cuando el turno trae el resultado de una de estas tools, las props que salen de ese
 * resultado se escriben aqui, lo haya parcheado el modelo o no; lo demas que mando (textos,
 * `razon`, la `Conclusion`) se respeta:
 *
 * | Tool del turno | Tarjeta | Props |
 * |---|---|---|
 * | `simular_pago_credito` posible | `ProyeccionPagoCredito` del mismo credito | escenario `simulado`, `antes`, contrato, `aviso`, `programado: false` |
 * | `ejecutar_decision` → `programar_abono_capital` | la misma | escenario `despues`, `antes`, `programado: true` |
 * | `simular_gasto_externo` | `GastoPorCategoria` | `categorias`, `totalCentavos` de `despues`, `antes`, `aviso` |
 * | `ejecutar_decision` → `registrar_gasto_externo` | la misma | `despues` ya guardado, `antes`, sin aviso |
 * | `proyectar_ahorro` | `SimuladorMeta` | meta, lo ahorrado, aportacion, tope (nunca debajo de la aportacion), frecuencia |
 * | cualquier accion con `capacidadAhorro` | `SimuladorMeta` | tope, y aportacion y piso recortados al tope |
 *
 * Sin ninguna de esas tools en el turno, no agrega nada.
 */
export function parchesDeterministas(
  pantalla: PantallaActual,
  datosDelTurno: Record<string, unknown> = {},
): Array<{ id: string; props: Record<string, unknown> }> {
  const salida: Array<{ id: string; props: Record<string, unknown> }> = [];
  const agregar = (id: string, props: Record<string, unknown>) => {
    const ya = salida.find((p) => p.id === id);
    if (ya) Object.assign(ya.props, props);
    else salida.push({ id, props });
  };
  const valorDe = (c: Componente, prop: string) => {
    const v = (c as Record<string, unknown>)[prop];
    return esBinding(v) ? leer(pantalla.dataModel, v.path) : v;
  };
  const deTipo = (nombre: string) => pantalla.arbol.filter((c) => c.component === nombre);

  const decision = objeto(datosDelTurno.ejecutar_decision);
  const accion = decision?.accion;
  const resultado = objeto(decision?.resultadoAccion);

  // Credito: la simulacion del turno, o el abono recien programado.
  const simulacion = objeto(datosDelTurno.simular_pago_credito);
  const credito =
    accion === "programar_abono_capital" && resultado?.despues
      ? {
          creditoId: objeto(resultado.abono)?.creditoId,
          escenario: objeto(resultado.despues),
          antes: objeto(resultado.antes),
          contrato: objeto(resultado.abono)?.mensualidadContratoCentavos,
          aviso: undefined,
          programado: true,
        }
      : simulacion?.posible === true && simulacion.simulado
        ? {
            creditoId: simulacion.creditoId,
            escenario: objeto(simulacion.simulado),
            antes: objeto(simulacion.actual),
            contrato: simulacion.mensualidadContratoCentavos,
            aviso: typeof simulacion.aviso === "string" ? simulacion.aviso : undefined,
            programado: false,
          }
        : undefined;
  if (credito?.escenario && credito.antes) {
    for (const c of deTipo("ProyeccionPagoCredito")) {
      const id = valorDe(c, "creditoId");
      if (typeof id === "string" && typeof credito.creditoId === "string" && id !== credito.creditoId) continue;
      const e = credito.escenario;
      agregar(c.id, {
        mensualidadCentavos: e.mensualidadCentavos,
        plazoRestanteMeses: e.plazoRestanteMeses,
        totalInteresesEstimadosCentavos: e.totalInteresesEstimadosCentavos,
        fechaLiquidacion: e.fechaLiquidacion,
        amortizacionResumen: e.amortizacionResumen,
        antes: {
          mensualidadCentavos: credito.antes.mensualidadCentavos,
          plazoRestanteMeses: credito.antes.plazoRestanteMeses,
          totalInteresesEstimadosCentavos: credito.antes.totalInteresesEstimadosCentavos,
        },
        ...(typeof credito.contrato === "number" ? { mensualidadContratoCentavos: credito.contrato } : {}),
        aviso: credito.aviso,
        programado: credito.programado,
      });
    }
  }

  // Gasto: la simulacion del turno, o lo recien guardado.
  const gastoSimulado = objeto(datosDelTurno.simular_gasto_externo);
  const gasto =
    accion === "registrar_gasto_externo" && resultado?.despues
      ? { despues: objeto(resultado.despues), antes: objeto(resultado.antes), aviso: undefined }
      : gastoSimulado?.despues
        ? {
            despues: objeto(gastoSimulado.despues),
            antes: objeto(gastoSimulado.antes),
            aviso: typeof gastoSimulado.aviso === "string" ? gastoSimulado.aviso : undefined,
          }
        : undefined;
  if (gasto?.despues && Array.isArray(gasto.despues.categorias)) {
    for (const c of deTipo("GastoPorCategoria")) {
      agregar(c.id, {
        categorias: gasto.despues.categorias,
        totalCentavos: gasto.despues.totalCentavos,
        ...(typeof gasto.antes?.totalCentavos === "number" ? { antes: { totalCentavos: gasto.antes.totalCentavos } } : {}),
        aviso: gasto.aviso,
      });
    }
  }

  // La meta: «que sean $80,000» o «lo quiero para diciembre» se proyectan con `proyectar_ahorro`,
  // y la tarjeta se queda con lo que la tool uso. El tope nunca queda debajo de la aportacion: si
  // la fecha pide mas de lo que cabe, el slider tiene que poder mostrarlo (y la tool avisa).
  const proyeccion = objeto(datosDelTurno.proyectar_ahorro);
  if (proyeccion && typeof proyeccion.montoObjetivoCentavos === "number" && typeof proyeccion.aportacionCentavos === "number") {
    const capacidad = typeof proyeccion.capacidadMensualCentavos === "number" ? proyeccion.capacidadMensualCentavos : 0;
    for (const c of deTipo("SimuladorMeta")) {
      agregar(c.id, {
        metaCentavos: proyeccion.montoObjetivoCentavos,
        ...(typeof proyeccion.saldoInicialCentavos === "number" ? { saldoInicialCentavos: proyeccion.saldoInicialCentavos } : {}),
        aportacionCentavos: proyeccion.aportacionCentavos,
        aportacionMaximaCentavos: Math.max(capacidad, proyeccion.aportacionCentavos),
        ...(proyeccion.frecuencia === "mensual" || proyeccion.frecuencia === "quincenal" ? { frecuencia: proyeccion.frecuencia } : {}),
      });
    }
  }

  // Lo que puede apartar al mes, tras cualquier accion que lo cambie.
  const tope = objeto(resultado?.capacidadAhorro)?.despuesCentavos;
  if (typeof tope === "number") {
    for (const c of deTipo("SimuladorMeta")) {
      const aportacion = valorDe(c, "aportacionCentavos");
      const minimo = valorDe(c, "aportacionMinimaCentavos");
      agregar(c.id, {
        aportacionMaximaCentavos: tope,
        ...(typeof aportacion === "number" && aportacion > tope ? { aportacionCentavos: tope } : {}),
        ...(typeof minimo === "number" && minimo > tope ? { aportacionMinimaCentavos: tope } : {}),
      });
    }
  }

  return salida;
}

function objeto(valor: unknown): Record<string, unknown> | undefined {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor) ? (valor as Record<string, unknown>) : undefined;
}

export function armarParches(
  entrada: EntradaAjustarPantalla,
  actual: PantallaActual,
  anteriores: PantallaActual[] = [],
  datosDelTurno: Record<string, unknown> = {},
): Ajustado {
  const errores: string[] = [];
  const elegida = elegirPantalla(entrada.pantalla, actual, anteriores);
  if (!elegida.ok) return { ok: false, errores: [elegida.error] };
  const pantalla = elegida.pantalla;

  const parchesDatos = parsearArreglo(entrada.parchesDatos, "parchesDatos", errores);
  const parchesComponentes =
    entrada.parchesComponentes === undefined
      ? []
      : parsearArreglo(entrada.parchesComponentes, "parchesComponentes", errores);
  if (errores.length) return { ok: false, errores };

  for (const fijo of parchesDeterministas(pantalla, datosDelTurno)) {
    const delModelo = parchesComponentes.find((p) => (p as { id?: unknown }).id === fijo.id) as
      | { id: string; props?: Record<string, unknown> }
      | undefined;
    if (delModelo && typeof delModelo.props === "object" && delModelo.props !== null) {
      Object.assign(delModelo.props, fijo.props);
    } else {
      parchesComponentes.push(fijo);
    }
  }

  if (parchesDatos.length === 0 && parchesComponentes.length === 0) {
    return {
      ok: false,
      errores: [
        "no mandaste ningun parche. Si no hay nada que cambiar en la pantalla, usa `responder`; " +
          "si hace falta otra pantalla, usa `pintar_pantalla`.",
      ],
    };
  }

  const mensajes: MensajeA2UI[] = [];

  for (const [i, parche] of parchesDatos.entries()) {
    const p = parche as { path?: unknown; value?: unknown };
    if (typeof p.path !== "string" || !p.path.startsWith("/")) {
      errores.push(`parchesDatos[${i}].path tiene que ser una ruta del data model que empiece con "/"`);
      continue;
    }
    if (!("value" in p)) {
      errores.push(`parchesDatos[${i}] no trae \`value\`. Para borrar una llave, usa \`pintar_pantalla\`.`);
      continue;
    }
    if (!alcanzable(pantalla.dataModel, p.path)) {
      errores.push(
        `parchesDatos[${i}]: "${p.path}" no existe en el data model de esta pantalla y su contenedor tampoco. ` +
          `Las rutas que hay son: ${rutasDePrimerNivel(pantalla.dataModel)}. Un dato nuevo se pinta con \`pintar_pantalla\`.`,
      );
      continue;
    }
    mensajes.push({ version: VERSION_A2UI, updateDataModel: { surfaceId: SUPERFICIE, path: p.path, value: p.value } });
  }

  const porId = new Map(pantalla.arbol.map((c) => [c.id, c]));
  const fusionados: Componente[] = [];

  for (const [i, parche] of parchesComponentes.entries()) {
    const p = parche as { id?: unknown; props?: unknown };
    if (typeof p.id !== "string") {
      errores.push(`parchesComponentes[${i}].id falta`);
      continue;
    }
    const viejo = porId.get(p.id);
    if (!viejo) {
      errores.push(
        `parchesComponentes[${i}]: no hay ningun componente con id "${p.id}" en esta pantalla. ` +
          `Los que hay son: ${[...porId.keys()].join(", ")}.`,
      );
      continue;
    }
    if (typeof p.props !== "object" || p.props === null || Array.isArray(p.props)) {
      errores.push(`parchesComponentes[${i}].props tiene que ser un objeto con las props que cambian`);
      continue;
    }
    const prohibidas = Object.keys(p.props).filter((k) => NO_PARCHEABLES.has(k));
    if (prohibidas.length) {
      errores.push(
        `parchesComponentes[${i}] intenta cambiar ${prohibidas.join(", ")} de "${p.id}". Un ajuste cambia props, ` +
          "no la estructura ni las acciones: para eso usa `pintar_pantalla`.",
      );
      continue;
    }
    if (!CATALOGO.some((c) => c.nombre === viejo.component)) {
      errores.push(`parchesComponentes[${i}]: "${p.id}" es ${viejo.component}, de layout, y no tiene props que ajustar`);
      continue;
    }
    // El componente COMPLETO, no solo lo que cambia: `updateComponents` reemplaza por id.
    // `null` en un parche es «quita esta prop» (vuelve a su default): el 2026-09-13, al guardar
    // un gasto, el modelo mando `etiquetaBoton: null` para esconder el boton, el schema lo
    // rechazo y el turno gasto un paso de mas. Una prop opcional ausente es lo que quiso decir.
    const fusionado: Record<string, unknown> = { ...viejo, ...(p.props as Record<string, unknown>) };
    for (const [llave, valor] of Object.entries(p.props as Record<string, unknown>)) {
      if (valor === null) delete fusionado[llave];
    }
    fusionados.push(fusionado as Componente);
  }

  if (fusionados.length) {
    mensajes.push({ version: VERSION_A2UI, updateComponents: { surfaceId: SUPERFICIE, components: fusionados } });
  }

  // El componente fusionado se valida entero contra el schema de su entrada del catalogo:
  // asi una prop nueva mal escrita se cacha aqui y no en el navegador. Sin `razonDelTurno`,
  // porque el componente ya trae la suya y la del ajuste habla de otra cosa.
  const permitidos = nombresPermitidos();
  for (const componente of fusionados) {
    errores.push(...revisarProps(componente));
    if (!permitidos.has(componente.component)) {
      errores.push(`${componente.id}: "${componente.component}" no esta en el catalogo`);
    }
  }

  if (errores.length) return { ok: false, errores };
  return {
    ok: true,
    mensajes,
    parches: mensajes.length,
    ...(elegida.esAnterior && pantalla.pantalla ? { pantalla: pantalla.pantalla } : {}),
  };
}

/**
 * Si la ruta se puede escribir sin inventarse media pantalla: o ya existe, o existe el
 * objeto que la contiene (agregar una llave a algo que ya esta es legitimo; crear
 * `/inversiones/portafolio/clases` de la nada, no).
 */
function alcanzable(dataModel: Record<string, unknown>, path: string): boolean {
  if (leer(dataModel, path) !== undefined) return true;
  const corte = path.lastIndexOf("/");
  if (corte <= 0) return true; // una llave de primer nivel: el contenedor es el data model
  const padre = leer(dataModel, path.slice(0, corte));
  return typeof padre === "object" && padre !== null && !Array.isArray(padre);
}

function rutasDePrimerNivel(dataModel: Record<string, unknown>): string {
  const llaves = Object.keys(dataModel).map((k) => `/${k}`);
  return llaves.length ? llaves.join(", ") : "(el data model esta vacio)";
}

/**
 * Los parches, vengan como arreglo nativo o como texto JSON.
 *
 * Las dos formas hacen falta y esto no es defensivo de mas: el 2026-09-12, en el primer
 * ensayo del ciclo live con el modelo real, Gemini mando `parchesDatos` como **arreglo**
 * (que es lo natural leyendo la descripcion) y el schema pedia `string`. El AI SDK rechazo
 * la llamada, el turno gasto un paso reintentando y salio una linea de error en la tira de
 * transparencia para algo que no era un error de nadie. `pintar_pantalla` no tiene el
 * problema porque sus campos se llaman `componentesJson` y `datosJson`, y ese nombre le
 * dice al modelo que van como texto.
 *
 * Se acepta texto igual porque es lo que hara el otro proveedor y lo que produce cualquiera
 * que copie la forma de `pintar_pantalla`.
 */
function parsearArreglo(entrada: string | unknown[], campo: string, errores: string[]): unknown[] {
  if (Array.isArray(entrada)) return entrada;
  let valor: unknown;
  try {
    valor = JSON.parse(entrada) as unknown;
  } catch (error) {
    errores.push(
      `${campo} no es JSON valido (${error instanceof Error ? error.message : String(error)}). ` +
        "Manda un solo arreglo, sin texto ni cercas alrededor.",
    );
    return [];
  }
  if (!Array.isArray(valor)) {
    errores.push(`${campo} tiene que ser un arreglo`);
    return [];
  }
  return valor;
}
