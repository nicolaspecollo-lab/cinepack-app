# Necesidad — Control de horarios y avisos (1AD)

**Cargo:** 1er asistente de dirección (departamento Dirección)
**Herramienta:** `dir-control-horarios-1ad` — "Control de horarios y avisos al equipo (1AD)"
**Clasificación actual:** Circunstancial (hint real, sin columnas)

## Estado confirmado (app/herramientas.ts:2623)

```ts
{ id: "dir-control-horarios-1ad", nombre: "Control de horarios y avisos al equipo (1AD)", tipo: "checklist",
  hint: "Checklist de control de tiempos del día: wrap de cada setup, alertas de overtime, notificaciones al equipo." }
```

Tiene `hint` real pero sigue siendo `checklist` sin `columnas`. No hay panel a medida en `app/hoy/` para este id — el motor genérico de tabla alcanza: basta migrar `tipo: "checklist"` → `tipo: "tabla"` con columnas declaradas.

## Necesidad real del cargo

El 1AD controla el reloj del día de rodaje de forma operativa: registro de EVENTOS DE TIEMPO por setup/escena — hora prevista de wrap vs. hora real, si cruza umbral de overtime, y si se avisó al equipo por ese cruce. Es distinto de `dir-control-horarios` (Asistencia de dirección, ya rediseñada en el ciclo del 22/11 como "Avisos y confirmaciones de citación al equipo" — centro de avisos cualitativo, no bitácora de tiempos cuantitativa).

## Propuesta de columnas (tipo `tabla`, migrar desde `checklist`)

| key | label | tipo |
|---|---|---|
| `escena_setup` | Escena / Setup | texto |
| `hora_prevista_wrap` | Hora prevista de wrap | fecha |
| `hora_real_wrap` | Hora real de wrap | fecha |
| `delta_minutos` | Delta (minutos) | num |
| `overtime` | Overtime | estado (opciones: No, Alerta, Confirmado) |
| `aviso_enviado` | Aviso enviado al equipo | estado (opciones: Pendiente, Enviado, No aplica) |
| `observacion` | Observación | largo |

El umbral exacto de "overtime" queda pendiente de que investigación confirme contra el convenio real, no se asume un número.

## No fusionar con `dir-control-horarios` (Asistencia)

Son naturalezas de dato distintas: tiempos cuantitativos por setup (1AD) vs. centro de avisos/confirmaciones por destinatario (Asistencia) — mismo criterio ya aplicado el 22/11 al diseñar esa otra herramienta. El campo `aviso_enviado` de esta tabla es el puente conceptual hacia el centro de avisos de Asistencia (el dato "hubo que avisar por overtime" nace aquí, el aviso en sí se ejecuta allá) — sin integración automática de datos entre ambas en este ciclo, solo coherencia terminológica.

## Investigación (con fuentes)

El III Convenio colectivo estatal de la industria de producción audiovisual —técnicos— (BOE-A-2024-6846, Resolución de 22/3/2024 de la Dirección General de Trabajo) sigue vigente en general. La Audiencia Nacional (sentencia 21/4/2025, publicada en BOE-A-2025-9881, 19/5/2025, tras impugnación de CGT/TACE) anuló únicamente el art. 17.2.a) sobre preaviso de cambios de horario ya fijados (exigencia de comunicar con 48h de antelación los cambios a planes de trabajo ya fijados) — **no hay anulación confirmada sobre horas extraordinarias/overtime**.

**Artículo que regula horas extraordinarias: Artículo 18 ("Horas extraordinarias"), dentro del Título V ("Jornada de trabajo") del convenio.** Esto se confirma por el índice del propio convenio, recogido en al menos dos fuentes independientes (guía profesional del sector y resumen de despacho laboralista — ver fuentes). Contenido del art. 18 según esas fuentes secundarias (no se pudo abrir el PDF oficial de BOE.es directamente desde este entorno por restricción de red; el contenido aquí reportado proviene de fuentes secundarias del sector que citan el convenio, no de la verificación directa del texto en BOE.es — **recomendado que el ciclo siguiente confirme contra el PDF oficial en cuanto la red lo permita**):

