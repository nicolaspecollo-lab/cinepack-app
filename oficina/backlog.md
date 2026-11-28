# Backlog priorizado — Oficina de Agentes CINEPACK

Orden de trabajo. Objetivo: 2 expedientes completos al día; si no alcanzan el nivel exigido, 1 o ninguno (sección 1.4 de las reglas).

## Bugs de alta prioridad — triage QA cobertura extendida 27-28/11/2026 (pendiente de confirmación de Nico para arrancar)
Informe recibido en rama `oficina-qa/2026-11-27-28-cobertura-extendida` (commit `0dbdca6`, pusheada), 20 de 52 cargos cubiertos (cobertura interrumpida por saturación de recursos del contenedor y límites de uso de cuenta — no por fallo de la app). 3 bugs confirmados con evidencia real; triage de prioridad:

1. **[Legal] NDAs de ejemplo vacíos + "✓ Guardado" que no persiste — ALTA, prioridad 1.** Un NDA nuevo muestra confirmación de guardado pero no escribe en base; al recargar, desaparece. Es el más urgente de los tres porque el indicador de guardado le está mintiendo al usuario (no es solo falta de contenido, es un bug de integridad de datos), y porque el mismo patrón de guardado podría repetirse en otras herramientas de tabla/formulario — a confirmar si es un bug puntual de la herramienta de Legal o un problema del motor genérico (comparar con la condición de carrera de "stale response" ya corregida el 25/11 en `HerramientaPanel.tsx`; podría ser la misma familia de causa, falta investigar antes de asumirlo). Suma además el defecto ya conocido de "cuadro vacío genérico" (los 3 NDA de ejemplo sin fecha de vencimiento), que viola la regla 6 de las inviolables.
2. **[Jefatura de locaciones] Falta campo "Organismo" en permisos de localización — ALTA, prioridad 2 — ✅ RESUELTO (28/11).** No distinguía ayuntamiento de Confederación Hidrográfica/organismo de cuenca. Fix: columna nueva `organismo` (`tipo: "estado"`, opciones Ayuntamiento/Confederación Hidrográfica-organismo de cuenca/Propietario privado/Otro) en `prod-ficha-localizacion` (`app/herramientas.ts`). Verificado en vivo contra `cinepack-dev` (cuenta `qa.prod-locaciones2@mailinator.com`): el campo aparece en el detalle de la ficha con las 4 opciones correctas; usa el mismo mecanismo genérico que ya persiste en el resto de la tabla. PR #30 en borrador contra `jv179i`, rama `oficina/2026-11-28-fix-locaciones-organismo`.
3. **[Jefatura de producción] Control de transporte sin soporte de tramos con escalas — MEDIA-ALTA, prioridad 3 — ✅ RESUELTO (28/11).** `origen`/`destino` solo modelaba un único trayecto. Fix: columna nueva `paradas` (`tipo: "repetible"`, sub-columnas `lugar`/`hora`/`motivo`) en `prod-transporte` (`app/herramientas.ts`), más la UI del board (`TransporteBoard` en `app/hoy/HerramientaPanel.tsx`) ampliada para renderizar esa lista repetible por tarjeta (reutiliza el componente genérico `EntidadRepetible`, igual que otras herramientas con campos repetibles). Verificado en vivo contra `cinepack-dev` (cuenta `qa.prod-jefatura2@mailinator.com`, proyecto `[PROYECTO TEST] La sed de los almendros`): se armó un trayecto de 3 localizaciones (Base de producción → Mirador de Peñalba 09:15 → Gasolinera Km 40 10:05 → Playa Rocas Altas) como una sola tarjeta con 2 paradas intermedias; los datos persistieron tras recargar la página y reiniciar el servidor de desarrollo. Commits `7730609` (modelo de datos) y `eadd3f5` (UI del board) en `oficina/2026-11-28-triage-qa-cobertura-extendida`, ya mergeados en esta rama. No tocó `main` ni Corte.

