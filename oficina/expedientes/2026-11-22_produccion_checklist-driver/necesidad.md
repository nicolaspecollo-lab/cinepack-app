# Necesidad — Checklist de vehículos, combustible y mantenimiento (Driver)

**Cargo:** Driver (departamento Producción)
**Herramienta:** `prod-checklist-vehiculos` — "Checklist de vehículos, combustible y mantenimiento"
**Clasificación actual:** Circunstancial (hint real, sin estructura de datos propia)

## Estado real verificado en app/herramientas.ts

```ts
{ id: "prod-checklist-vehiculos", nombre: "Checklist de vehículos, combustible y mantenimiento", tipo: "checklist" },
```

Confirmado: es un `checklist` sin `columnas` y sin siquiera `hint`. No tiene ninguna estructura de datos propia — es una lista de ítems booleanos genérica sin identidad de vehículo, sin fecha, sin kilometraje. No permite llevar un registro por vehículo ni en el tiempo.

## Relación con otras herramientas de Producción (para no duplicar)

- **Control de transporte y vehículos** (`prod-transporte`, Consolidada, departamento Logística/Jefatura de producción): registra **viajes** — fecha, vehículo/matrícula, conductor, pasajeros, origen, destino, horas, estado (Programado/En ruta/Llegó/Cancelado). Es un *trip sheet* por jornada, NO un registro de estado mecánico/mantenimiento del vehículo. No hay solapamiento de campos si el checklist de Driver se centra en estado del vehículo, no en el viaje.
- **Parte de producción diario** (`prod-parte-diario`, Consolidada): registra incidencias generales del día de rodaje, no detalle de mantenimiento vehicular.
- Por lo tanto la terminología de vehículo/matrícula ya usada en `prod-transporte` (`vehiculo` → "Vehículo / Matrícula") debe reutilizarse igual en esta herramienta para coherencia.

## Necesidad real del cargo Driver

El Driver necesita un **registro por vehículo y por fecha de revisión**, no un checklist booleano genérico de "sí/no". Lo que un Driver controla realmente al cierre de cada jornada o en cada revisión:

- Qué vehículo es (identificación/matrícula, coherente con `prod-transporte`).
- Cuándo fue la última revisión/ITV y cuándo toca la próxima (para anticipar vencimientos).
- Kilometraje actual (para planificar mantenimiento por uso).
- Nivel de combustible al cierre de jornada (para que el vehículo salga con depósito adecuado al día siguiente).
- Incidencias detectadas (ruidos, luces, frenos, daños) — en texto libre, no solo un check.
- Estado general / disponibilidad del vehículo (operativo, en taller, fuera de servicio).

## Propuesta de columnas (tipo `tabla`, una fila por vehículo y fecha de revisión)

| key | label | tipo |
|---|---|---|
| `fecha` | Fecha de revisión | fecha |
| `vehiculo` | Vehículo / Matrícula | texto |
| `kilometraje` | Kilometraje actual | num |
| `combustible` | Nivel de combustible al cierre | estado (opciones: Lleno, 3/4, 1/2, 1/4, Vacío) |
| `ultima_itv` | Fecha última ITV/revisión técnica | fecha |
| `proxima_revision` | Próxima revisión programada | fecha |
| `incidencias` | Incidencias / averías detectadas | largo |
| `estado` | Estado del vehículo | estado (opciones: Operativo, En taller, Fuera de servicio) |
| `responsable` | Driver responsable | texto |
| `foto` | Foto de incidencia/estado | archivo |

Esto reemplaza el checklist booleano genérico por una tabla con trazabilidad temporal por vehículo, atendiendo directamente la observación de QA (qa-prod-driver): "checklist con fecha de última revisión de cada vehículo, no solo un sí/no genérico".

## Entrega

