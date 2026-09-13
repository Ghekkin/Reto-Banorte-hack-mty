import { beforeEach, describe, expect, it } from "vitest";
import { estadoVacio, type EstadoSuperficie } from "@maya/a2ui";
import { guardarHilo, olvidarHilo, recuperarHilo } from "@/lib/agente/persistencia";
import { calcularSuperficieViva, SUPERFICIE, type EntradaDelHilo } from "@/lib/agente/usar-agente";

/**
 * La persistencia del hilo en `sessionStorage`.
 *
 * La prueba que importa de verdad es la de la REFERENCIA. `calcularSuperficieViva` decide si
 * la ultima pantalla del hilo es tambien la del turno en curso comparando los dos objetos
 * con `===`, y eso es exacto porque `procesar` nunca muta. Al hidratar desde JSON hay que
 * mantener esa exactitud: el `estado` vivo tiene que apuntar al MISMO objeto que quedo en el
 * hilo, no a una copia con los mismos campos. Con dos objetos distintos la comparacion diria
 * "son diferentes" y la ultima pantalla se pintaria dos veces, una congelada en la
 * conversacion y otra como pantalla en curso.
 */

const USUARIO = "usr_ana";

/**
 * `sessionStorage` en memoria.
 *
 * Las pruebas de este paquete corren en entorno `node` (`vitest.config.ts`) y no hay `window`.
 * En vez de meter jsdom al proyecto para dos llamadas, se pone lo unico que el modulo toca:
 * `window.sessionStorage` con sus cuatro metodos. Si algun dia `persistencia.ts` empieza a
 * usar mas del DOM, esto truena y se vera aqui.
 */
class AlmacenEnMemoria implements Storage {
  private datos = new Map<string, string>();

  get length(): number {
    return this.datos.size;
  }
  clear(): void {
    this.datos.clear();
  }
  getItem(llave: string): string | null {
    return this.datos.get(llave) ?? null;
  }
  key(indice: number): string | null {
    return [...this.datos.keys()][indice] ?? null;
  }
  removeItem(llave: string): void {
    this.datos.delete(llave);
  }
  setItem(llave: string, valor: string): void {
    this.datos.set(llave, valor);
  }
}

const almacen = new AlmacenEnMemoria();
(globalThis as { window?: unknown }).window = { sessionStorage: almacen };

function superficieDePrueba(periodo: string): EstadoSuperficie {
  return {
    id: SUPERFICIE,
    catalogId: "http://localhost:3000/catalogo/v1.json",
    componentes: new Map([
      ["root", { id: "root", component: "Column", children: ["gasto"] }],
      ["gasto", { id: "gasto", component: "GastoPorCategoria", periodo: { path: "/gasto/periodo" } }],
    ]),
    raiz: "root",
    dataModel: { gasto: { periodo, totalCentavos: 1650350 } },
  };
}

const HILO: EntradaDelHilo[] = [
  { tipo: "mensaje", rol: "usuario", texto: "¿En qué se me fue el dinero?" },
  { tipo: "mensaje", rol: "agente", texto: "Tu mayor gasto fue Vivienda." },
  {
    tipo: "pantalla",
    superficie: superficieDePrueba("2026-08"),
    transparencia: [{ tipo: "fin", pasos: 2, ms: 4700, cierre: "pintar" }],
  },
];

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("guardar y recuperar", () => {
  it("devuelve el hilo completo, con los mensajes y la pantalla", () => {
    guardarHilo(USUARIO, { hilo: HILO, conversacionId: "c_abc", sugerencias: ["¿Y julio?"], razon: "Tu gasto subió" });

    const recuperado = recuperarHilo(USUARIO);
    expect(recuperado).toBeDefined();
    expect(recuperado!.hilo).toHaveLength(3);
    expect(recuperado!.conversacionId).toBe("c_abc");
    expect(recuperado!.sugerencias).toEqual(["¿Y julio?"]);
    expect(recuperado!.razon).toBe("Tu gasto subió");
    expect(recuperado!.hilo[0]).toEqual({ tipo: "mensaje", rol: "usuario", texto: "¿En qué se me fue el dinero?" });
  });

  it("el `Map` de componentes sobrevive al viaje por JSON", () => {
    guardarHilo(USUARIO, { hilo: HILO, conversacionId: "c_abc", sugerencias: [] });

    const pantalla = recuperarHilo(USUARIO)!.hilo[2];
    expect(pantalla?.tipo).toBe("pantalla");
    if (pantalla?.tipo !== "pantalla") return;

    expect(pantalla.superficie.componentes).toBeInstanceOf(Map);
    expect(pantalla.superficie.componentes.size).toBe(2);
    expect(pantalla.superficie.componentes.get("gasto")).toMatchObject({ component: "GastoPorCategoria" });
    // Los enlaces siguen siendo enlaces: sin esto la tarjeta se pintaria vacia.
    expect(pantalla.superficie.componentes.get("gasto")).toHaveProperty("periodo", { path: "/gasto/periodo" });
    expect(pantalla.superficie.raiz).toBe("root");
    expect(pantalla.superficie.dataModel).toEqual({ gasto: { periodo: "2026-08", totalCentavos: 1650350 } });
  });

  it("el estado apunta al MISMO objeto que la ultima pantalla del hilo", () => {
    guardarHilo(USUARIO, { hilo: HILO, conversacionId: "c_abc", sugerencias: [] });
    const recuperado = recuperarHilo(USUARIO)!;

    const congelada = recuperado.hilo.at(-1);
    expect(congelada?.tipo).toBe("pantalla");
    if (congelada?.tipo !== "pantalla") return;

    // La identidad, no la igualdad: es lo que hace exacta la comparacion del hilo.
    expect(recuperado.estado.get(SUPERFICIE)).toBe(congelada.superficie);
  });

  it("y por eso la pantalla recuperada NO se pinta dos veces", () => {
    guardarHilo(USUARIO, { hilo: HILO, conversacionId: "c_abc", sugerencias: [] });
    const recuperado = recuperarHilo(USUARIO)!;

    const viva = calcularSuperficieViva(recuperado.hilo, recuperado.estado.get(SUPERFICIE));
    expect(viva).toBeUndefined();
  });

  it("con solo mensajes el estado queda vacio y no inventa una superficie", () => {
    const soloTexto: EntradaDelHilo[] = [{ tipo: "mensaje", rol: "usuario", texto: "hola" }];
    guardarHilo(USUARIO, { hilo: soloTexto, conversacionId: "c_abc", sugerencias: [] });

    const recuperado = recuperarHilo(USUARIO)!;
    expect(recuperado.hilo).toHaveLength(1);
    expect(recuperado.estado.size).toBe(0);
  });

  it("con varias pantallas se queda con la ULTIMA", () => {
    const conDos: EntradaDelHilo[] = [
      ...HILO,
      { tipo: "pantalla", superficie: superficieDePrueba("2026-07"), transparencia: [] },
    ];
    guardarHilo(USUARIO, { hilo: conDos, conversacionId: "c_abc", sugerencias: [] });

    const recuperado = recuperarHilo(USUARIO)!;
    const dataModel = recuperado.estado.get(SUPERFICIE)!.dataModel as { gasto: { periodo: string } };
    expect(dataModel.gasto.periodo).toBe("2026-07");
  });
});

