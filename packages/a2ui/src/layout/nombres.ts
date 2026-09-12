/**
 * Los nombres de layout del catalogo basico de A2UI, sin React de por medio.
 *
 * Vive en su propio modulo porque el AGENTE (que corre en el servidor) necesita saber
 * que nombres tiene permitido emitir, y no tiene por que importar componentes de React
 * para averiguarlo. `layout/index.tsx` registra exactamente estos.
 */
export const NOMBRES_DE_LAYOUT = ["Column", "Row", "Text", "Divider"] as const;

export type NombreDeLayout = (typeof NOMBRES_DE_LAYOUT)[number];