- Son horas extraordinarias las que excedan de la jornada efectiva pactada en cómputo MENSUAL y las que superen el límite máximo diario. Las prolongaciones de jornada reguladas en el art. 16 NO cuentan como horas extraordinarias si se compensan con descanso dentro de plazo (Guía Profesional Audiovisual).
- Compensación: se puede optar por descanso (90 minutos de descanso por cada hora prolongada, compensable dentro de los tres meses siguientes a su realización, o antes del fin del contrato si éste dura menos) o por pago con un recargo del 50% sobre el valor de la hora ordinaria (el convenio anterior, II Convenio, preveía un recargo del 25% — subió en el III Convenio). En contratos de duración inferior a tres meses, o en fijos discontinuos sin pacto previo, la empresa decide la forma de compensación.
- Jornada diaria total (incluyendo horas extraordinarias, montaje, desmontaje y descansos) no puede superar las 13 horas, según la misma guía sectorial.
- Jornada general: máximo 40 horas semanales / 8 horas diarias; con el "complemento de flexibilidad" (128,86 €/mes) la jornada diaria puede ir de un mínimo de 5 a un máximo de 9 horas (hasta 45 horas semanales en la práctica), con 48 horas de descanso semanal ininterrumpido y 12 horas de descanso diario (resumen de despacho Écija).

**Importante — no asumir el umbral de "overtime" como un número fijo sin revisión:** la propuesta de columna `overtime` en este expediente (estado: No/Alerta/Confirmado) debe entenderse como un indicador cualitativo de que el wrap real cruzó la jornada pactada en cómputo mensual o el límite diario — no como un contador aritmético de horas extra acumuladas, porque el cómputo real del convenio es mensual, no diario por evento. El arquitecto no debe codificar un número de horas fijo (p.ej. "8h") como umbral de alerta sin que esto se revise contra el texto oficial.

Referencia de industria (no española, orientativa de patrón de producto, sin valor normativo): plantillas de "Daily Timesheet" de crew de cine/TV registran call time, meal break, wrap time y turnaround — confirma que call/wrap previsto vs. real es el patrón estándar del sector.

### Fuentes
- BOE, Resolución de 22 de marzo de 2024, III Convenio colectivo estatal de la industria de producción audiovisual (técnicos) — https://BOE.ES/boe/dias/2024/04/06/pdfs/BOE-A-2024-6846.pdf (no accesible directamente desde este entorno por restricción de red; referenciado vía fuentes secundarias)
- BOE, Resolución (sentencia Audiencia Nacional 21/4/2025, art. 17.2.a anulado), publicada 19/5/2025 — https://www.boe.es/boe/dias/2025/05/19/pdfs/BOE-A-2025-9881.pdf
- Guía Profesional Audiovisual, "Convenio colectivo (Horas extras)" — https://guiaprofesionalaudiovisual.es/convenio-colectivo-audiovisual-horas-extras/ (nota: esta guía advierte que una versión anterior citaba 65 minutos de descanso por hora, cifra del II Convenio ya superada; la cifra vigente que reporta es 90 minutos/hora y recargo del 50%)
- Mentalegal, "Se publica en el BOE el III Convenio Colectivo de la industria de la producción audiovisual (técnicos)" — https://mentalegal.com/se-publica-en-el-boe-el-iii-convenio-colectivo-de-la-industria-de-la-produccion-audiovisual-tecnicos/
- Iberley, resumen de la Resolución de 22 de marzo de 2024 — https://www.iberley.es/convenios/sector/resolucion-18-marzo-2003-direccion-general-trabajo-que-se-dispone-inscripcion-registro-y-publicacion-revision-salarial-venio-colectivo-industria-produccion-audiovisual-tecnicos-1600650
- Film & TV Production Crew Daily Timesheet template (referencia de patrón de producto, no normativa española) — https://templates.platoforms.com/pdf/film-tv-production-crew-daily-timesheet
- Crew Call app (App Store, referencia de patrón de producto) — https://apps.apple.com/au/app/crew-call/id1532198878

### Pendiente de verificación
El contenido exacto del art. 18 reportado arriba proviene de fuentes secundarias (guías del sector, despachos laboralistas) que citan el convenio, no de lectura directa del PDF oficial de BOE.es — este entorno de investigación no pudo resolver boe.es por restricción de red de la sesión. **Antes de cerrar el diseño de la columna `overtime` con cifras concretas en la UI (90 minutos, recargo 50%, límite 13h/jornada), un ciclo posterior debe confirmar el texto literal del art. 18 y del Título V directamente contra el BOE** cuando el acceso de red lo permita, o solicitar al usuario que confirme/adjunte el PDF oficial.

