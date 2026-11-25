# Necesidad — Tareas administrativas diarias (Asistencia de producción)

**Cargo real:** Asistencia de producción (departamento Producción, rodaje) — **no** "Producción ejecutiva" (Ejecutivo).

## Corrección de encuadre (hallazgo del agente depto-ejecutivo, confirmado en código)

`oficina/inventario.md` línea 36 etiqueta esta herramienta como del cargo "Producción ejecutiva", pero en `app/herramientas.ts` (línea ~2846) está bajo el departamento **Producción**, cargo **"Asistencia de producción"**:

```ts
"Asistencia de producción": {
  departamento: [parteDiario],
  cargo: [
    { id: "prod-tareas-admin", nombre: "Tareas administrativas diarias", tipo: "checklist" },
  ],
},
```

Es un error de etiquetado del inventario (confusión de nombres entre "Asistencia de producción" y "Producción ejecutiva", cargo del departamento Ejecutivo que ya tiene sus 6 herramientas propias Consolidadas — Gestión de coproductores, Justificación de subvenciones, Agenda ejecutiva, Deliverables, Historial de decisiones ejecutivas, KPIs — ninguna vacía). Se corrige en este ciclo.

## Necesidad real del cargo

Asistencia de producción es el brazo operativo de Jefatura de producción en el día a día del rodaje: trámites y tareas administrativas puntuales que no encajan en el Parte de producción diario (que ya registra incidencias/horarios de la jornada) ni en Control de material prestado/alquilado (ya Consolidada, cargo vecino). Lo real que maneja: gestiones puntuales delegadas (pedir presupuestos, hacer un trámite, entregar/retirar documentación, comprar algo puntual con caja chica, coordinar un proveedor menor) con plazo y responsable, no un checklist booleano de "hecho/no hecho" sin contexto.

## Propuesta: tipo `tabla`, no checklist

| key | label | tipo |
|---|---|---|
| `tarea` | Tarea / gestión | texto |
| `categoria` | Categoría | estado (opciones: Trámite, Compra/caja chica, Documentación, Proveedor, Logística, Otro) |
| `responsable` | Responsable | texto |
| `fecha_limite` | Fecha límite | fecha |
| `prioridad` | Prioridad | estado (opciones: Alta, Media, Baja) |
| `estado` | Estado | estado (opciones: Pendiente, En curso, Bloqueada, Completada) |
| `notas` | Notas / contexto | largo |

## Relación con otras herramientas (para no duplicar)

- **Parte de producción diario** (Consolidada, departamento): incidencias/horarios de la jornada — no tareas administrativas sueltas.
- **Control de material prestado o alquilado** (Consolidada, cargo vecino "Asistencia de producción"): ya cubre préstamos/alquileres con su propia tabla — esta herramienta no debe duplicar ese seguimiento, solo tareas administrativas que no sean de material.
- **Checklist de preparación de jornada** (Circunstancial, mismo cargo): es específico de la logística previa al día de rodaje (locación/permisos/equipos/catering/transporte) — distinto de gestiones administrativas sueltas sin fecha de jornada fija.

## Acción pendiente de este ciclo

Corregir `oficina/inventario.md` línea 36: cambiar "Cargo 'Producción ejecutiva'" por "Cargo 'Asistencia de producción' (departamento Producción)".

Archivos leídos: `app/herramientas.ts` (líneas 2480-2533, 2820-2860), `oficina/inventario.md` (líneas 14-19, 33-39), `oficina/backlog.md` (línea 28).

## Arquitectura

**Id/tipo final:** se mantiene `prod-tareas-admin`, `tipo: "tabla"` (motor genérico `herramienta_filas`, sin migración nueva). Columnas = las 7 propuestas por el agente de depto (`tarea`, `categoria` estado, `responsable`, `fecha_limite` fecha, `prioridad` estado, `estado` estado, `notas` largo) — todos tipos ya existentes en `ColTipo`, no se necesita tipo nuevo.

