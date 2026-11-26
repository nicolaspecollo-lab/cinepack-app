# Escena 3D — avance día 2 (26/11/2026, continuación tras arquitectura)

## Decisiones de Nico aplicadas (diálogo directo, 26/11)
1. Storyboard: se filtra por escena como las demás caras (no instancia aparte) — **aún no implementado** (ver pendientes).
2. Guion técnico + Fotografía: fusionadas en UNA cara "Fotografía", mostrando `tipo` (encuadre) y `mov_camara` (movimiento). **Hallazgo importante**: la tabla `planos` YA tenía ambos campos completos con terminología real de la industria (`tipo`: PG/PA/PE/PM/PMC/PP/PPP/DET/PC/INSERT; `mov_camara`: Fijo/Panorámica H/V/Travelling in-out-lateral/Steadicam/Handheld/Grúa/Drone/Zoom in-out) — no hizo falta agregar ningún campo nuevo, contrario a lo que se asumió al pedir el cambio. Se documenta para que quede claro que no se inventó ni se dejó de construir nada.
3. Sonido: confirmado con campo `escena` real en `son-plan-directo` — implementado.
4. Planta de luces agregada como 10ª cara, usando `luz-plan-iluminacion` ("Plan de iluminación por escena (Gaffer)"), que YA tenía campo `escena` — sin trabajo de modelo de datos nuevo.

## Qué se construyó (real, verificado)
- `app/hoy/Escena3DPanel.tsx` (nuevo): carrusel 3D en CSS puro (`transform-style: preserve-3d`, sin librerías ni WebGL), selector de escena arriba, pestañas de acceso directo por las 10 caras, navegación con flechas, y un cálculo de duración de giro proporcional a la distancia angular (acceso directo lejano gira más rápido/más vueltas visuales en vez de teletransportarse — pedido explícito de Nico).
- Conectado en `app/hoy/GeneralesPanel.tsx`, reemplazando el placeholder plano (`EscenasPanel`) que ya ocupaba la sub-pestaña "Escena 3D" — ese placeholder queda eliminado de esta ruta (sigue existiendo el archivo `EscenasPanel.tsx` por si se usa en otro lado, no se tocó).
- CSS agregado a `dashboard.css` (`.e3d-*`), mobile-first (stage más alto en <640px, pestañas de acceso directo con scroll horizontal).
- 7 de las 10 caras con fuente de datos 100% real y ya cableada: Guion, Fotografía (fusionada), Plan de rodaje, Horarios 1AD, Reparto, Vestuario/Maquillaje, Continuidad, Sonido, Planta de luces — es decir, **9 de 10** (todas salvo Storyboard).
- `tsc --noEmit`: limpio. `next build --webpack`: limpio, sin romper ninguna ruta existente.
- QA en vivo (Playwright, cuenta `qa.general-callsheet4@mailinator.com`, proyecto de prueba "La sed de los almendros"): la pestaña "Escena 3D" aparece correctamente dentro de Generales, sin errores de consola ni de página. El proyecto de prueba **no tiene filas en la tabla `escenas` todavía** (nadie subió/confirmó un guion vía el flujo de Guion en este proyecto), así que se vio el estado vacío correcto ("Sin escenas todavía") en vez del cubo con datos reales — **no se pudo verificar visualmente la rotación del cubo con contenido real** en esta pasada.

## Pendiente real (no fingido)
1. **Storyboard**: sigue sin filtrar por escena — hoy muestra un mensaje explícito de "pendiente", no un dato falso. Falta decidir con el departamento de Dirección/Arte si el storyboard existente puede reusar el mismo campo `escena` que el resto, o si necesita trabajo de modelo de datos propio.
2. **Verificación visual real del giro con datos**: hace falta sembrar (o que QA suba) un guion real con escenas confirmadas en el proyecto de prueba para ver el cubo girando con contenido de verdad en las 9 caras ya cableadas, no solo el estado vacío.
3. **QA responsive completo** (390/820/1440px, interacción real con el carrusel, no solo la carga de la pestaña) — todavía no se hizo, solo se verificó carga sin errores en 1440px.
4. **Comité de calidad**: todavía no pasó por esta revisión — no se le puede entregar a Nico como "Cumple"/"Supera" sin este paso.
5. **Dossier.md de 11 secciones + dossier.pdf**: no se generaron en esta pasada — falta investigación de competencia (sección 5, "Estado del arte") y el resto de las secciones del formato estándar.
6. **Rama**: cambios commiteados en `oficina/2026-11-26-escena-3d`, NO hay PR abierto todavía — es prematuro sin pasar por QA real + comité.

## Conclusión honesta
Este expediente sigue en construcción, no entregado. Lo que avanzó hoy: el componente del carrusel 3D existe, compila, no rompe nada, y 9 de las 10 caras tienen datos reales cableados (comprobado por código, no solo supuesto) — pero falta sembrar datos de prueba para verlo girar con contenido real, falta QA responsive completo, falta comité, y falta el dossier. No se infla el estado de avance para parecer más cerca de entregable de lo que está.
