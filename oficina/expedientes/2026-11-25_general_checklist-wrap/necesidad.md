# Necesidad — Checklist de wrap (`gen-checklist-wrap`)

Hecho directamente por el desarrollador (sin investigador/arquitecto disponibles hoy), a partir de `oficina/inventario.md` y `oficina/backlog.md` — sin inventar datos nuevos, solo lo que ya describe el expediente.

## Por qué existe
Es la única herramienta **General** (scope "Cualquier integrante") todavía Vacía (`oficina/inventario.md`, sección 17). Transversal: se usa al cierre de cada jornada/del rodaje, por cualquier cargo, no por un departamento específico.

## El problema real
El wrap de rodaje tiene puntos comunes a todos los departamentos (devolver equipo propio, dejar el set/locación en condiciones — crítico si hay compromiso de restauración con el propietario, reportar incidencias del día, entregar material a Producción: tarjetas/archivos/partes, firma de responsable) pero **cada departamento tiene su propio detalle** — el wrap de Fotografía (tarjetas, baterías, ópticas) no se parece al de Arte (attrezzo, decorado, inventario de alquiler). Un checklist único y genérico no sirve para ninguno de los dos; 50 herramientas separadas tampoco es sostenible.

## Decisión de modelo
Una fila por departamento+jornada, con una lista de ítems (categorizados en Equipo / Espacio / Documentación) que se precarga distinto según el departamento al crear la fila — mismo mecanismo ya usado en `post-checklist-mezcla` (QC_SUGERIDOS por formato), aplicado acá a ítems por departamento. Así el modelo de datos es uno solo (una tabla, columnas tipadas) pero el contenido real diverge por fila.

## Integración (nivel alto, detalle en el dossier completo cuando haya arquitecto disponible)
- Con Producción: cada fila expone un estado agregado "Set liberado"/"Pendiente" — Producción es quien necesita ver de un vistazo qué departamentos ya cerraron, sin entrar a cada detalle.
- Con el propio departamento: la fila de wrap es la misma tabla para todos los cargos del depto (igual que cualquier herramienta de departamento vía `deptTools()`).
- Riesgo abierto (no resuelto hoy, dejar para el arquitecto): si además hace falta una fila "consolidada" de Producción que agregue todas las de los departamentos del día, o si alcanza con leer la tabla filtrando por `fecha`.
