/**
 * El flag del premio lateral de voz (ElevenLabs). Vive en su propio archivo, sin
 * `server-only`, porque tanto el boton (cliente) como la ruta de `signed-url`
 * (servidor) necesitan la misma respuesta: con el flag apagado, ninguno de los
 * dos ejecuta nada nuevo (docs/como-funciona/premio-elevenlabs.md).
 *
 * `NEXT_PUBLIC_` porque el cliente decide si pinta el boton de voz; sin el
 * prefijo, Next no lo mete al bundle del navegador y el valor ahi siempre
 * seria `undefined`.
 */
export function vozHabilitada(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_VOZ === "1";
}
