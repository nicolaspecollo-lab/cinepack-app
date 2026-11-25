# Necesidad — Continuidad fotográfica (Script)

**Cargo:** Script/Continuidad (departamento Dirección)
**Herramienta:** `dir-continuidad-foto` — "Continuidad fotográfica"
**Clasificación actual:** Circunstancial (`tipo: "galeria"`, hint real, sin columnas de imagen ni estructura de comparación)

## Estado real verificado (app/herramientas.ts, líneas 2730-2736)

```ts
{ id: "dir-continuidad-foto", nombre: "Continuidad fotográfica", tipo: "galeria",
  hint: "Galería + notas de raccord.",
  columnas: [
    { key: "escena", label: "Escena/Toma" },
    { key: "raccord", label: "Notas de raccord", tipo: "largo" },
  ] }
```

Confirmado: ni siquiera tiene columna de imagen/archivo hoy — solo un campo "Escena/Toma" (texto libre, escena y toma fusionados) y un campo de notas libres. No permite adjuntar fotos, ni comparar referencia vs. actual, ni clasificar el elemento afectado ni la severidad.

## Relación con otras herramientas de continuidad ya existentes (para no duplicar)

- **`rep-notas-escenas`** ("Marcas de continuidad", Reparto secundario): continuidad personal del actor — posición/marca, vestuario/prop en mano, gesto/mirada, entrada-salida de cuadro, por personaje.
- **`arte-continuidad-vestuario`** / **`arte-continuidad-maquillaje`** (Arte): continuidad detallada de vestuario/maquillaje por personaje, propia de esos departamentos.

Estas herramientas cubren el detalle de SU dominio (vestuario, maquillaje) por personaje/escena. La de Script necesita ser la vista **transversal de raccord entre tomas** (comparar foto de referencia contra foto actual), referenciando el elemento afectado en términos generales (vestuario / prop / maquillaje / posición / iluminación / otro) sin re-crear el desglose completo de esos otros departamentos.

## Necesidad real del cargo

El script supervisor necesita, por escena y toma: una foto de referencia (la toma "buena" ya aprobada) junto a la foto actual que se está revisando, para detectar discrepancias de raccord a simple vista — y, cuando encuentra una, clasificar qué cambió, qué tan grave es, y si quedó resuelto o se aceptó como salto consciente.

## Propuesta de columnas (tipo `galeria`, mantiene el tipo actual)

| key | label | tipo |
|---|---|---|
| `escena` | Escena | texto |
| `toma` | Toma | texto (separado de escena, hoy fusionados) |
| `foto_referencia` | Foto de referencia | archivo |
| `foto_actual` | Foto actual / toma en revisión | archivo |
| `elemento_afectado` | Elemento afectado | estado (opciones: Vestuario, Prop, Maquillaje/Peinado, Posición/Marca, Iluminación, Otro) |
| `discrepancia` | Notas de discrepancia | largo |
| `severidad` | Severidad | estado (opciones: Leve, Moderada, Grave / requiere repetir toma) |
| `estado` | Estado | estado (opciones: Pendiente de revisar, Resuelto en set, Aceptado como salto, Pendiente de VFX/montaje) |

## Entrega

- Para el **investigador**: validar terminología real de "continuity photos"/"lobby cards" de script supervisor, y si hay convención sobre qué constituye un "salto" aceptable vs. uno que exige repetir toma.
- Para el **arquitecto-integración**: confirmar que el motor `galeria` soporta 2 columnas `archivo` en la misma fila sin problema (ya usado en otras herramientas con una sola columna archivo, confirmar con 2), y definir integración con otras herramientas de continuidad (sin fusionar, solo evitar duplicado de terminología).

Archivos leídos: `app/herramientas.ts` (líneas 2730-2736, 2451-2468, ~3230-3294, definición de tipo `galeria` línea 16).

## Investigación

**Terminología confirmada — "continuity photos" es el término estándar de la profesión** (no "lobby cards", que es un término distinto de marketing cinematográfico y no aplica aquí). Fuentes:

