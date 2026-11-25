# Necesidad — Control de horarios y avisos al equipo (Asistencia de dirección)

**Cargo:** Asistencia de dirección (departamento Dirección)
**Clasificación actual:** Vacía — duplicado sin adaptar del "Control de horarios y avisos (1AD)"

## Estado confirmado (app/herramientas.ts del worktree)

- Línea 2701: `{ id: "dir-control-horarios-1ad", nombre: "Control de horarios y avisos al equipo (1AD)", tipo: "checklist", hint: "Checklist de control de tiempos del día: wrap de cada setup, alertas de overtime, notificaciones al equipo." }` — cargo 1er asistente de dirección. Circunstancial (hint real, sin columnas).
- Línea 2707: `{ id: "dir-control-horarios", nombre: "Control de horarios y avisos al equipo", tipo: "checklist" }` — cargo Asistencia de dirección, sin hint, mismo nombre salvo "(1AD)". Confirmado Vacía.
- No hay render específico bajo `app/hoy/` para `dir-control-horarios` — checklist genérico sin diferenciación.

## Propuesta: diferenciar, no fusionar

1AD y Asistencia de dirección hacen trabajos distintos en un rodaje real, aunque ambos giren alrededor del horario del día:

- **1AD** controla el CÁLCULO de tiempos: wrap por setup, cómputo de horas trabajadas, disparo de alertas de overtime según convenio. Es un registro de eventos de tiempo (setup, hora prevista, hora real, delta, overtime cruzado o no).
- **Asistencia de dirección** gestiona la COMUNICACIÓN OPERATIVA del plan hacia el equipo: avisos de citación, cambios de horario de último momento, confirmaciones de recepción por persona/departamento. Es un centro de avisos con estado de lectura/confirmación por destinatario, no un checklist de tiempos.

Esto es coherente con que "2ª Asistencia de dirección" ya tiene su propia herramienta separada de figuración — cada escalón de asistencia de dirección tiene un foco operativo distinto en este sistema, no deben fusionarse mecánicamente.

## Renombre y estructura propuestos

- **1AD** conserva "Control de horarios y overtime" (`dir-control-horarios-1ad`) — tabla con columnas: setup/escena, hora prevista de wrap, hora real, delta, overtime (sí/no), observación. (Fuera del alcance de hoy — no se toca.)
- **Asistencia de dirección** pasa a **"Avisos y confirmaciones de citación al equipo"** (mismo id `dir-control-horarios`, contenido rediseñado) — tabla con columnas:

| key | label | tipo |
|---|---|---|
| `mensaje` | Aviso / mensaje | texto |
| `destinatario` | Destinatario o departamento | texto |
| `fecha_envio` | Fecha y hora de envío | fecha |
| `canal` | Canal | estado (opciones: WhatsApp, Llamada, Presencial, Callsheet) |
| `estado_confirmacion` | Estado de confirmación | estado (opciones: Pendiente, Confirmado, No leído) |
| `confirmado_por` | Quién confirmó | texto |

## Alternativa de fusión (descartada salvo decisión del arquitecto)

Si se fusionara, debería quedar una tabla con un campo "tipo de registro" (evento de tiempo vs. aviso) y permisos distintos por cargo — se desaconseja: mezcla dos flujos de datos con columnas distintas (tiempos vs. destinatarios/confirmaciones), a diferencia del precedente de Flujo de caja/Presupuesto (dos vistas del MISMO dato financiero).

## Recomendación / entrega

- Para el **investigador**: validar terminología real de "call sheet changes/crew notifications" en rodajes.
- Para el **arquitecto-integración**: definir el modelo de tabla final y si ambas herramientas comparten familia de id `dir-control-horarios-*` o quedan separadas; actualizar `inventario.md` (línea 27): `dir-control-horarios` pasa de "Vacía/duplicado" a "necesidad definida: centro de avisos de citación".

Archivos leídos: `app/herramientas.ts` (líneas 2696-2709), `oficina/inventario.md` (línea 27), `oficina/cola-merge.md` (precedente de fusión Flujo de caja/Presupuesto).

