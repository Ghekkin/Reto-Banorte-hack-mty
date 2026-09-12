"use client";

import { registrarLayout } from "@maya/a2ui/layout";
import { registrarCatalogo } from "@maya/catalogo";

/**
 * Deja el registro del renderer listo: los 4 de layout y los 8 del catalogo.
 *
 * **Todo modulo que pinte un `<Superficie>` tiene que llamar esto.** El registro es un
 * Map en memoria del bundle (`packages/a2ui/src/registro.ts`), asi que un componente que
 * nadie registro no existe para el renderer: cae en `Desconocido` y, si el canal de
 * fallos esta conectado, se lo cuenta al agente. Eso es lo que paso el 2026-09-12 a las
 * 09:20 — la galeria registraba, el lienzo de la demo no, y la consola no pintaba NADA
 * mientras la galeria se veia perfecta.
 *
 * Vive aqui, en un solo archivo, para que no haya dos listas que se puedan separar; y es
 * idempotente para que navegar entre `/maya` y `/catalogo` no reemplace nada ni llene la
 * consola de avisos.
 */
let hecho = false;

export function registrarComponentes(): void {
  if (hecho) return;
  hecho = true;
  registrarLayout();
  registrarCatalogo();
}

/** Tambien al importar, para que no dependa de que alguien se acuerde de llamarla. */
registrarComponentes();
