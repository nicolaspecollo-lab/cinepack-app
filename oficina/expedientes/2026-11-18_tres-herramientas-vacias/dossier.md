# Dossier — Ciclo diario 18/11/2026: 3 herramientas vacías pasan a tener contenido real

## 1. Resumen ejecutivo
Tres cargos con herramienta vacía/genérica en el inventario pasan a tener contenido real y específico: `foto-checklist-descarga` (Auxiliar de cámara), `arte-checklist-tareas` (Ayudantía de dirección de arte) y `rep-diario-personaje` (Protagonista). Se generalizó el motor de checklist del repo (`itemsPrecargados`) para que cualquier checklist futuro pueda nacer con contenido real en vez de una lista vacía — no es un parche puntual de estas 3.

## 2. Origen de la idea
`oficina/backlog.md` e `inventario.md` listan 13 cargos con herramienta vacía confirmada (ningún precargado en todo el repo, confirmado por grep). Se priorizaron estos 3 por impacto real: pérdida de material en rodaje digital (DIT/cámara), continuidad de decorado (causa habitual de gazapos de raccord), y preparación de personaje (pedido implícito tras el feedback de Nico sobre `dir-notas-escena`: contenido genérico no alcanza).

## 3. Los cargos
- **Auxiliar de cámara** (Fotografía): descarga, verificación y backup de material de cámara al final de cada jornada — responsable directo de que no se pierda material de rodaje.
- **Ayudantía de dirección de arte** (Arte): seguimiento de continuidad del decorado día a día, strike al cierre.
- **Protagonista** (Reparto): preparación y continuidad del personaje a lo largo del rodaje.