- Para el **investigador**: validar terminología estándar de la industria para "trip sheet"/"vehicle log" de transportation captain/driver, y si existe convención sobre periodicidad de checklist (diario vs. por revisión) y campos obligatorios en checklists de flota de rodaje.
- Para el **arquitecto-integración**: diseñar el modelo de datos final (tipo `tabla` en lugar de `checklist`), decidir si `vehiculo` debe ser clave compartida/normalizada con `prod-transporte` para evitar inconsistencia de matrículas entre ambas herramientas, y definir si el id `prod-checklist-vehiculos` se mantiene o se renombra dado que deja de ser un checklist booleano.

---

Archivos leídos (rutas absolutas):
- /tmp/claude-0/cinepack-dev-ciclo-20261122/app/herramientas.ts (líneas 440-490 para `prod-transporte` y `parteDiario`; líneas 2800-2946 para los cargos de Producción: Jefatura de producción, Asistencia, Coordinación, Jefatura de locaciones, Scouting, Logística, Driver)

## Arquitectura

### Decisión sobre el id

Se mantiene `prod-checklist-vehiculos` como id de código, aunque deja de ser conceptualmente un checklist (pasa a `tipo: "tabla"`). Mismo razonamiento que para `dir-control-horarios`: el id es un slug interno no mostrado al usuario (el `nombre` sí cambia o se ajusta en los `messages/*.json` si se desea, p.ej. a "Registro de vehículos, combustible y mantenimiento"), no hay render específico en `app/hoy/` acoplado al nombre "checklist", y la herramienta está Circunstancial/sin filas reales todavía — renombrar el id no trae beneficio funcional y sí fuerza tocar `messages/es.json`, `messages/en.json`, `messages/ca.json` y la documentación de oficina sin necesidad real. Si el equipo de producto considera que el id debería reflejar semántica (`prod-registro-vehiculos`), es un cambio cosmético de bajo riesgo pero no indispensable — queda como alternativa documentada, no aplicada hoy.

### Modelo de datos final

`tipo: "tabla"` (cambia de `checklist`), columnas (tipos existentes de `ColTipo`, sin tipo nuevo):

| key | label | tipo |
|---|---|---|
| `fecha` | Fecha de revisión | fecha |
| `vehiculo` | Vehículo / Matrícula | texto |
| `kilometraje` | Kilometraje actual | num |
| `combustible` | Nivel de combustible al cierre | estado (opciones: Lleno, 3/4, 1/2, 1/4, Vacío) |
| `ultima_itv` | Fecha última ITV/revisión técnica | fecha |
| `proxima_revision` | Próxima revisión programada | fecha |
| `incidencias` | Incidencias / averías detectadas | largo |
| `estado` | Estado del vehículo | estado (opciones: Operativo, En taller, Fuera de servicio) |
| `responsable` | Driver responsable | texto |
| `foto` | Foto de incidencia/estado | archivo |

Se confirma la propuesta del agente de depto sin cambios.

### Clave `vehiculo`: coherencia con `prod-transporte`, sin normalización forzada

El agente de depto preguntó si `vehiculo` debe ser clave compartida/normalizada con `prod-transporte` (columna `vehiculo` → "Vehículo / Matrícula" en ambas). Decisión: **mismo label y mismo tipo (`texto`) por convención de nomenclatura, pero NO una clave foránea real ni una tabla de vehículos normalizada**. Motivo: el motor genérico `herramienta_filas` guarda cada fila como `datos jsonb` dentro de su propia herramienta (`herramienta_id` distinto para `prod-transporte` y `prod-checklist-vehiculos`); no hay mecanismo de clave foránea entre dos filas de `herramienta_filas` de herramientas distintas en el esquema actual (confirmado por inspección: las únicas integraciones cruzadas existentes, p.ej. `app/api/plan-financiacion/sincronizar-hito/route.ts`, lo hacen vía un endpoint de API ad-hoc que lee/escribe `datos` por `id` de fila, no vía FK de Postgres). Introducir una tabla `vehiculos` normalizada sí sería una migración nueva — se descarta para hoy porque el alcance pedido es "no crear migración salvo que de verdad no haya otra forma", y escribir la misma matrícula como texto libre en ambas tablas es suficiente para el volumen real de un rodaje (flota pequeña, consistencia manual aceptable). Riesgo documentado: inconsistencia de texto libre (ej. "Furgo 1" vs "Furgoneta 1") si dos personas distintas tipean distinto — mitigable a futuro con un `chips`/`estado` con opciones precargadas desde los vehículos ya usados en `prod-transporte`, pero eso requeriría lectura cruzada en el cliente (factible sin migración, se deja como mejora de UI para otro ciclo, no bloqueante).

