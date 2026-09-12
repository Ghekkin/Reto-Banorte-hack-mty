# Especificación A2UI v0.9.1, vendoreada

Copia literal de `specification/v0_9_1/` del repositorio oficial
[`a2ui-project/a2ui`](https://github.com/a2ui-project/a2ui) (Apache 2.0, ver
`LICENSE-A2UI`). El commit exacto del que se copió está en `UPSTREAM_COMMIT`.

**No se edita nada aquí.** Si la spec cambia, se vuelve a copiar completa y se actualiza
`UPSTREAM_COMMIT`. Nuestro código (`../src`) valida contra estos archivos; así "A2UI"
es defendible con un renderer propio (ADR 0008).

| Carpeta | Qué es | Para qué lo usamos |
|---|---|---|
| `json/server_to_client.json` | Schema de los mensajes agente → cliente (`createSurface`, `updateComponents`, `updateDataModel`, `deleteSurface`) | `validar()` de cada línea `a2ui` del stream, en el agente y en el renderer |
| `json/client_to_server.json` | Schema del `action` cliente → agente | Validar lo que emite `acciones.ts` y lo que recibe `/api/agente` |
| `json/common_types.json`, `client_data_model.json` | Tipos compartidos: bindings `{path}`, data model | Referenciados por los anteriores (`$ref`) |
| `json/*_list*.json`, `*_capabilities.json` | Listas de mensajes y negociación de capacidades | Referencia; no los usamos en el hack |
| `json/sample.json` | Ejemplo oficial completo | Fixture de prueba |
| `catalogs/basic/catalog.json` | El catálogo básico oficial (Column, Row, Text, Button…) con el schema de cada componente | Modelo para el formato de **nuestro** `catalogo.json`; implementamos Column/Row/Text/Divider con Tailwind |
| `test/cases/*.json` | **Casos de conformidad oficiales** | Se corren tal cual contra `validar()` y `procesar()`: son nuestros tests de la spec, no inventados |

## Cómo se cargan

`ajv` con `$ref` resueltos desde esta carpeta; ver `../src/validar.ts`. Los `$id` de
los archivos apuntan a `a2ui.org`; se registran en `ajv` por `$id` sin salir a la red.
