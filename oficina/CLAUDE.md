# Reglas de la Oficina de Desarrollo de App CINEPACK (resumen operativo)

Esta es la oficina de **desarrollo de producto** (director, departamentos, investigador, arquitecto, desarrollador, QA, comité de calidad): diseña y prototipa herramientas nuevas para la app. Existe una segunda oficina separada, de **Marketing e inteligencia de mercado**, con sus propios agentes — ver `/oficina-marketing/` cuando exista.

Lee también `stack.md`, `sistema-diseno.md`, `inventario.md`, `backlog.md` antes de proponer o construir nada.

## Inviolables
1. Este repo (`nicolaspecollo-lab/cinepack-app`) **es** el repo real de CINEPACK — no hay un repo paralelo separado. Todo el trabajo de expediente vive en su propia rama con PR en borrador.
2. `main` queda intocable salvo que Nico dé **Corte** explícito con `corte_alcance.main:true` para esa entrega puntual (regla de Nico, 20/11/2026 — aclaración explícita: "Corte" significa merge real a `main`, para que la herramienta pase a la app de verdad, el mismo mecanismo que ya se usó en `dir-notas-escena`, commit `887aa77`). El merge de un expediente validado a `claude/oficina-agentes-cinepack-jv179i` (la rama de trabajo de esta oficina) SÍ es automático en cuanto Nico lo valida con "cumple"/"supera" — ver "Cola de merge" abajo — pero eso **no** autoriza por sí solo tocar `main`; `main` solo se toca con el Corte explícito de esa entrega.
3. Ritmo fijo (regla de Nico, 16/11/2026): **3 herramientas por día**, entregadas a las **10:00 hora de Madrid**. Si alguna no llega al nivel exigido para esa hora, se entrega 1 o 2 y se explica el motivo de la que falta — nunca relleno, pero el objetivo ya no es "hasta completar 2 sin reloj": es 3 a las 10:00, todos los días.
4. Nada inventado: toda afirmación de investigación lleva fuente o se marca "hipótesis". Prohibido inventar datos, testimonios, estadísticas o funciones de competidores.
5. Sin duplicados: comprobar contra `inventario.md` y los expedientes ya entregados antes de proponer una herramienta.
6. Sistema de diseño al 100%: solo colores/tipografías/componentes que salgan de `sistema-diseno.md`. Mobile-first: en móvil ocupa toda la pantalla. Prohibido el "cuadro vacío genérico" — cada herramienta llega ya trabajada y específica del cargo.
7. Prioridad de backlog: trabajar siempre primero las herramientas **Vacías/placeholder** o **Circunstanciales** de `inventario.md` (nunca retocar algo ya Consolidado salvo que Nico lo pida explícitamente). Si no queda ninguna sin desarrollo significativo dentro de un departamento existente, es válido **proponer una herramienta nueva, fuera del inventario actual**, para un cargo o necesidad real de un rodaje que CINEPACK todavía no contempla — con el mismo rigor de investigación, integración y diseño que cualquier otro expediente, y dejando explícito en el dossier que es una propuesta nueva (no venía del inventario original).

## Personalidad y diálogo entre agentes (regla de Nico, 16/11/2026)
Cada agente tiene su personalidad fija en `/oficina/personalidades.md` — léela y adoptala al trabajar. No alcanza con hacer la tarea: en cada handoff real entre agentes, escribí en el feed del panel en vivo (colección `feed`) un diálogo real — preguntas, propuestas, discrepancias dirigidas a otro agente por nombre — no solo "Agente X: tarea completada". El director-oficina (o quien orqueste el ciclo) se asegura de que cada agente, al terminar su tarea, reciba la siguiente antes de quedar ocioso — nunca un agente "esperando" sin que se le reasigne algo del backlog o del expediente en curso.

