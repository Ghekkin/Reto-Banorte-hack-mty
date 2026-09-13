import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * El reloj solo arranca en produccion (issue #38): un `next dev` conserva el reloj con el
 * codigo de cuando arranco y, con la base compartida, rearmaba las portadas de produccion con
 * codigo viejo. `INICIO_RELOJ` lo fuerza en cualquier sentido.
 *
 * El servicio va simulado y "activo" (llave, base y flag): sin eso el reloj tampoco arrancaria
 * en las pruebas y no se veria la diferencia entre entornos.
 */
vi.mock("../servicio", () => ({
  inicioActivo: () => true,
  regenerarTodos: vi.fn(async () => ({})),
}));

type Global = typeof globalThis & { __relojDelInicio?: ReturnType<typeof setInterval> };

async function arrancarCon(entorno: { NODE_ENV: string; INICIO_RELOJ?: string }) {
  vi.stubEnv("NODE_ENV", entorno.NODE_ENV);
  if (entorno.INICIO_RELOJ === undefined) delete process.env.INICIO_RELOJ;
  else vi.stubEnv("INICIO_RELOJ", entorno.INICIO_RELOJ);
  const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
  const { iniciarReloj } = await import("../reloj");
  iniciarReloj();
  const lineas = log.mock.calls.map((c) => JSON.parse(String(c[0])) as Record<string, unknown>);
  return { prendido: Boolean((globalThis as Global).__relojDelInicio), lineas };
}

afterEach(async () => {
  const { detenerReloj } = await import("../reloj");
  detenerReloj();
  vi.unstubAllEnvs();
  delete process.env.INICIO_RELOJ;
  vi.restoreAllMocks();
});

describe("iniciarReloj", () => {
  it("en next dev (NODE_ENV=development) no arranca y el log dice por que", async () => {
    vi.useFakeTimers();
    const { prendido, lineas } = await arrancarCon({ NODE_ENV: "development" });
    vi.useRealTimers();
    expect(prendido).toBe(false);
    expect(lineas).toContainEqual(expect.objectContaining({ inicio: "reloj", hecho: "apagado", motivo: expect.stringContaining("INICIO_RELOJ=1") }));
  });

  it("en produccion arranca y el log dice cada cuanto y por que", async () => {
    vi.useFakeTimers();
    const { prendido, lineas } = await arrancarCon({ NODE_ENV: "production" });
    vi.useRealTimers();
    expect(prendido).toBe(true);
    expect(lineas).toContainEqual(expect.objectContaining({ inicio: "reloj", hecho: "prendido", motivo: "produccion", cadaMinutos: 10 }));
  });

  it("INICIO_RELOJ=1 lo prende en desarrollo", async () => {
    vi.useFakeTimers();
    const { prendido } = await arrancarCon({ NODE_ENV: "development", INICIO_RELOJ: "1" });
    vi.useRealTimers();
    expect(prendido).toBe(true);
  });

  it("INICIO_RELOJ=0 lo apaga aun en produccion", async () => {
    vi.useFakeTimers();
    const { prendido, lineas } = await arrancarCon({ NODE_ENV: "production", INICIO_RELOJ: "0" });
    vi.useRealTimers();
    expect(prendido).toBe(false);
    expect(lineas).toContainEqual(expect.objectContaining({ hecho: "apagado", motivo: "INICIO_RELOJ=0" }));
  });
});

describe("decisionDelReloj", () => {
  it("por omision solo en produccion; un valor raro cuenta como vacio", async () => {
    const { decisionDelReloj } = await import("../config");
    expect(decisionDelReloj({ NODE_ENV: "production" }).prendido).toBe(true);
    expect(decisionDelReloj({ NODE_ENV: "development" }).prendido).toBe(false);
    expect(decisionDelReloj({ NODE_ENV: "test" }).prendido).toBe(false);
    expect(decisionDelReloj({}).prendido).toBe(false);
    expect(decisionDelReloj({ NODE_ENV: "development", INICIO_RELOJ: "si" }).prendido).toBe(false);
    expect(decisionDelReloj({ NODE_ENV: "production", INICIO_RELOJ: " 0 " }).prendido).toBe(false);
  });
});
