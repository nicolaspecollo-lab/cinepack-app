# Inventario de departamentos, cargos y herramientas — CINEPACK

Fuente: `app/herramientas.ts` (registro completo, 3839 líneas) y git log del repo de muestreo. 17 departamentos, definidos en `export const HERRAMIENTAS: Record<departamento, Record<cargo, CargoTools>>`.

## Criterio de clasificación
- **Consolidada**: tiene `columnas`/`campos` específicos del cargo (terminología real, tipos de dato variados: `money`, `fecha`, `estado` con opciones propias, `repetible`, etc.) y/o un `hint` que describe un flujo real. Evidencia de diseño pensado, no genérico.
- **Circunstancial**: tiene algunas columnas o un hint, pero menos desarrollado, o reutiliza una herramienta de otro cargo sin adaptar, o el panel de `app/hoy/` que la renderiza es parcial.
- **Vacía/placeholder**: herramienta `nota` o `checklist` **sin `hint` y sin contenido precargado** (confirmado: no existe ningún registro de ítems de checklist precargados en el repo — búsqueda sin resultados). Es un cuadro en blanco genérico, el caso que la sección 6 del encargo prohíbe entregar tal cual.

**Importante**: esta clasificación es de primera pasada, hecha desde la definición en `herramientas.ts`. El agente de departamento correspondiente debe confirmarla contra el panel real en `app/hoy/` antes de proponer una herramienta del backlog como objetivo del día (puede haber lógica en el panel que no se ve en el registro, o al revés).

---

## 1. Ejecutivo
Herramientas de departamento (compartidas): Presupuesto (`ej-presupuesto-costos`, **Consolidada** — 17 columnas, capítulos ICIB/ICAA, reparto por coproductora, IVA), Plan de financiación/ayudas/coproducción (**Consolidada**), Flujo de caja (**Consolidada**, fusión documentada de 2 herramientas duplicadas), Facturas (**Consolidada**), Contratos (**Consolidada**).
- **Producción ejecutiva**: Gestión de coproductores, Justificación de subvenciones, Agenda ejecutiva, Deliverables, Historial de decisiones ejecutivas, KPIs clave — todas con columnas propias, **Consolidadas** (muestra de `ejAgendaEjecutivo`, `ejDeliverables`, `ejKpis` con nombres propios en el registro).
- **Dirección financiera**: Modelo financiero y proyección (**Consolidada** — 3 escenarios, waterfall de recoupment).
- **Tesorería**: Pagos/nóminas/caja chica/rendiciones (**Consolidada** — maneja alta/baja en Seguridad Social, muy detallada).
- **Administración**: Gestión documental administrativa (**Circunstancial** — una sola tabla genérica, a confirmar alcance).
- **Legal**: Cadena de titularidad y derechos, Acuerdos de confidencialidad/NDA (**Circunstancial/Consolidada** a confirmar con el agente de departamento).
- **Financiación y Seguros**: Pólizas de seguro (**Circunstancial**, a confirmar).

## 2. Dirección
Herramienta de departamento: Calendario de ensayos, Partes de script/continuidad por escena.
- **Dirección**: Notas de dirección por escena (**Vacía** — `nota` sin hint), Decisiones de visionado/dailies (**Vacía** — `checklist` sin hint).
- **1er asistente de dirección**: Control de horarios y avisos (1AD) — **Circunstancial** (tiene `hint` describiendo wrap/overtime/notificaciones, pero es `checklist` sin columnas).
- **Asistencia de dirección**: Control de horarios y avisos al equipo (**Vacía** — `checklist` sin hint, duplicado del de 1AD sin adaptar).
- **2ª Asistencia de dirección**: Listado de figuración/extras por escena — **Consolidada** (tabla con columnas propias).
- **Script**: Continuidad fotográfica (**Circunstancial** — tipo `galeria` con hint "Galería + notas de raccord", sin campos detallados vistos).
- **Dirección de actores**: Notas de ensayo por actor/personaje (**Vacía** — `nota` sin hint).
- **Secretaría de rodaje**: Actas de reuniones y archivo administrativo (**Vacía** — `nota` sin hint).

## 3. Producción
- **Dirección de producción**, **Jefatura de producción**, **Asistencia de producción**, **Coordinación de producción**, **Jefatura de locaciones**, **Scouting**, **Logística**, **Driver**.
- Herramientas de departamento detectadas: Stripboard (**Consolidada**), Catering y dietas (**Consolidada**), Parte de producción diario (**Consolidada**), Control de transporte y vehículos (**Consolidada**).
- Cargo "Producción ejecutiva" tiene: Tareas administrativas diarias (**Vacía** — `checklist` sin hint).
- **Driver**: Checklist de vehículos, combustible y mantenimiento (**Circunstancial** — `checklist` con hint pero sin estructura de datos propia).
- Resto de cargos (Jefatura/Asistencia/Coordinación de producción, Jefatura de locaciones, Scouting): **pendiente de detalle fino** — el registro completo de estos cargos no se volcó línea a línea en este reconocimiento por volumen; confirmar con el agente de departamento de Producción antes del primer ciclo.