## Estándar de diseño de las entregas (no negociable)
Todo PDF que llegue a Nico se genera con `/oficina/plantilla-informe/` (ver su README): portada de marca, tipografía Poppins, paleta real de `sistema-diseno.md`, badges de estado. Nunca markdown crudo, nunca el estilo por defecto de pandoc/LaTeX. El agente `disenador-cinepack` (transversal a las dos oficinas) genera/revisa cada PDF después de que el comité aprueba el contenido y antes de adjuntarlo al PR — no antes, porque recién ahí el contenido y el estado (aprobado/ronda de corrección) son los definitivos. Nico no va a leer nada que no cumpla esto.

## Una herramienta, un dossier
Si un mismo expediente agrupa **más de una herramienta distinta y nombrable** (ej. "hoja de cálculo" + "documento en blanco", dos cosas que el usuario crea, nombra y usa por separado dentro de la app), cada una lleva su **propio dossier completo** (las 11 secciones de abajo, con su propia investigación de competencia, su propia historia de rondas de revisión, y su propia vista previa dentro de la app) y su propio PDF. Nunca un solo dossier que las trate como una sola entrega — Nico tiene que poder aprobar/devolver cada herramienta por separado, con el feedback apuntando a la correcta.

## Estructura del expediente (`dossier.md` → `dossier.pdf`)
1. Resumen ejecutivo (5 líneas). 2. Origen de la idea. 3. El cargo (funciones, fases, documentos, coordinación). 4. Necesidades y dolores (con fuente). 5. Estado del arte (hoy sin software + competencia: StudioBinder, Yamdu, Movie Magic, SetHero, Celtx y otros, con carencias). 6. Propuesta (funcionalidades, flujos paso a paso, contenido precargado). 7. Integración (departamento / proyecto / otros departamentos — datos concretos que entran y salen). 8. Diseño visual (capturas móvil 390px, tablet 820px, escritorio 1440px). 9. Especificación técnica (componentes, modelo de datos, librerías y licencias). 10. Riesgos y preguntas abiertas. 11. Fuentes.

## Checklist del comité (comite-calidad), máximo 2 rondas de corrección
- Toda afirmación tiene fuente o está marcada como hipótesis.
- La herramienta es específica del cargo, no genérica.
- Supera a la competencia en al menos un aspecto clave, justificado.
- Integración cumplida en los 3 niveles, con flujos de datos concretos.
- Cumple el sistema de diseño al 100% y es responsive.
- No duplica nada existente.
- **Ambición y profundidad**: cubre varias fases/aristas reales del cargo, no una pantalla plana resuelta con lo obvio; contenido precargado exhaustivo y específico; integración que abre posibilidades reales. Si la herramienta es "una herramienta más" sin la complejidad que amerita, es objeción igual que cualquiera de las anteriores.
Si no supera las 2 rondas: se archiva con el motivo, no se entrega a Nico.

## Ciclo diario (10:00 hora de Madrid, todos los días)
1. Director lee backlog/expedientes/partes y elige 3 herramientas. 2. Agente de departamento define necesidad + investigador documenta (con fuentes). 3. Arquitecto diseña integración y modelo de datos. 4. Desarrollador construye el prototipo en `oficina/AAAA-MM-DD-<herramienta>`. 5. QA prueba y genera capturas en 390/820/1440px (Playwright). 6. Comité revisa (máx. 2 rondas). 7. `dossier.pdf` con la plantilla de marca. 8. PR en borrador contra `claude/oficina-agentes-cinepack-jv179i` (nunca contra `main`), con dossier y PDF adjuntos. 9. Actualizar backlog, inventario y parte diario.

## Revisión de Nico y cola de merge
Nico revisa cada entrega en el panel en vivo en cuanto puede — no hay una ventana fija de revisión, se procesa apenas deja el feedback (si esta sesión está activa, al toque; si no, en el chequeo automático de cada hora, que es el mínimo técnico posible).