## Arquitectura

### Decisión sobre el id

Se mantiene el id de código `dir-control-horarios` (no se crea uno nuevo). Verificado por búsqueda en todo el worktree: el id aparece en `app/herramientas.ts` (declaración única, línea 2707), en `messages/es.json`, `messages/en.json`, `messages/ca.json` (clave de traducción del nombre visible) y en documentación de oficina (`inventario.md`, `backlog.md`, `.claude/agents/depto-direccion.md`). **No** hay ningún render específico bajo `app/hoy/` para este id (confirmado por el agente de depto) ni ninguna referencia en tests — es un `tipo: "tabla"` genérico que lee `columnas` desde el registro y lo pinta con `HerramientaPanel.tsx`. Como el nombre visible al usuario vive en los `messages/*.json` (no en el id), renombrar el `nombre`/contenido sin tocar el id no rompe nada: solo hay que actualizar la cadena de traducción en los 3 idiomas y el array `columnas`. Cambiar el id en cambio obligaría a migrar filas existentes de `herramienta_filas` (`herramienta_id = "dir-control-horarios"` → nuevo valor) sin beneficio real, y arrastraría todas esas referencias de documentación. Motivo de la decisión: menor costo de cambio, cero filas de producción reales todavía (herramienta Vacía) y el id es un slug interno, no contenido visible — no hace falta que describa literalmente el contenido.

### Modelo de datos final

`tipo: "tabla"`, columnas (todas con tipos existentes de `ColTipo`, sin tipo nuevo):

| key | label | tipo |
|---|---|---|
| `mensaje` | Aviso / mensaje | texto |
| `destinatario` | Destinatario o departamento | texto |
| `fecha_envio` | Fecha y hora de envío | fecha |
| `canal` | Canal | estado (opciones: WhatsApp, Llamada, Presencial, Callsheet) |
| `estado_confirmacion` | Estado de confirmación | estado (opciones: Pendiente, Confirmado, No leído) |
| `confirmado_por` | Quién confirmó | texto |

Se confirma la propuesta del agente de depto sin cambios de columnas.

### Nivel 1 — con el propio departamento (Dirección)
- **`dir-control-horarios-1ad`** (1AD, Circunstancial, fuera del alcance de hoy): registra eventos de TIEMPO (setup/wrap/overtime), no avisos. No comparte filas ni columnas con `dir-control-horarios`: son dos `herramienta_id` distintos en `herramienta_filas`, sin relación de clave. Se descarta expresamente la fusión (ya razonado en `necesidad.md` arriba — columnas de naturaleza distinta, a diferencia del precedente válido Flujo de caja/Presupuesto que son dos vistas del MISMO dato financiero). Si en un futuro ciclo se decide fusionar, habría que introducir una columna discriminadora (`tipo_registro`: "Tiempo" | "Aviso") y permisos distintos por fila, lo que el `ColTipo` actual (`estado`) ya permitiría sin tipo nuevo — queda documentado como alternativa viable, no implementada hoy.
- No hay otras herramientas de departamento Dirección que comparta datos con esta tabla de avisos.

### Nivel 2 — con el proyecto en su conjunto
- No escribe en `GENERAL_CALENDARIO`/`GENERAL_PLAN_RODAJE`/`GENERAL_ORDEN_RODAJE` de forma automática. Flujo real: Asistencia de dirección suele avisar sobre cambios que SÍ están en `GENERAL_ORDEN_RODAJE` (orden del día) o `GENERAL_CALENDARIO`, pero el aviso en sí (`mensaje`, `destinatario`, `canal`) es un registro de comunicación, no un dato de planificación — no corresponde escribirlo ahí. Pregunta abierta para un ciclo futuro: si se quisiera trazabilidad bidireccional (ej. un aviso de "cambio de horario" que referencie el día/escena de `GENERAL_ORDEN_RODAJE`), se podría agregar una columna opcional `referencia_jornada` (tipo `texto` o `link` a la fila del Orden de rodaje) — no se agrega hoy por falta de necesidad confirmada por el cargo.

