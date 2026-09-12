import { cerrarPool } from "../src/datos/postgres.js";
import { reiniciarEstado } from "../src/datos/estado.js";

/**
 * Vuelve el estado mutable al punto de partida: trunca `banorte.acciones_aplicadas`.
 * Se corre ANTES de cada ensayo y antes del pitch (skill `checklist-demo`).
 *
 * Los datos de partida no se tocan. El servidor que ya este corriendo lo nota sin
 * reiniciarse: refresca las acciones antes de cada llamada a una tool.
 */
await reiniciarEstado();
await cerrarPool();
console.log("estado reiniciado: banorte.acciones_aplicadas quedo vacia");