**Nota aparte, sin acción requerida**: una "regresión" reportada en Secretaría de rodaje (Actas de reuniones) fue descartada — el cargo de QA usó un worktree desactualizado (congelado en un commit viejo, previo al merge real de esa herramienta). La herramienta en `jv179i` está correcta. Se deja documentado para no reusar ese worktree en próximas noches de QA.

**Siguiente paso**: antes de poner a trabajar al agente de departamento de Legal (y, en cadena, investigador/arquitecto/desarrollador/QA/comité) sobre el fix de NDA — regla de confirmación previa del 26/11 — se necesita el visto bueno explícito de Nico para arrancar este trabajo fuera del cupo normal de 3 herramientas nuevas/día, dado que es una corrección sobre una herramienta ya Consolidada, no una herramienta nueva del inventario. Mismo criterio aplica a los otros dos bugs.

## Ideas de QA 27-28/11 (sin asignar, candidatas de backlog bajo)
- Lista `repetible` de paradas en Control de transporte (Jefatura de producción) — resuelve directamente el bug #3 de arriba.
- Campo "Organismo" tipado (ayuntamiento/confederación hidrográfica/privado) en Localizaciones, con reglas de plazo distintas por tipo — resuelve directamente el bug #2 de arriba.
- Integración Catering↔RRHH para descansos legales del rodaje de 22 días (Coordinación de producción).
- Indicador visual "editado a mano" cuando el overtime de 1AD se overridea manualmente, para distinguirlo del calculado.
- Buscador de texto en Memoria de RRHH (hoy no existe).

## Bug de alta prioridad — triage QA nocturno 26/11/2026 — ✅ RESUELTO (27/11)
**[1AD] Overtime y delta de horario no se calculan automáticamente** (`dir-control-horarios-1ad`, ya Consolidada/mergeada a `main` el 25/11). Fix real aplicado 27/11: `calcularDeltaOvertime()` deriva `delta_minutos`/`overtime` automáticamente desde `hora_prevista_wrap`/`hora_real_wrap`, umbral >30' Alerta / >60' Confirmado, override manual disponible. QA de regresión real contra `cinepack-dev` (3 casos: 90/40/0 min, todos correctos) + comité abreviado aprobado. PR #26 en borrador contra `jv179i`, pendiente de calificación de Nico y de Corte explícito (entrada `dir-control-horarios-1ad-fix-overtime` en el panel).

## Pendiente de reconfirmar — no es bug confirmado todavía (QA nocturno 26/11/2026)
**[Tareas admin] Persistencia del campo título** — la prueba de esta noche se rompió por un error del propio script de QA (navegación directa a `/hoy` sin pasar por la selección de proyecto, rompiendo el `localStorage` del proyecto activo), no por un fallo de la app. Categoría y prioridad sí persistieron correctamente en la misma prueba. Se deja para la próxima noche de QA (27/11), con flujo de login normal — no se abre como bug ni se asigna a desarrollador hasta reconfirmar.

## Ideas de QA 26/11 (sin asignar, candidatas de backlog bajo, no urgentes)
- 1AD: resumen agregado de overtime por departamento al pie del Gantt (reporte semanal al productor ejecutivo) — natural extensión del fix de arriba, evaluar cuando se construya el cálculo automático.
- Tareas administrativas: extender el patrón "Cambios recientes + Deshacer" a otras herramientas con edición frecuente (ej. checklist de vehículos) — solo si Nico lo pide explícitamente.
- Vehículos: filtro rápido "solo con alertas" en el mapa de tarjetas, si se suman más matrículas reales.

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
6. **Confirmación para arrancar el fix de los 3 bugs del triage QA 27-28/11** (NDA de Legal que no persiste — prioridad 1 — , falta de campo "Organismo" en Localizaciones, y tramos con escalas en Control de transporte): los tres son correcciones sobre herramientas ya Consolidadas, no herramientas nuevas del cupo diario — por la regla de confirmación previa del 26/11, no se lanza el ciclo de agentes sobre ellos sin el visto bueno explícito de Nico. ¿Arrancamos los tres en el próximo ciclo, empezando por Legal, o prefiere priorizar distinto?
7. Al investigar el bug de Legal, hay que confirmar si es un caso puntual de esa herramienta o si comparte causa con la condición de carrera de "stale response" ya corregida el 25/11 en `HerramientaPanel.tsx` — si el patrón se repite, podría afectar a más herramientas de tabla/formulario. Esto se investiga antes de tocar código, no se asume la causa.
8. La próxima noche de QA debería cubrir los 32 cargos restantes (de 52) sin terminar por saturación de recursos — candidatos prioritarios según el informe: Producción ejecutiva, Dirección financiera, Tesorería, Financiación y Seguros, 2ª Asistencia de dirección, Script/Continuidad, Dirección de actores, Dirección de producción (parcial). Recomendación del propio QA: escalonar con menos paralelismo simultáneo para no repetir la saturación — a confirmar con Nico si se autoriza otra ventana nocturna extendida.