Archivos leídos: `app/herramientas.ts` (líneas 2623, 2629, 16-29), `app/hoy/HerramientaPanel.tsx` (grep sin panel a medida para este id).

## Arquitectura

### Decisión de id y tipo

- **Id**: se mantiene `dir-control-horarios-1ad`. Confirmado contra `app/herramientas.ts` y `app/hoy/HerramientaPanel.tsx`: no hay panel a medida que dependa de este id ni evidencia de filas reales precargadas (es `checklist` sin `CHECKLIST_ITEMS`, confirmado también por el hallazgo general de inventario.md de que no existe ningún precargado de checklist en el repo). Es un slug interno sin filas de producción que dependan de él — mismo criterio aplicado en ciclos anteriores (ej. `dir-decisiones-visionado`, 20/11). No hace falta cambiarlo.
- **Tipo**: migra `"checklist"` → `"tabla"`. El motor genérico de tabla (`esMulti` en `HerramientaPanel.tsx:351`, que agrupa `"tabla"` y `"galeria"` para el flujo multi-fila) ya soporta las columnas propuestas con los tipos existentes (`texto`, `fecha`, `num`, `estado`, `largo`) sin necesidad de componente a medida ni `ColTipo` nuevo.

### Modelo de datos final

| key | tipo | notas |
|---|---|---|
| `escena_setup` | texto | — |
| `hora_prevista_wrap` | fecha | el tipo `fecha` ya se usa en el repo para timestamps de hora (ver `GENERAL_ORDEN_RODAJE`); si el desarrollador necesita hora sin fecha-completa, usar el mismo input `type="date"`/`datetime` que ya use el resto del callsheet para consistencia, no inventar un tipo nuevo |
| `hora_real_wrap` | fecha | idem |
| `delta_minutos` | num | calculado manualmente por el 1AD en este ciclo (no hay cálculo automático propuesto; si se quisiera automatizar, el desarrollador podría derivarlo client-side de las dos columnas de hora, pero eso es decisión de implementación, no de modelo de datos) |
| `overtime` | estado | opciones: No, Alerta, Confirmado |
| `aviso_enviado` | estado | opciones: Pendiente, Enviado, No aplica |
| `observacion` | largo | — |

Todo expresable con `ColTipo` existente. No se propone tipo nuevo.

### Por qué NO se fusiona con `dir-control-horarios` (Asistencia de dirección)

Confirmado el razonamiento del necesidad.md: son dos naturalezas de dato distintas — `dir-control-horarios-1ad` es una bitácora cuantitativa de eventos de tiempo por setup/escena (hora prevista vs. real, delta, overtime), mientras que `dir-control-horarios` (rediseñada 22/11 como "Avisos y confirmaciones de citación al equipo") es un centro de avisos cualitativo por destinatario. Fusionarlas obligaría a modelar en una sola fila dos granularidades distintas (por setup vs. por persona/destinatario), lo que ensuciaría ambas. Se ratifica sin cambios.

### Integración nivel 1 — con el propio departamento (Dirección)

- `dir-control-horarios` (Asistencia de dirección): el campo `aviso_enviado` de esta tabla es el puente conceptual — cuando `overtime` cruza a "Alerta"/"Confirmado" y toca avisar al equipo, ese aviso se ejecuta y registra en el centro de avisos de Asistencia. **Sin integración automática de datos en este ciclo** (ratificado del necesidad.md): no hay escritura cruzada, solo coherencia de que el dato "hubo que avisar por overtime" nace aquí y el aviso en sí vive allá. Si en un ciclo futuro se quisiera automatizar, el enganche sería: al guardar `overtime = "Confirmado"` en esta tabla, crear una fila sugerida en `dir-control-horarios` con el setup/escena como referencia — pero eso es una decisión de producto para otro ciclo, no se implementa ahora.
- `2ª Asistencia de dirección` (Listado de figuración/extras por escena): sin relación de datos directa; comparten `escena` como campo de texto libre, sin normalización (mismo límite estructural que el resto del repo).

### Integración nivel 2 — con el proyecto (plan/calendario)