### Nivel 1 — con el propio departamento (Producción)
- No comparte filas con **Control de material prestado o alquilado** (cargo vecino, Consolidada): esa herramienta tiene su propia fila/tabla de préstamos con sus propias columnas; `prod-tareas-admin` filtra explícitamente la categoría "Compra/caja chica" a *gestiones puntuales* (ej. comprar algo con caja chica), nunca a seguimiento de un préstamo en curso. No hay join ni columna compartida entre ambas — son `herramienta_id` distintos en `herramienta_filas`, sin relación de clave foránea. Riesgo abierto: si un usuario crea una tarea "devolver trípode prestado" aquí en vez de en Control de material, quedará huérfana de ese seguimiento — se resuelve con el `hint` de la herramienta (texto que indique "si es sobre material prestado/alquilado, usá esa herramienta"), no con una restricción de datos.
- No comparte filas con **Checklist de preparación de jornada** (mismo cargo, Circunstancial): esa es logística pre-rodaje con fecha de jornada fija; `prod-tareas-admin` es trámite puntual con `fecha_limite` propia, sin acoplarse al calendario de jornadas. Se mantienen separadas, sin columna `jornada_id` compartida — es una decisión explícita, no una omisión.
- No comparte filas con **Parte de producción diario** (herramienta de departamento): esta última registra incidencias/horarios de la jornada ya ocurrida; `prod-tareas-admin` es prospectivo (pendiente/en curso), no un registro de lo sucedido.

### Nivel 2 — con el proyecto en su conjunto
- **No** escribe ni lee de `GENERAL_PLAN_RODAJE`, `GENERAL_ORDEN_RODAJE` ni `GENERAL_CALENDARIO`. Es intencional: estas tareas son gestión interna de Asistencia de producción (caja chica, trámites, proveedores menores) sin impacto directo en el cronograma de rodaje visible a todo el equipo. Si en el futuro una tarea tuviera `fecha_limite` coincidente con un día de rodaje y se quisiera ver en el calendario general, habría que agregar explícitamente un puente (ej. un botón "crear evento" que escriba en `GENERAL_CALENDARIO` vía API, al estilo de `app/api/plan-financiacion/sincronizar-desde-evento/route.ts`) — no está en el alcance de hoy, se deja como pregunta abierta para el backlog si Jefatura de producción lo pide.

### Nivel 3 — con otros departamentos
- **Jefatura de producción** (cargo superior directo del mismo departamento) necesita **ver** (no necesariamente editar) esta tabla completa: es quien delega estas gestiones y debe poder auditar su estado/prioridad sin pedirle a Asistencia que le reporte a mano. Se resuelve con `herramienta_asignaciones` (tabla ya existente, ver `20260702000000_control_depto_permisos.sql`): fila con `herramienta = "prod-tareas-admin"`, `departamento = "Producción"`, nivel "ver" asignado al cargo Jefatura de producción (o a usuarios concretos de ese cargo) por el jefe de depto desde el panel de Control.
- Ningún otro departamento necesita ver esta tabla de forma estructural (es gestión administrativa interna de Producción); si Tesorería/Administración necesitara trazabilidad de caja chica, eso ya lo cubre su propia herramienta de Pagos/caja chica (Ejecutivo) — no se duplica aquí.

### Modelo de datos y permisos
- **Espacio**: todas las columnas viven en el espacio común del proyecto (fila en `herramienta_filas`, `project_id` + `herramienta_id = "prod-tareas-admin"`). No hay campo privado del cargo — a diferencia de notas de preparación personales, estas tareas son por definición visibles a quien las delega.
- **Permisos**: edita Asistencia de producción (todos los miembros del cargo, vía RLS base de `herramienta_filas` — mismo departamento). Jefatura de producción: solo lectura vía `herramienta_asignaciones` (nivel "ver"). Super_admin: lectura por política `herramienta_filas_super_admin_select` ya existente, sin escritura especial (no hace falta, el jefe de depto ya administra `herramienta_asignaciones`).
- **Librerías**: ninguna — tabla estándar del motor genérico, renderizada por el `HerramientaPanel.tsx` ya existente (`tipo: "tabla"` con `columnas`), sin necesidad de componente nuevo.

## Investigación

### El cargo y cómo se gestiona hoy sin software

