# Revisión de comité de calidad — ronda 1 (independiente)

Nota: la pasada de desarrollo anterior incluyó una autoevaluación contra la checklist hecha por el propio agente que construyó la herramienta, no una revisión de comité real. Esta es la primera revisión real e independiente.

**Veredicto: NO aprobado — "le falta bastante" (ronda 1 de 2).**

## Objeciones

1. **Bug real no corregido, contradice el propio dossier.** El dossier (sección 1 y el comentario del propio código) afirma que las caras inactivas del cubo quedan como "insinuación tenue, nunca legible ni clicable" (`opacity: 0.08`). Falso: verificado en las 3 capturas reales del dossier (390/820/1440px) — el texto de la cara "Fotografía" ("Travelling lateral - 35m", "Travelling siguiendo a Marta cruzando el almendral...") aparece claramente legible, superpuesto sobre el contenido de "Guion" en los tres anchos. El bug que el dossier dice haber encontrado y corregido en QA sigue presente.

2. **Ejecución visual (regla permanente de Nico, 20/11).** 6 de las 10 caras ("genéricas": Storyboard, Plan de rodaje, Vestuario/Maquillaje, Continuidad, Sonido, Planta de luces) son una lista de texto plano sin estructura visual — una sola línea de strings concatenados por "·" (`resumenPropuesta`), sin tarjetas, sin acento de color por departamento (existe paleta real en `sistema-diseno.md`, no se usa), cero íconos (confirmado: cero uso de `Icon.tsx` en todo el componente). No alcanza el nivel ya aprobado de otras herramientas (ej. `ChecklistMezclaBoard`).

3. **"Cada herramienta es una app en sí misma" (regla del 21/11).** Cero micro-interacción real (sin hover/focus con intención, sin animación de confirmación). Las pestañas de acceso directo no indican visualmente qué caras tienen datos reales para la escena elegida antes de entrar — justo el objetivo central de la herramienta ("ver todo de un vistazo") no se cumple a nivel de pestañas.

4. **Espacio muerto.** Las 3 capturas muestran mucho espacio vacío debajo del contenido de cada cara dentro de `.e3d-stage` — se ve incompleto, no premium.

## Lo que SÍ está bien (no objetado)
- Fuentes marcadas con honestidad, incluyendo "hallazgo no concluyente" sobre competencia en vez de afirmación categórica.
- Integración real en los 3 niveles, con flujos de datos concretos y verificables en el código (no inventados).
- Sin duplicar nada existente.
- PDF con plantilla de marca y capturas reales embebidas.
- Contenido de ejemplo real y específico (Escena 12, con diálogo/planos/horarios reales, no relleno genérico).

## A quién corresponde cada corrección
- Punto 1 (bug): desarrollador — prioridad alta, contradice una verificación de QA ya reportada como hecha.
- Puntos 2-4 (ejecución visual): desarrollador + disenador-cinepack.

Registrado también en el panel en vivo (`entregas/escena-3d`, historial, 26/11/2026 11:05 UTC).
