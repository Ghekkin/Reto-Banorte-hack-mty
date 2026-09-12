import { MockLanguageModelV2, simulateReadableStream } from "ai/test";

/**
 * Utilidades para probar el agente SIN llave de modelo y sin red: un modelo simulado del
 * AI SDK al que se le escribe, paso por paso, que tools llamaria un modelo real.
 *
 * Es la unica forma honesta de probar el bucle del agente en CI. Lo que NO prueba es si
 * el modelo real decide bien; eso se mide con los prompts del guion (skill `probar`).
 */

/**
 * El tipo de las partes del stream de un proveedor, sacado del propio modelo simulado:
 * asi las pruebas no dependen de `@ai-sdk/provider`, que no es dependencia de la app.
 */
type RespuestaDeStream = Awaited<ReturnType<MockLanguageModelV2["doStream"]>>;
type ParteDeStream = RespuestaDeStream["stream"] extends ReadableStream<infer P> ? P : never;

/** Un paso del modelo simulado: llamar una tool con estos argumentos. */
export function pasoConTool(toolName: string, input: unknown, texto = "") {
  const partes: ParteDeStream[] = [{ type: "stream-start", warnings: [] }];
  if (texto) {
    partes.push({ type: "text-start", id: "t1" }, { type: "text-delta", id: "t1", delta: texto }, { type: "text-end", id: "t1" });
  }
  partes.push(
    { type: "tool-call", toolCallId: `llamada_${toolName}_${Math.random().toString(36).slice(2, 8)}`, toolName, input: JSON.stringify(input) },
    {
      type: "finish",
      finishReason: "tool-calls",
      usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 },
    },
  );
  return { stream: simulateReadableStream({ chunks: partes }) };
}

/** Un paso que solo contesta texto, sin llamar tools. */
export function pasoConTexto(texto: string) {
  const partes: ParteDeStream[] = [
    { type: "stream-start", warnings: [] },
    { type: "text-start", id: "t1" },
    { type: "text-delta", id: "t1", delta: texto },
    { type: "text-end", id: "t1" },
    { type: "finish", finishReason: "stop", usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 } },
  ];
  return { stream: simulateReadableStream({ chunks: partes }) };
}

/** Un modelo que ejecuta los pasos en orden, uno por cada ronda del bucle de tools. */
export function modeloGuionizado(pasos: ReturnType<typeof pasoConTool>[]) {
  return new MockLanguageModelV2({ doStream: pasos });
}