La Asistencia de producción es el eslabón operativo que ejecuta encargos puntuales delegados por Jefatura/Dirección de producción durante el rodaje: trámites, recados, compras menores con caja chica, entregas/retiros de documentación. No hay fuente específica en español que documente el día a día de este cargo (no se encontró un artículo de sindicato/asociación que describa explícitamente el flujo de trabajo de "auxiliar/asistente de producción" con caja chica en rodajes españoles — se marca como **Hipótesis, no confirmada por fuente directa**), aunque es coherente con la práctica estándar descrita para "production assistant" en fuentes anglosajonas sobre gestión de caja chica: formulario de solicitud por escrito, recibo por cada gasto, conciliación diaria (staffmeup.com, consultado 22/11/2026: https://blog.staffmeup.com/?p=3476; cmsla.squarespace.com, consultado 22/11/2026: https://cmsla.squarespace.com/blog/managing-petty-cash-production).

En España, la caja chica como instrumento de gestión de gastos menores es una práctica administrativa general (no exclusiva del audiovisual): fondo de dinero para gastos imprevistos o de emergencia, bajo la responsabilidad de una persona que debe rendir cuentas, con un recibo/justificante interno por cada salida (Sage, "Caja chica", consultado 22/11/2026: https://www.sage.com/es-es/blog/diccionario-empresarial/caja-chica/). No se encontró una guía específica del sector audiovisual español sobre caja chica de rodaje; la guía de justificación de documentales de la Junta de Andalucía trata la justificación de gastos de subvención en general (ventanas temporales de gasto, topes de capítulo de viajes), no un procedimiento de caja chica diaria de plató (Junta de Andalucía, "Guía justificativa producción documental 2021", consultado 22/11/2026: https://juntadeandalucia.es/sites/default/files/inline-files/2023/10/guia_justificativa_produccion_docu_2021.pdf).

Una gestoría especializada en audiovisual advierte que pagar en efectivo sin factura (comidas, transporte, alojamiento de rodaje) genera gasto no deducible — razón práctica fuerte para que la caja chica de producción quede trazada con justificante, no solo como lista de "hecho/no hecho" (Billeo, "Gestoría para productoras audiovisuales", consultado 22/11/2026: https://www.billeo.es/gestoria-productoras). Herramientas comerciales de gasto corporativo (p. ej. Pleo, en colaboración con APPA) ya ofrecen gestión de tarjetas/gastos a productoras españolas, lo que confirma que el problema de caja chica/gastos sueltos en rodaje es real y hoy se resuelve con herramientas genéricas de gasto corporativo, no con software de producción audiovisual (Pleo, "Pleo y APPA: partners de cine para ayudarte con tu producción audiovisual", consultado 22/11/2026: https://blog.pleo.io/es/pleo-appa-partners-gastos-produccion-audiovisual). Fuera de eso, es razonable asumir (**hipótesis, sin fuente directa sobre rodajes españoles pequeños/medianos**) que muchas productoras pequeñas siguen gestionando estos encargos sueltos por WhatsApp y hojas de Excel/papel, en línea con lo ya documentado para otras herramientas "vacías" de este inventario, pero no se encontró un testimonio o artículo que lo confirme específicamente para este cargo.

### Competencia

No se encontró evidencia de que StudioBinder tenga un módulo de caja chica o de gestión de tareas administrativas sueltas para el Production Assistant: su gestión de tareas es genérica (checklists, fechas límite, estados) asociada a módulos de guion, desglose, storyboard, calendario y callsheet, sin un objeto de dato "gasto/caja chica" (StudioBinder, "Task Management Software", consultado 22/11/2026: https://studiobinder.com/creative-project-management-software). Quien sí tiene un módulo dedicado de caja chica es Wrapbook, con un reporte línea a línea de transacciones, fechas de envío/aprobación e importes (Wrapbook, "About petty cash" / "Petty cash report", consultado 22/11/2026: https://help.wrapbook.com/docs/about-petty-cash y https://help.wrapbook.com/petty-cash-report) — referencia de diseño útil aunque Wrapbook no es uno de los competidores nombrados en el encargo original. Para Yamdu, Movie Magic (Budgeting) y SetHero no se encontró mención de caja chica o tareas administrativas sueltas del Production Assistant en las fuentes consultadas; Showbiz Budgeting (no mencionado en el encargo, pero relevante) sí ofrece seguimiento de caja chica, órdenes de compra y pagos a proveedores a nivel de dirección de producción, no a nivel de asistente (reseñas agregadas de software de presupuesto, consultado 22/11/2026, sin URL única fiable de primera mano — **marcado como fuente débil/agregador, no vendor directo**). Celtx no apareció en ninguna búsqueda relacionada con caja chica o tareas administrativas. **Conclusión:** ningún competidor de los cinco nombrados ofrece, de forma documentada, una herramienta específica de "tareas administrativas sueltas con caja chica" para el cargo de asistente de producción — queda confirmado como hueco de mercado, al menos dentro de lo verificable por fuente abierta.

### Normativa española aplicable

No existe normativa específica de "caja chica de rodaje"; aplica la normativa general de justificación de gastos y fiscalidad de empresas (facturación, deducibilidad de gastos pagados en efectivo) y, cuando el proyecto recibe subvención pública (ICAA o autonómica), las bases de la convocatoria correspondiente y sus guías de justificación de gasto son las que fijan plazos y documentación exigida — ver ejemplo de la Junta de Andalucía citado arriba. No se encontró convenio colectivo del sector que regule específicamente la gestión de caja chica por el cargo de asistencia de producción.

### Fuentes
- Sage, "Caja chica" — https://www.sage.com/es-es/blog/diccionario-empresarial/caja-chica/ (consultado 22/11/2026)
- Junta de Andalucía, "Guía justificativa producción documental 2021" — https://juntadeandalucia.es/sites/default/files/inline-files/2023/10/guia_justificativa_produccion_docu_2021.pdf (consultado 22/11/2026)
- Billeo, "Gestoría para productoras audiovisuales" — https://www.billeo.es/gestoria-productoras (consultado 22/11/2026)
- Pleo, "Pleo y APPA: partners de cine para ayudarte con tu producción audiovisual" — https://blog.pleo.io/es/pleo-appa-partners-gastos-produccion-audiovisual (consultado 22/11/2026)
- staffmeup.com, "Petty Cash Tips For Production Coordinators" — https://blog.staffmeup.com/?p=3476 (consultado 22/11/2026, fuente anglosajona, práctica general no específica de España)
- cmsla.squarespace.com, "The Role of a Production Assistant in Managing Petty Cash" — https://cmsla.squarespace.com/blog/managing-petty-cash-production (consultado 22/11/2026, fuente anglosajona)
- Wrapbook, "About petty cash" — https://help.wrapbook.com/docs/about-petty-cash (consultado 22/11/2026)
- StudioBinder, "Task Management Software" — https://studiobinder.com/creative-project-management-software (consultado 22/11/2026)

## QA

Golden path real interactuando de verdad con la cuenta `qa.prod-asistencia2@mailinator.com` (perfil completado por self-update RLS, cargo "Asistencia de producción" exacto según `JERARQUIA_POR_DEPARTAMENTO`). Login real, proyecto test, Exclusivas → Tareas administrativas diarias.

- Fila real creada: "Pagar alquiler de generador con caja chica", categoría, responsable, fecha límite, prioridad, estado y notas — las 7 columnas probadas.
- **2 bugs reales encontrados en el motor genérico de tabla durante esta QA, ambos corregidos en este mismo ciclo** (afectaban potencialmente a cualquier herramienta tipo tabla, no solo a las 3 de hoy):
  1. Columna `fecha`: no persistía tras reload (commit `4d0d5b0`).
  2. Columnas `estado` (dropdown `CpSelect`): al editar 2+ en la misma fila en sucesión rápida, la primera se perdía (race condition) (commit `56fa4f8`).
- Reverificado tras ambos fixes: categoría, prioridad, estado y fecha límite persisten correctamente tras reload + re-navegación (el reload por sí solo vuelve a Pulso, no es bug, hay que re-navegar a Exclusivas).
- Responsive: 390/820/1440px verificados con la fila real cargada — tabla con su propio scroll horizontal interno (patrón estándar del motor), sin scroll horizontal de página en ningún ancho, usable de punta a punta en 390px. Capturas: `capturas/tareas-admin_{390,820,1440}px.png`.
- `qa_responsive_ok: true`.

## Decisión de agrupación (ronda 2)

**Columna candidata:** `categoria` (Trámite/Compra·caja chica/Documentación/Proveedor/Logística/Otro).

**Decisión: NO agrupar. Tabla plana, ordenable por `prioridad`/`fecha_limite`.**

Argumento: el uso real de Asistencia de producción con esta herramienta es gestión de trámites puntuales con vencimiento (caja chica, documentación, proveedores menores) que el cargo revisa priorizando qué vence antes o qué es más urgente, no por tipo de trámite. Agrupar por `categoria` fragmentaría una lista que necesita leerse de un vistazo ordenada por `fecha_limite`/`prioridad`: una tarea de "Compra/caja chica" urgente para hoy terminaría en un bloque visual distinto de una "Documentación" igualmente urgente para hoy, obligando al cargo a leer categoría por categoría en vez de ver lo más urgente arriba. A diferencia de "Checklist de mezcla y masterización" (donde agrupar por una fase de proceso es justo cómo se trabaja, en bloques secuenciales) o del caso de vehículos (donde "ver todo el historial de una unidad junta" es el objetivo), aquí no hay un eje de agrupación que el cargo necesite ver "en bloque" — la categoría es metadata de clasificación, no el eje de trabajo diario. Se mantiene tabla plana sin `agruparPor`, ordenable por las columnas existentes (comportamiento ya soportado por el motor genérico sin cambio de código).