## Excepción puntual 27/11 — horario y alcance confirmados por Nico
Ciclo del 27/11 arranca a las 8:30 Madrid (no 7:00) por el reseteo de uso de tokens. Alcance confirmado: fix bug overtime 1AD (no cuenta como herramienta nueva) + terminar citación-equipo si no cierra hoy (tampoco cuenta) + Memoria de RRHH (1ª herramienta nueva) + 2 herramientas nuevas más a elegir por proceso normal. Trigger puntual creado: `trig_01K5GDKb2w55TcW1hb1NQooo`.

## BUG CRÍTICO, YA EN PRODUCCIÓN — MODULOS_BETA_ACTIVOS bloquea departamentos con herramientas ya en main real (27/11/2026)
`app/constants.ts` en **`main` real** (confirmado con `git show origin/main:app/constants.ts`, no solo en una rama de oficina) tiene `MODULOS_BETA_ACTIVOS = ["Ejecutivo", "Dirección", "Guion", "Producción"]`. El gate `bloqueado = !esModuloBeta && !isAdmin` (encontrado al investigar por qué `rep-notas-preparacion`/`rep-instrucciones-figuracion` caían al Kanban genérico) bloquea TODAS las herramientas de cualquier departamento que no esté en esa lista, para cualquier usuario real no-admin — sin importar si el panel a medida está bien construido.

**Departamentos con herramientas YA con `corte_ejecutado:true` (en producción real) pero FUERA de la lista — inaccesibles hoy para usuarios reales no-admin de esos departamentos:**
- **Fotografía** (`foto-checklist-descarga`, Corte 20/11)
- **Arte** (`arte-checklist-tareas`, Corte 20/11)
- **Reparto** (`rep-diario-personaje` Corte 20/11, `rep-notas-escenas` Corte 21/11)
- **Making of** (`mo-memoria`, Corte 21/11)
- **RRHH** (`rrhh-plan-bienestar`, Corte 20/11)
- **Postproducción** (`post-checklist-mezcla`, Corte 20/11)

Es decir: **6 departamentos completos** tienen cargos reales que, desde que esas herramientas se desplegaron, no pueden verlas ni usarlas — el Corte se ejecutó, el deploy se hizo, pero el gate de beta las esconde igual. No se tocó `main` para corregir esto en esta pasada (regla de Corte: `main` solo se toca con autorización explícita de Nico) — queda como la decisión más urgente que necesita su palabra, porque ya está afectando producción real, no es un bug de una rama en desarrollo.

**Recomendación**: agregar los 6 departamentos (o directamente sacar el gate de beta si ya no tiene sentido mantenerlo — habría que preguntarle a Nico por qué se creó en primer lugar) a `MODULOS_BETA_ACTIVOS` vía un Corte puntual, lo antes posible.

## Comité de calidad — veredicto real 3 PRs de bugs (28/11/2026)