## 4. Fotografía
Herramientas de departamento: Plan técnico de cámara/Shot list, Inventario y hoja de alquiler de equipo, Plan de iluminación, Look book/Moodboard de fotografía (**Consolidada**, es la herramienta más desarrollada del repo — tiene lienzo Konva propio, comparación de referencias, búsqueda por escena/etiqueta, varios commits dedicados), Paleta de color por escena.
- **Dirección de fotografía**, **Operación de cámara**, **Foquista**, **Auxiliar de cámara**, **Maquinista**, **Eléctricos/Gaffer**, **DIT (Imagen Digital)**.
- **Operación de cámara**: herramientas exclusivas detectadas con columnas propias (**Consolidada**, no detalladas línea a línea aquí).
- **Auxiliar de cámara**: Checklist de descarga, backup y etiquetado de tarjetas (**Vacía** — sin hint).
- **DIT**: Backup y verificación de material/checksum (**Vacía** — sin hint).

## 5. Arte
Herramientas de departamento: Moodboard de arte, Planos de decorado, Desglose de atrezzo por escena, Desglose de vestuario por personaje, Presupuesto y proveedores de arte — todas con columnas propias (**Consolidadas**, a confirmar nivel de detalle real con el agente del departamento).
- **Dirección de arte**, **Ayudantía de dirección de arte**, **Construcción de decorados**, **Atrezzo**, **Vestuario**, **Maquillaje**, **Peluquería**.
- **Ayudantía de dirección de arte**: Checklist de seguimiento por escena/decorado (**Vacía** — sin hint).

## 6. Guion
Herramientas de departamento: Historial de versiones y cambios, Sinopsis y escaleta, Desglose de escenas, Registro de actividad, Traducción y subtitulado — **Consolidadas** (columnas con fases, estados).
- **Guion**, **Coguion**, **Script doctor**, **Documentación**, **Traductor**.
- Cargos con herramientas detalladas y ricas: Tratamiento/sinopsis/logline, Informes de análisis, Plan de reescritura, Banco de investigación, Mi propiedad intelectual — **Consolidadas**.

## 7. Casting
Herramientas de departamento: Listado de candidatos por personaje, Convocatoria de casting, Resultados de audiciones, Ficha de reparto confirmado, Contratos de reparto y cesión de imagen — **Consolidadas**.
- **Dirección de casting**, **Ayudantía de casting**, **Coordinación de audiciones**, **Casting de figuración**.

## 8. Reparto
Herramientas de departamento: Ficha de personaje y arco, Calendario de citaciones, Vestuario y maquillaje asignado, Contrato individual y cesión de imagen, Guion con escenas marcadas — **Consolidadas**.
- **Protagonista**: Diario de personaje/preparación del rol (**Vacía** — `nota` sin hint).
- **Reparto principal**: Notas de preparación del personaje (**Vacía** — `nota` sin hint).
- **Reparto secundario**: Notas de escenas y marcas (**Vacía** — `nota` sin hint).
- **Figuración**: Instrucciones de figuración por jornada (**Vacía** — `checklist` sin hint).

## 9. Making of
Herramientas de departamento: Calendario editorial, Plan de cobertura BTS, Listado de material grabado, Calendario de publicaciones, Derechos de uso de material BTS — **Consolidadas**.
- **Dirección de making of**: Memoria de making of (**Vacía** — `nota` sin hint) + reutiliza herramientas BTS de departamento.
- **Cámara de making of**, **Edición de contenido**, **Community management** — pendiente de detalle fino.

## 10. Sonido
Herramientas de departamento: Plan de sonido directo (**Consolidada**, varios commits dedicados: estados, publicación, permisos del jefe de sonido), Plan de frecuencias inalámbricas (**Consolidada**, con aprobación exclusiva del jefe de sonido — migración `frecuencias_aprobacion_solo_jefe`), Lista de micrófonos por escena, Inventario y hoja de alquiler de sonido, Reportes de sonido por toma, Notas de postsincronización/ADR — **Consolidadas**.
- **Dirección de sonido**, **Microfonía**, **Postproducción de sonido**.

## 11. Postproducción
Herramientas de departamento: Plan de montaje, Versiones de corte (EDL), Notas de visionado/dailies, Lista de planos VFX, Guía de color/LUT final, Plan de entregas (masters), Checklist de entrega final — **Consolidadas**.
- **Dirección de postproducción**, **Montaje**, **Etalonaje y color**, **VFX**, **Sonorización final**, **Coordinación de postproducción**.
- **Sonorización final**: Checklist de mezcla y masterización de audio (**Vacía** — sin hint).