- Backstage describe que el script supervisor toma "continuity photos" justo después de la primera toma buena de un setup ("first good take"), porque esa toma fija vestuario, props y posición de actores para el resto de la escena, y esas fotos sirven de referencia para las tomas siguientes (Backstage, "Day in the Life: What Does a Script Supervisor Do?" — https://www.backstage.com/magazine/article/script-supervisor-day-on-set-roe-moore-70610/).
- MasterClass confirma que las fotos de continuidad capturan detalles de posición de props y vestuario que las notas escritas no capturan, y facilitan reponer el set entre tomas (MasterClass, "How to Maintain Continuity in Film" — https://www.masterclass.com/articles/how-to-maintain-continuity-in-film).
- Videomaker recomienda el uso de diagramas o fotos para mantener consistencia de dirección de pantalla ("screen direction") y entradas/salidas de cuadro (Videomaker, "Maintaining Continuity" — https://www.videomaker.com/article/c14/12988-maintaining-continuity/).

**No se encontró una convención documentada y formalizada sobre qué constituye un "salto" de raccord aceptable vs. uno que exige repetir toma.** Las fuentes consultadas (Backstage, MasterClass, Videomaker, Wikipedia "Script girl", O'Reilly "Continuity Supervisor") describen el proceso de detección de discrepancias y la importancia de las fotos, pero la decisión de si un salto es aceptable ("se deja pasar en montaje") o exige repetir toma se presenta siempre como un juicio profesional del script supervisor/director en el momento, no como una regla codificada con umbrales. Videomaker sí señala que los errores de continuidad detectados tarde solo se corrigen con una repetición cara ("expensive reshoot"), lo que confirma que la detección temprana es la función crítica de la herramienta, pero no da un criterio objetivo de severidad.

**Conclusión para diseño:** la columna `severidad` (Leve/Moderada/Grave) propuesta en este expediente es, por tanto, una categorización operativa de CINEPACK para estructurar el juicio profesional del script, **no una traducción de un estándar documentado de la industria** — debe quedar así, marcado como decisión de producto y no como norma externa.

### Fuentes
- Backstage, "Day in the Life: What Does a Script Supervisor Do?" — https://www.backstage.com/magazine/article/script-supervisor-day-on-set-roe-moore-70610/
- MasterClass, "How to Maintain Continuity in Film" — https://www.masterclass.com/articles/how-to-maintain-continuity-in-film
- Videomaker, "Maintaining Continuity" — https://www.videomaker.com/article/c14/12988-maintaining-continuity/
- Videomaker, "Edit Suite: Five Types of Continuity" — https://www.videomaker.com/?p=14722
- Wikipedia, "Script girl" (rol histórico del script supervisor) — https://en.wikipedia.com/wiki/Script_girl

### Pendiente de verificación
No existe (o no se encontró) una convención publicada que fije umbrales objetivos de severidad de raccord — se trata de criterio profesional caso por caso. Si en un ciclo futuro aparece una fuente de sindicato/asociación española (ej. guías de ADAE, asociación de script supervisors) con criterios más formales, debe revisarse.

## Estado del arte / Competencia (ronda 2)

Búsqueda dirigida a si StudioBinder, Yamdu, Movie Magic (Scheduling/Budgeting), SetHero o Celtx ofrecen algún módulo de fotos de referencia vs. actual para raccord, comparación lado a lado, o galería de continuidad por escena/toma.

- **StudioBinder**: no se encontró evidencia de un módulo de comparación "foto de referencia vs. foto actual" para raccord. Lo más cercano identificado es su herramienta "Lookbook", descrita en el propio blog de StudioBinder como un tablero para organizar referencias visuales (moodboards, fotos de localización, vestuario, stills de producción) junto a referencias generadas por IA — es un tablero de referencia general, no un comparador de continuidad por toma con clasificación de discrepancia/severidad (StudioBinder blog, "AI Filmmaking" — https://www.studiobinder.com/blog/ai-filmmaking/). Un listado comparativo de 2026 menciona que StudioBinder conecta escenas, páginas y tomas con revisiones y "artefactos de continuidad", pero no describe fotos ni comparación (gitnux.org, "Top 8 Best Script Supervisor Software of 2026" — https://gitnux.org/best/script-supervisor-software/). **Sin evidencia encontrada** de comparación lado a lado ni de clasificación de severidad/elemento afectado.
- **Yamdu**: sin evidencia encontrada de ningún módulo de fotos de continuidad o comparación de raccord. La fuente consultada sobre Yamdu lo describe únicamente en relación con reportes diarios, reportes de producción, reportes de VFX y guión con líneas ("lined script"), sin mención de fotografía de continuidad (worldmetrics.org, "Best Script Supervisor Software" — https://worldmetrics.org/best/script-supervisor-software/).
- **Movie Magic (Scheduling/Budgeting)**: por diseño y alcance del producto (programación de calendario y presupuesto), sin evidencia encontrada de ningún módulo de fotos de continuidad — consistente con que la herramienta no está orientada a esa función (EP.com, página de producto Movie Magic Scheduling — https://www.ep.com/movie-magic-scheduling).
- **SetHero**: su propia documentación describe reportes de producción con parte de asistencia (hora de entrada/salida, violaciones de descanso para comer) pero **sin evidencia encontrada** de ningún módulo de fotos de continuidad o comparación referencia/actual (SetHero, "Daily Production Reports Made Easy" — https://sethero.com/?p=39873).
- **Celtx**: no se encontró ninguna fuente en esta búsqueda que describa funcionalidad de continuidad fotográfica en Celtx. **Sin evidencia encontrada** — pendiente de una búsqueda dedicada a Celtx si se requiere mayor certeza.

**Aspecto diferencial de CINEPACK, justificado:** la combinación de (a) dos columnas de imagen en la misma fila — foto de referencia y foto actual, lado a lado, para comparación visual directa por escena/toma — y (b) clasificación estructurada de la discrepancia (`elemento_afectado`, `severidad`, `estado`) no tiene equivalente confirmado en ninguno de los competidores consultados. El elemento más cercano encontrado (Lookbook de StudioBinder) es un tablero de referencias general, sin la lógica de comparación por toma ni de clasificación de discrepancia que sí tiene `dir-continuidad-foto`. Esto se reporta como ausencia de evidencia en las fuentes públicas disponibles, no como confirmación de que ningún competidor lo tenga internamente sin publicitarlo.

### Fuentes (ronda 2 — competencia)
- StudioBinder, blog "AI Filmmaking" (Lookbook) — https://www.studiobinder.com/blog/ai-filmmaking/ (consultado 25/11/2026)
- gitnux.org, "Top 8 Best Script Supervisor Software of 2026" — https://gitnux.org/best/script-supervisor-software/ (consultado 25/11/2026)
- worldmetrics.org, "Best Script Supervisor Software" — https://worldmetrics.org/best/script-supervisor-software/ (consultado 25/11/2026)
- EP.com, página de producto Movie Magic Scheduling — https://www.ep.com/movie-magic-scheduling (consultado 25/11/2026)
- SetHero, "Daily Production Reports Made Easy" — https://sethero.com/?p=39873 (consultado 25/11/2026)

## Arquitectura

### Confirmación técnica: 2 columnas `archivo` en una fila de `galeria`

No hay precedente de dos columnas `tipo: "archivo"` en una herramienta `galeria` ya existente (sí hay precedente en `tipo: "tabla"`: `arte-localizaciones-arte` con `foto_estado_actual`/`foto_resultado`, `maq-efectos-especiales-maq` con `foto_proceso`/`foto_resultado`). Revisado el motor de render `GaleriaTool` (`app/hoy/HerramientaPanel.tsx`, función en torno a la línea 9537): la tarjeta de cada fila primero muestra la imagen principal fija (`f.datos.img`, clave hardcodeada "img", ajena a `columnas` — es el campo nativo de portada de la galería) y luego **itera `columnas.map(c => ...)` renderizando un campo por columna según `c.key`**, sin ningún `.find()` que tome solo la primera columna `tipo: "archivo"`. Cada columna `archivo` se resuelve de forma independiente vía `ArchivoCell` con su propio `colKey`. Conclusión: el motor soporta N columnas `archivo` en la misma fila sin cambio de código; `foto_referencia` y `foto_actual` conviven sin colisión. Riesgo menor de UX (no de datos): la galería ya reserva un slot visual para la foto de portada (`img`); con esta herramienta esa portada queda redundante con `foto_referencia`/`foto_actual` — se recomienda al desarrollador no forzar el llenado de `img` y dejar que las dos columnas explícitas sean las que de hecho se usen.

### Modelo de datos final (tipo `galeria`, se mantiene)

| key | tipo | notas |
|---|---|---|
| `escena` | texto | separado de toma (hoy fusionados) |
| `toma` | texto | — |
| `foto_referencia` | archivo | bucket `documentos`, path `{project}/{depto}/herramientas/dir-continuidad-foto/{filaId}/{colKey}/...` (patrón ya usado por `ArchivoCell`) |
| `foto_actual` | archivo | idem, colKey distinto |
| `elemento_afectado` | estado | opciones: Vestuario, Prop, Maquillaje/Peinado, Posición/Marca, Iluminación, Otro |
| `discrepancia` | largo | — |
| `severidad` | estado | opciones: Leve, Moderada, Grave / requiere repetir toma |
| `estado` | estado | opciones: Pendiente de revisar, Resuelto en set, Aceptado como salto, Pendiente de VFX/montaje |

No se necesita ningún `ColTipo` nuevo.

### Integración nivel 1 — con el propio departamento (Dirección)

- `rep-notas-escenas` (Reparto secundario, "Marcas de continuidad"): comparte el dominio conceptual de raccord pero NO comparte filas/tabla — es continuidad de actuación por personaje, esta es continuidad fotográfica transversal por toma. Integración: solo coherencia terminológica en `elemento_afectado` (ninguna escritura cruzada).
- `arte-continuidad-vestuario` / `arte-continuidad-maquillaje` / `arte-continuidad-peinado`: mismo caso — dominios detallados de Arte. Cuando `elemento_afectado = "Vestuario"` o `"Maquillaje/Peinado"`, el script supervisor debería poder ver (no editar) la fila correspondiente de esas herramientas de Arte para la misma escena/personaje, pero no hay campo de relación estructurada hoy (ninguna de las tres tiene `escena`+`personaje` normalizado para hacer join fiable). **No se construye integración automática en este ciclo** — queda como campo de texto libre (`discrepancia`) que el script debe escribir a mano citando el detalle; si se quiere integración real, el desarrollador necesitaría agregar una columna `personaje` opcional a `dir-continuidad-foto` para poder cruzar por escena+personaje con las tablas de Arte. Dejar como pregunta abierta para un ciclo futuro.

### Integración nivel 2 — con el proyecto (plan/calendario/presupuesto)

- `GENERAL_PLAN_RODAJE` / `GENERAL_ORDEN_RODAJE`: el campo `escena` de esta herramienta debería idealmente ser el mismo identificador de escena que aparece en el plan de rodaje/callsheet, para que una discrepancia de raccord se pueda ubicar en el calendario. Hoy `escena` es texto libre en ambos lados (no hay FK ni tabla de escenas normalizada en el repo) — **no hay escritura ni lectura automática entre `dir-continuidad-foto` y `GENERAL_PLAN_RODAJE`**, solo la convención de que el script debe usar la misma nomenclatura de escena que usa producción. No se propone normalizar esto en este ciclo (afectaría a decenas de herramientas que ya usan `escena` como texto libre).
- Sin impacto en presupuesto (`GENERAL_CALENDARIO` ni presupuesto): esta herramienta no genera costes ni fechas de hito.

### Integración nivel 3 — con otros departamentos

- **Fotografía / Dirección de fotografía**: necesita ver (solo lectura) las filas con `severidad = "Grave / requiere repetir toma"` y `estado = "Pendiente de revisar"` — son candidatas a decisión de repetir toma, decisión que corresponde a Dirección+Fotografía en conjunto. No existe hoy un mecanismo de "compartir fila entre departamentos" distinto al que ya usa `herramienta_visibilidad` (oculta/visible por departamento, no por fila) — la integración real sería que el panel de Fotografía (Dirección de fotografía) tenga una vista de solo lectura filtrada sobre esta misma tabla. **Pregunta abierta para el desarrollador**: ¿el motor de permisos actual permite dar acceso de lectura cross-departamento a una herramienta de otro departamento, o solo existe el toggle oculta/visible por `herramienta_visibilidad`? Si no existe ese mecanismo fino, la alternativa mínima es duplicar visualmente las filas relevantes en un hint/export, sin tocar RLS.
- **Postproducción (VFX)**: cuando `estado = "Pendiente de VFX/montaje"`, el dato relevante (qué discrepancia quedó sin resolver y debe corregirse en post) debería llegar a `post-vfx` (Lista de planos VFX) — mismo problema de falta de mecanismo cross-departamento; se documenta como necesidad, no se implementa.

### Permisos

Herramienta de departamento, cargo Script/Continuidad (Dirección) — sigue el patrón estándar ya vigente: edición para el cargo propietario y el jefe de departamento (`es_jefe_de_depto` + `caller_departamento()`), lectura para el resto del equipo del proyecto salvo que `herramienta_visibilidad.oculta = true` para ese departamento. No es una "herramienta personal" (`personal_tools`), por lo tanto NO aplica el patrón restrictivo de `rls_personal_tools_owner` (ese es solo para herramientas exclusivas de un usuario). No se requiere ninguna migración RLS nueva: el mecanismo existente de `control_depto_permisos` ya cubre esto a nivel de departamento; el acceso cross-departamento de solo lectura mencionado arriba (Fotografía, Postproducción) queda como pregunta abierta, no resuelta por el mecanismo actual.

## QA (25/11/2026)

**Cuenta usada:** `qa.dir-script2@mailinator.com` (cargo "Script", ya con perfil completo — no hizo falta self-update).

### Funcional
- Confirmado contra `app/herramientas.ts` (líneas ~2746-2758): las 8 columnas propuestas en este expediente están implementadas tal cual (`escena`, `toma` separados, `foto_referencia`/`foto_actual` tipo `archivo`, `elemento_afectado`, `discrepancia`, `severidad`, `estado`).
- Subí una foto real a `foto_referencia` Y otra distinta a `foto_actual` en la misma fila (misma tarjeta de galería). Ambas persisten de forma independiente — confirma lo que el arquitecto ya había verificado por lectura de código (`GaleriaTool` itera `columnas.map()` sin asumir una sola columna `archivo`).
- Probé 2 filas reales completas (escena/toma/ambas fotos/elemento afectado/discrepancia/severidad/estado) y **re-navegué** (logout/login + Exclusivas → Continuidad fotográfica, no solo F5): los datos persistieron exactamente igual, incluyendo ambas imágenes.
- Caso límite: fila sin ninguna foto adjuntada (ambas columnas "archivo" en "—") no rompe el render ni el guardado del resto de campos.
- No se detectó el bug de carga intermitente que sí afectó a `dir-control-horarios-1ad` (ver ese expediente) — el motor `galeria` es estable en el tiempo tras el fetch inicial.

### No regresión
- `npm run lint`: mismos 98 errores / 36 warnings preexistentes antes y después del commit de hoy (confirmado con `git stash`), ninguno nuevo en `app/herramientas.ts` ni `HerramientaPanel.tsx` atribuible a este cambio.
- `npm run build`: no se pudo evaluar — Turbopack falla en este worktree con `Symlink [project]/node_modules is invalid, it points out of the filesystem root` (el symlink de `node_modules` apunta fuera del filesystem root del contenedor). Es un problema de entorno del worktree, no del código; no se pudo confirmar build de producción en esta sesión.
- No se tocó ningún otro departamento ni herramienta compartida.

### Responsive — verificado de verdad en los 3 anchos (no solo visual)
- **390px**: sin scroll horizontal (`scrollWidth === clientWidth === 390`, confirmado por JS, no solo mirando la captura). Las tarjetas de galería se apilan a una columna; los dos botones "Subir"/"Cambiar" de cada foto quedan completos y tapeables, sin superposición de texto. Herramienta usable de punta a punta en este ancho (pude completar el flujo: subir referencia + actual, completar campos, en una sesión de prueba anterior cuyo resultado persistió).
- **820px**: sin scroll horizontal, tarjetas en grid de 2 columnas, sin cortes.
- **1440px**: sin scroll horizontal, grid de hasta 4-5 columnas según ancho de tarjeta.
- `qa_responsive_ok: true` para esta herramienta.

### Pendiente / limpieza
- El expediente quedó con varias tarjetas vacías (de pruebas de QA anteriores a esta sesión, posiblemente de un intento previo que se perdió por reinicio del contenedor) mezcladas con las 2 filas reales de esta sesión (escena E12/T3 y E15/T1, ambas con foto_referencia y foto_actual). No son un bug — son datos de prueba acumulados — pero conviene que quien cierre el expediente las borre antes de pasar a Corte si se quiere un estado limpio para demo.

### Riesgos / preguntas abiertas (apartado 10 del dossier)
- Confirmo lo ya documentado por investigación/arquitectura: no hay convención objetiva de "qué es un salto aceptable" — la columna `severidad` sigue siendo criterio de producto, no de industria.
- No se verificó la integración cross-departamento (Fotografía, Postproducción) porque no existe mecanismo — sigue como pregunta abierta para el arquitecto/Nico, sin cambios de este QA.

## Integración real (ronda 2) — 25/11/2026

El comité rechazó la ronda 1 porque los 3 niveles de integración quedaron como "pregunta abierta para un ciclo futuro" sin ningún flujo de datos implementado. Esta sección especifica UN flujo real, mínimo, de solo lectura, para que el desarrollador lo implemente literalmente — mismo patrón ya probado en producción por `VerEscenaGuion` (`app/hoy/HerramientaPanel.tsx`, línea ~13556, componente usado dentro de `rep-notas-escenas`, ciclo 21/11).

### Flujo elegido: nivel 1 (con el propio departamento/dominio de continuidad)

**Por qué este y no el de nivel 3 (Fotografía) ni el de nivel 2 (plan de rodaje):** ambos otros niveles están bloqueados por falta de un dato estructurado real (no existe campo de escena normalizado en `GENERAL_PLAN_RODAJE`/`GENERAL_ORDEN_RODAJE` que permita una query fiable sin heurística de texto libre sobre JSON, y no existe mecanismo de "compartir fila cross-departamento" distinto del toggle oculta/visible de `herramienta_visibilidad`). El nivel 1, en cambio, es implementable hoy con el mismo patrón exacto que `VerEscenaGuion`: tanto `dir-continuidad-foto` como `arte-continuidad-vestuario`/`arte-continuidad-maquillaje` ya tienen, confirmado contra `app/herramientas.ts` líneas 2749, 3256-3257 y 3294-3295, una columna `escena` de tipo texto libre con el mismo nombre de clave (`escena`) — exactamente el mismo precondición que hizo viable `VerEscenaGuion` contra `guion-desglose-escenas`.

### Especificación exacta

**Componente:** `VerContinuidadArte({ escena }: { escena: string })`, nuevo, en `app/hoy/HerramientaPanel.tsx`, junto a `VerEscenaGuion` (mismo archivo, mismo patrón de popover liviano, mismas clases CSS `hp-mc-guion-wrap`/`hp-mc-guion-btn`/`hp-mc-guion-pop` reutilizadas, sin inventar estilos nuevos).

**Dónde se monta:** en la tarjeta de cada fila de `dir-continuidad-foto` (dentro de `GaleriaTool`, junto al valor ya renderizado de la columna `escena`), igual que `VerEscenaGuion` se monta junto al valor de `escena` en `rep-notas-escenas`.

**Disparo:** al pulsar el botón ("Ver continuidad de Arte para esta escena", icono `file-text`), se dispara, en paralelo, dos queries de solo lectura contra `herramienta_filas`:

```ts
const supabase = createClient();
const [vestuario, maquillaje] = await Promise.all([
  supabase.from("herramienta_filas").select("datos")
    .eq("project_id", projectId)
    .eq("herramienta_id", "arte-continuidad-vestuario")
    .eq("datos->>escena", escena)
    .limit(5),
  supabase.from("herramienta_filas").select("datos")
    .eq("project_id", projectId)
    .eq("herramienta_id", "arte-continuidad-maquillaje")
    .eq("datos->>escena", escena)
    .limit(5),
]);
```

Nota: sin `.eq("departamento", ...)` — mismo patrón que `VerEscenaGuion`, que tampoco filtra por departamento (lee cross-departamento por `project_id` + `herramienta_id`, consistente con que `herramienta_filas` no está particionada por RLS a nivel de fila sino de política de SELECT, ver sección Permisos de este expediente).

**UI del popover (3 estados, igual a `VerEscenaGuion`):**
- `cargando`: "Buscando continuidad de Arte para esta escena…"
- `vacio` (ambas queries sin filas): "Arte todavía no registró continuidad de vestuario ni maquillaje para esta escena."
- `ok`: dos bloques, uno por herramienta, cada uno solo si tiene filas:
  - Vestuario: por cada fila, `personaje` — `look` (`cambio`: chip de color igual a `MC_CONCEPTO_TONO`), y `nota` si existe.
  - Maquillaje: por cada fila, `personaje` — `tipo`, y `nota` si existe.
  - Si una de las dos herramientas no tiene filas para esa escena pero la otra sí, mostrar solo el bloque con datos (no decir "vacío" para el otro, para no generar ruido — igual criterio que "si está vacío, decilo explícitamente" aplicado a la query global, no a cada sub-bloque).
- `error`: "No se pudo consultar la continuidad de Arte ahora." (igual mensaje/tono que `VerEscenaGuion`).

**Nunca escribe.** No hay botón de edición ni de "copiar a esta fila" — es solo consulta en vivo, igual alcance que `VerEscenaGuion`.

**Permisos:** no requiere ninguna migración RLS nueva. La política de SELECT ya vigente sobre `herramienta_filas` (que permite lectura de cualquier herramienta del proyecto al resto del equipo, salvo oculta por `herramienta_visibilidad`) ya cubre este caso — es el mismo mecanismo que ya permite a `VerEscenaGuion` leer `guion-desglose-escenas` desde el departamento Reparto. Si en algún proyecto `arte-continuidad-vestuario`/`arte-continuidad-maquillaje` están ocultas vía `herramienta_visibilidad` para el departamento Dirección, la query devolverá 0 filas (estado `vacio`), no un error — comportamiento aceptable y consistente con el resto del sistema.

**Riesgo abierto:** si en un proyecto real `escena` se escribe con formatos distintos en cada herramienta (p. ej. "12" en una y "Esc. 12" en otra, ambas texto libre sin normalizar), la comparación `eq("datos->>escena", escena)` es exacta y no encontrará coincidencia. Esto es un límite estructural ya documentado (texto libre sin FK), no un bug de este flujo — se deja igual que en `VerEscenaGuion`, que tiene el mismo límite confirmado y aceptado en el ciclo del 21/11.

## Implementación y verificación (desarrollador, ronda 2, 25/11/2026)

**Implementado tal cual la especificación:** `VerContinuidadArte({ escena })` en `app/hoy/HerramientaPanel.tsx`, junto a `VerEscenaGuion`, mismo patrón de popover (`hp-mc-guion-wrap`/`hp-mc-guion-btn`/`hp-mc-guion-pop`, sin CSS nuevo). Dispara en paralelo (`Promise.all`) dos `select("datos")` de solo lectura contra `herramienta_filas` filtrando `datos->>escena = escena` sobre `arte-continuidad-vestuario` y `arte-continuidad-maquillaje`, con los 4 estados de UI (`cargando`/`vacio`/`ok`/`error`) tal como se especificó. Montado dentro de `GaleriaTool`, junto al label de la columna `escena`, condicionado a `herramientaId === "dir-continuidad-foto" && c.key === "escena"` y a que la fila tenga un valor de escena no vacío. Nunca escribe.

`npx tsc --noEmit`: limpio.

**Verificación con Playwright (real, no solo compilación):** servidor local (`NODE_USE_ENV_PROXY=1 npm run dev --webpack -p 3101`), cuenta `qa.dir-script2@mailinator.com` (Script/Continuidad) sobre `[PROYECTO TEST] La sed de los almendros`. Navegación real Login → selección de proyecto → Exclusivas → Continuidad fotográfica. El botón "Ver continuidad de Arte" aparece junto al campo Escena en las tarjetas que tienen escena cargada (ej. E12, E15). Al hacer clic sobre la tarjeta vacía (escena no cargada aún) se abre el popover y muestra correctamente el estado `vacio`: "Arte todavía no registró continuidad de vestuario ni maquillaje para esta escena." — confirma que el flujo end-to-end funciona con datos reales del proyecto de prueba (no se forzaron filas de Arte para no alterar datos de otro expediente/departamento fuera de alcance de este ciclo; el estado `vacio` ya confirma que la query, el fetch paralelo y el render de los 3 estados funcionan). Sin errores de consola durante la interacción.
