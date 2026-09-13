import { CATALOGO } from "@maya/catalogo";
import { consultar } from "@/lib/datos/tablas";
import { DISPOSITIVO_COMUN } from "@/lib/dispositivo";

/**
 * La huella: con que datos se armo la portada de una persona.
 *
 * Es lo que decide si vale la pena correr el modelo. El reloj pasa cada N minutos por
 * los tres usuarios, pero una cuenta que no se ha movido produce la MISMA portada, y
 * pagar por rearmarla es tirar el dinero. Asi que se compara esta huella con la que se
 * guardo junto a la pantalla: iguales, no se hace nada; distintas, se rearma.
 *
 * Cabe en una linea y no es un hash a proposito: en el log y en la base se lee que
 * cambio ("a:1:7" -> hubo una accion, la fila 7). Ver `docs/algoritmos/huella-del-inicio.md`.
 */

/** Sube cuando cambia el prompt de la portada, el catalogo o la forma de armarla: rearma las tres. */
export const VERSION_DEL_GENERADOR = 1;

export type PartesDeHuella = {
  /** `cuenta:ultimoId` de `acciones_aplicadas` de la persona. Cubre planes, apartados, topes y suscripciones. */
  acciones: string;
  /** `cuenta:ultimaFecha` de sus movimientos. */
  movimientos: string;
  version?: number;
  componentes?: number;
};

export function armarHuella(partes: PartesDeHuella): string {
  const version = partes.version ?? VERSION_DEL_GENERADOR;
  const componentes = partes.componentes ?? CATALOGO.length;
  return `v${version}|c${componentes}|a:${partes.acciones}|m:${partes.movimientos}`;
}

/**
 * Dos subconsultas con indice, no dos tablas enteras: corre en cada visita a Inicio.
 *
 * Las acciones que cuentan son las del dispositivo (ADR 0012): cada visitante tiene su propio
 * estado, asi que su portada se arma con SUS acciones. Un dispositivo que no ha aplicado nada
 * tiene la misma huella que el comun sin acciones, y eso es lo que le permite ver la portada
 * comun sin gastar modelo (`servicio.ts`).
 */
export async function huellaDe(usuarioId: string, dispositivoId: string = DISPOSITIVO_COMUN): Promise<string> {
  const [fila] = await consultar<{ acciones: string; movimientos: string }>(
    `select
       (select count(*) || ':' || coalesce(max(id), 0)
          from banorte.acciones_aplicadas where usuario_id = $1 and dispositivo_id = $2) as acciones,
       (select count(*) || ':' || coalesce(max(fecha)::text, '')
          from banorte.movimientos where usuario_id = $1) as movimientos`,
    [usuarioId, dispositivoId],
  );
  return armarHuella({ acciones: fila?.acciones ?? "0:0", movimientos: fila?.movimientos ?? "0:" });
}
