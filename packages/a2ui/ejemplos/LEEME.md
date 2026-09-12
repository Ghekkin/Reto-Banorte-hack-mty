# Ejemplos `.jsonl`

Mensajes A2UI escritos **a mano**: lo que el agente deberia emitir. Sirven para
tres cosas y las tres importan:

1. Probar el renderer sin agente ni MCP (`pnpm --filter @maya/a2ui test`).
2. Probar un componente del catalogo sin agente (`web` pega el archivo en el lienzo).
3. Ensenarle al modelo la forma exacta que debe producir (van en el prompt).

Uno por componente del catalogo, con el mismo nombre: `plan-de-pago.jsonl`,
`gasto-por-categoria.jsonl`… Una linea por mensaje, sin comas al final.
