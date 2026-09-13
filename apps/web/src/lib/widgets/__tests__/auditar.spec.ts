import { beforeAll, describe, expect, it } from "vitest";
import { auditarWidgets } from "../auditar";
import { crearConsultor } from "../consultor";
import { armarPantallaDeWidgets, type PantallaDeWidgets } from "../pintar";
import { componentesDe } from "../pantalla-viva";
import { llamarFalso } from "./mcp-falso";

/**
 * El auditor: re-consultar el MCP y comparar prop por prop. Si una cifra de una tarjeta no
 * es exactamente lo que devuelve su fuente —la escribio el modelo, se altero en la base, un
 * adaptador cambio—, aparece aqui.
 */

let portada: PantallaDeWidgets;

beforeAll(async () => {
  const r = await armarPantallaDeWidgets(
    {
      razon: "Tu portafolio se desvio de su modelo y tienes suscripciones activas",
      texto: "Tu portafolio pide un ajuste.",
      conclusion: { titular: "Tu portafolio se desvió de tu modelo y conviene rebalancearlo." },
      widgets: [
        { id: "portafolio", fuente: "portafolio", heroe: true, razon: "Tu portafolio es tu mayor patrimonio" },
        { id: "fugas", fuente: "fugas", razon: "Tus suscripciones suman cada mes" },
      ],
    },
    crearConsultor({ usuarioId: "usr_carmen", llamar: llamarFalso("usr_carmen") }),
  );
  if (!r.ok) throw new Error(r.errores.join("\n"));
  portada = r;
});

describe("auditarWidgets", () => {
  it("una portada armada por fuentes: cero diferencias", async () => {
    const a = await auditarWidgets(componentesDe(portada.mensajes), portada.procedencias, llamarFalso("usr_carmen"));
    expect(a).toMatchObject({ revisados: 2, diferencias: [], datosCambiaron: [], sinAuditar: [] });
  });

  it("una cifra alterada en pantalla se detecta con el campo, lo visto y lo del MCP", async () => {
    const componentes = componentesDe(portada.mensajes);
    componentes.set("fugas", { ...componentes.get("fugas")!, totalMensualCentavos: 100 });
    const a = await auditarWidgets(componentes, portada.procedencias, llamarFalso("usr_carmen"));
    expect(a.diferencias).toEqual([{ widgetId: "fugas", campo: "totalMensualCentavos", enPantalla: 100, delMcp: 354600 }]);
  });

  it("si la cuenta se movio despues de armar la tarjeta, no es mentira: es datosCambiaron", async () => {
    const llamar = llamarFalso("usr_carmen", (tool, salida) => {
      if (tool !== "detectar_fugas") return salida;
      return { ...(salida as Record<string, unknown>), totalMensualCentavos: 1 };
    });
    const a = await auditarWidgets(componentesDe(portada.mensajes), portada.procedencias, llamar);
    expect(a.datosCambiaron).toEqual(["fugas"]);
    expect(a.diferencias.map((d) => d.campo)).toEqual(["totalMensualCentavos"]);
  });

  it("se puede auditar solo la tarjeta que cambio", async () => {
    const llamar = llamarFalso("usr_carmen");
    const a = await auditarWidgets(componentesDe(portada.mensajes), portada.procedencias, llamar, ["fugas"]);
    expect(a.revisados).toBe(1);
    expect(llamar).toHaveBeenCalledTimes(1);
  });
});
