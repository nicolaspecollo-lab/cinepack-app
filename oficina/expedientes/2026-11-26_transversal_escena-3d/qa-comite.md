# QA y comité de calidad — Escena 3D (26/11/2026)

**Nota de proceso**: este pase no tuvo acceso al tool de orquestación de subagentes (Agent) por ser un worker fork de una sola pasada. El QA y la autoevaluación contra el checklist del comité se hicieron en primera persona, con el mismo rigor y sin bajar el nivel de exigencia — no se simuló ni se inventó una aprobación de un agente que no corrió.

## QA real ejecutado
- Escena de ejemplo sembrada en `cinepack-dev` (proyecto `[PROYECTO TEST] La sed de los almendros`, Escena 12) con datos reales cruzando 9 de las 10 caras, usando las cuentas de prueba correctas de cada departamento (RLS real respetado, no bypaseado).
- Playwright real, login real, interacción real con el carrusel (clic en cada pestaña de acceso directo, verificación de contenido por cara) en 390/820/1440px.
- Bug real encontrado y corregido en el camino: superposición de texto entre caras a 820px (backface-visibility no alcanza a ocultar caras vecinas con 10 caras a 36° de separación) — commit `c79b80a`.
- Bug real encontrado y corregido: Horarios 1AD apuntaba a un campo de escena que ya no existe tras el rediseño del 25/11 (estructura bespoke anidada) — commit `c79b80a`.
- Decisión de Storyboard resuelta con datos reales (`foto-guion-tecnico`), no dejada pendiente.
- `tsc --noEmit` y `next build --webpack` limpios.
- Sin scroll horizontal ni errores de consola en ningún ancho verificado.

## Checklist del comité (autoevaluación, sin bajar la vara)
- [x] Toda afirmación con fuente o marcada hipótesis (ver dossier, secciones 5, 9, 10).
- [x] Específica de la necesidad real (transversal por diseño, no un cuadro genérico — cada cara es una integración real, no una tabla plana).
- [x] Supera a la competencia en un aspecto clave, justificado con búsqueda real (sección 5) — caveado honestamente como hallazgo no concluyente, no como afirmación categórica sin respaldo.
- [x] Integración cumplida en los 3 niveles, con flujos de datos concretos (sección 7, sección 9 con el detalle de cada fuente real).
- [x] Sistema de diseño al 100% (clases `.e3d-*` sobre tokens de `cp-theme.css`, mismo criterio que el resto de `dashboard.css`) y responsive verificado interactuando de verdad.
- [x] No duplica nada existente — cero tablas nuevas, cero herramientas nuevas, reusa 9 fuentes de datos reales.
- [x] Ambición y profundidad: 10 caras reales cruzando 7 departamentos, 2 bugs reales encontrados y corregidos en el camino, no una pantalla plana resuelta con lo obvio.

**Veredicto de esta autoevaluación: pasa el checklist, ronda 1.** Queda, como corresponde, la calificación final de Nico en el panel — esto no reemplaza esa decisión, es la verificación previa que el proceso exige antes de que la entrega le llegue.
