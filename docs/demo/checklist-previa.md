# Checklist previa a demo

Se corre completa **antes de cada ensayo** y antes del pitch. Quien la corre anota hora
y resultado al final. Si algo falla y no se arregla en 10 minutos, se registra en
`docs/issues/` y se decide si la demo lo rodea.

## Entorno

- [ ] La máquina de presentación tiene el repo en `main`, último commit.
- [ ] `pnpm install` corre limpio (sin red, si es posible: `node_modules` ya presente).
- [ ] Variables de entorno cargadas (`.env` presente, API key válida, con crédito).
- [ ] Script único de arranque levanta todo y `/health` de cada servicio responde.
- [ ] Si hay Python: proceso arriba, pesos en disco, `/health` responde. Si no
      responde, el mock toma el control **sin tocar nada**.

## Funcional

- [ ] Cada paso del guion se ejecutó completo, en orden, con los mismos prompts.
- [ ] Cada interfaz generada renderiza sin error de consola.
- [ ] La conversación completa cabe en 3 minutos con margen.
- [ ] Un prompt fuera de guion no rompe nada (el agente responde algo razonable).

## Plan B

- [ ] La etiqueta `estable` apunta a un commit que arranca: `git checkout estable` y probar.
- [ ] Grabación de la demo en el escritorio, probada que abre y suena.
- [ ] Prompts del guion copiados en un archivo de texto para pegar rápido.

## Registro de corridas

| Hora | Quién | Resultado | Notas |
|---|---|---|---|
