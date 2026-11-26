# Backlog priorizado — Oficina de Agentes CINEPACK

Orden de trabajo. Objetivo: 2 expedientes completos al día; si no alcanzan el nivel exigido, 1 o ninguno (sección 1.4 de las reglas).

## Actualizado 26/11/2026 — `rep-notas-preparacion` entregado
Código ya existía de una pasada del 25/11 sin dossier/QA; hoy se completó el proceso (dossier de 11 secciones, tsc/build limpios, wiring verificado por código) — ver `oficina/expedientes/2026-11-25_reparto_notas-preparacion/`. **Bloqueo real documentado, no fabricado**: no hay cuenta de prueba con cargo "Reparto principal" en `oficina-qa/cargos.md`, y el registro público de la app está cerrado — QA de interacción real queda pendiente hasta que se cree esa cuenta (recomendado para la próxima noche de QA). Pendiente de tu calificación en el panel con esta limitación explícita.

## Bug transversal pendiente de decisión de Nico (25/11/2026)
`/perfil` no escribe `profiles.cargo` al cambiar de cargo — escribe a `user_roles` en su lugar. El gating real de qué herramientas ve un cargo en Exclusivas/Departamentos lee `profiles.cargo` (`app/hoy/page.tsx`), así que cualquier usuario que cambie de cargo vía la UI de autoservicio no ve efecto real, sin error visible. Encontrado por QA al intentar destrabar la cuenta de 1er asistente de dirección el 25/11. No se toca hasta que Nico decida prioridad (afecta onboarding/autoservicio de cualquier cargo, no solo el de hoy).

## Bug menor sin investigar a fondo (25/11/2026)
En "Plan de rodaje" (`GENERAL_PLAN_RODAJE`), el guardado `onBlur` de una celda a veces no persiste si el foco se mueve inmediatamente hacia una celda de tipo fecha (date picker) — posible condición de carrera de guardado/debounce. Detectado de pasada durante la verificación de los flujos de integración de hoy, no investigado a fondo (fuera de alcance de esos 3 expedientes). Candidato para un ciclo futuro.

## 0. Herramienta transversal — Hoja y documento en blanco — ✅ ENTREGADA (16/11, PR #5)
Aprobada por el comité tras 2 rondas. Univer (hoja, Apache-2.0) + TipTap (documento, MIT). Ver `expedientes/2026-11-16_transversal_hoja-documento-blanco/`. Pendiente real (no bloqueante): persistencia Supabase, export .xlsx/.docx, permisos fila-por-persona (Nivel 3).

## 0bis. (texto original, archivado)
No es de un departamento: la usa cualquier cargo para crear su propia hoja/documento en blanco, nombrado por el usuario. Dos modos:
- **Hoja de cálculo**: fórmulas, formato de celdas, colores, alineación, insertar/eliminar filas y columnas, importar/exportar Excel.
- **Documento**: edición de texto enriquecido estilo Word, con exportación.

**No existe hoy ni como herramienta ni como librería instalada** (confirmado: `package.json`/`package-lock.json` no tienen Univer, FortuneSheet, Handsontable ni TipTap). El arquitecto-integracion debe comparar estas opciones (y cualquier otra candidata que surja) en: licencia, coste, rendimiento en móvil (el sistema de diseño es mobile-first con gutter de 16px/12px en pantallas chicas — una librería pesada o no táctil sería un mal encaje), y encaje con el stack (React 19, Next 16, exportación ya cubierta en parte por `exceljs`/`jspdf`/`pdf-lib`, que ya están instalados y podrían evitar reinventar la exportación). **Pregunta abierta, no resuelta aquí**: no se evaluó aún ninguna librería — queda explícitamente para el ciclo de trabajo del arquitecto, no se debe asumir una opción de antemano.

