import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AlertaFugas } from "../alerta-fugas/componente";
import { Conclusion } from "../conclusion/componente";
import { DetalleCategoria } from "../detalle-categoria/componente";
import { DistribucionPortafolio } from "../distribucion-portafolio/componente";
import { OrdenRebalanceo } from "../orden-rebalanceo/componente";
import { SimuladorMeta } from "../simulador-meta/componente";
import { schemaConclusion } from "../conclusion/schema";
import { schemaSimuladorMeta } from "../simulador-meta/schema";

/**
 * Las props de VISTA de los cuatro componentes que listan colecciones, mas los dos arreglos
 * de cifras que llegaron a pantalla el 2026-09-12.
 *
 * Las props de vista existen para el ciclo live: "solo las 3 mas caras" u "ordenalo por
 * monto" no son otra pantalla ni otros datos, son la MISMA tarjeta vista de otra forma, asi
 * que el agente las cambia con `ajustar_pantalla` y no se vuelve a consultar nada. Antes de
 * esto solo `GastoPorCategoria` y `Calendario` las tenian, y esas peticiones obligaban a
 * repintar con datos nuevos aunque el componente ya los tuviera todos.
 *
 * La invariante que se cuida en las cuatro: **lo que el limite recorta se resume, no
 * desaparece**. Si desapareciera, la suma de los renglones no cuadraria con el total del
 * encabezado y quien lo lea no sabria a cual de los dos numeros creerle.
 */

const FUGAS = [
  { id: "sus_gym", concepto: "Smart Fit", comercio: "Smart Fit", montoCentavos: 45000, sinUsoReciente: true, periodicidad: "mensual", mesesSinUso: 4 },
  { id: "sus_streaming", concepto: "Netflix", comercio: "Netflix", montoCentavos: 29900, sinUsoReciente: false, periodicidad: "mensual" },
  { id: "sus_musica", concepto: "Spotify", comercio: "Spotify", montoCentavos: 11500, sinUsoReciente: false, periodicidad: "mensual" },
  { id: "sus_nube", concepto: "iCloud", comercio: "Apple", montoCentavos: 4900, sinUsoReciente: true, periodicidad: "mensual", mesesSinUso: 9 },
];

function pintarFugas(extra: Record<string, unknown> = {}): string {
  return renderToStaticMarkup(
    createElement(AlertaFugas, {
      totalMensualCentavos: 91300,
      totalAnualCentavos: 1095600,
      pctDelIngreso: 0.031,
      fugas: FUGAS,
      razon: "Cuatro cargos recurrentes, dos sin uso",
      ...extra,
    }),
  );
}

/** El orden en que aparecen unos nombres en el HTML. */
function ordenPintado(html: string, nombres: string[]): string[] {
  return nombres
    .map((nombre) => ({ nombre, donde: html.indexOf(nombre) }))
    .filter((n) => n.donde !== -1)
    .sort((a, b) => a.donde - b.donde)
    .map((n) => n.nombre);
}

/**
 * Igual, pero por la ULTIMA aparicion. `DistribucionPortafolio` imprime los nombres dos
 * veces —en la config de la dona y en la lista de al lado— y la dona va primero y en el
 * orden original, asi que buscar la primera aparicion mediria el orden equivocado.
 */
function ordenEnLista(html: string, nombres: string[]): string[] {
  return nombres
    .map((nombre) => ({ nombre, donde: html.lastIndexOf(nombre) }))
    .filter((n) => n.donde !== -1)
    .sort((a, b) => a.donde - b.donde)
    .map((n) => n.nombre);
}