### Nivel 1 — con el propio departamento (Producción)
- **`prod-transporte`** (departamento, Consolidada): registra viajes (trip sheet) por jornada — `fecha`, `vehiculo`, `conductor`, `pasajeros`, `origen`, `destino`, horas. `prod-checklist-vehiculos` registra estado mecánico/mantenimiento por vehículo y fecha de revisión. No se solapan en propósito; comparten solo la convención de nombre de columna `vehiculo` (ver arriba), sin lectura/escritura cruzada automática.
- **Parte de producción diario** (departamento, Consolidada): incidencias generales de la jornada — no se toca; una avería grave detectada en `prod-checklist-vehiculos` (`incidencias`, `estado = Fuera de servicio`) podría ameritar que el Driver también la reporte ahí, pero es un paso manual del usuario, no una sincronización automática (no se construye hoy).

### Nivel 2 — con el proyecto en su conjunto
- No escribe en `GENERAL_PLAN_RODAJE`/`GENERAL_ORDEN_RODAJE`/`GENERAL_CALENDARIO`. Es intencional: es un registro de mantenimiento de flota, no un dato de planificación del rodaje. Si un vehículo queda `Fuera de servicio` y eso afecta el plan de transporte del día, es Logística/Jefatura de producción quien debe actuar manualmente sobre `prod-transporte` o el plan de rodaje — no hay puente automático propuesto hoy (pregunta abierta para un ciclo futuro si el departamento lo pide).

### Nivel 3 — con otros departamentos
- **Jefatura de producción / Logística** (cargos del mismo departamento, no "otro departamento" estrictamente, pero con necesidad de visibilidad cross-cargo): deberían poder **ver** esta tabla para anticipar vencimientos de ITV o vehículos fuera de servicio antes de planificar transporte. Se resuelve igual que en `prod-tareas-admin`: entrada en `herramienta_asignaciones` con nivel "ver" para esos cargos, administrada por el jefe de depto desde el panel de Control — no requiere cambio de RLS nuevo, el mecanismo ya existe.
- Ningún departamento fuera de Producción necesita ver esta tabla de forma estructural.

### Permisos
- **Edita**: Driver (RLS base de `herramienta_filas` por departamento/cargo).
- **Ve, no edita**: Jefatura de producción / Logística, vía `herramienta_asignaciones` (nivel "ver"), igual patrón que `prod-tareas-admin`.
- **Espacio**: 100% común del proyecto (no hay campo privado de cargo — el estado del vehículo debe ser visible a quien decide si sale a rodar).

### Librerías
Sin necesidad de librería externa — tabla estándar del motor genérico, misma base que `prod-transporte` (incluye columna `archivo` para `foto`, tipo ya soportado por el motor de subida de archivos existente en otras herramientas — no se verificó en esta sesión qué componente de subida usan hoy columnas `archivo` ya consolidadas; si el desarrollador no encuentra un componente reutilizable, es una pregunta abierta a resolver antes de implementar, no asumida resuelta aquí).

## Investigación

### Terminología estándar de la industria

