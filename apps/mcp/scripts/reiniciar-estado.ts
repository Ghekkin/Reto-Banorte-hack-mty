import { reiniciarEstado } from "../src/datos/estado.js";
import { config } from "../src/config.js";

/**
 * Vuelve el estado mutable al punto de partida. Se corre ANTES de cada ensayo y
 * antes del pitch (skill `checklist-demo`). Los CSV no se tocan nunca.
 */
reiniciarEstado();
console.log(`estado reiniciado: ${config.archivoEstado}`);