describe("AlertaFugas: orden y limite", () => {
  it("por default ordena por monto, de la mas cara a la mas barata", () => {
    expect(ordenPintado(pintarFugas(), ["Smart Fit", "Netflix", "Spotify", "iCloud"])).toEqual([
      "Smart Fit",
      "Netflix",
      "Spotify",
      "iCloud",
    ]);
  });

  it("`sinUso` sube las que no se usan, y dentro de esas manda el monto", () => {
    const html = pintarFugas({ orden: "sinUso" });
    expect(ordenPintado(html, ["Smart Fit", "Netflix", "Spotify", "iCloud"])).toEqual([
      "Smart Fit",
      "iCloud",
      "Netflix",
      "Spotify",
    ]);
  });

  it("`nombre` ordena alfabeticamente", () => {
    const html = pintarFugas({ orden: "nombre" });
    expect(ordenPintado(html, ["Smart Fit", "Netflix", "Spotify", "iCloud"])).toEqual([
      "iCloud",
      "Netflix",
      "Smart Fit",
      "Spotify",
    ]);
  });

  it("`limite` recorta la lista y RESUME lo que queda fuera con su monto", () => {
    const html = pintarFugas({ limite: 2 });

    expect(html).toContain("Smart Fit");
    expect(html).toContain("Netflix");
    expect(html).not.toContain("Spotify");
    // Lo recortado se resume: $115.00 + $49.00 = $164.00.
    expect(html).toContain("y 2 cargos mas");
    expect(html).toContain("$164.00");
  });

  it("un limite mayor que la lista no inventa un renglon de resumen", () => {
    const html = pintarFugas({ limite: 10 });
    expect(html).not.toContain("cargos mas");
    expect(html).toContain("iCloud");
  });
});

const MOVIMIENTOS = [
  { fecha: "2026-08-28", comercio: "Rappi", montoCentavos: 41200 },
  { fecha: "2026-08-15", comercio: "Cabrito Nuevo", montoCentavos: 128000 },
  { fecha: "2026-08-03", comercio: "Starbucks", montoCentavos: 9800 },
];

function pintarDetalle(extra: Record<string, unknown> = {}): string {
  return renderToStaticMarkup(
    createElement(DetalleCategoria, {
      categoria: "Restaurantes",
      periodo: "2026-08",
      totalCentavos: 179000,
      movimientos: MOVIMIENTOS,
      razon: "Los movimientos de Restaurantes de agosto",
      ...extra,
    }),
  );
}

describe("DetalleCategoria: orden y limite", () => {
  it("por default va del mas reciente al mas viejo", () => {
    expect(ordenPintado(pintarDetalle(), ["Rappi", "Cabrito Nuevo", "Starbucks"])).toEqual([
      "Rappi",
      "Cabrito Nuevo",
      "Starbucks",
    ]);
  });

  it("`monto` pone primero el gasto mas fuerte", () => {
    expect(ordenPintado(pintarDetalle({ orden: "monto" }), ["Rappi", "Cabrito Nuevo", "Starbucks"])).toEqual([
      "Cabrito Nuevo",
      "Rappi",
      "Starbucks",
    ]);
  });

  it("`limite` resume lo recortado, y no se confunde con los que el agente no mando", () => {
    const html = pintarDetalle({ orden: "monto", limite: 1, totalMovimientos: 9 });

    expect(html).toContain("Cabrito Nuevo");
    expect(html).not.toContain("Starbucks");
    // Los 2 que el limite recorto, con su suma ($412.00 + $98.00).
    expect(html).toContain("y 2 movimientos mas en la lista");
    expect(html).toContain("$510.00");
    // Y aparte, los 6 que nunca llegaron del backend.
    expect(html).toContain("y 6 movimientos más.");
  });
});

const CLASES = [
  { claseId: "deuda", nombre: "Deuda gubernamental", tipo: "Renta fija", montoCentavos: 5000000, pesoPct: 0.5, pesoObjetivoPct: 0.45 },
  { claseId: "rv", nombre: "Renta variable global", tipo: "Renta variable", montoCentavos: 3000000, pesoPct: 0.3, pesoObjetivoPct: 0.1 },
  { claseId: "liquidez", nombre: "Liquidez", tipo: "Liquidez", montoCentavos: 2000000, pesoPct: 0.2, pesoObjetivoPct: 0.2 },
];

function pintarDistribucion(extra: Record<string, unknown> = {}): string {
  return renderToStaticMarkup(
    createElement(DistribucionPortafolio, {
      valorTotalCentavos: 10000000,
      rendimientoTotalPct: 0.087,
      clases: CLASES,
      razon: "Tu portafolio por clase de activo",
      ...extra,
    }),
  );
}

