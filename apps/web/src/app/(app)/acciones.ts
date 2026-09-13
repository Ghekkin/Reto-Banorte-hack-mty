"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { almacenEnPostgres } from "@/lib/inicio/almacen";
import { generarPortada } from "@/lib/inicio/generar";
import { huellaDe } from "@/lib/inicio/huella";
import { inicioActivo } from "@/lib/inicio/servicio";
import { dispositivoActivo } from "@/lib/dispositivo-activo";
import { COOKIE_USUARIO, usuarioActivo } from "@/lib/usuario-activo";
import { USUARIOS } from "@/lib/usuarios";

/**
 * Cambiar de usuario demo. Es una server action porque tiene que escribir la cookie que
 * leen los componentes de servidor y despues invalidar el cache: sin el
 * `revalidatePath`, Inicio seguiria mostrando los datos del usuario anterior.
 *
 * Se valida el id contra la lista en vez de confiar en lo que llega del cliente: es una
 * entrada del navegador y termina en una lectura de disco.
 */
export async function cambiarUsuario(id: string): Promise<void> {
  if (!USUARIOS.some((u) => u.id === id)) return;

  (await cookies()).set(COOKIE_USUARIO, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  revalidatePath("/", "layout");
}

/** Mas largo que esto no es una pregunta, es un texto pegado. */
const MAX_PREGUNTA = 300;

export type ResultadoDeConsulta = { ok: true } | { ok: false; motivo: string };

/**
 * Lo que la persona pregunta desde Inicio: **reemplaza su dashboard completo**.
 *
 * Es el pizarron que se borra. No se agrega una burbuja ni se apila una pantalla nueva
 * debajo: la portada guardada se sustituye por la que contesta esta pregunta, y al volver
 * a renderizar Inicio ya no queda nada de la anterior.
 *
 * **Por que una server action y no un `fetch` desde el navegador.** El resultado se
 * guarda en `banorte.pantallas_inicio`, y eso significa que alguien tiene que decidir que
 * A2UI entra a la base. Si el navegador armara la pantalla y la mandara a guardar, la base
 * confiaria en entrada del cliente. Aqui el turno corre en el servidor, la pantalla pasa
 * por las mismas cuatro validaciones que la portada (`pintar_pantalla`) y el navegador
 * solo manda el texto de la pregunta.
 *
 * **La huella se guarda con el valor de HOY a proposito.** Es lo que evita que el reloj
 * borre la consulta en el siguiente tick: mientras la cuenta no se mueva, la pantalla que
 * pediste se queda. En cuanto se mueva de verdad (una accion, movimientos nuevos), el
 * reloj rearma la portada de perfil, que es el comportamiento correcto: los datos que
 * sostenian tu consulta ya cambiaron.
 */
export async function preguntarEnInicio(pregunta: string): Promise<ResultadoDeConsulta> {
  const limpia = pregunta.trim();
  if (limpia.length < 3) return { ok: false, motivo: "Escribe un poco mas para que pueda ayudarte." };
  if (limpia.length > MAX_PREGUNTA) return { ok: false, motivo: "La pregunta es muy larga; resumela." };
  if (!inicioActivo()) {
    return { ok: false, motivo: "El Inicio personalizado esta apagado (FEATURE_INICIO_PERSONALIZADO)." };
  }

  // La respuesta es de ESTE dispositivo (ADR 0012): se guarda como su portada propia y no le
  // borra el Inicio a nadie que haya abierto a la misma persona.
  const [usuario, dispositivoId] = await Promise.all([usuarioActivo(), dispositivoActivo()]);
  const generada = await generarPortada(usuario.id, { pregunta: limpia, dispositivoId });

  if (!generada.ok) {
    // El motivo real, no un "algo salio mal": quien ve esto en la demo es del equipo.
    return { ok: false, motivo: generada.motivo };
  }

  await almacenEnPostgres.guardar({
    usuarioId: usuario.id,
    dispositivoId,
    huella: await huellaDe(usuario.id, dispositivoId),
    mensajes: generada.mensajes,
    texto: generada.texto,
    razon: generada.razon,
    sugerencias: generada.sugerencias,
    modelo: generada.modelo,
    tools: generada.tools,
    entradaTokens: generada.entradaTokens,
    salidaTokens: generada.salidaTokens,
    cacheTokens: generada.cacheTokens,
    ms: generada.ms,
    // Con widgets vivos, sin esto la portada queda sin procedencias, `vencida()` la da por
    // vieja y la siguiente visita tira la respuesta (issue #27).
    procedencias: generada.procedencias,
    referencias: generada.referencias,
  });

  revalidatePath("/");
  return { ok: true };
}