describe("el aislamiento entre usuarios", () => {
  it("el hilo de una persona no aparece en la sesion de otra", () => {
    guardarHilo(USUARIO, { hilo: HILO, conversacionId: "c_ana", sugerencias: [] });

    expect(recuperarHilo("usr_beto")).toBeUndefined();
    expect(recuperarHilo(USUARIO)).toBeDefined();
  });

  it("olvidar borra solo al usuario que se le pide", () => {
    guardarHilo(USUARIO, { hilo: HILO, conversacionId: "c_ana", sugerencias: [] });
    guardarHilo("usr_beto", { hilo: HILO, conversacionId: "c_beto", sugerencias: [] });

    olvidarHilo(USUARIO);

    expect(recuperarHilo(USUARIO)).toBeUndefined();
    expect(recuperarHilo("usr_beto")!.conversacionId).toBe("c_beto");
  });

  it("guardar un hilo vacio limpia lo que hubiera: no deja un fantasma", () => {
    guardarHilo(USUARIO, { hilo: HILO, conversacionId: "c_ana", sugerencias: [] });
    guardarHilo(USUARIO, { hilo: [], conversacionId: "c_nueva", sugerencias: [] });

    expect(recuperarHilo(USUARIO)).toBeUndefined();
  });
});

describe("lo que llega roto", () => {
  it("un JSON ilegible se descarta y se borra, en vez de tumbar la conversacion", () => {
    window.sessionStorage.setItem("maya:hilo:v1:usr_ana", "{ esto no es json");

    expect(recuperarHilo(USUARIO)).toBeUndefined();
    // Y no se queda ahi para volver a fallar en el siguiente render.
    expect(window.sessionStorage.getItem("maya:hilo:v1:usr_ana")).toBeNull();
  });

  it("un hilo de otro usuario metido a mano en la llave se rechaza", () => {
    window.sessionStorage.setItem(
      "maya:hilo:v1:usr_ana",
      JSON.stringify({ version: "v1", usuarioId: "usr_beto", conversacionId: "c_x", sugerencias: [], hilo: [] }),
    );

    expect(recuperarHilo(USUARIO)).toBeUndefined();
  });

  it("una entrada de pantalla sin componentes se salta y el resto del hilo se conserva", () => {
    window.sessionStorage.setItem(
      "maya:hilo:v1:usr_ana",
      JSON.stringify({
        version: "v1",
        usuarioId: USUARIO,
        conversacionId: "c_x",
        sugerencias: [],
        hilo: [
          { tipo: "mensaje", rol: "usuario", texto: "hola" },
          { tipo: "pantalla", superficie: { id: "principal", catalogId: "x", dataModel: {} }, transparencia: [] },
        ],
      }),
    );

    const recuperado = recuperarHilo(USUARIO)!;
    expect(recuperado.hilo).toHaveLength(1);
    expect(recuperado.estado.size).toBe(0);
  });

  it("una version vieja se descarta entera", () => {
    window.sessionStorage.setItem(
      "maya:hilo:v1:usr_ana",
      JSON.stringify({ version: "v0", usuarioId: USUARIO, conversacionId: "c_x", sugerencias: [], hilo: [] }),
    );

    expect(recuperarHilo(USUARIO)).toBeUndefined();
  });

  it("sin nada guardado devuelve undefined, no un estado a medias", () => {
    expect(recuperarHilo("usr_carmen")).toBeUndefined();
    expect(estadoVacio().size).toBe(0);
  });
});