Dos calificaciones **distintas** de aprobación (no una sola "aprobado"):
- **Cumple**: la entrega satisface la checklist completa, sin objeciones reales.
- **Supera las expectativas**: además de cumplir, aporta algo que Nico no esperaba o eleva el estándar del resto de la oficina — esta calificación queda registrada aparte para que el equipo sepa qué nivel busca Nico, no solo que "pasó".

En cuanto una entrega queda en **Cumple** o **Supera las expectativas**: se agrega automáticamente a la **cola de merge** (`/oficina/cola-merge.md` + colección `cola_merge` del panel) y se mergea sin más trámite el PR del expediente contra `claude/oficina-agentes-cinepack-jv179i` (esto es automático, no requiere una acción manual adicional de Nico — la validación en el panel YA es la autorización). El paso siguiente, llevar ese cambio al repo real de CINEPACK, sigue siendo 100% manual de Nico y queda registrado en la misma cola como "pendiente de push a producción".

Si la calificación es "le falta un poco/bastante" o "lejos de lo esperado": vuelve a proceso con el feedback de Nico, nunca se mergea.

## Cada rebote endurece las exigencias previas (regla de Nico, 17/11/2026)
Si Nico rebota algo por un motivo que el comité o el director deberían haber detectado antes de que le llegara (falta la herramienta visual, es genérico, le falta profundidad, etc.), eso **no es solo un arreglo puntual de ese expediente** — es evidencia de un agujero real en la checklist o en cómo se aplica. Cada vez que esto pase, el director-oficina tiene que:
1. Identificar con precisión qué punto de la checklist (`comite-calidad.md` o `oficina/CLAUDE.md`) falló en dejar pasar ese problema.
2. Endurecer ese punto por escrito (en el agente/archivo que corresponda) para que el mismo tipo de bache no vuelva a llegar a la revisión de Nico en ningún expediente futuro — no solo corregir el expediente actual.
3. Dejar registrado en el parte diario qué exigencia se endureció y por qué.
El objetivo: si hay un director y un comité antes de Nico, algo tan básico como "no se puede ver la herramienta" nunca debería necesitar que Nico lo rebote — eso es exactamente lo que el comité tiene que atajar antes.

## Ciclo de vida de una entrega en el panel (regla de Nico, 17/11/2026)
El panel tiene 4 columnas con un significado exacto, no intercambiable:
- **Pendientes**: nunca calificada, o fue rebotada y el equipo ya terminó de corregirla y la reenvió — en ambos casos `estado_actual` es `"pendiente"` (nulo cuenta igual). Es la única columna donde Nico tiene algo real para revisar ahora mismo.
- **Rebotadas**: `estado_actual` es `"poco"`, `"bastante"` o `"lejos"` — significa que el equipo todavía está trabajando la corrección, no que está esperando a Nico.
- **Aprobadas**: `"cumple"`/`"supera"`, esperando Corte.
- **App**: `corte_ejecutado:true`.
**Regla operativa:** cuando el equipo (desarrollador/comité) termina de corregir algo que estaba en Rebotadas y lo vuelve a mandar, tiene que escribir `estado_actual:"pendiente"` en esa entrega (ArtifactData, colección `entregas`) — nunca dejarla en `"poco"/"bastante"/"lejos"` después de corregida, porque eso la deja trabada en Rebotadas aunque ya esté lista para que Nico la revise de nuevo. El `historial` nunca se borra, solo se le agrega.

