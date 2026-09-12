---
name: premio-lateral
description: Cómo integrar una tecnología de premio patrocinador (Vultr, .Tech, Tiger Data, ElevenLabs, Gemini) sin ponerla en la ruta crítica de la demo - flag, fallback probado, timebox, doc y registro para el premio. Invocar antes de empezar cualquier integración de docs/reto/premios-objetivo.md.
---

# Integrar un premio lateral

La regla madre está en `docs/reto/premios-objetivo.md`: **un premio lateral nunca
está en la ruta crítica de la demo.** Esta skill es cómo se cumple en la práctica.

## Antes de empezar

- [ ] Está en la lista de `premios-objetivo.md` con veredicto "Sí" o "Probable".
- [ ] Son antes de la **hora 30**. Después no entra nada nuevo, ni premios.
- [ ] `demo` lo sabe y lo anotó en el tablero. Timebox acordado (el de la tabla).
- [ ] La cuenta y la API key existen y la key está en `.env` (y en `.env.example`
      con comentario), no en el código.

## Pasos

1. **Flag por variable de entorno**: `FEATURE_VOZ=1`, `FEATURE_TIGER=1`, etc. Con el
   flag apagado, el código nuevo **no se ejecuta** y la demo es idéntica a antes.
2. **Fallback primero**: escribe primero qué pasa si el servicio falla con el flag
   encendido (timeout de 3 s → el mock / el chat de texto / el JSON local toma el
   control). Pruébalo apagando la red o poniendo una URL inválida.
3. **Integración** detrás del flag, en su propio archivo o carpeta, sin tocar el
   contrato: un premio lateral no cambia schemas. Si Tiger Data sustituye al JSON, la
   tool devuelve exactamente lo mismo que con el mock (mismo schema, mismos ids).
4. **Probar** (skill `probar`) con el flag **apagado** y luego **encendido**. Los dos
   deben pasar. El checklist de demo corre los dos.
5. **Doc**: `docs/como-funciona/premio-<nombre>.md` con los dos niveles, qué pasa si
   falla, y el flag. Fila de estado en `premios-objetivo.md`.
6. **Commit** con `scripts/sync.sh "premio: <nombre> detrás de FEATURE_X"`.
7. **Registro para el premio**: `demo` verifica en el momento cómo se aplica (Devpost,
   formulario, mención en el pitch) y lo anota en `premios-objetivo.md`. Un premio no
   registrado no existe.

## Si el timebox se acaba

Se apaga el flag, se commitea lo que haya (detrás del flag no estorba), se anota en
`premios-objetivo.md` como "intentado, apagado" y se sigue con el reto. Sin culpa: el
objetivo es el reto de Banorte.