### Nivel 3 — con otros departamentos
- Es, por naturaleza, transversal: los destinatarios de los avisos son personas/departamentos de TODO el equipo (campo `destinatario`), no solo Dirección. El dato que otros departamentos necesitan ver es su propia fila filtrada por `destinatario` — por ejemplo, un jefe de Fotografía debería poder ver los avisos donde `destinatario` lo mencione a él o a su departamento, para saber si tiene una confirmación pendiente.
- Esto **no** se resuelve con RLS por departamento (la RLS base de `herramienta_filas` ya da lectura a cualquier miembro del proyecto, según el comentario de `app/api/plan-financiacion/sincronizar-hito/route.ts`: "RLS de herramienta_filas ('ver = cualquier miembro del proyecto')"), así que cualquier cargo ya puede leer esta tabla sin cambios adicionales de permisos. Lo que falta es solo de **presentación**: un filtro en el panel de "Hoy" de cada cargo que muestre "avisos dirigidos a mí/mi departamento" — eso es responsabilidad del desarrollador de UI, no del modelo de datos ni de RLS.

### Permisos
- **Edita**: Asistencia de dirección (RLS base por departamento, igual que cualquier herramienta de cargo).
- **Ve, no edita**: 1AD y resto del equipo — lectura abierta ya cubierta por la RLS base de `herramienta_filas` citada arriba; no se necesita entrada nueva en `herramienta_asignaciones` salvo que Dirección quiera restringir la lectura (no es el caso: son avisos que por definición deben ser visibles a quien los recibe).
- **Espacio**: 100% común del proyecto — no hay campo privado de cargo (un aviso de citación no tiene sentido como nota privada).

### Librerías
Sin necesidad de librería externa — tabla estándar del motor genérico (`HerramientaPanel.tsx`), igual que `prod-transporte`.

## Investigación

### Terminología de la industria

El término estándar en la industria para este flujo es "call sheet distribution" y "crew/cast notifications" (avisos de citación), con seguimiento de "confirmations"/"RSVP" por destinatario — exactamente la terminología que ya usa StudioBinder en su documentación de producto (ver abajo). En español de producción audiovisual la terminología habitual, consistente con el resto del inventario de CINEPACK (que ya usa "orden de rodaje" para el callsheet), es "aviso de citación" o "parte de citación" y "confirmación de recepción/lectura" — no se encontró un glosario normativo único en español que fije estos términos (los sindicatos no publican un glosario de terminología de callsheet), por lo que la propuesta de columnas del expediente (`mensaje`, `destinatario`, `canal`, `estado_confirmacion`, `confirmado_por`) es coherente con el uso de la industria pero no está respaldada por una fuente normativa española específica.

### Competencia: StudioBinder ya resuelve esto, como referencia de diseño

