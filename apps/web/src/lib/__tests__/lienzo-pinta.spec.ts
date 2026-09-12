import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { estadoVacio, procesarVarios, type MensajeA2UI } from "@maya/a2ui";
import { Lienzo } from "@/components/maya/lienzo";

/**
 * La prueba que faltaba: que el lienzo de la demo PINTE de verdad.
 *
 * Todo lo demas se probaba con mensajes (que validen, que el reducer los aplique), y
 * aun asi la consola estuvo una tarde entera sin pintar nada: el registro del renderer
 * estaba vacio en ese camino. Un mensaje valido que nadie sabe pintar se ve igual que
 * un mensaje roto. Asi que aqui se renderiza el componente de verdad, con el mismo
 * `.jsonl` que va al prompt, y se exige HTML con contenido.
 *
 * No hace falta DOM: `renderToStaticMarkup` basta para saber si salio la tarjeta o si
 * salio el cartel de "Componente desconocido".
 */
function superficieDelEjemplo(ruta: string) {
  const mensajes = readFileSync(ruta, "utf8")
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => JSON.parse(l) as MensajeA2UI);
  const { estado, error } = procesarVarios(estadoVacio(), mensajes);
  expect(error).toBeUndefined();
  return estado.get("principal");
}

// `fileURLToPath`, no `.pathname`: en Windows `.pathname` deja el driver letter con
// una barra al frente y los espacios en `%20`, que `readFileSync` no resuelve.
const EJEMPLO = fileURLToPath(new URL("../../../../../packages/a2ui/ejemplos/plan-de-pago.jsonl", import.meta.url));

describe("el lienzo de la demo", () => {
  const html = renderToStaticMarkup(
    createElement(Lienzo, {
      superficie: superficieDelEjemplo(EJEMPLO),
      conversacionId: "c_prueba",
      alAccionar: () => {},
    }),
  );

  it("no pinta ningun componente desconocido", () => {
    expect(html).not.toContain("Componente desconocido");
  });

  it("pinta el contenido de las tarjetas, con los montos ya formateados", () => {
    expect(html).toContain("•••• 4821"); // ResumenTarjeta, prop enlazada al data model
    expect(html).toContain("47,386"); // saldoCentavos 4738600 formateado en es-MX
    expect(html).toContain("¿Por qué veo esto?"); // la razon, que exige la rubrica
  });

  it("le da a la rejilla el span de las tarjetas amplias (`ancho`)", () => {
    expect(html).toContain('data-ancho="amplio"');
  });
});
