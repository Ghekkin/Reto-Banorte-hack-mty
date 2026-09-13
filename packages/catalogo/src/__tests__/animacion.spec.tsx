// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { estadoVacio, procesarVarios, Superficie, type MensajeA2UI } from "@maya/a2ui";
import { registrarLayout } from "@maya/a2ui/layout";
import { CATALOGO, registrarCatalogo } from "../index";
import { Tarjeta } from "../tarjeta";

/**
 * La animacion de entrada de los widgets (`docs/como-funciona/animacion-de-widgets.md`).
 *
 * La coreografia vive en CSS (`apps/web/src/app/globals.css`) y ahi la cuida
 * `apps/web/src/lib/__tests__/animacion-widgets.spec.ts`. Aqui se cuida la otra mitad: que los
 * componentes pongan los ganchos (sin `animar-tarjeta` una tarjeta entra de golpe y nadie lo
 * nota en una prueba) y que las tarjetas fuera de la pantalla esperen a verse.
 */
registrarLayout();
registrarCatalogo();

const RAIZ = join(import.meta.dirname, "../..");
const kebab = (n: string) => n.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

function pintar(nombre: string): string {
  const mensajes = readFileSync(join(RAIZ, "ejemplos", `${kebab(nombre)}.jsonl`), "utf8")
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => JSON.parse(l) as MensajeA2UI);
  const { estado } = procesarVarios(estadoVacio(), mensajes);
  return renderToStaticMarkup(
    createElement(Superficie, { superficie: estado.get("principal"), conversacionId: "c", alAccionar: () => {} }),
  );
}

describe("los ganchos de la animacion en el HTML", () => {
  it("toda tarjeta del catalogo entra con la coreografia, con datos y en carga", () => {
    for (const entrada of CATALOGO) {
      expect(pintar(entrada.nombre), entrada.nombre).toContain("animar-tarjeta");
      const { estado } = procesarVarios(estadoVacio(), [
        { version: "v0.9.1", createSurface: { surfaceId: "principal", catalogId: "x" } },
        { version: "v0.9.1", updateComponents: { surfaceId: "principal", components: [{ id: "root", component: entrada.nombre, razon: "sin datos todavia" }] } },
      ]);
      const carga = renderToStaticMarkup(
        createElement(Superficie, { superficie: estado.get("principal"), conversacionId: "c", alAccionar: () => {} }),
      );
      expect(carga, `${entrada.nombre} en carga`).toContain("animar-tarjeta");
    }
  });

  it("cada tarjeta marca a lo mas UNA cifra: es EL numero de la tarjeta, no todos", () => {
    for (const entrada of CATALOGO) {
      const tarjetas = pintar(entrada.nombre).split('data-tarjeta=""').slice(1);
      for (const tarjeta of tarjetas) {
        const cifras = tarjeta.match(/class="[^"]*\bcifra\b/g) ?? [];
        expect(cifras.length, `${entrada.nombre} marca ${cifras.length} cifras en una tarjeta`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("las curvas se abren con la ventana; la dona y el medidor traen su propia capa", () => {
    for (const nombre of ["RendimientoHistorico", "ProyeccionCrecimiento", "ProyeccionPagoCredito"]) {
      expect(pintar(nombre), nombre).toContain("animar-trazo");
    }
    const dona = pintar("DistribucionPortafolio");
    expect(dona).toContain("animar-dona");
    expect(dona).not.toContain("animar-trazo");

    const medidor = pintar("TermometroSaludFinanciera");
    expect(medidor).not.toContain("animar-trazo");
    // El arco gira desde su propio angulo en negativo: con 74 puntos, 74 % de 180 grados.
    expect(medidor).toMatch(/class="animar-arco[^"]*"[^>]*style="--barrido:-133deg"/);
  });
});

/* --- Las tarjetas fuera de la pantalla esperan a verse (`animacion.ts`) --- */

type Aviso = (avisos: Array<Partial<IntersectionObserverEntry>>) => void;

describe("usarEntradaAlVerse", () => {
  // Los observadores de `animacion.ts` son de modulo: se crean UNA vez, con la primera tarjeta
  // del archivo, y despues se reusan. Por eso este registro no se vacia entre pruebas.
  const observadores: Array<{ margen: string | undefined; avisar: Aviso; observados: Set<Element> }> = [];
  let contenedor: HTMLDivElement;
  let raiz: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    class ObservadorFalso {
      observados = new Set<Element>();
      constructor(callback: IntersectionObserverCallback, opciones?: IntersectionObserverInit) {
        observadores.push({
          margen: opciones?.rootMargin,
          avisar: (avisos) => callback(avisos as IntersectionObserverEntry[], this as unknown as IntersectionObserver),
          observados: this.observados,
        });
      }
      observe(el: Element) {
        this.observados.add(el);
      }
      unobserve(el: Element) {
        this.observados.delete(el);
      }
      disconnect() {}
    }
    vi.stubGlobal("IntersectionObserver", ObservadorFalso);
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    contenedor = document.createElement("div");
    document.body.appendChild(contenedor);
    raiz = createRoot(contenedor);
  });

  afterEach(async () => {
    await act(async () => raiz.unmount());
    contenedor.remove();
    vi.unstubAllGlobals();
  });

  async function montar(): Promise<HTMLElement> {
    await act(async () => raiz.render(createElement(Tarjeta, null, "hola")));
    return contenedor.querySelector("[data-tarjeta]") as HTMLElement;
  }

  // Se buscan por su margen y no por posicion.
  const vigia = () => observadores.find((o) => o.margen === undefined);
  const entrada = () => observadores.find((o) => o.margen !== undefined);

  it("una tarjeta que se ve al montar no se toca", async () => {
    const tarjeta = await montar();
    vigia()?.avisar([{ target: tarjeta, isIntersecting: true }]);
    expect(tarjeta.hasAttribute("data-en-espera")).toBe(false);
    expect(tarjeta.hasAttribute("data-reinicio")).toBe(false);
  });

  it("una tarjeta fuera de la pantalla se reinicia, espera, y se libera al asomar", async () => {
    const tarjeta = await montar();
    vigia()?.avisar([{ target: tarjeta, isIntersecting: false }]);
    // En pausa, y el reinicio ya se quito (el requestAnimationFrame falso corre en el acto).
    expect(tarjeta.hasAttribute("data-en-espera")).toBe(true);
    expect(tarjeta.hasAttribute("data-reinicio")).toBe(false);

    const segundo = entrada();
    expect(segundo?.margen).toBe("0px 0px -10% 0px");
    expect(segundo?.observados.has(tarjeta)).toBe(true);

    segundo?.avisar([{ target: tarjeta, isIntersecting: true }]);
    expect(tarjeta.hasAttribute("data-en-espera")).toBe(false);
    expect(tarjeta.style.getPropertyValue("--orden")).toBe("0");
    expect(segundo?.observados.has(tarjeta)).toBe(false);
  });

  it("con reducir movimiento no observa nada", async () => {
    vi.stubGlobal("matchMedia", (consulta: string) => ({ matches: consulta.includes("reduce"), addEventListener() {}, removeEventListener() {} }));
    const tarjeta = await montar();
    expect(observadores.some((o) => o.observados.has(tarjeta))).toBe(false);
  });
});