- `GENERAL_ORDEN_RODAJE` (callsheet): trae la hora de citación/llamada prevista por departamento, pero NO trae horas de wrap por setup — este es justamente el dato nuevo que esta herramienta aporta y que hoy no existe en ningún lado del proyecto. `escena_setup` debería usar la misma nomenclatura de escena que el plan de rodaje (convención, no FK — igual límite que en la herramienta de continuidad fotográfica de hoy).
- `GENERAL_PLAN_RODAJE` / `GENERAL_CALENDARIO`: sin escritura automática. Si el equipo quisiera ver el real histórico de wraps para replanificar jornadas futuras, sería una lectura manual de esta tabla por parte de Producción, no un dato que fluya solo.
- Sin impacto en presupuesto: `delta_minutos`/`overtime` no alimentan automáticamente ninguna partida de horas extra en `ej-presupuesto-costos` — si eso se quisiera, requeriría primero confirmar el umbral/coste de hora extra contra el convenio real (pendiente de verificación, según el propio necesidad.md), así que no se construye ahora.

### Integración nivel 3 — con otros departamentos

- **Producción (Jefatura de producción / Parte de producción diario)**: necesita ver (lectura) el resumen de overtime del día para el parte de producción diario — hoy ese parte es una herramienta de departamento distinta y separada; la integración mínima no automatizada es que el 1AD comunique el dato, igual que hoy. No se propone unificación de tablas.
- **RRHH (Control de horas)**: `RRHH` ya tiene "Control de horas" como herramienta de departamento con fines de cumplimiento legal (PRL, descansos) — sus datos NO deberían nutrirse automáticamente de esta tabla sin que investigación confirme el criterio legal de cómputo de horas extra (ver "pendiente de verificación" del necesidad.md). Se documenta como relación potencial futura, no se conecta ahora.

### Permisos

Herramienta de departamento (Dirección), cargo 1er asistente de dirección. Edición: 1AD y jefe de departamento (Dirección) vía el mismo mecanismo de `control_depto_permisos` (`es_jefe_de_depto` + `caller_departamento()`). Lectura: resto del equipo con acceso al proyecto, salvo que se oculte vía `herramienta_visibilidad`. No es herramienta personal, no aplica el patrón restrictivo de `personal_tools`. No se requiere migración nueva — la migración de `checklist` a `tabla` es solo en `app/herramientas.ts` (metadata de columnas), las filas ya guardadas (si hubiera, que no hay evidencia de que existan) seguirían siendo compatibles porque el `id` no cambia.

## Bug real encontrado y corregido en este mismo ciclo (25/11/2026)

QA detectó que el cargo "1er asistente de dirección" **no existía en `JERARQUIA_POR_DEPARTAMENTO`** (`app/constants.ts`) — el selector de cargo en `/crear-perfil` y el self-update de perfil solo ofrecen los valores de esa lista, así que este cargo era estructuralmente inalcanzable para cualquier usuario real, independientemente del bug de `MODULOS_BETA_ACTIVOS`. Afectaba no solo a `dir-control-horarios-1ad` (de hoy) sino también a las herramientas ya existentes de ese cargo (`dirBreakdownTecnico`, `dirContinuidadDiaria`).

Un primer intento automático de corrección (fusionar este cargo con "Asistencia de dirección") fue descartado: habría mezclado dos herramientas de naturaleza deliberadamente distinta bajo el mismo cargo (bitácora de tiempos cuantitativa del 1AD vs. centro de avisos cualitativo de Asistencia, separación decidida explícitamente en los ciclos del 22/11 y de hoy). Se corrigió en cambio agregando `"1er asistente de dirección"` a `JERARQUIA_POR_DEPARTAMENTO["Dirección"]` (commit `bfb3885` en este worktree), preservando la separación de cargos ya decidida. Mismo fix aplicado y entregado por separado contra `main` real (rama de revisión `fix-beta-gating-making-reparto`, junto con el fix de `MODULOS_BETA_ACTIVOS` ya autorizado por Nico), porque el gap es preexistente y también afecta a producción.

## QA (25/11/2026)

**Cuenta usada:** `qa.dir-1ad2@mailinator.com`.