## 4. Necesidades y dolores (con fuente)
- Pérdida/corrupción de material sin backup verificado es el riesgo técnico más citado en guías de gestión de datos de producción — Netflix exige mínimo 3-2-1 y checksum verificado antes de formatear ([Netflix](https://backlothelp.netflix.com/hc/en-us/articles/360000581207-Production-Assets-Data-Management)), con manifiestos MHL como fuente de verdad para copias posteriores ([Pomfort](https://kb.pomfort.com/?p=4678), [Hedge](https://blog.hedge.video/asc-mhl)).
- Las fotos de continuidad del decorado y el strike mal planificado son errores reales y recurrentes según guías de rol de standby art director / set decorator ([ScreenSkills](https://screenskills.com/skills-checklists/scripted-film-and-tv/art-department/standby-art-director-skills), [local44](https://local44.org/node/13)).
- La preparación de personaje combina un diario/log en primera persona con una línea de continuidad física y emocional, según bibliografía de interpretación para cine y guías de continuidad de actor ([Fiveable](https://fiveable.me/art-direction/unit-11/set-design-art-department-coordination/study-guide/1TQ0KckY1TVIXb37), [Backstage](https://www.backstage.com/magazine/article/continuity-in-film-76064/), [Artfolio](https://www.artfolio.com/article/character-journals-a-daily-habit-that-deepens-emotional-recall-during-shoots)).

## 5. Estado del arte
Ningún competidor revisado (StudioBinder, Yamdu, Movie Magic, SetHero, Celtx) ofrece checklist de backup con regla 3-2-1/MHL precargada ni diario de personaje estructurado por escena — se confirmó en expedientes anteriores de esta oficina que esto sigue siendo terreno sin cubrir. No se reinvestigó de cero esta vuelta (dato ya confirmado, se reusa).

## 6. Propuesta
- `foto-checklist-descarga`: checklist con 10 puntos reales (regla 3-2-1, checksum, MHL, inspección visual, etiquetado) — ver código.
- `arte-checklist-tareas`: checklist con 8 puntos reales (fotos de continuidad, desglose, objetos sensibles, strike, devolución).
- `rep-diario-personaje`: de "nota" de texto libre pasa a **tabla** por escena (momento de la historia, estado emocional con tono de color, continuidad física, entrada de diario en primera persona).
- Mejora de motor: `Herramienta.itemsPrecargados?: string[]` — si una checklist no tiene fila guardada todavía, se siembra con esos puntos en vez de una lista vacía; el primer click/check la persiste de verdad.

## 7. Integración
- **Departamento**: las 3 quedan dentro de Exclusivas del cargo correspondiente, sin tocar nada de Generales/Departamentos.
- **Proyecto completo**: `rep-diario-personaje` ahora referencia escena (columna `escena`), igual convención que `dir-notas-escena` — permite en el futuro cruzarlo con el desglose de guion sin cambiar el modelo.
- **Otros departamentos**: el checklist de arte menciona explícitamente objetos que requieren intervención de Legal (permisos de armas/vehículos/marcas) — dato que ya existía como criterio en otros expedientes, no se inventa una integración nueva no soportada por el motor.

## 8. Diseño visual
Capturas reales en `capturas/` (390/820/1440px) de `foto-checklist-descarga` con los 10 puntos reales cargados, sin scroll horizontal confirmado por `scrollWidth<=clientWidth` en los 3 anchos. **Limitación honesta**: se confirmó visualmente (lectura) pero no se pudo confirmar interacción real de escritura (marcar un ítem y que persista) — ver sección 10.

## 9. Especificación técnica
- `app/herramientas.ts`: `Herramienta.itemsPrecargados?: string[]`, definiciones de las 3 herramientas.
- `app/hoy/HerramientaPanel.tsx`: `ChecklistTool` recibe `itemsPrecargados`, siembra `items` cuando `fila?.datos?.items` todavía no existe.
- Sin librerías nuevas, sin migración de base de datos nueva — usa el motor y la tabla `herramienta_filas` ya existentes.

## 10. Riesgos y preguntas abiertas
- **QA de escritura real bloqueado, no por bug de código**: el selector "Modo de prueba" (depto/cargo) de la cuenta admin de QA es solo vista — no afecta RLS, por diseño documentado en `sistema-diseno.md`. Al intentar crear una fila real (marcar un ítem) con el cargo simulado "Auxiliar de cámara", Supabase devuelve 403 porque el perfil real de esa cuenta sigue siendo "Sonorización final" — comportamiento de seguridad correcto, no un defecto. Para probar escritura real hace falta que las cuentas específicas de cargo de la Oficina de QA (`qa.foto-aux-camara@...`, `qa.arte-ayudantia@...`, `qa.rep-protagonista@...`) sean miembros reales del proyecto de prueba — pendiente, se lo paso al director-qa para la próxima noche.
- Por eso **no se marca `qa_responsive_ok:true`** en el panel para estas 3 — el render/lectura está confirmado en los 3 anchos, la interacción de escritura no.

## 11. Fuentes
- [Netflix — Production Assets Data Management](https://backlothelp.netflix.com/hc/en-us/articles/360000581207-Production-Assets-Data-Management)
- [Frame.io — checksums & backups guide](https://workflow.frame.io/guide/checksums-backups)
- [Pomfort — checksum verification methods](https://kb.pomfort.com/?p=4678)
- [Hedge — ASC MHL](https://blog.hedge.video/asc-mhl)
- [ScreenSkills — Standby Art Director](https://screenskills.com/skills-checklists/scripted-film-and-tv/art-department/standby-art-director-skills)
- [local44.org — Set Decorator](https://local44.org/node/13)
- [Fiveable — Set Design & Art Department Coordination](https://fiveable.me/art-direction/unit-11/set-design-art-department-coordination/study-guide/1TQ0KckY1TVIXb37)
- [Backstage — How to Maintain Continuity as an Actor](https://www.backstage.com/magazine/article/continuity-in-film-76064/)
- [Artfolio — Character journals](https://www.artfolio.com/article/character-journals-a-daily-habit-that-deepens-emotional-recall-during-shoots)
