# Necesidad real — Instrucciones de figuración por jornada (Figuración / Reparto)

Expediente vacío confirmado en `oficina/inventario.md` (`rep-instrucciones-figuracion`, `checklist` sin `hint`, sin contenido). Sin agente de investigación/arquitectura disponible en esta pasada; necesidad levantada directamente por el desarrollador contra el inventario y el backlog, sin inventar datos nuevos sobre el cargo.

## El cargo, el día de rodaje
El coordinador/responsable de Figuración no gestiona el casting ni la cantidad de figurantes por escena — eso ya lo cubre, en este mismo repo, "Listado de figuración/extras por escena" (`dir-plan-extras`/`dir-figuracion-escena`, 2ª Asistencia de Dirección, **Consolidada**): cuántos, qué perfil, convocatoria. La necesidad real de Figuración empieza DESPUÉS de esa convocatoria: una vez que los grupos ya están citados, alguien tiene que decirles, grupo por grupo, **qué hacer en plató** — vestuario y attrezzo exactos, dónde se colocan y cómo se bloquean en la escena, qué se mueven y cuándo, punto de reunión y hora de citación propios de Figuración (no la citación general del callsheet), y confirmar que cada grupo recibió y entendió esas instrucciones antes de rodar. Caso real usado como referencia (mencionado en varios QA de este proyecto): la escena de asamblea con ~25 figurantes, donde no todos reciben la misma instrucción (destacados de primera fila vs. fondo vs. guardias).

## Por qué no es "Listado de figuración/extras" de nuevo
Son necesidades distintas del mismo evento de rodaje: una (`dir-figuracion-escena`) resuelve "cuántos necesito y los convoco", la otra (esta) resuelve "ya los tengo, qué les digo exactamente". Distinto cargo (Figuración vs. 2ª Asistencia de Dirección), distinto momento (antes de la jornada vs. en plató), y distinto contenido (perfil/cantidad vs. vestuario/posición/movimiento/confirmación). Se construyó un patrón visual deliberadamente distinto al de `PlanFiguracion` (números hero por escena) para no repetir el error ya señalado en `dir-actas` ("está igual al diseño de otra herramienta").

## Patrones de interacción evaluados (3, antes de elegir)
1. **Tabla/grilla genérica de celdas** — descartada de entrada, regla endurecida de Nico 25/11 sin excepciones salvo contenido estrictamente tabular (no es el caso: hay texto instructivo largo, foto de referencia y agrupación real por jornada).
2. **Línea de tiempo/Gantt de citaciones** — evaluada y descartada: los grupos de una jornada no se solapan ni compiten por un recurso compartido de forma que una línea de tiempo aporte claridad real (a diferencia de `ControlHorarios1ADPanel`, que sí necesita Gantt por presencia real). Habría sido forzar un patrón ya usado para un problema distinto.
3. **Bandeja de tarjetas por grupo, agrupadas por jornada, colapsadas con detalle al abrir (elegida)** — es como el coordinador usa esto de verdad: escanea rápido el estado de todos los grupos de la jornada (badge de estado, hora de citación, progreso de confirmación) y abre solo el grupo que necesita instruir o verificar en ese momento. Mobile-first real: en el set, esto se consulta desde el móvil, no desde un escritorio.

## Contenido precargado (no inventado sobre el cargo, datos de ejemplo del proyecto de prueba)
1 jornada con 3 grupos de la escena de asamblea (fila central, primera fila de reacciones, guardias de fondo) + 1 grupo de una segunda jornada (mercado), cada uno con vestuario, posición/bloqueo, movimiento y estado distintos — para que la variedad real del cargo (no todos los grupos son iguales ni están en el mismo estado) se vea desde el primer vistazo, no un caso pelado.

## Qué falta (para arquitecto-integración / QA, próxima ronda)
- Integración real con `dir-figuracion-escena` (traer automáticamente el número de figurantes convocados por escena, en vez de digitarlo de nuevo) — hoy campos independientes, documentado como pendiente.
- Confirmación de recepción hoy es un contador manual (`confirmados`/`num_figurantes`); si el arquitecto define un futuro checklist nominal por figurante, migrar sin perder los datos de grupo ya cargados.
