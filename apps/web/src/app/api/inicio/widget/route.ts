import type { LanguageModelUsage } from "ai";
import { z } from "zod";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { conectarMcp, llamarTool } from "@/lib/agente/mcp-cliente";
import { escritorEnPostgres, registrar as registrarEnLaBase } from "@/lib/corridas/escritor";
import { crearGrabadora } from "@/lib/corridas/grabadora";
import { dispositivoActivo } from "@/lib/dispositivo-activo";
import { almacenEnPostgres } from "@/lib/inicio/almacen";
import { configInicio } from "@/lib/inicio/config";
import { estadoDelInicio, inicioActivo } from "@/lib/inicio/servicio";
import { usuarioActivo } from "@/lib/usuario-activo";
import { auditarWidgets, type Auditoria } from "@/lib/widgets/auditar";
import { paraLaPersona, type LineaDeWidget } from "@/lib/widgets/linea";
import { componentesDe, fundirAjuste } from "@/lib/widgets/pantalla-viva";
import { turnoDeWidget } from "@/lib/widgets/turno";

/**
 * `POST /api/inicio/widget` — preguntarle a Inicio SIN rearmarlo.
 *
 * Cuerpo: `{ pregunta, foco?, historial? }`. La persona sale de la cookie de sesion, no
 * del cuerpo: nadie pregunta sobre el Inicio de otro.
 *
 * Responde en JSONL, una linea por evento, igual que `/api/agente`:
 *
 *   {"tipo":"estado","valor":"pensando"|"consultando"|"armando"|"verificando"}
 *   {"tipo":"tool","nombre":"analizar_gasto","ms":42,"ok":true}
 *   {"tipo":"a2ui","mensaje":{ "updateComponents": … }}      <- solo la tarjeta que cambio
 *   {"tipo":"fin", "cierre", "widgetId", "texto", "sugerencias", "auditoria", "guardada", …}
 *   {"tipo":"error","mensaje":"…"}
 *
 * Despues del turno, con la misma conexion al MCP, el **auditor** vuelve a consultar la
 * fuente de la tarjeta que cambio y compara prop por prop con lo que se va a pintar. El
 * resultado viaja en `fin.auditoria` y la interfaz lo muestra: es la prueba, visible, de
 * que ninguna cifra la escribio el modelo. Si hubiera una diferencia, la tarjeta NO se
 * guarda y se reporta.
 *
 * El ajuste se guarda fundido en la portada (`pantallas_inicio`) con la huella intacta:
 * recargar la pagina conserva lo que la persona pidio, hasta que sus datos cambien de verdad.
 * Y se guarda en la portada de ESTE dispositivo (ADR 0012): si estaba viendo la comun, el
 * ajuste se vuelve su portada propia y la comun queda intacta para los demas visitantes.
 * Ver `docs/como-funciona/widgets-vivos.md`.
 *
 * Cada pregunta queda como corrida `widget` en `banorte.corridas` (issue #35): el turno graba
 * modelo, pasos, tokens y tools; esta ruta, cada linea que sale (con la auditoria del `fin`) y
 * como termino. El `fin` lleva `corridaId`. La grabacion es de mejor esfuerzo: si la base falla,
 * la persona recibe su respuesta igual.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cuerpoValido = z.object({
  pregunta: z.string().trim().min(3, "Escribe un poco más para que pueda ayudarte.").max(300, "La pregunta es muy larga; resúmela."),
  foco: z.string().regex(/^[a-z][a-z0-9_-]{1,30}$/).optional(),
  historial: z
    .array(z.object({ pregunta: z.string().max(300), respuesta: z.string().max(600) }))
    .max(3)
    .optional(),
});

export async function POST(peticion: Request): Promise<Response> {
  let crudo: unknown;
  try {
    crudo = await peticion.json();
  } catch {
    return Response.json({ error: "cuerpo invalido: no es JSON" }, { status: 400 });
  }
  const cuerpo = cuerpoValido.safeParse(crudo);
  if (!cuerpo.success) {
    return Response.json({ error: cuerpo.error.issues[0]?.message ?? "peticion invalida" }, { status: 400 });
  }
  if (!inicioActivo() || !configInicio.widgetsVivos) {
    return Response.json({ error: "Los widgets vivos estan apagados (FEATURE_WIDGETS_VIVOS)." }, { status: 409 });
  }

  const [usuario, dispositivoId] = await Promise.all([usuarioActivo(), dispositivoActivo()]);
  // La misma portada que la pagina le pinto a este dispositivo: la propia o la comun.
  const pantalla = (await estadoDelInicio(usuario.id, { dispositivoId })).pantalla;
  if (!pantalla || Object.keys(pantalla.procedencias).length === 0) {
    return Response.json({ error: "Tu Inicio todavía no está listo para preguntas por tarjeta; Maya lo está armando." }, { status: 409 });
  }

  const grabadora = crearGrabadora(
    {
      tipo: "widget",
      usuarioId: usuario.id,
      motivo: cuerpo.data.foco ? `foco:${cuerpo.data.foco}` : "general",
      peticion: { ...cuerpo.data, portada: { dispositivoId: pantalla.dispositivoId, generadaEn: pantalla.generadaEn } },
      dispositivoId,
    },
    escritorEnPostgres,
  );
  const corridaId = grabadora.activa ? grabadora.id : undefined;

  const codificador = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controlador) {
      const emitir = (linea: LineaDeWidget) => {
        grabadora.linea(linea);
        controlador.enqueue(codificador.encode(JSON.stringify(linea) + "\n"));
      };
      let cliente: Client | undefined;
      try {
        cliente = await conectarMcp({ dispositivoId });
        const abierto = cliente;
        const turno = await turnoDeWidget(
          {
            usuarioId: usuario.id,
            pregunta: cuerpo.data.pregunta,
            foco: cuerpo.data.foco,
            historial: cuerpo.data.historial,
            pantalla,
          },
          { cliente: abierto, alEvento: emitir, grabadora, dispositivoId },
        );
        const tokens = tokensDe(turno.uso);
        if (!turno.ok) {
          // A la persona, una frase que pueda entender; el motivo tecnico va al log.
          emitir({ tipo: "error", mensaje: paraLaPersona(turno.motivo) });
          registrar({ widget: usuario.id, hecho: "fallo", motivo: turno.motivo, tools: turno.tools, pasos: turno.pasos, ms: turno.ms, ...tokens }, corridaId);
          return;
        }

        let auditoria: Auditoria | null = null;
        let guardada = false;
        if (turno.mensajes.length && turno.widgetId) {
          const mensajes = fundirAjuste(pantalla.mensajes, turno.mensajes);
          // La interfaz lo dice mientras espera («Verificando las cifras con el banco»): el
          // auditor vuelve a consultar el MCP y es una espera real, no un adorno.
          emitir({ tipo: "estado", valor: "verificando" });
          auditoria = await auditarWidgets(
            componentesDe(mensajes),
            turno.procedencias,
            (tool, argumentos) => llamarTool(abierto, tool, argumentos, { corridaId }),
            [turno.widgetId],
          );
          if (auditoria.diferencias.length > 0) {
            // No deberia pasar nunca: el adaptador es el mismo. Si pasa, es un bug y la
            // tarjeta no se muestra ni se guarda.
            grabadora.resumir({ estado: "error", error: `auditoria: ${auditoria.diferencias.length} diferencia(s) contra el MCP` });
            registrar({ widget: usuario.id, hecho: "auditoria-fallida", diferencias: auditoria.diferencias, ...tokens }, corridaId);
            emitir({ tipo: "error", mensaje: "La tarjeta no pasó la verificación contra el banco; no la cambié." });
            return;
          }
          for (const mensaje of turno.mensajes) emitir({ tipo: "a2ui", mensaje });
          guardada = Boolean(
            await almacenEnPostgres.ajustar?.({
              usuarioId: usuario.id,
              dispositivoId,
              mensajes,
              procedencias: turno.procedencias,
              generadaEn: pantalla.generadaEn,
              base: pantalla,
            }),
          );
        }

        const procedencia = turno.widgetId ? turno.procedencias[turno.widgetId] : undefined;
        emitir({
          tipo: "fin",
          cierre: turno.cierre,
          widgetId: turno.widgetId,
          texto: turno.texto,
          razon: turno.razon,
          sugerencias: turno.sugerencias,
          tools: turno.tools,
          ms: turno.ms,
          modelo: turno.modelo,
          auditoria: auditoria && {
            revisados: auditoria.revisados,
            diferencias: auditoria.diferencias,
            datosCambiaron: auditoria.datosCambiaron,
            ms: auditoria.ms,
          },
          guardada,
          procedencia: procedencia && {
            tool: procedencia.tool,
            fuente: procedencia.fuente,
            parametros: procedencia.parametros,
            en: procedencia.en,
          },
          ...(corridaId ? { corridaId } : {}),
        });
        registrar({
          widget: usuario.id,
          hecho: turno.cierre,
          widgetId: turno.widgetId ?? null,
          tools: turno.tools,
          pasos: turno.pasos,
          auditoria: auditoria ? { revisados: auditoria.revisados, diferencias: auditoria.diferencias.length } : null,
          cifrasQuitadas: turno.cifrasQuitadas,
          guardada,
          ms: turno.ms,
          ...tokens,
        }, corridaId);
      } catch (error) {
        const motivo = error instanceof Error ? error.message : String(error);
        grabadora.resumir({ estado: "error", error: motivo });
        registrar({ widget: usuario.id, hecho: "fallo", motivo }, corridaId);
        emitir({ tipo: "error", mensaje: paraLaPersona(motivo) });
      } finally {
        await cliente?.close().catch(() => undefined);
        // En segundo plano: la respuesta no espera a la base.
        void grabadora.terminar();
        controlador.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}

/** Los tokens del turno para el registro, con los nombres del de la portada. */
function tokensDe(uso: LanguageModelUsage | undefined): { entrada: number | null; salida: number | null; cache: number | null } {
  return { entrada: uso?.inputTokens ?? null, salida: uso?.outputTokens ?? null, cache: uso?.cachedInputTokens ?? null };
}

/**
 * Una linea por turno: en consola, como el agente y el Inicio, y en `banorte.registros` (fuente
 * `inicio`, evento `widget-<hecho>`), ligada a su corrida.
 */
function registrar(linea: Record<string, unknown> & { widget: string; hecho: string }, corridaId?: string): void {
  const falla = linea.hecho === "fallo" || linea.hecho === "auditoria-fallida";
  registrarEnLaBase({
    fuente: "inicio",
    nivel: falla ? "warn" : "info",
    evento: `widget-${linea.hecho}`,
    usuarioId: linea.widget,
    corridaId: corridaId ?? null,
    datos: linea,
  });
}
