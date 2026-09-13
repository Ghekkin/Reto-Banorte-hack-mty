import { configInicio, decisionDelReloj } from "./config";
import { inicioActivo, regenerarTodos } from "./servicio";

/**
 * El reloj: cada `INICIO_CADA_MINUTOS` revisa a los tres usuarios y rearma la portada
 * de quien haya cambiado. Vive dentro del proceso de la web (lo arranca
 * `src/instrumentation.ts` al levantar el servidor): sin cron, sin cola, sin otra pieza
 * que desplegar. Si el proceso se reinicia, el reloj se reinicia con el.
 *
 * **Solo en produccion** (`decisionDelReloj`, issue #38). El intervalo se queda con los
 * modulos de cuando arranco el servidor, y en `next dev` el HMR no lo alcanza: un servidor
 * de desarrollo viejo rearmaba las portadas de la base compartida con codigo que ya no
 * estaba en `main`. En desarrollo las visitas, las acciones y `POST /api/inicio` rearman
 * igual; solo falta el tick. `INICIO_RELOJ=1` lo prende para probarlo.
 *
 * "Revisar" no es "generar": la huella de `servicio.ts` decide, y una cuenta quieta no
 * cuesta nada. Por eso el ritmo puede ser corto sin miedo a la cuota.
 *
 * `unref()` en los dos temporizadores: el reloj no mantiene vivo el proceso. Un
 * `next build` o una prueba que importen esto por accidente terminan igual.
 */
type Global = typeof globalThis & { __relojDelInicio?: ReturnType<typeof setInterval> };

/** Antes de la primera revision: que el MCP haya terminado de levantar. */
const ESPERA_INICIAL_MS = 15_000;

export function iniciarReloj(): void {
  const g = globalThis as Global;
  if (g.__relojDelInicio) return; // el dev server recarga modulos; el reloj es uno solo

  const decision = decisionDelReloj();
  if (!decision.prendido) {
    console.log(JSON.stringify({ inicio: "reloj", hecho: "apagado", motivo: decision.motivo }));
    return;
  }

  if (!inicioActivo()) {
    console.log(JSON.stringify({ inicio: "reloj", hecho: "inactivo", motivo: "flag apagado, sin llave o sin base" }));
    return;
  }

  const cadaMs = configInicio.cadaMinutos * 60_000;
  const revisar = () => {
    regenerarTodos("reloj").catch((error: unknown) => {
      console.warn(`[inicio] el reloj fallo: ${error instanceof Error ? error.message : String(error)}`);
    });
  };

  setTimeout(revisar, ESPERA_INICIAL_MS).unref();
  g.__relojDelInicio = setInterval(revisar, cadaMs);
  g.__relojDelInicio.unref();

  console.log(
    JSON.stringify({ inicio: "reloj", hecho: "prendido", motivo: decision.motivo, cadaMinutos: configInicio.cadaMinutos, modelo: configInicio.modelo }),
  );
}

/** Para pruebas y para apagarlo a mano. */
export function detenerReloj(): void {
  const g = globalThis as Global;
  if (!g.__relojDelInicio) return;
  clearInterval(g.__relojDelInicio);
  g.__relojDelInicio = undefined;
}