**PR #30 — Jefatura de locaciones, campo "Organismo"**: APROBADO. Verificación independiente en vivo (login real `qa.prod-locaciones2@mailinator.com`, servidor dedicado): el campo aparece con las 4 opciones correctas (Ayuntamiento/Confederación Hidrográfica/Propietario privado/Otro). `tsc --noEmit` limpio. Diff aislado de 1 línea en `app/herramientas.ts`.

**PR #32 — Jefatura de producción, paradas intermedias en transporte**: APROBADO. Verificación independiente en vivo (login real `qa.prod-jefatura2@mailinator.com`): columna "Paradas intermedias" visible y conectada al componente genérico `EntidadRepetible`. `tsc --noEmit` limpio.

**PR #31 — Legal, NDA que no persiste**: **RECHAZADO — el bug original sigue sin corregir.** El diff solo agrega `tipo: "fecha"` a la columna `vigencia` (título del propio PR: "NDA vigencia sin tipo fecha") — nunca tocó la causa real de "no persiste". Reproducción independiente con evidencia de red concreta:
- Crear una fila nueva: `POST .../herramienta_filas` → 201, fila creada con `datos:{}`.
- Editar un campo (ej. Contraparte): `PATCH .../herramienta_filas?id=eq.<id>` con body correcto `{"datos":{"contraparte":"..."}}` → **204 (éxito reportado)**.
- Releer la misma fila después (reload completo + re-login fresco): `datos` sigue **vacío (`{}`)** — el valor nunca llegó a persistir, pese al 204.
- Esto es la firma típica de una política RLS de Supabase que bloquea el UPDATE en silencio (coincide con el patrón ya documentado el 21/11 en `dir-notas-ensayo`, donde Nico tuvo que aplicar una migración de RLS: `20261121010000_fix_privacidad_notas_ensayo.sql`). Hipótesis a confirmar por quien tenga acceso a las políticas reales de `cinepack-dev`: la policy de UPDATE sobre `herramienta_filas` probablemente exige una condición (ej. `created_by = auth.uid()` o rol específico) que no se cumple para `ej-cesion-nda`/cargo Legal, mientras que el INSERT sí la cumple.
- El fork que implementó el PR reportó "persiste correctamente" sin esta evidencia de red — probablemente confundió la navegación de vuelta a `/hoy` (que no es la URL de la herramienta, es estado de pestaña cliente) con una prueba real de persistencia.

**Acción**: PR #31 vuelve a desarrollador con esta evidencia concreta — investigar la policy RLS real de `herramienta_filas` para `ej-cesion-nda`/Legal antes de reintentar un fix de UI. No se mergea a `jv179i` hasta corregir la causa real.

## Corrección del veredicto de comité sobre PR #31 (28/11/2026, tercera verificación)

**Rectificación**: el rechazo anterior de PR #31 (Legal/NDA) fue un **falso positivo propio**, no un bug real. Al reproducir por tercera vez con tracking riguroso por ID real de fila (no por posición en la lista), el bug no reproduce:
- Fila creada con `POST` → id real `7408391d-9332-49e8-9e4a-3720217e6198`.
- `PATCH .../herramienta_filas?id=eq.7408391d-9332-49e8-9e4a-3720217e6198` con `{"datos":{"contraparte":"BYID-1795884169473"}}` → 204.
- `GET` tras reload completo + renavegación real a la herramienta, filtrando por ese mismo id exacto → `datos:{"contraparte":"BYID-1795884169473"}` — **persiste correctamente**.

Causa real del falso positivo anterior: mi script de verificación llenaba "el último `<input>` de la lista" por posición del DOM, no por ID de fila capturado de la respuesta real del servidor — con la lista reordenándose entre acciones, eso pudo apuntar a una fila distinta de la que creía estar editando. Mea culpa del verificador, no de la app.

**Veredicto final: PR #31 — APROBADO** tal como está (el fix de `tipo: "fecha"` en `vigencia` del autor original). Los 3 PRs (#30, #31, #32) quedan aprobados por comité y listos para mergear a `claude/oficina-agentes-cinepack-jv179i`.