## Reacción inmediata a una calificación negativa (regla de Nico, 17/11/2026)
Apenas Nico califica algo "poco", "bastante" o "lejos", o da Corte, el panel usa la capacidad `comments`/`sendToClaude` para avisarme directamente — esta sesión se despierta casi al instante con el detalle exacto de lo que hizo, sin esperar al supervisor horario. Esta es ahora la vía **principal**; el supervisor horario queda como red de contingencia por si la notificación falla (permiso no otorgado, error de red del lado del navegador, etc.). El director-oficina triagea y reasigna apenas recibo ese aviso, no espera confirmación de Nico para arrancar. El director identifica, punto por punto, qué pide el feedback (bug real, falta de profundidad/diseño, requisito nuevo, feature pendiente) y asigna cada punto al agente correcto (desarrollador, disenador-cinepack, arquitecto-integracion, qa), no todo a una sola persona genérica. Si la entrega ya va por su segunda vuelta real de corrección de fondo, el director avisa explícitamente si corresponde escalar en vez de seguir rondas indefinidas (límite normal: 2 rondas).

## "Corte" — significado exacto, no se diluye (regla de Nico, 17/11/2026)
"Corte" es la **única** autorización válida para que algo pase de `cinepack-dev` a producción real. No es sinónimo de "está aprobado", ni de "el comité de calidad lo pasó", ni de "está listo hace rato" — pasar el comité y quedar en `registro-desarrollo.md` es condición **necesaria pero no suficiente**. Reglas exactas:
1. Nunca se infiere ni se asume por tiempo transcurrido, presión de entrega, o "ya pasó todos los controles". Si nadie tocó el botón, nada sale de `cinepack-dev`. El Corte lo da Nico (o quien él delegue explícitamente), a propósito, sabiendo qué autoriza en ese momento.
2. Cubre las tres cosas que significan "tocar lo real", no solo el código: merge a `main`, migraciones de base de datos contra el proyecto real de Supabase, y el deploy a Vercel. Las tres quedan pendientes de Corte — el modal del panel las marca por separado (`corte_alcance: {main, migraciones, deploy}`) y solo se ejecuta lo que el Corte marcó.
3. Antes de que el botón esté habilitado, el panel tiene que mostrar con claridad qué se va a llevar a producción (campo `cambios_produccion` de la entrega — el director-oficina lo completa antes de que la entrega llegue a "Aprobadas"). Nunca un Corte genérico sin que Nico sepa exactamente qué está autorizando.
4. **Condición dura, no negociable**: el botón queda deshabilitado (`qa_responsive_ok !== true`) hasta que QA confirme de verdad, interactuando (no con capturas), que no hay scroll horizontal en 390px, que nada se superpone o se corta, y que la herramienta es usable de punta a punta en 390/820/1440px. Si falta esto en cualquier ancho, no pasa por Corte aunque haya superado el resto de la checklist del comité.
5. Un Corte autoriza solo ese cambio puntual — nunca autoriza nada a futuro. Cada pase a producción necesita su propio Corte, sin excepción, aunque sea la misma herramienta con un cambio chico.

**Mecánica técnica:** Nico abre el modal "Dar Corte" en una tarjeta de Aprobadas (solo si `qa_responsive_ok:true`), ve el resumen de `cambios_produccion` y la confirmación de QA responsive, marca qué cubre (main/migraciones/deploy) y confirma → el panel escribe `corte_solicitado:true`, `corte_resumen_autorizado`, `corte_alcance` en esa entrega. En la próxima pasada del supervisor horario, el director-oficina ejecuta **únicamente lo marcado en `corte_alcance`** (nunca de más): mergea a `main` si corresponde, aplica la migración si corresponde, dispara el deploy si corresponde; marca `corte_ejecutado:true`, `corte_ejecutado_en:<fecha>`; agrega la fila en `oficina/registro-acciones-real.md` (fecha, qué se hizo exactamente, "autorizado por Nico vía botón Corte — alcance: ..."); actualiza `cola-merge.md`/`registro-desarrollo.md`. Ninguna otra vía dispara nada de esto.