El rol que coordina la flota de un rodaje se llama en inglés "Transportation Captain" (o Transportation Coordinator), que lidera un equipo de transportation managers y drivers, gestiona recogidas de reparto y movimientos de tráilers, y despliega vehículos/conductores en los momentos adecuados para mantener el rodaje en calendario y presupuesto (Broadway Stages, "Industry Jobs | Transportation Captain", consultado 22/11/2026: https://www.broadway-stages.com/news/2021/11/30/industry-jobs-what-is-a-transportation-captain; Broadway Stages, "Driving Production Forward: The Role of a Transportation Captain in Film and TV", consultado 22/11/2026: https://www.broadway-stages.com/newsletter-articles-uploads/2025/6/12/47nmzdbi50azn3lavyp10bxnkush6v). No se encontró, sin embargo, un término único y estandarizado para el documento de registro de estado del vehículo (lo que en el expediente se llama "checklist de vehículos") — lo más cercano documentado es el "Record of Duty Status" (RODS)/log diario del conductor, que en EE.UU. es un registro de horas de conducción (de/fuera de servicio), no un registro de estado mecánico/combustible del vehículo (CSATF, "LMS HOS FAQ", consultado 22/11/2026: https://csatf.org/LMS_hos_faq; FMCSA, exención de registro electrónico de horas de servicio para producción cinematográfica, consultado 22/11/2026: https://www.fmcsa.dot.gov/newsroom/hours-service-drivers-application-exemption-motion-picture). No se encontró un término o plantilla estándar publicado para "vehicle log"/"trip sheet" de mantenimiento/combustible específico de producción audiovisual, por lo que las columnas propuestas en el expediente (kilometraje, combustible, ITV, incidencias) son razonables por analogía con registros de flota genéricos, pero **no están respaldadas por una plantilla sectorial publicada** — se marca como hipótesis de diseño, no como estándar confirmado.

### Competencia

No se encontró documentación de StudioBinder, Yamdu, Movie Magic, SetHero o Celtx que ofrezca una herramienta específica de checklist/registro de estado de vehículo (combustible, kilometraje, mantenimiento, ITV) para el cargo de Driver o Transportation Captain — las búsquedas no devolvieron ningún resultado relacionado con "vehicle log" o "fleet maintenance" en ninguno de estos productos. Se marca como hueco de mercado no cubierto por ninguno de los competidores nombrados, dentro de lo verificable por fuente abierta.

### Normativa española aplicable (ITV)

La inspección técnica de vehículos en España se rige por el Real Decreto 920/2017, que transpone la Directiva 2014/45/UE sobre inspecciones técnicas periódicas de vehículos de motor y remolques, y deroga el régimen anterior de los Reales Decretos 2042/1994 y 224/2008 (BOE-A-2017-12841, consultado 22/11/2026: https://www.boe.es/boe/dias/2017/11/08/pdfs/BOE-A-2017-12841.pdf; portal Administración.gob.es, consultado 22/11/2026: https://administracion.gob.es/pag_Home/gl/Tu-espacio-europeo/derechos-obligaciones/ciudadanos/vehiculos/itv.html). Según un análisis de Fundación Mapfre sobre el cambio normativo, los vehículos destinados a alquiler (con o sin conductor) — relevante porque muchas productoras alquilan furgonetas/vehículos para rodaje — equiparan hoy su periodicidad de ITV a la de los vehículos de su misma categoría, sin un régimen propio diferenciado por el hecho de ser de alquiler, a diferencia del régimen anterior de 1994 que sí fijaba plazos específicos para vehículos de alquiler de hasta nueve plazas (Fundación Mapfre, consultado 22/11/2026: https://documentacion.fundacionmapfre.org/documentacion/en/media/group/1097693.do). No se localizó en esta búsqueda el anexo concreto del RD 920/2017 con la tabla de periodicidades vigente por categoría de vehículo — para los plazos exactos aplicables a una furgoneta de producción habría que consultar directamente ese anexo en el BOE. La gestión de las estaciones ITV depende de cada Comunidad Autónoma. Implicación de diseño: el campo `proxima_revision` de la propuesta debe calcularse o registrarse según la categoría del vehículo, no con una periodicidad fija universal.

No se encontró normativa española específica de PRL que regule checklists de mantenimiento de vehículos de rodaje más allá de la normativa general de seguridad vial y de empresa (uso de vehículos de empresa), por lo que no se incluye una afirmación sobre PRL salvo esta constatación de ausencia de fuente específica.

### Fuentes
- Broadway Stages, "Industry Jobs | Transportation Captain" — https://www.broadway-stages.com/news/2021/11/30/industry-jobs-what-is-a-transportation-captain (consultado 22/11/2026)
- Broadway Stages, "Driving Production Forward: The Role of a Transportation Captain in Film and TV" — https://www.broadway-stages.com/newsletter-articles-uploads/2025/6/12/47nmzdbi50azn3lavyp10bxnkush6v (consultado 22/11/2026)
- CSATF, "LMS HOS FAQ" — https://csatf.org/LMS_hos_faq (consultado 22/11/2026)
- FMCSA, exención de ELD para producción cinematográfica — https://www.fmcsa.dot.gov/newsroom/hours-service-drivers-application-exemption-motion-picture (consultado 22/11/2026)
- BOE, Real Decreto 920/2017 (ITV) — https://www.boe.es/boe/dias/2017/11/08/pdfs/BOE-A-2017-12841.pdf (consultado 22/11/2026)
- Administración.gob.es, ficha ITV — https://administracion.gob.es/pag_Home/gl/Tu-espacio-europeo/derechos-obligaciones/ciudadanos/vehiculos/itv.html (consultado 22/11/2026)
- Fundación Mapfre, análisis sobre periodicidad ITV vehículos de alquiler — https://documentacion.fundacionmapfre.org/documentacion/en/media/group/1097693.do (consultado 22/11/2026)

## QA

**Fecha:** 22/11/2026. Verificado contra `cinepack-dev` real (`npm run dev -- -p 3501`, `NODE_USE_ENV_PROXY=1`), cuenta `qa.prod-driver2@mailinator.com`, proyecto `[PROYECTO TEST] La sed de los almendros`, Playwright con Chromium real (sin mockups).

**Perfil:** ya estaba completo (full_name "QA Driver", departamento "Producción", cargo "Driver", país/provincia residencia y producción España/Madrid, `acepta_tratamiento_datos`) — no hizo falta self-update.

**Funcional:**
- Login real, navegación Exclusivas → "Checklist de vehículos, combustible y mantenimiento" (id `prod-checklist-vehiculos`). Confirmadas las 10 columnas exactamente como en el apartado de arquitectura: `fecha`, `vehiculo` (texto), `kilometraje` (num), `combustible` (estado), `ultima_itv` (fecha), `proxima_revision` (fecha), `incidencias` (largo), `estado` (estado), `responsable` (texto), `foto` (archivo).
- Fila 1: fecha de revisión, vehículo/matrícula, kilometraje (85430, columna numérica con total/suma en el pie de tabla funcionando — `Σ 85.430`), fecha última ITV, próxima revisión, incidencias en texto libre, responsable y **foto adjunta** (subida real de un archivo de imagen de prueba, confirmado con miniatura + nombre de archivo visible tras subir).
- Fila 2: segunda fila con otro vehículo, kilometraje distinto, responsable — caso con solo un subconjunto de columnas completado (campos vacíos no bloquean guardado).
- Texto, fecha, número y **foto (archivo)** persisten correctamente tras reload (re-navegando Exclusivas → la herramienta).

**BUG encontrado (mismo bug que en `dir-control-horarios`, ver su `necesidad.md` para el detalle técnico completo):** las columnas tipo **`estado`** (`combustible` y `estado` del vehículo) **no persisten** — confirmado directamente contra `herramienta_filas` en Supabase: el valor elegido en el dropdown queda ausente del JSON `datos` tras guardar, tanto si es la única columna `estado` tocada en la fila como si hay más de una. Esto confirma que el bug es del motor genérico de tabla (`HerramientaPanel.tsx`, línea ~2068, `CeldaConAutocomp` para `tipo === "estado"`), no de esta herramienta en particular ni de tener dos columnas del mismo tipo en una fila.
- Repro adicional confirmado aquí: en una fila **nueva**, sin ningún otro campo `estado` previamente guardado, seleccionar "En taller" en "Estado del vehículo" tampoco persiste — descarta que el bug dependa de colisión entre dos columnas `estado` de la misma fila; el guardado del propio selector nunca incluye su valor recién elegido.

**Responsive (los 3 anchos probados de verdad, interactuando):**
- **390px:** sin scroll horizontal de página confirmado por script (`scrollWidth === clientWidth === 390`); tabla con scroll interno propio (`.hp-table-wrap`, mismo patrón estándar). Usabilidad confirmada de punta a punta: se agregó una fila, se editó una celda de texto y luego se borró la fila de prueba, todo en este ancho sin problemas.
- **820px:** sin scroll horizontal de página.
- **1440px:** sin scroll horizontal de página.
- `qa_responsive_ok: true` para esta herramienta (el bug de persistencia de `estado` es funcional, no responsive).

**Capturas:** `oficina/expedientes/2026-11-22_produccion_checklist-driver/capturas/vehiculos_390px.png`, `vehiculos_820px.png`, `vehiculos_1440px.png`.

**Riesgos/preguntas abiertas para el comité:** mismo bloqueo que tenía `dir-control-horarios` — las columnas "Nivel de combustible" y "Estado del vehículo" no se podían usar en producción hasta corregir el bug de persistencia de columnas `estado` en el motor genérico.

**Reverificación post-fix (22/11/2026, commit `56fa4f8`):** corregido una sola vez en `HerramientaPanel.tsx` (mismo patrón `onSave` que la columna `fecha`, commit `4d0d5b0`). Verificado en vivo con Playwright contra `cinepack-dev` real (cuenta `qa.prod-driver2@mailinator.com`): se editaron `combustible` y `estado` del vehículo en la MISMA fila en sucesión rápida, reload + re-navegación a Exclusivas → la herramienta, y AMBAS columnas persisten correctamente. Fila de prueba limpiada después. `npx tsc --noEmit` y `npx next build --webpack` limpios tras el fix. **Corte ya no bloqueado por este motivo.**

## Decisión de agrupación (ronda 2)

**Columnas candidatas:** `vehiculo` o `estado`.

**Decisión: SÍ agrupar, por `vehiculo`.** Especificación: `agruparPor: "vehiculo"` en la definición de la herramienta `prod-checklist-vehiculos` en `app/herramientas.ts`.

Argumento: el caso de uso real del cargo (Driver/Transportation) es revisar el historial completo de mantenimiento/combustible de una misma unidad de la flota de un vistazo — por ejemplo antes de asignar una furgoneta a un trayecto, ver todas sus revisiones, ITV y última incidencia juntas, igual que "Checklist de mezcla y masterización" agrupa por fase de proceso. Con flota pequeña y filas que se acumulan por fecha, una tabla plana ordenada solo por fecha mezclaría las revisiones de distintas unidades, obligando a escanear toda la tabla para reconstruir el historial de un vehículo concreto. Se descarta `estado` como eje de agrupación: aunque "ver de un vistazo qué está Fuera de servicio/En taller" es una necesidad real, es una necesidad puntual de triage (pocos vehículos estarán fuera de servicio a la vez) mejor resuelta con un filtro/orden por `estado` o un indicador visual en la fila, no con agrupar toda la tabla por ese eje — agrupar por `estado` dispersaría el historial de una misma unidad entre varios grupos ("Operativo" en un bloque, "En taller" en otro) cada vez que cambia de estado, que es exactamente el problema que se busca evitar agrupando. `vehiculo` es el eje estable; `estado` cambia con cada revisión y no debe ser el criterio de agrupación.

**Tarea para el desarrollador:** agregar `agruparPor: "vehiculo"` a la definición de `prod-checklist-vehiculos` en `app/herramientas.ts` (mismo mecanismo declarativo ya usado por "Checklist de mezcla y masterización", sin lógica nueva en `HerramientaPanel.tsx`).