StudioBinder tiene un sistema de distribución de orden de rodaje con confirmación de lectura, en beta según el propio blog de producto: permite enviar la orden de rodaje por email/SMS, ver qué destinatarios la abrieron ("read tracking") y cuáles no, y que el reparto/equipo confirme sin necesidad de cuenta ("RSVP directly from the email without needing an account") (StudioBinder, "Call Sheet Confirmations Have Arrived", consultado 22/11/2026: https://studiobinder.com/call-sheet-confirmations-have-arrived-at-studio-binder). El propio fabricante describe el sistema de distribución con seguimiento de apertura y confirmación como una mejora reciente de su producto (StudioBinder, "new features reach your crews inbox with more confidence", consultado 22/11/2026: https://studiobinder.com/blog/new-features-reach-your-crews-inbox-with-more-confidence). Su guía de mejores prácticas de distribución de callsheet recomienda, como práctica estándar del sector (no exclusiva de StudioBinder), pedir confirmación de recepción en el cuerpo del email y enviar en PDF de solo lectura (StudioBinder, "5 best practices for distributing call sheets", consultado 22/11/2026: https://www.studiobinder.com/blog/5-best-practices-for-distributing-call-sheets). No se encontraron reseñas independientes (de terceros, no del propio fabricante) que confirmen el funcionamiento real de este sistema de confirmaciones en producción.

**Esto no significa que CINEPACK no deba construirlo**: es una referencia de diseño de un competidor directo que ya valida la necesidad (seguimiento de lectura + confirmación por destinatario + posibilidad de reenviar solo a quien no confirmó), y refuerza que las columnas `estado_confirmacion` (Pendiente/Confirmado/No leído) y `confirmado_por` propuestas en el expediente están alineadas con el estado del arte del sector.

No se encontró evidencia de un módulo equivalente documentado para Yamdu, Movie Magic, SetHero o Celtx en las búsquedas realizadas — **no se puede confirmar su ausencia con certeza** (podría existir sin documentación pública indexada), por lo que se marca como "sin evidencia encontrada", no como "confirmado que no lo tienen".

### Normativa española aplicable (horarios y avisos de citación)

El convenio de referencia es el III Convenio colectivo estatal de la industria de producción audiovisual (técnicos), publicado en el BOE el 6 de abril de 2024 (BOE-A-2024-6846, https://BOE.ES/boe/dias/2024/04/06/pdfs/BOE-A-2024-6846.pdf, consultado 22/11/2026). Su artículo 17.2.a) regulaba precisamente las alteraciones de horario sobre planes de trabajo ya establecidos, exigiendo un aviso previo mínimo de 48 horas a las personas afectadas — es decir, la norma española sí fija (o fijaba) un plazo mínimo de preaviso para cambios de citación, lo cual justifica directamente la necesidad de un registro con fecha/hora de envío y estado de confirmación.

**Importante — hallazgo relevante para el diseño**: la Audiencia Nacional, en sentencia de 21 de abril de 2025, declaró nulo por ilegalidad ese artículo 17.2.a) del convenio, en un procedimiento promovido por TACE; existe además una demanda adicional de CGT de enero de 2025 contra el mismo convenio (Resolución de 5 de mayo de 2025, publicada en BOE el 19 de mayo de 2025: https://www.boe.es/boe/dias/2025/05/19/pdfs/BOE-A-2025-9881.pdf, consultado 22/11/2026). Esto significa que, a fecha de este ciclo, el plazo de 48 horas de preaviso para cambios de horario **no es exigible** según este fallo judicial, aunque la situación puede ser objeto de recurso o de renegociación del convenio. Se recomienda que la herramienta no "hardcodee" un plazo legal de preaviso como validación obligatoria, dado que está en litigio, y que el campo de fecha de envío sea de registro libre, no una regla de negocio basada en un plazo legal actualmente anulado. Fuente secundaria descriptiva del convenio: panoramaaudiovisual.com, "Claves del III Convenio Colectivo de Técnicos de la Industria Audiovisual" (consultado 22/11/2026: https://www.panoramaaudiovisual.com/en/2024/04/23/claves-iii-convenio-colectivo-tecnicos-industria-audiovisual).

### Fuentes
- StudioBinder, "Call Sheet Confirmations Have Arrived" — https://studiobinder.com/call-sheet-confirmations-have-arrived-at-studio-binder (consultado 22/11/2026)
- StudioBinder, "new features reach your crews inbox with more confidence" — https://studiobinder.com/blog/new-features-reach-your-crews-inbox-with-more-confidence (consultado 22/11/2026)
- StudioBinder, "5 best practices for distributing call sheets" — https://www.studiobinder.com/blog/5-best-practices-for-distributing-call-sheets (consultado 22/11/2026)
- BOE, III Convenio colectivo estatal de la industria de producción audiovisual (técnicos) — https://BOE.ES/boe/dias/2024/04/06/pdfs/BOE-A-2024-6846.pdf (consultado 22/11/2026)
- BOE, Resolución de 5 de mayo de 2025 (sentencia Audiencia Nacional sobre art. 17.2.a) del convenio) — https://www.boe.es/boe/dias/2025/05/19/pdfs/BOE-A-2025-9881.pdf (consultado 22/11/2026)
- Panorama Audiovisual, "Claves del III Convenio Colectivo de Técnicos de la Industria Audiovisual" — https://www.panoramaaudiovisual.com/en/2024/04/23/claves-iii-convenio-colectivo-tecnicos-industria-audiovisual (consultado 22/11/2026)

## QA

**Fecha:** 22/11/2026. Verificado contra `cinepack-dev` real (`npm run dev -- -p 3501`, `NODE_USE_ENV_PROXY=1`), cuenta `qa.dir-asistencia2@mailinator.com`, proyecto `[PROYECTO TEST] La sed de los almendros`, Playwright con Chromium real (sin mockups).

**Perfil:** ya estaba completo (full_name, departamento "Dirección", cargo "Asistencia de dirección", país/provincia residencia y producción España/Madrid, `acepta_tratamiento_datos`) — no hizo falta self-update.

**Funcional:**
- Login real, navegación Exclusivas → "Avisos y confirmaciones de citación al equipo" (id `dir-control-horarios`), confirmado el golden path: tabla vacía → "+ Agregar primera fila" → 2 filas con datos reales (aviso de cambio de call, destinatario, fecha, canal, estado, confirmado por). Columnas confirmadas exactamente como en el apartado de arquitectura: `mensaje`, `destinatario`, `fecha_envio`, `canal` (estado: WhatsApp/Llamada/Presencial/Callsheet), `estado_confirmacion` (estado: Pendiente/Confirmado/No leído), `confirmado_por`.
- Texto, destinatario y fecha persisten correctamente tras reload (re-navegando Exclusivas → la herramienta, como es el comportamiento normal del sistema).
- Caso límite probado: agregar fila con solo el campo "mensaje" completado (resto vacío) — no bloquea, guarda igual.

**BUG encontrado (no corregido, requiere intervención del desarrollador):** las columnas tipo **`estado`** (dropdown `CpSelect`: `canal` y `estado_confirmacion`) **no persisten su valor en la base de datos**, pese a que la UI muestra el valor seleccionado correctamente hasta que se recarga. Confirmado directamente contra la tabla `herramienta_filas` en Supabase (no solo visualmente): el campo seleccionado queda simplemente ausente del JSON `datos` tras guardar.
- Repro: abrir cualquier fila de esta tabla → hacer clic en el selector de "Canal" → elegir cualquier opción (p. ej. "Callsheet") → esperar unos segundos → recargar y re-navegar a la herramienta → el valor vuelve a "—". Lo mismo ocurre con "Estado de confirmación".
- Causa probable (ubicada, no corregida): en `app/hoy/HerramientaPanel.tsx`, dentro de `CeldaConAutocomp` (columnas `tipo === "estado"`, línea ~2068), el `CpSelect` llama `onChange={(v) => { onChange(v); onCommit(); }}` — es decir, invoca `onCommit()` (función `commit(f)`, línea ~8618) de forma síncrona e inmediatamente después de `onChange()` (función `setVal`, línea ~8615, que hace `setDraft(...)`). Como `setDraft` es un `setState` de React y no se aplica de forma síncrona, `commit(f)` lee `draft[f.id]` **todavía sin el valor recién elegido** (el estado anterior al `setDraft` que se acaba de disparar), y guarda ese valor desactualizado — perdiendo el cambio. Si `draft[f.id]` no existía aún (primer cambio en la fila), `commit()` ni siquiera dispara el guardado (`if (draft[f.id])` es `false`), por lo que el primer clic en un selector de una fila recién creada puede no hacer nada visible en el guardado.
- Esto es un **bug del motor genérico de tabla** (`HerramientaPanel.tsx`), no específico de esta herramienta: afecta a cualquier columna `tipo: "estado"` en cualquier herramienta de tipo `tabla`, en cualquier departamento. Se reprodujo también, de forma independiente, en `prod-checklist-vehiculos` (ver su propio `necesidad.md`) con las columnas "Nivel de combustible" y "Estado del vehículo".
- Reportado al desarrollador para corrección antes de Corte: separar el guardado de los selectores `estado` para que lea el draft ya actualizado (por ejemplo, computar el valor a guardar a partir de `v` directamente en el handler, en vez de depender de un `draft[f.id]` leído en el mismo tick que el `setDraft`).

**Responsive (los 3 anchos probados de verdad, interactuando, no solo mirando capturas):**
- **390px:** sin scroll horizontal de página (`document.documentElement.scrollWidth === clientWidth === 390`, confirmado por script); `.cp-dash` tiene `overflow-x: hidden` como exige el sistema de diseño. La tabla en sí tiene su propio scroll horizontal interno (`.hp-table-wrap`, patrón estándar del motor genérico para tablas anchas, no un bug). Usabilidad confirmada de punta a punta: se agregó una fila nueva y se editó una celda de texto en este ancho sin problemas (no solo se ve bien, se puede completar el flujo).
- **820px:** sin scroll horizontal de página, tabla completa visible con menos scroll interno que en 390px.
- **1440px:** sin scroll horizontal, tabla completa visible sin scroll interno.
- `qa_responsive_ok: true` para esta herramienta (el bug de persistencia de `estado` es funcional, no responsive).

**Capturas:** `oficina/expedientes/2026-11-22_direccion_asistencia-horarios/capturas/avisos_390px.png`, `avisos_820px.png`, `avisos_1440px.png`.

**Riesgos/preguntas abiertas para el comité:** el bug de persistencia de columnas `estado` descrito arriba bloqueaba el uso real de "Canal" y "Estado de confirmación" — ambas son columnas centrales del propósito de la herramienta. No se recomendaba Corte hasta que el desarrollador corrigiera este bug y QA reverificara.

**Reverificación post-fix (22/11/2026, commit `56fa4f8`):** el desarrollador aplicó el mismo patrón ya usado para la columna `fecha` (commit `4d0d5b0`) — el `CpSelect` de columnas `estado` ahora guarda vía `onSave` con el valor nuevo pasado directo, sin depender de que `draft` ya esté actualizado. Verificado en vivo con Playwright contra `cinepack-dev` real (cuenta `qa.dir-asistencia2@mailinator.com`): se editaron `canal` y `estado_confirmacion` en la MISMA fila en sucesión rápida (el escenario exacto que antes perdía la primera edición), reload + re-navegación a Exclusivas → la herramienta, y AMBAS columnas persisten correctamente. Fila de prueba limpiada después. `npx tsc --noEmit` y `npx next build --webpack` limpios tras el fix. **Corte ya no bloqueado por este motivo.**

## Decisión de agrupación (ronda 2)

**Columnas candidatas:** `canal` o `destinatario`.

**Decisión: NO agrupar. Tabla plana, cronológica por `fecha_envio`.**

Argumento: el propio expediente (línea 17) define esta herramienta como "un centro de avisos ... no un checklist de tiempos" cuyo uso real documentado es el flujo de Asistencia de dirección emitiendo avisos a medida que ocurren cambios de última hora — el caso de uso primario es "qué mandé/qué cambió hoy", no "qué le falta confirmar a cada persona" (esa segunda necesidad existe pero es secundaria y ya está cubierta por la columna `estado_confirmacion` visible en la misma fila, sin necesitar agrupación). Agrupar por `destinatario` rompería la lectura cronológica de "qué pasó hoy en orden de ocurrencia" — un cambio de horario y el aviso de transporte relacionado, enviados con minutos de diferencia a personas distintas, quedarían en bloques separados en vez de seguirse en la secuencia real de la jornada. Agrupar por `canal` tiene aún menos sentido de uso: saber si algo se mandó por WhatsApp o Callsheet no es el eje por el que Asistencia de dirección necesita escanear sus propios avisos. Si en un ciclo futuro se confirma que el cargo SÍ necesita con frecuencia la vista "qué le falta confirmar a cada destinatario" como tarea recurrente (no solo ocasional), se podría reconsiderar `agruparPor: "destinatario"` — hoy no hay esa confirmación del cargo, así que se mantiene tabla plana ordenable por `fecha_envio`, sin cambio de código.