### Bug de perfil encontrado y corregido en esta sesión (distinto del ya corregido en `JERARQUIA_POR_DEPARTAMENTO`)
Al loguear la cuenta, el badge de cargo mostraba **"Asistencia de dirección"** (cargo equivocado — no "1er asistente de dirección") y Exclusivas solo listaba la herramienta del OTRO cargo (`dir-control-horarios`, sin "(1AD)"). Investigando encontré que el gating real de qué herramientas de "cargo" se muestran en `/hoy` usa el campo **singular `profiles.cargo`** (leído en `app/hoy/page.tsx:16` y pasado como prop `cargo` hasta `HerramientasPanel`), **no** la tabla `user_roles` que edita la pantalla `/perfil` ("Cargos" / "Agregar cargo"). Usar la UI de `/perfil` para agregar el cargo "1er asistente de dirección" (chip añadido correctamente a `user_roles`) **no tuvo ningún efecto** sobre qué se ve en Exclusivas, porque `profiles.cargo` seguía con el valor viejo.

**Esto es un bug real, confirmado por código, independiente del fix ya aplicado en `JERARQUIA_POR_DEPARTAMENTO` (commit `bfb3885`):** la pantalla de autoservicio `/perfil` no tiene ningún control que actualice `profiles.cargo` (el botón "Guardar cambios" solo actualiza nombre/bio/teléfono/ubicación; el botón "+" de "Agregar cargo" solo hace `insert` en `user_roles`). Un usuario real que cambie de cargo vía `/perfil` **no vería reflejado el cambio en Exclusivas**, con o sin el fix de jerarquía. Recomiendo a Nico/arquitectura que esto se repare: o bien `/perfil` actualiza también `profiles.cargo` al agregar/quitar un rol (p. ej. al primer rol agregado, o con un selector de "cargo principal"), o bien el gating de Exclusivas pasa a leer de `user_roles` en vez de `profiles.cargo`.

**Cómo lo destrabé para poder hacer el resto del QA de hoy (self-update RLS, sin tocar código):** hice un `PATCH` autenticado como la propia cuenta (mismo mecanismo de "self-update" que usa la RLS para que un usuario edite su propio `profiles`) seteando `cargo = "1er asistente de dirección"` directamente. Status 200. Tras esto, el badge y Exclusivas mostraron correctamente "1ER ASISTENTE DE DIRECCIÓN" y la herramienta "Control de horarios y avisos al equipo (1AD)".

### Funcional
- Con el cargo corregido, la herramienta `dir-control-horarios-1ad` es visible y migró de `checklist` a `tabla` con las 7 columnas propuestas (`escena_setup`, `hora_prevista_wrap`, `hora_real_wrap`, `delta_minutos`, `overtime`, `aviso_enviado`, `observacion`), tal como documenta este expediente.
- Cargué 2 filas reales (E22/Setup A: delta 15, overtime "No"; E23/Setup B: delta 95, overtime "Confirmado") con fecha, delta, overtime y observación. **Confirmado por consulta directa a la tabla `herramienta_filas` vía REST (bypaseando la UI)** que ambas filas persisten correctamente con todos los campos en `datos`.
- Campo `aviso_enviado` (select): abrí el desplegable y confirmé que ofrece exactamente las 3 opciones del expediente (Pendiente/Enviado/No aplica); no llegué a fijarlo en los datos finales por una limitación de mi script de prueba (no es un bug de la herramienta).

### 🔴 Bug real encontrado — reportar al desarrollador antes de Corte
**La tabla de esta herramienta, en su primera carga, muestra una condición de carrera que hace desaparecer visualmente los datos ya guardados.** Reproducido de forma consistente y cronometrada en varias corridas:
- t ≈ 300ms tras abrir la pestaña: tabla sin filas (normal, todavía cargando).
- t ≈ 700ms: aparecen las filas reales correctamente (ej. "E22/Setup A", "E23/Setup B" con sus datos).
- t ≈ 1200ms en adelante (estable, no se recupera): la tabla vuelve a mostrar **"Esta tabla está vacía" / Total (0)**, aunque los datos siguen intactos en la base (confirmado por API: las 2 filas existen con `project_id`, `departamento` y `herramienta_id` correctos, exactamente los mismos que usa la query que hace el front).