describe("DistribucionPortafolio: orden y limite", () => {
  it("por default ordena por peso", () => {
    expect(ordenEnLista(pintarDistribucion(), ["Deuda gubernamental", "Renta variable global", "Liquidez"])).toEqual([
      "Deuda gubernamental",
      "Renta variable global",
      "Liquidez",
    ]);
  });

  it("`desviacion` pone primero la que mas se salio del modelo", () => {
    const html = pintarDistribucion({ orden: "desviacion" });
    // Renta variable se desvio 20 puntos; deuda 5; liquidez 0.
    expect(ordenEnLista(html, ["Deuda gubernamental", "Renta variable global", "Liquidez"])[0]).toBe(
      "Renta variable global",
    );
  });

  it("una clase sin peso objetivo se va al final: no es lo mismo que no haberse desviado", () => {
    const html = pintarDistribucion({
      orden: "desviacion",
      clases: [
        { claseId: "sin", nombre: "Sin modelo", tipo: "Otro", montoCentavos: 100, pesoPct: 0.01 },
        ...CLASES,
      ],
    });
    expect(ordenEnLista(html, ["Sin modelo", "Renta variable global"])).toEqual([
      "Renta variable global",
      "Sin modelo",
    ]);
  });

  it("`limite` recorta la LISTA pero la dona sigue siendo el portafolio completo", () => {
    const html = pintarDistribucion({ limite: 1 });

    expect(html).toContain("Deuda gubernamental");
    expect(html).toContain("y 2 clases mas");
    expect(html).toContain("$50,000.00");
    // La dona no se recorta: un pedazo de dona no suma 100 %.
    expect(html).toContain("Distribución del portafolio en 3 clases");
  });
});

const OPERACIONES = [
  { tipo: "compra" as const, claseActivo: "Deuda", instrumentoClave: "CETES28", montoCentavos: 800000, pesoAnteriorPct: 0.2, pesoNuevoPct: 0.28 },
  { tipo: "venta" as const, claseActivo: "Renta variable", instrumentoClave: "NAFTRAC", montoCentavos: 1200000, pesoAnteriorPct: 0.4, pesoNuevoPct: 0.28 },
  { tipo: "compra" as const, claseActivo: "Liquidez", instrumentoClave: "BONDDIA", montoCentavos: 400000, pesoAnteriorPct: 0.1, pesoNuevoPct: 0.14 },
];

function pintarOrden(extra: Record<string, unknown> = {}): string {
  return renderToStaticMarkup(
    createElement(OrdenRebalanceo, {
      portafolioId: "port_carmen",
      nombrePortafolio: "Portafolio patrimonial",
      valorTotalCentavos: 10000000,
      movimientos: OPERACIONES,
      razon: "Las operaciones para volver al modelo",
      ...extra,
    }),
  );
}

describe("OrdenRebalanceo: orden y limite", () => {
  it("por default ordena por monto", () => {
    expect(ordenPintado(pintarOrden(), ["NAFTRAC", "CETES28", "BONDDIA"])).toEqual([
      "NAFTRAC",
      "CETES28",
      "BONDDIA",
    ]);
  });

  it("`tipo` pone primero las VENTAS, que es el orden en que se ejecutan", () => {
    const html = pintarOrden({ orden: "tipo" });
    expect(ordenPintado(html, ["NAFTRAC", "CETES28", "BONDDIA"])).toEqual(["NAFTRAC", "CETES28", "BONDDIA"]);
  });

  it("`limite` dice que la orden sigue teniendo las demas operaciones", () => {
    const html = pintarOrden({ limite: 1 });

    expect(html).toContain("NAFTRAC");
    expect(html).not.toContain("BONDDIA");
    expect(html).toContain("y 2 operaciones mas en la orden");
    expect(html).toContain("$12,000.00");
  });
});

