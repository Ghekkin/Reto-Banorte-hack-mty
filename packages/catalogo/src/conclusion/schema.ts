import { z } from "zod";
import { Ancho, PropsBase } from "../comunes";

/**
 * `Conclusion` — lo que Maya te dice de frente, en grande.
 *
 * Es el unico componente del catalogo que **no muestra un dato**: muestra la LECTURA de
 * los datos. Existe porque el texto del turno (`texto` del contrato agente-cliente) se
 * pintaba como un parrafo gris de 14 px arriba del lienzo, y ahi el consejo —que es lo
 * mas valioso que produce el agente— pesaba menos que cualquier monto de cualquier
 * tarjeta. La pantalla decia "no contestamos con parrafos" y el parrafo seguia siendo lo
 * primero, en el tamano de un pie de foto.
 *
 * No lleva `heroe`: ya es la pieza dominante de la superficie por tamano de tipografia, y
 * el degradado esta reservado para la tarjeta que carga EL numero de la pantalla.
 */

/** Un dato que sostiene la conclusion. Es lo que evita que el texto suene a opinion. */
export const DatoDeApoyo = z.object({
  etiqueta: z.string().describe("Que es: 'Mensualidad', 'Retiros de efectivo', 'Salud financiera'"),
  valor: z
    .string()
    .describe(
      "Ya formateado y corto: '$3,193.35', '+74%', '39/100'. Si es dinero, va con centavos y EXACTAMENTE " +
        "igual que en la tarjeta que lo reporta: dos cifras distintas para el mismo monto en la misma " +
        "pantalla es lo que hace que nadie crea ninguna",
    ),
  tono: z
    .enum(["neutro", "bueno", "alerta"])
    .default("neutro")
    .describe("`bueno` lo pinta verde, `alerta` en ambar. Usa `neutro` salvo que el dato sea la buena o la mala noticia"),
});

export const schemaConclusion = PropsBase.extend({
  ancho: Ancho.default("amplio"),
  saludo: z
    .string()
    .optional()
    .describe("Una linea corta antes del titular: 'Hola, Alberto'. Sin ella el componente arranca en el titular"),
  titular: z
    .string()
    .min(10)
    .describe(
      "LA frase. Una sola oracion, en segunda persona, con el veredicto: 'Tu plan ya esta activo y " +
        "tus retiros se dispararon'. Va en el tamano mas grande de la tarjeta, asi que si no cabe en " +
        "dos renglones esta muy larga",
    ),
  detalle: z
    .string()
    .optional()
    .describe("De una a tres frases con el porque y la recomendacion. Es el texto del turno; aqui va completo"),
  datos: z
    .array(DatoDeApoyo)
    .max(3)
    .optional()
    .describe("Hasta 3 cifras que sostienen el titular. Son las MISMAS que ya estan en las tarjetas, no nuevas"),
  sugerencias: z
    .array(z.string())
    .max(3)
    .optional()
    .describe("Hasta 3 preguntas de seguimiento, tal cual las diria la persona. Tocarlas dispara preguntar"),
});

export type PropsConclusion = z.infer<typeof schemaConclusion>;
export type DatoDeApoyo = z.infer<typeof DatoDeApoyo>;

export const entradaConclusion = {
  nombre: "Conclusion",
  cuandoUsarlo:
    "SIEMPRE la primera tarjeta de una pantalla: es tu lectura de la situacion en una frase grande, con " +
    "hasta 3 cifras que la sostienen y las preguntas de seguimiento. Sustituye al parrafo de texto: si " +
    "pones Conclusion, el `texto` del turno puede ir vacio. No la uses para reportar un dato suelto " +
    "(para eso esta la tarjeta de ese dato) ni para confirmar una accion (eso es Confirmacion).",
  schema: schemaConclusion,
  acciones: ["preguntar"],
};
