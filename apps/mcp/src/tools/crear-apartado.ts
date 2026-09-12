import { EntradaCrearApartado, SalidaCrearApartado } from "@maya/schemas";
import { aplicarAccion } from "../datos/index.js";
import { apartadosCreados, cuentaDe, cuentasDe, type ApartadoCreado } from "../dominio/consultas.js";
import { hoy, sumarMeses } from "../dominio/tiempo.js";
import type { DefinicionDeTool } from "./registro.js";

/**
 * `crear_apartado` — **ACCION**. La segunda accion real del reto (fase 3): aparta
 * dinero hacia una meta con aportacion automatica. Cambia el estado, y
 * `proyectar_ahorro` posterior ya la considera la meta activa de la persona.
 *
 * Idempotente por `idempotencyKey`, igual que `aplicar_plan_pago`: un reintento del
 * agente no crea dos apartados.
 */
export const crearApartado: DefinicionDeTool = {
  nombre: "crear_apartado",
  titulo: "Crear un apartado de ahorro",
  descripcion:
    "CREA de verdad un apartado: separa dinero de una cuenta hacia una meta con aportacion automatica. " +
    "Cambia el estado. Llamala SOLO cuando te llegue la accion `crear_apartado` desde la interfaz, con el " +
    "monto y la aportacion que la persona confirmo, y pasa siempre `idempotencyKey`. Despues pinta la " +
    "confirmacion con la fecha en que llegara a su meta.",
  clase: "accion",
  entrada: EntradaCrearApartado.shape,
  manejar: async (argumentos) => {
    const entrada = EntradaCrearApartado.parse(argumentos);
    const frecuencia = entrada.frecuencia ?? "mensual";

    if (entrada.aportacionCentavos <= 0) throw new Error("la aportacion tiene que ser mayor que cero");
    if (entrada.montoObjetivoCentavos <= entrada.aportacionCentavos) {
      throw new Error("el objetivo tiene que ser mayor que una sola aportacion");
    }

    // La cuenta de origen tiene que ser de la persona: el modelo no puede apartar de la
    // cuenta de otro ni por error.
    if (entrada.cuentaOrigenId && !cuentasDe(entrada.usuarioId).some((c) => c.id === entrada.cuentaOrigenId)) {
      throw new Error(`la cuenta ${entrada.cuentaOrigenId} no es de ${entrada.usuarioId}`);
    }
    const cuentaOrigen =
      entrada.cuentaOrigenId ??
      cuentaDe(entrada.usuarioId, "ahorro")?.id ??
      cuentaDe(entrada.usuarioId, "nomina")?.id;
    if (!cuentaOrigen) throw new Error(`${entrada.usuarioId} no tiene una cuenta de donde apartar`);

    // Un apartado que ya existe con el mismo nombre no se duplica: el agente puede
    // reintentar sin que la persona acabe con tres "Fondo de emergencia".
    const repetido = apartadosCreados(entrada.usuarioId).find(
      (a) => a.nombre.toLowerCase() === entrada.nombre.toLowerCase(),
    );
    if (repetido) return respuesta(repetido, frecuencia, false, true, `Ya tienes un apartado "${repetido.nombre}".`);

    const porMes = frecuencia === "quincenal" ? entrada.aportacionCentavos * 2 : entrada.aportacionCentavos;
    const meses = Math.max(1, Math.ceil(entrada.montoObjetivoCentavos / porMes));
    const creadoEn = new Date().toISOString();

    const meta: ApartadoCreado = {
      id: `meta_${entrada.usuarioId.replace("usr_", "")}_${Date.now()}`,
      nombre: entrada.nombre,
      cuentaOrigenId: cuentaOrigen,
      montoObjetivoCentavos: entrada.montoObjetivoCentavos,
      // El apartado nace en cero: lo que ya tenia ahorrado sigue siendo saldo de su
      // cuenta, no de esta meta. Mezclarlos inflaria el avance el primer dia.
      montoActualCentavos: 0,
      aportacionCentavos: entrada.aportacionCentavos,
      frecuencia,
      fechaObjetivo: sumarMeses(hoy(), meses),
      primeraAportacionFecha: sumarMeses(hoy(), 1),
      creadoEn,
    };

    const resultado = await aplicarAccion({
      id: `acc_${meta.id}`,
      tipo: "crear_apartado",
      usuarioId: entrada.usuarioId,
      idempotencyKey: entrada.idempotencyKey,
      aplicadaEn: creadoEn,
      datos: meta as unknown as Record<string, unknown>,
    });

    const mensaje = resultado.yaEstaba
      ? "Este apartado ya se habia creado con la misma llave; no se creo dos veces."
      : `Listo: aparte ${pesos(meta.aportacionCentavos)} ${frecuencia === "quincenal" ? "cada quincena" : "al mes"} ` +
        `para "${meta.nombre}". Llegas a ${pesos(meta.montoObjetivoCentavos)} el ${meta.fechaObjetivo}.`;

    return respuesta(meta, frecuencia, resultado.aplicado, resultado.yaEstaba, mensaje);
  },
};

function respuesta(
  meta: ApartadoCreado,
  frecuencia: "mensual" | "quincenal",
  aplicado: boolean,
  yaEstaba: boolean,
  mensaje: string,
) {
  const porMes = frecuencia === "quincenal" ? meta.aportacionCentavos * 2 : meta.aportacionCentavos;
  return SalidaCrearApartado.parse({
    aplicado,
    yaEstaba,
    mensaje,
    meta: {
      id: meta.id,
      nombre: meta.nombre,
      cuentaOrigenId: meta.cuentaOrigenId,
      montoObjetivoCentavos: meta.montoObjetivoCentavos,
      montoActualCentavos: meta.montoActualCentavos,
      aportacionCentavos: meta.aportacionCentavos,
      frecuencia: meta.frecuencia,
      apartadoAutomatico: true,
      fechaObjetivo: meta.fechaObjetivo,
      primeraAportacionFecha: meta.primeraAportacionFecha,
      mesesEstimados: Math.max(1, Math.ceil((meta.montoObjetivoCentavos - meta.montoActualCentavos) / porMes)),
    },
  });
}

function pesos(centavos: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(centavos / 100);
}