describe("Conclusion: el dinero lo formatea el componente", () => {
  it("`montoCentavos` se pinta formateado, no como el entero crudo", () => {
    const html = renderToStaticMarkup(
      createElement(Conclusion, {
        titular: "Tu credito se puede liquidar en un ano",
        // El caso real del 2026-09-12: 457095 centavos.
        datos: [{ etiqueta: "Mensualidad actual", montoCentavos: 457095, tono: "neutro" }],
        razon: "La mensualidad viene de simular_credito",
      }),
    );

    expect(html).toContain("$4,570.95");
    // Y ninguna de las dos formas equivocadas que el modelo escribia a mano.
    expect(html).not.toContain("457,09.50");
    expect(html).not.toContain("457,095");
  });

  it("`valor` sigue sirviendo para lo que NO es dinero", () => {
    const html = renderToStaticMarkup(
      createElement(Conclusion, {
        titular: "Tus retiros de efectivo se dispararon",
        datos: [
          { etiqueta: "Retiros", valor: "+74%", tono: "alerta" },
          { etiqueta: "Salud financiera", valor: "39/100", tono: "alerta" },
        ],
        razon: "Del diagnostico de habitos",
      }),
    );

    expect(html).toContain("+74%");
    expect(html).toContain("39/100");
  });

  it("el schema exige uno de los dos: un dato sin monto y sin valor se rechaza", () => {
    // `razon` es obligatoria en todo el catalogo (`PropsBase`), asi que va en los dos casos.
    const base = { titular: "Un titular suficientemente largo", razon: "De simular_credito" };

    expect(schemaConclusion.safeParse({ ...base, datos: [{ etiqueta: "Vacio" }] }).success).toBe(false);
    expect(
      schemaConclusion.safeParse({ ...base, datos: [{ etiqueta: "Mensualidad", montoCentavos: 457095 }] }).success,
    ).toBe(true);
  });

  it("un `valor` con dinero escrito a mano sigue pasando el schema: lo caza el host", () => {
    // Zod no puede distinguir "$4,570.95" de "39/100": los dos son strings validos. El
    // rechazo del `$` vive en `revisarProps` del host, sobre las props ya RESUELTAS, que es
    // el unico lugar donde se ve el valor final de una prop enlazada.
    const res = schemaConclusion.safeParse({
      titular: "Un titular suficientemente largo",
      razon: "De simular_credito",
      datos: [{ etiqueta: "Mensualidad", valor: "$4,570.95" }],
    });
    expect(res.success).toBe(true);
  });
});

describe("SimuladorMeta: la aportacion se acota a su propio rango", () => {
  function pintarSimulador(extra: Record<string, unknown> = {}): string {
    return renderToStaticMarkup(
      createElement(SimuladorMeta, {
        nombre: "Aportacion extra a credito",
        metaCentavos: 5578308,
        aportacionCentavos: 200000,
        aportacionMinimaCentavos: 50000,
        aportacionMaximaCentavos: 662905,
        razon: "Tu capacidad mensual es de $6,629.05",
        ...extra,
      }),
    );
  }

  it("una aportacion por DEBAJO del piso se pinta en el piso, no fuera del slider", () => {
    // El caso de la captura del 2026-09-12: $477 con un slider que empieza en $500.
    const html = pintarSimulador({ aportacionCentavos: 47700 });

    expect(html).toContain("$500.00");
    expect(html).not.toContain("$477.00");
  });

  it("una aportacion por ARRIBA del tope se pinta en el tope", () => {
    const html = pintarSimulador({ aportacionCentavos: 99999999 });
    expect(html).toContain("$6,629.05");
  });

  it("y la fecha de llegada se calcula con la aportacion acotada, no con la imposible", () => {
    const conImposible = pintarSimulador({ aportacionCentavos: 47700 });
    const conElPiso = pintarSimulador({ aportacionCentavos: 50000 });
    // Misma aportacion efectiva, misma cuenta: 5578308 / 50000 son 112 meses.
    expect(conImposible).toBe(conElPiso);
  });

  it("el schema ademas lo REPORTA, para que el modelo se entere", () => {
    const base = { metaCentavos: 5578308, razon: "Tu capacidad mensual es de $6,629.05" };

    const fuera = schemaSimuladorMeta.safeParse({
      ...base,
      aportacionCentavos: 47700,
      aportacionMinimaCentavos: 50000,
      aportacionMaximaCentavos: 662905,
    });
    expect(fuera.success).toBe(false);
    expect(JSON.stringify(fuera.error?.issues)).toContain("fuera del rango del slider");

    const dentro = schemaSimuladorMeta.safeParse({
      ...base,
      aportacionCentavos: 200000,
      aportacionMinimaCentavos: 50000,
      aportacionMaximaCentavos: 662905,
    });
    expect(dentro.success).toBe(true);
  });

  it("un piso mayor que el tope tambien se reporta", () => {
    const res = schemaSimuladorMeta.safeParse({
      metaCentavos: 100000,
      razon: "Tu capacidad mensual",
      aportacionCentavos: 50000,
      aportacionMinimaCentavos: 900000,
      aportacionMaximaCentavos: 100000,
    });
    expect(res.success).toBe(false);
  });
});
