import { buscar, filtrar } from "../datos/index.js";
import { usuario, tarjetaDeCredito } from "./consultas.js";
import { resumenDeDeuda } from "./creditos.js";
import type {
  CategoriaConsultaNoValida,
  SalidaOrientarConsultaNoValida,
  TipoInvalidez,
  AccionSugerida,
} from "@maya/schemas";

/**
 * Evalúa consultas que resultan no válidas, no aplicables o fuera de alcance
 * para el usuario en cuestión, proporcionando razones cuantitativas y alternativas reales.
 */
export function orientarConsultaNoValida(
  usuarioId: string,
  consulta: string,
  categoria?: CategoriaConsultaNoValida,
): SalidaOrientarConsultaNoValida {
  const u = usuario(usuarioId);
  const texto = consulta.toLowerCase();

  // 1. Detección de consultas fuera de alcance institucional / regulatorio
  const esCriptoOApuesta =
    categoria === "fuera_de_alcance" ||
    texto.includes("cripto") ||
    texto.includes("bitcoin") ||
    texto.includes("binance") ||
    texto.includes("apuesta") ||
    texto.includes("piramid") ||
    texto.includes("forex");

  if (esCriptoOApuesta) {
    return {
      esValida: false,
      tipoInvalidez: "fuera_de_alcance",
      titulo: "Consulta fuera del catálogo regulado Banorte",
      explicacion:
        "En Banorte operamos bajo estricta regulación de la CNBV y Banco de México. " +
        "No intermediamos en criptoactivos no respaldados ni esquemas de alto riesgo no regulados. " +
        "Te sugerimos alternativas formales con rendimiento garantizado y protección IPAB.",
      datoClave: "Productos 100% supervisados por CNBV y protegidos por IPAB hasta 400 mil UDIS",
      alternativasSugeridas: [
        "Conocer pagarés bancarios con rendimiento garantizado",
        "Consultar fondos de deuda gubernamental Banorte",
        "Simular una meta de ahorro formal",
      ],
      accionSugerida: {
        nombre: "ver_instrumento",
        etiqueta: "Ver fondos gubernamentales",
        context: { tipo: "deuda" },
      },
    };
  }

  // 2. Consulta sobre reestructurar tarjeta cuando NO se tiene tarjeta de crédito
  const esReestructura =
    categoria === "reestructura_sin_tarjeta" ||
    texto.includes("reestructur") ||
    (texto.includes("tarjeta") && texto.includes("plan"));

  const tdc = tarjetaDeCredito(usuarioId);

  if (esReestructura && !tdc) {
    const primerNombre = u?.nombre ? String(u.nombre).split(" ")[0] : "Cliente";
    return {
      esValida: false,
      tipoInvalidez: "producto_no_aplica",
      titulo: "No cuentas con tarjeta de crédito deudora",
      explicacion:
        `Hola ${primerNombre}, tus cuentas activas en Banorte están al corriente y no tienes una tarjeta ` +
        "de crédito con saldo deudor revolvente que requiera un plan de pagos o reestructura.",
      datoClave: "0 tarjetas de crédito con saldo pendiente",
      alternativasSugeridas: [
        "Quiero empezar a ahorrar para una meta",
        "¿En qué se me fue el dinero este mes?",
        "Ver mis movimientos y suscripciones activas",
      ],
      accionSugerida: {
        nombre: "simular_meta",
        etiqueta: "Crear meta de ahorro",
        context: { meta: "Fondo de emergencia" },
      },
    };
  }

  // 3. Consulta sobre inversión cuando el usuario tiene deuda tóxica en mora
  const deuda = resumenDeDeuda(usuarioId);
  const esInversion =
    categoria === "inversion_con_deuda" ||
    texto.includes("invertir") ||
    texto.includes("inversión") ||
    texto.includes("rendimiento") ||
    texto.includes("bolsa") ||
    texto.includes("acciones");

  const tieneMoraOCatAlto = tdc && (Number(tdc.dias_mora) > 0 || Number(tdc.saldo_centavos) > Number(tdc.limite_centavos) * 0.8);

  if (esInversion && tieneMoraOCatAlto) {
    const deudaFormateada = (Number(tdc.saldo_centavos) / 100).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    });

    return {
      esValida: false,
      tipoInvalidez: "deuda_prioritaria",
      titulo: "Recomendación prioritaria: Atiende tu deuda antes de invertir",
      explicacion:
        `Actualmente tu tarjeta presenta un saldo de ${deudaFormateada} con intereses elevados (CAT superior al 60%). ` +
        "Desde el punto de vista financiero, ninguna inversión conservadora te dará más rendimiento del que te cuesta " +
        "esa tasa. Congelar tu saldo con un plan de pagos te ahorra mucho más dinero garantizado.",
      datoClave: "Costo de deuda: ~62.1% CAT vs Rendimiento inversión fija: ~10.5%",
      alternativasSugeridas: [
        "Quiero pagar menos intereses de mi tarjeta",
        "¿En qué se me fue el dinero este mes?",
        "Simular plan de pago con mensualidades fijas",
      ],
      accionSugerida: {
        nombre: "ver_plan_pago",
        etiqueta: "Ver opciones de reestructura",
        context: { tarjetaId: tdc.id },
      },
    };
  }

  // 4. Cancelar suscripciones cuando no hay suscripciones activas
  const suscripciones = filtrar("suscripciones", "usuario_id", usuarioId).filter((s) => s.estatus === "activa");
  const esCancelacion =
    categoria === "cancelacion_sin_suscripciones" ||
    (texto.includes("cancelar") && (texto.includes("suscripcion") || texto.includes("membresia")));

  if (esCancelacion && suscripciones.length === 0) {
    return {
      esValida: false,
      tipoInvalidez: "producto_no_aplica",
      titulo: "No tienes suscripciones activas registradas",
      explicacion:
        "No detectamos suscripciones activas ni cargos periódicos de streaming o gimnasios en tus cuentas Banorte.",
      datoClave: "0 suscripciones activas detectadas",
      alternativasSugeridas: [
        "¿En qué se me fue el dinero este mes?",
        "Ver mis movimientos recientes",
        "Consultar mi salud financiera",
      ],
    };
  }

  // 5. Caso general no válido o incompatible
  return {
    esValida: false,
    tipoInvalidez: "sin_datos_suficientes",
    titulo: "Consulta no disponible para tu cuenta",
    explicacion:
      "La solicitud ingresada no coincide con los productos activos o el estado de tu cuenta en Banorte. " +
      "Aquí tienes las opciones con las que sí podemos asistirte en este momento.",
    alternativasSugeridas: [
      "¿Cómo estoy financieramente hoy?",
      "¿En qué se me fue el dinero?",
      "Quiero revisar mis cuentas y saldos",
    ],
  };
}
