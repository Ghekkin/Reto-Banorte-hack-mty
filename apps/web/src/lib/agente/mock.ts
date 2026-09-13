import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { validarMensaje, type MensajeA2UI } from "@maya/a2ui";
import { config } from "./config";
import { nombresPermitidos } from "./pantalla";
import { proveedorActivo } from "./modelo";
import type { LineaStream, PeticionAgente } from "./tipos";

/**
 * El turno de ejemplo: lo que se sirve cuando NO hay llave de modelo en el `.env`.
 *
 * Existe por la regla 4 del repo (`main` siempre arranca): quien clona el repo sin
 * llaves ve el ciclo completo —escribir, stream, renderer, tocar, turno nuevo— con una
 * pantalla fija. Con llave, este archivo no se ejecuta.
 */
export async function* turnoDeEjemplo(peticion: PeticionAgente, inicio: number): AsyncGenerator<LineaStream> {
  const ultimoTexto = peticion.mensajes.at(-1)?.texto.toLowerCase().trim() ?? "";
  const esSaludo =
    !peticion.accion &&
    (ultimoTexto === "hola" ||
      ultimoTexto === "hola maya" ||
      ultimoTexto === "buen dia" ||
      ultimoTexto === "buenos dias" ||
      ultimoTexto === "buenas tardes");

  if (esSaludo) {
    const sugerenciasPorUsuario: Record<string, string[]> = {
      usr_beto: ["Bajar intereses de mi tarjeta", "¿En qué se me fue el dinero?", "Diagnóstico de salud financiera"],
      usr_ana: ["Quiero empezar a ahorrar", "Detectar suscripciones y fugas", "¿Cómo va mi crédito?"],
      usr_carmen: ["Ver mi portafolio", "Sugerencias de inversión", "Balance y gastos del mes"],
    };
    const sugerencias = sugerenciasPorUsuario[peticion.usuarioId] ?? [
      "¿Cómo está mi salud financiera?",
      "¿En qué se me fue el dinero?",
      "Quiero empezar a ahorrar",
    ];

    yield {
      tipo: "texto",
      valor:
        "¡Hola! Qué gusto saludarte. Soy Maya, tu asesora de salud financiera en Banorte. ¿Qué te gustaría realizar hoy con tus finanzas y cuentas?",
    };
    yield { tipo: "sugerencias", valores: sugerencias };
    yield { tipo: "fin", pasos: 1, ms: Date.now() - inicio };
    return;
  }

  yield {
    tipo: "error",
    codigo: "modelo",
    mensaje:
      `Sin llave para ${proveedorActivo()}: va la pantalla de ejemplo. ` +
      "Llena el .env (GOOGLE_GENERATIVE_AI_API_KEY o ANTHROPIC_API_KEY) para el agente real.",
  };
  yield { tipo: "estado", valor: "pintando" };

  const permitidos = nombresPermitidos();
  for (const mensaje of await mensajesDeEjemplo()) {
    const resultado = validarMensaje(mensaje, permitidos);
    if (!resultado.ok) {
      yield { tipo: "error", codigo: "a2ui", mensaje: resultado.errores.join("; ") };
      continue;
    }
    yield { tipo: "a2ui", mensaje: resultado.mensaje };
  }

  yield {
    tipo: "texto",
    valor: peticion.accion
      ? `Listo: apliqué "${peticion.accion.name}". (Pantalla de ejemplo: sin llave no hay agente real.)`
      : "Esta es una pantalla de ejemplo. Con una llave de modelo en el .env, el agente la construye con tus datos.",
  };
  yield { tipo: "razon", valor: "No hay llave de modelo: esto sale de packages/catalogo/ejemplos/confirmacion.jsonl." };
  yield { tipo: "fin", pasos: 0, ms: Date.now() - inicio };
}

/** Lee el `.jsonl` de ejemplo del catalogo. */
async function mensajesDeEjemplo(): Promise<MensajeA2UI[]> {
  const opciones = [
    join(process.cwd(), "packages", "catalogo", "ejemplos", "confirmacion.jsonl"),
    join(process.cwd(), "..", "packages", "catalogo", "ejemplos", "confirmacion.jsonl"),
    join(process.cwd(), "..", "..", "packages", "catalogo", "ejemplos", "confirmacion.jsonl"),
  ];
  const ruta = opciones.find((r) => existsSync(r)) ?? opciones[2]!;
  const texto = await readFile(ruta, "utf8");
  const mensajes = texto
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => JSON.parse(l) as MensajeA2UI);

  // El `.jsonl` trae el catalogId de desarrollo escrito a mano. En el servidor publicado
  // tiene que ser la URL real: es lo que un juez abre para ver de que esta hecha la interfaz.
  for (const m of mensajes) {
    if ("createSurface" in m) m.createSurface.catalogId = config.urlCatalogo;
  }
  return mensajes;
}
