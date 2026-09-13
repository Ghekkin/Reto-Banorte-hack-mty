import { z } from "zod";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { conectarMcp, llamarTool } from "@/lib/agente/mcp-cliente";
import { almacenEnPostgres } from "@/lib/inicio/almacen";
import { configInicio } from "@/lib/inicio/config";
import { inicioActivo } from "@/lib/inicio/servicio";
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
 *   {"tipo":"estado","valor":"pensando"|"consultando"|"armando"}
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
 * Ver `docs/como-funciona/widgets-vivos.md`.
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

  const usuario = await usuarioActivo();
  const pantalla = await almacenEnPostgres.leer(usuario.id);
  if (!pantalla || Object.keys(pantalla.procedencias).length === 0) {
    return Response.json({ error: "Tu Inicio todavía no está listo para preguntas por tarjeta; Maya lo está armando." }, { status: 409 });
  }

  const codificador = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controlador) {
      const emitir = (linea: LineaDeWidget) => controlador.enqueue(codificador.encode(JSON.stringify(linea) + "\n"));
      let cliente: Client | undefined;
      try {
        cliente = await conectarMcp();
        const abierto = cliente;
        const turno = await turnoDeWidget(
          {
            usuarioId: usuario.id,
            pregunta: cuerpo.data.pregunta,
            foco: cuerpo.data.foco,
            historial: cuerpo.data.historial,
            pantalla,
          },
          { cliente: abierto, alEvento: emitir },
        );
        if (!turno.ok) {
          // A la persona, una frase que pueda entender; el motivo tecnico va al log.
          emitir({ tipo: "error", mensaje: paraLaPersona(turno.motivo) });
          registrar({ widget: usuario.id, hecho: "fallo", motivo: turno.motivo, tools: turno.tools, ms: turno.ms });
          return;
        }

        let auditoria: Auditoria | null = null;
        let guardada = false;
        if (turno.mensajes.length && turno.widgetId) {
          const mensajes = fundirAjuste(pantalla.mensajes, turno.mensajes);
          auditoria = await auditarWidgets(
            componentesDe(mensajes),
            turno.procedencias,
            (tool, argumentos) => llamarTool(abierto, tool, argumentos),
            [turno.widgetId],
          );
          if (auditoria.diferencias.length > 0) {
            // No deberia pasar nunca: el adaptador es el mismo. Si pasa, es un bug y la
            // tarjeta no se muestra ni se guarda.
            registrar({ widget: usuario.id, hecho: "auditoria-fallida", diferencias: auditoria.diferencias });
            emitir({ tipo: "error", mensaje: "La tarjeta no pasó la verificación contra el banco; no la cambié." });
            return;
          }
          for (const mensaje of turno.mensajes) emitir({ tipo: "a2ui", mensaje });
          guardada = Boolean(
            await almacenEnPostgres.ajustar?.({
              usuarioId: usuario.id,
              mensajes,
              procedencias: turno.procedencias,
              generadaEn: pantalla.generadaEn,
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
        });
      } catch (error) {
        const motivo = error instanceof Error ? error.message : String(error);
        registrar({ widget: usuario.id, hecho: "fallo", motivo });
        emitir({ tipo: "error", mensaje: paraLaPersona(motivo) });
      } finally {
        await cliente?.close().catch(() => undefined);
        controlador.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}

/** Una linea JSON por turno en el log, como el agente y el Inicio. */
function registrar(linea: Record<string, unknown>): void {
  console.log(JSON.stringify(linea));
}
