import { z } from "zod";
import { Ancho, Centavos, PropsBase } from "../comunes";

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

/**
 * Un dato que sostiene la conclusion. Es lo que evita que el texto suene a opinion.
 *
 * **El dinero va en `montoCentavos`, NUNCA en `valor`.** Esta era la unica prop del
 * catalogo donde el modelo escribia una cifra de dinero como texto, contra la regla de
 * todo el repo (los montos viajan en centavos enteros y formatea quien pinta), y el
 * 2026-09-12 llego a pantalla el resultado: el dato real eran 457095 centavos, el modelo
 * los agrupo como si fueran pesos (`457,095`) y le metio el punto decimal dentro del
 * numero ya agrupado, produciendo **`$457,09.50`** donde iban $4,570.95. El mismo destrozo
 * convirtio una mensualidad de $5,503.20 en `$504,78.50`.
 *
 * Con `montoCentavos` el error es imposible por construccion: el componente formatea con
 * `formatearMonto`, venga la prop enlazada o literal.
 */
export const DatoDeApoyo = z
  .object({
    etiqueta: z.string().describe("Que es: 'Mensualidad', 'Retiros de efectivo', 'Salud financiera'"),
    montoCentavos: Centavos.optional().describe(
      "SI ES DINERO, va aqui: el entero en CENTAVOS tal como lo devolvio la tool (457095, no 4570.95 " +
        "ni '$4,570.95'). La interfaz lo formatea. Nunca escribas un monto a mano en `valor`",
    ),
    valor: z
      .string()
      .optional()
      .describe(
        "Solo para lo que NO es dinero: '+74%', '39/100', '15 meses', '5 de octubre'. Si empieza con " +
          "`$` se rechaza la pantalla: eso va en `montoCentavos`",
      ),
    tono: z
      .string()
      .default("neutro")
      // Texto libre y no un `enum`, a proposito, y es la unica prop del catalogo que lo es.
      // El modelo alcanza otras palabras para esto (`positivo`, `negativo`, `exito`) y, desde
      // que `Conclusion` es obligatoria en toda pantalla, ese error costaba un reintento y un
      // paso del turno en 3 de cada 10 turnos del guion (medido el 2026-09-12). Con un `enum`
      // no basta con ser tolerante en Zod: el catalogo publicado se genera de aqui y la capa
      // de los JSON Schema oficiales rechazaria igual, asi que las dos capas tienen que decir
      // lo mismo. El tono es DECORACION —el color de una cifra—: tumbar la pantalla por el
      // nombre de un color, cuando la cifra viene bien, es un mal trato. Lo que no reconoce el
      // componente se pinta neutro (`componente.tsx`).
      .describe(
        "Exactamente uno de estos tres: `neutro`, `bueno` o `alerta` (no `positivo` ni `negativo`, no " +
          "se pintan). `bueno` lo pinta verde, `alerta` en ambar. Usa `neutro` salvo que el dato sea " +
          "la buena o la mala noticia",
      ),
  })
  .refine((d) => d.montoCentavos !== undefined || (d.valor !== undefined && d.valor.length > 0), {
    message: "cada dato necesita `montoCentavos` (si es dinero) o `valor` (si no lo es)",
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
    .describe(
      "Hasta 3 cifras que sostienen el titular. Son las MISMAS que ya estan en las tarjetas, no nuevas. " +
        "El dinero va en `montoCentavos`, no en `valor`",
    ),
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