## 1-4. Herramientas vacías/placeholder de cargos clave (sección 2.3, prioridad por impacto de lanzamiento)
**Actualizado 17/11**: los 3 primeros de esta lista (`dir-notas-escena`, `rrhh-plan-bienestar`, `foto-dit-backup`) se entregaron hoy — ver `oficina/expedientes/2026-11-17_*` y `entregas` en el panel, pendientes de calificación de Nico. `post-checklist-mezcla` también entregado y rehecho (ver 17/11).
**Actualizado 18/11**: `foto-checklist-descarga`, `arte-checklist-tareas` y `rep-diario-personaje` entregados hoy — ver `oficina/expedientes/2026-11-18_tres-herramientas-vacias/`. **Pendiente real para la próxima noche de QA**: sumar a `qa.foto-aux-camara@...`, `qa.arte-ayudantia@...` y `qa.rep-protagonista@...` como miembros reales del proyecto de prueba — el "Modo de prueba" de la cuenta admin no alcanza para QA de escritura (no afecta RLS, por diseño). Siguientes candidatos: `dir-decisiones-visionado`, `dir-notas-ensayo`, `rep-notas-preparacion`.
**Actualizado 20/11**: `dir-decisiones-visionado` entregada hoy (ficha por toma/escena, `EntidadTabsBoard`) — ver `oficina/expedientes/2026-11-20_direccion_decisiones-visionado/`. QA real con Playwright (login con `qa.dir-direccion2@mailinator.com`, creación/edición real de una ficha, capturas en 390/820/1440px) una vez corregido el proceso de arranque: el dev server necesita `NODE_USE_ENV_PROXY=1` para que sus llamadas a Supabase pasen por el proxy de red del entorno (las credenciales de `.env.local` ya existían, el bloqueo inicial fue de proceso, no de credenciales faltantes). Calificado "Cumple" por Nico.
**Actualizado 20/11**: `dir-actas` entregado hoy (ver `oficina/expedientes/2026-11-20_direccion_actas-secretaria/`, PR #12) — pasa de `nota` vacía a archivo de actas con buscador real, luego rediseñada en ronda 3 (patrón de bandeja, departamento editable). Calificado "Cumple" por Nico (21/11).

Los 16 casos confirmados en `inventario.md` son candidatos. Prioridad sugerida por impacto (cargo con responsabilidad crítica en rodaje/legal, y potencial de integración cruzada):

1. **`dir-notas-escena`** — Notas de dirección por escena (cargo: Dirección). Impacto alto: el director es el cargo más visible, y "notas por escena" conecta de forma natural con Guion (desglose de escenas), Script (continuidad) y Postproducción (notas de visionado). Candidata fuerte a integración en 3 niveles.
2. **`rrhh-plan-bienestar`** / RRHH en general — el departamento de RRHH tiene herramientas de cumplimiento legal fuertes (control de horas, descansos, PRL) pero su único cargo con herramienta exclusiva (Coordinación de bienestar) está vacío. España tiene convenio colectivo del sector y normativa PRL aplicable — alto valor legal/diferencial frente a competencia (StudioBinder/Yamdu no suelen cubrir esto a nivel de convenio español). Investigar antes de proponer.
3. **`foto-dit-backup`** — Backup y verificación de material/checksum (DIT). Cargo técnico crítico en rodaje digital: pérdida de material es un riesgo real y concreto; cargo con poca cobertura de software especializado en el mercado (oportunidad frente a competencia).
4. **`post-checklist-mezcla`** — Checklist de mezcla y masterización (Sonorización final). Cierra el pipeline técnico de entrega, conecta con "Checklist de entrega final" de Postproducción y con DCP/deliverables técnicos.

El resto de los 16 vacíos (`dir-decisiones-visionado`, `dir-control-horarios` duplicado, `dir-notas-ensayo`, ~~`dir-actas`~~, `prod-tareas-admin`, `arte-checklist-tareas`, `rep-diario-personaje`, `rep-notas-preparacion`, `rep-notas-escenas`, `rep-instrucciones-figuracion`, `mo-memoria`, `gen-checklist-wrap`, `foto-checklist-descarga`) quedan en el backlog sin orden fino todavía — el director-oficina los prioriza día a día según estos mismos criterios (impacto de lanzamiento + integración).

## Preguntas abiertas para Nico (no resueltas aquí, no inventadas)
1. ¿Hay forma de dar a esta sesión acceso de lectura al repo real de CINEPACK para contrastar diseño e inventario? Hoy no está disponible.
2. ¿`messages/*.json` o `i18n/messages/*.json` es la fuente de traducciones vigente? Hay dos ubicaciones con el mismo contenido aparente.
3. ¿`@anthropic-ai/sdk` está en uso en producción o reservado para una migración futura? Solo se confirmó `@google/genai` en las rutas de IA revisadas (`app/api/asistente`, `app/api/guion/desglose/generar`).
4. Confirmar el radio de borde estándar de tarjetas/paneles del sistema de diseño real (en el repo de muestreo no hay un token único, se declara por componente).
5. ¿Qué librería de hoja de cálculo/editor enriquecido prefiere evaluar primero el arquitecto, o se le da total libertad? (sin respuesta asumida todavía).
