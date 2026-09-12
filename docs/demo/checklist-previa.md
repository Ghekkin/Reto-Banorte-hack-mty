# Checklist previa a demo

Se corre completa **antes de cada ensayo** y antes del pitch. Quien la corre anota hora
y resultado al final. Si algo falla y no se arregla en 10 minutos, se registra en
`docs/issues/` y se decide si la demo lo rodea.

## Entorno

- [ ] La máquina de presentación tiene el repo en `main`, último commit.
- [ ] `pnpm install` corre limpio (sin red, si es posible: `node_modules` ya presente).
- [ ] Variables de entorno cargadas (`.env` presente, API key válida, con crédito).
- [ ] `pnpm dev` levanta todo y los dos `/health` responden (web `/api/health`, mcp `/health`).
- [ ] **`pnpm reiniciar-estado`**: el estado mutable vuelve al punto de partida. Sin
      esto, Beto llega a la demo con el plan ya aplicado de la corrida anterior.
- [ ] Si hay Python: proceso arriba, pesos en disco, `/health` responde. Si no
      responde, el mock toma el control **sin tocar nada**.

## Funcional

- [ ] Cada paso del guion se ejecutó completo, en orden, con los mismos prompts.
- [ ] Cada interfaz generada renderiza sin error de consola.
- [ ] La conversación completa cabe en 3 minutos con margen.
- [ ] Un prompt fuera de guion no rompe nada (el agente responde algo razonable).

## Versión publicada (respaldo y prueba de que es real)

No sustituye a la demo local, pero si la máquina falla, esto salva el pitch.

- [ ] https://maya.157.173.204.174.sslip.io abre y `/api/health` responde.
- [ ] https://maya-mcp.157.173.204.174.sslip.io/health responde.
- [ ] Un cliente MCP externo lista las tools contra `…/mcp` con el `MCP_TOKEN`
      (está en `/opt/reto/.env` del VPS). Es lo que se le ofrece a un juez que
      quiera conectarse.
- [ ] El último workflow de GitHub está en verde
      (`gh run list --repo Ghekkin/Reto-Banorte-hack-mty --limit 1`). Si está en rojo,
      lo publicado es la versión anterior: averiguar cuál antes de enseñarla.

## Plan B

- [ ] La etiqueta `estable` apunta a un commit que arranca: `git checkout estable` y probar.
- [ ] Grabación de la demo en el escritorio, probada que abre y suena.
- [ ] Prompts del guion copiados en un archivo de texto para pegar rápido.

## Registro de corridas

| Hora | Quién | Resultado | Notas |
|---|---|---|---|
