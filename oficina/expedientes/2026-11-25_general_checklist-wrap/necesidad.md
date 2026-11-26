# Necesidad — Checklist de wrap (`gen-checklist-wrap`)

Hecho directamente por el desarrollador (sin investigador/arquitecto disponibles hoy), a partir de `oficina/inventario.md` y `oficina/backlog.md` — sin inventar datos nuevos, solo lo que ya describe el expediente.

## Por qué existe
Es la única herramienta **General** (scope "Cualquier integrante") todavía Vacía (`oficina/inventario.md`, sección 17). Transversal: se usa al cierre de cada jornada/del rodaje, por cualquier cargo, no por un departamento específico.

## El problema real
El wrap de rodaje tiene puntos comunes a todos los departamentos (devolver equipo propio, dejar el set/locación en condiciones — crítico si hay compromiso de restauración con el propietario, reportar incidencias del día, entregar material a Producción: tarjetas/archivos/partes, firma de responsable) pero **cada departamento tiene su propio detalle** — el wrap de Fotografía (tarjetas, baterías, ópticas) no se parece al de Arte (attrezzo, decorado, inventario de alquiler). Un checklist único y genérico no sirve para ninguno de los dos; 50 herramientas separadas tampoco es sostenible.

## Decisión de modelo
Una fila por departamento+jornada, con una lista de ítems (categorizados en Equipo / Espacio / Documentación) que se precarga distinto según el departamento al crear la fila — mismo mecanismo ya usado en `post-checklist-mezcla` (QC_SUGERIDOS por formato), aplicado acá a ítems por departamento. Así el modelo de datos es uno solo (una tabla, columnas tipadas) pero el contenido real diverge por fila.

## Patrón de panel a medida elegido (3 evaluados, documentado también como comentario en el código)
1. Tabla plana con columnas fijas — descartado: cada departamento tiene ítems distintos, y no son columnas, son filas de una sub-lista variable.
2. Línea de tiempo del día — descartado: el wrap no tiene un orden temporal entre departamentos, cada uno cierra en paralelo al final de la jornada.
3. **Tarjetas por departamento con checklist categorizado interno + badge de progreso y "Set liberado" — elegido.** Es cómo lo vive Producción en la práctica: un vistazo a qué departamentos ya liberaron el set, y el detalle categorizado (Equipo/Espacio/Documentación) solo importa cuando hay que corregir algo puntual.

## Integración (nivel alto, pendiente de que un arquitecto disponible la certifique en detalle)
- Con Producción: cada fila expone un estado agregado "Pendiente/En curso/Set liberado" — Producción necesita ver de un vistazo qué departamentos ya cerraron sin entrar al detalle de cada uno.
- Con el propio departamento: la fila de wrap es la misma tabla para todos los cargos del depto (igual que cualquier herramienta de departamento vía `deptTools()`), ya que `GENERAL_CHECKLIST_WRAP` es de scope "Cualquier integrante".
- Riesgo abierto (no resuelto hoy, dejar para el arquitecto): si además hace falta una vista consolidada de Producción que agregue las filas de todos los departamentos de una misma jornada, o si alcanza con filtrar la tabla por `fecha`.