## 12. RRHH
Herramientas de departamento: Listado de equipo y contactos, Altas y bajas, Control de horas, Registro de descansos legales, Protocolo de prevención de riesgos, Canal de incidencias — **Consolidadas** (cumplimiento legal explícito: PRL, descansos).
- **Dirección de RRHH**: Memoria de RRHH (**Vacía** — `nota` sin hint).
- **Gestión de personal**, **Coordinación de bienestar**.
- **Coordinación de bienestar**: Plan de bienestar y actividades del equipo (**Vacía** — `checklist` sin hint).

## 13. Sostenibilidad
Herramientas de departamento: Huella de carbono, Consumo energético, Plan de gestión de residuos, Proveedores sostenibles, Checklist producción verde — **Consolidadas** (relevante: normativa de producción audiovisual sostenible, en auge en España/UE).
- **Dirección de sostenibilidad**, **Medición de impacto**, **Gestión de residuos**.

## 14. Marketing
Herramientas de departamento: Plan de marketing, Identidad gráfica, Calendario de redes sociales, Banco de assets — **Consolidadas**.
- **Jefatura de marketing**, **Diseño gráfico**, **Redes sociales**.

## 15. Difusión
Herramientas de departamento: Dossier de prensa, Listado de medios y contactos, Notas de prensa — **Consolidadas**.
- **Jefatura de prensa**, **Asistencia de prensa**.

## 16. Distribución
Herramientas de departamento: Plan de distribución, Listado de festivales (seed real de 127 festivales vía migración `festivales_seed_127.sql` — dato notable, ya hay contenido precargado real aquí), Acuerdos de distribución — **Consolidadas**.
- **Jefatura de distribución**, **Asistencia de distribución** (con tabla propia "Seguimiento de inscripciones a festivales", **Consolidada**).

## 17. Herramientas generales del proyecto (scope "General", cualquier integrante)
`GENERAL_CALENDARIO`, `GENERAL_PLAN_RODAJE`, `GENERAL_ORDEN_RODAJE` (callsheet — muy detallada, con JSON anidado de citaciones/localizaciones/llamadas por departamento), `GENERAL_CONTACTOS_EMERGENCIA`, `GENERAL_CHECKLIST_WRAP` — todas **Consolidadas** salvo `GENERAL_CHECKLIST_WRAP` (**Vacía** — `checklist` sin hint ni ítems precargados).

---

## Resumen cuantitativo (primera pasada, sujeto a confirmación por los agentes de departamento)
- Herramientas de departamento (compartidas) revisadas: ~45, la gran mayoría **Consolidadas**.
- Herramientas `nota`/`checklist` sin `hint` identificadas como **Vacía/placeholder** (lista cerrada, confirmada por grep, 16 casos; actualizado 17/11: 3 entregadas hoy, pendientes de calificación — ver `entregas` en el panel):
  ~~`dir-notas-escena`~~, `dir-decisiones-visionado`, `dir-control-horarios` (2ª Asistencia), `dir-notas-ensayo`, `dir-actas`, `prod-tareas-admin`, `foto-checklist-descarga`, ~~`foto-dit-backup`~~, `arte-checklist-tareas`, `rep-diario-personaje`, `rep-notas-preparacion`, `rep-notas-escenas`, `rep-instrucciones-figuracion`, `post-checklist-mezcla`, ~~`rrhh-plan-bienestar`~~, `mo-memoria`, además de `gen-checklist-wrap`.
- No existe en el repo ningún precargado de ítems de checklist (`CHECKLIST_ITEMS`/similar) — confirma que todo tipo `checklist`/`nota` sin `hint` es, literalmente, un cuadro vacío genérico hoy.
- Herramienta transversal "Hoja y documento en blanco" (sección 7 del encargo): **Consolidada** (16/11, PR #5, aprobada por el comité). Univer (hoja) + TipTap (documento). Ver `expedientes/2026-11-16_transversal_hoja-documento-blanco/`.

## Limitaciones de este inventario
- No se tuvo acceso al repo real para contrastar si estas herramientas "Consolidadas" en el prototipo ya existen de otra forma en producción (evitar duplicar trabajo que ya esté en el repo real). **El director-oficina debe preguntar a Nico si hay alguna forma de contrastar contra el repo real antes de dar luz verde a un expediente.**
- Los cargos de Producción, Fotografía, Arte, Making of y RRHH no se revisaron línea a línea en su totalidad por el volumen del archivo (3839 líneas); los agentes de departamento correspondientes deben completar el detalle antes de proponer una herramienta concreta del backlog.