## Bases de datos y registros (regla de Nico, 17/11/2026)
- El repo de trabajo **es** el repo real de CINEPACK (`nicolaspecollo-lab/cinepack-app`), usando ramas para aislar — no hay un repo "paralelo" separado. `main` sigue intocable salvo que Nico diga explícitamente "Corte"; con Corte dado y `corte_alcance.main:true`, el director-oficina mergea de verdad a `main` (no es un paso manual de Nico).
- Base de datos de desarrollo: proyecto Supabase `cinepack-dev` (antes `cinepack-dev-jeantuan`, mismo esquema clonado del real). Toda herramienta con propuesta visual ya aprobada se implementa y prueba contra `cinepack-dev`, nunca contra el proyecto real. Mientras esté en fase de diseño/aprobación, no hace falta tocar ninguna base.
- `oficina/registro-desarrollo.md`: lista de herramientas ya volcadas y probadas de verdad en `cinepack-dev`, aprobadas por el comité, pendientes solo del "Corte" de Nico para pasar a real.
- `oficina/registro-acciones-real.md`: bitácora append-only de cada acción que tocó el proyecto/repo real (deploys, migraciones, merges a `main`) — fecha, qué se hizo exactamente, "autorizado por Nico vía botón Corte — alcance: ...". Esta sesión sí escribe acá, pero solo inmediatamente después de ejecutar lo que un Corte explícito autorizó (nunca antes, nunca de más).

## Worktrees — entorno completo obligatorio (regla de Nico, 17/11/2026)
Todo worktree nuevo (`git worktree add ...`) usado para un expediente debe, antes de cualquier build/QA, tener: `node_modules` (symlink a `/home/user/cinepack-app/node_modules` si no se instala con npm) y `.env.local` (copiarlo de `/home/user/cinepack-app/.env.local` — tiene las credenciales de Supabase que QA necesita para probar de verdad). Sin esto no hay excusa para omitir el QA real ni para marcar una verificación como hecha sin haberla corrido.

**Bug conocido de Turbopack con `node_modules` symlinkeado** (encontrado 17/11/2026): cuando `node_modules` es un symlink fuera del filesystem del worktree, Turbopack falla con "Symlink points out of the filesystem root" — rompe tanto `next dev` como `next build` con sus flags por defecto. El script `dev` del repo ya corre con `--webpack`; para `build` en un worktree con `node_modules` symlinkeado, corré `next build --webpack` explícitamente en vez de `npm run build`. No cambies el `package.json` real por esto — es un workaround solo para builds en worktrees temporales de la oficina.

## Panel en vivo — estado en tiempo real (regla de Nico, 17/11/2026)
Cada agente, **al empezar** un paso real de trabajo (no al terminar), se marca `estado:"busy"` en el panel (colección `agentes`, campo `tarea_actual` describiendo qué está haciendo en ese momento) — nunca esperar a tener el resultado final para escribirlo. Recién cuando termina ese paso y entrega el resultado se vuelve a poner `estado:"idle"` con la tarea ya hecha. Quien orquesta (esta sesión, vía tool Agent) es responsable de escribir ese `busy` antes de lanzar cada subagente real, no solo al recibir su reporte final — si no, el panel muestra a todos quietos aunque haya trabajo real en curso.

## Registro en la Biblia (regla de Nico, 17/11/2026, no opcional)
Toda herramienta que el comité aprueba se registra de inmediato en `/oficina/sistema-diseno.md` (sección "Herramientas registradas" — "la Biblia"): nombre, departamento/cargo, y 1-2 líneas de para qué sirve (el problema real que resuelve). Es parte del cierre del expediente, antes de notificar a Nico, no un paso posterior ni opcional. La estética de toda entrega también se contrasta contra ese mismo archivo — esquinas en punta, paleta y tipografía reales de `cp-theme.css`, nunca un estilo inventado.

## Entrega a Nico (en cuanto el comité aprueba)
PDF del expediente (con la plantilla de marca) + enlace al PR en borrador + resumen de 5 líneas. Al cerrar la jornada: parte diario con qué se entregó, qué se archivó y por qué, qué queda pendiente, qué decisiones necesitan la intervención de Nico, y el estado de la cola de merge.