Esto **no es pérdida de datos** (la base de datos está bien), pero es un bug de UI serio: cualquier usuario real que abra esta herramienta un segundo después de que cargó va a creer que perdió su trabajo, y muy probablemente vuelva a cargar los datos de nuevo (esto fue literalmente lo que me pasó a mí durante el QA, generando filas duplicadas que tuve que limpiar por API). Probé:
- El mismo componente con tipo `galeria` (`dir-continuidad-foto`, hoy) — **no** reproduce el bug, queda estable tras el fetch inicial.
- El componente bespoke de `ej-gestion-documental` (hoy) — tiene un parpadeo inicial breve (muestra demo → real) pero **se estabiliza** en el estado correcto y no se vacía después.
- Solo en `dir-control-horarios-1ad` (tipo `tabla` genérico) se reprodujo la reversión a vacío de forma persistente en todas las corridas.

No alcancé a aislar la causa exacta en el código en el tiempo de este ciclo (candidato más probable: el `useEffect(() => { load(); }, [load])` de `HerramientaPanel.tsx` ejecutándose dos veces — posible doble invocación de efectos de React 18/Next dev mode — donde la segunda invocación de `load()` resuelve con un resultado vacío por algún motivo que no determiné; la primera consulta sí trae los datos correctos). Recomiendo al desarrollador reproducir con el mismo cargo/cuenta y revisar si es específico de esta herramienta, de "tipo tabla" en general, o de condiciones de carrera en modo desarrollo (`next dev`) que no se repiten en producción. **Hasta que esto se entienda, no debería pasar a Corte.**

### No regresión
- `npm run lint`: mismos 98 errores / 36 warnings preexistentes, nada nuevo atribuible a este cambio.
- `npm run build`: no evaluable en este entorno (symlink de `node_modules` rompe Turbopack — problema de worktree, no de código).
- No afecta a `dir-control-horarios` (Asistencia de dirección), que sigue siendo una herramienta separada sin cambios.

### Responsive
- **390px**: sin scroll horizontal a nivel de página (`document.documentElement.scrollWidth === clientWidth === 390`, confirmado por JS). La tabla interna SÍ tiene su propio scroll horizontal controlado (`.hp-table-wrap { overflow-x: auto }`, confirmado), y pude desplazarlo programáticamente hasta ver la columna "Acciones" (borrar fila) — es decir, el patrón "page sin scroll + contenedor de tabla con su propio scroll" funciona y la herramienta es operable de punta a punta en este ancho (dí de alta/edité/borré filas reales).
- **820px / 1440px**: sin scroll horizontal, tabla con más columnas visibles sin necesidad de scroll interno.
- `qa_responsive_ok: true` para el aspecto de ancho/overflow — **pero con la salvedad del bug de carga intermitente de arriba**, que es un problema de datos/estado, no de layout, y que el comité debe conocer igual antes de aprobar Corte.

## Desarrollo (25/11/2026) — bug de carga intermitente: causa raíz y fix

**Reproducido con Playwright** (`NODE_USE_ENV_PROXY=1 npm run dev --webpack -p 3100`, cuenta `qa.dir-1ad2@mailinator.com`, mismo proyecto). Confirmado el síntoma tal cual lo describió QA: la tabla carga las 2 filas reales (E22/Setup A, E23/Setup B) y, entre ~400ms y ~1000ms después, revierte a "Esta tabla está vacía" / "Total (0)" de forma estable — sin que la base de datos pierda nada. Reproducido de forma intermitente en runs limpios (sin que yo tocara código entre corridas), descartando de entrada el candidato que sugería QA.

**Candidato de QA descartado:** no es doble invocación de `useEffect`/`load()` por React Strict Mode. Instrumenté `load()` con un contador de "cuántas veces se llamó" y de mounts/unmounts del componente: en TODAS las corridas (buenas y malas) `load()` se llamó exactamente **una vez** para `dir-control-horarios-1ad`, y el componente montó una sola vez (un solo `instId`, sin remount). El Strict Mode de dev no estaba duplicando nada acá.

**Causa raíz real, confirmada con instrumentación (no solo hipótesis):** `HerramientaPanel` (vía su sub-componente interno, el que mantiene el estado `filas`) **se reutiliza sin remount** cuando el panel padre (`HerramientasPanel.tsx`) cambia qué `herramienta` le pasa como prop — no tiene `key`, así que React no desmonta/remonta, solo actualiza props sobre el mismo fiber. Eso es correcto en general, pero `HerramientasPanel.tsx` dispara la selección de "qué herramienta mostrar" desde **dos efectos distintos que pueden resolverse en momentos distintos**: el auto-select de la primera herramienta disponible (`if (cargoSubTools.length > 0) abrir(cargoSubTools[0])`) y el restore de la última herramienta abierta (por `localStorage`, o por el click del usuario). En la secuencia real que reproduje:

1. El panel monta mostrando temporalmente otra herramienta compartida de Dirección (`dir-calendario-ensayos`) mientras se resuelve cuál es la herramienta correcta a mostrar.
2. Casi de inmediato cambia la prop `herramienta` a `dir-control-horarios-1ad` (mismo fiber, sin remount) — dispara un *nuevo* `load()` para la herramienta correcta, que resuelve con las 2 filas reales. `filas` se actualiza bien.
3. El fetch de `dir-calendario-ensayos` del paso 1, que había quedado **en vuelo** (todavía no había resuelto cuando la prop ya había cambiado), **resuelve después** — y como `load()` no tenía ninguna forma de saber que ya era una respuesta obsoleta, llama a `setFilas([])` (esa herramienta no tiene filas) igual, pisando las 2 filas reales que ya se habían pintado para `dir-control-horarios-1ad`.

Confirmado con logs instrumentados mostrando la secuencia exacta: `setFilas call forId=dir-control-horarios-1ad len=2` (correcto) seguido, ~80ms después, de `setFilas call forId=dir-calendario-ensayos len=0` sobre el **mismo** fiber/instancia — exactamente el patrón de una respuesta tardía de un pedido viejo pisando el estado del pedido nuevo. Es una condición de carrera clásica de "stale response", agravada en esta herramienta porque es la primera vez que el cargo "1er asistente de dirección" tiene una herramienta `tipo: "tabla"` con filas reales cargadas (antes era `checklist` vacío) — con 0 filas reales, una respuesta tardía pisando `[]` con `[]` es indetectable a simple vista; acá, por primera vez, había datos reales que se podían ver desaparecer.

Por qué no lo reproduce `dir-continuidad-foto` (galería) ni `ej-gestion-documental` (bespoke): es pura cuestión de timing, no de tipo de herramienta — cualquier herramienta reutilizada en el mismo slot del panel padre justo después de otra con un fetch todavía en vuelo es candidata. `dir-control-horarios-1ad` lo expone de forma consistente porque está en la posición en la que el panel pasa primero por un "default" antes de asentarse en la herramienta final, y porque (a diferencia de antes) ahora SÍ tenía filas reales que hacían visible el pisado.

**Fix aplicado** en `app/hoy/HerramientaPanel.tsx` (función `load()`, dentro de `HerramientaData`): se agregó `loadReqRef` (un contador de "pedido más reciente"). Cada llamada a `load()` toma un `reqId` al entrar; después de esperar la respuesta de Supabase, si `loadReqRef.current !== reqId` (es decir, si mientras tanto se disparó OTRO `load()` más nuevo — típicamente porque `herramienta.id` cambió), la respuesta se descarta sin tocar `filas`/`meta`/`error`. Mismo patrón que el `let activo = true / return () => { activo = false }` que ya usa el repo en otros fetches de efecto (ver `ImgPreview` en este mismo archivo) pero expresado como contador en vez de flag booleano, porque acá el fetch lo dispara una función (`load`) reutilizada por el propio `useEffect(() => { load(); }, [load])`, no un efecto con cleanup directo.

Esto es un fix del **motor genérico de tabla** (`HerramientaPanel.tsx`), no de esta herramienta puntual — beneficia a cualquier herramienta `tabla`/`galeria`/`nota`/`checklist`/`ficha` que pueda quedar en el mismo escenario de reutilización de fiber con fetches superpuestos.

**Verificación:**
- `npx tsc --noEmit`: sin errores.
- Reproducción real con Playwright contra `npm run dev --webpack -p 3100`: **14 corridas limpias consecutivas** (antes del fix, el bug se reproducía en aproximadamente la mitad de las corridas) observando el estado de la tabla durante ~9 segundos por corrida (no solo el primer render) — las 2 filas reales (E22/Setup A, E23/Setup B, Total 2) quedaron estables en todas, sin reversión a "Esta tabla está vacía" en ningún punto de la ventana observada.
- Dev server detenido al terminar la verificación.

**Puede pasar a Corte** en lo que respecta a este bug — la salvedad de QA sobre el bug queda resuelta. Sigue pendiente, sin relación con esto, el bug ya documentado arriba de `/perfil` no escribiendo `profiles.cargo`.
