# Decisiones de visionado (dailies) — Dirección

## 1. Resumen ejecutivo
`dir-decisiones-visionado` era un `checklist` vacío sin `hint` (confirmado en `inventario.md`). Se rediseñó como una ficha navegable por toma/escena visionada —no una tabla plana— con pestañas de Decisión, Notas y Seguimiento, reutilizando el motor `EntidadTabsBoard` ya construido en `app/hoy/HerramientaPanel.tsx`. El código pasa typecheck limpio. La verificación interactiva con Playwright y la cuenta QA de Dirección quedó bloqueada: este entorno no tiene configuradas las credenciales de Supabase (`NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`), así que el servidor de desarrollo arranca pero cualquier página autenticada responde 500. Por esa razón el expediente se archiva hoy sin entrega a Nico, con el motivo documentado abajo, y no se fabricó ninguna captura.

## 2. Origen de la idea
Viene del inventario: `dir-decisiones-visionado` está en la lista cerrada de 16 herramientas `nota`/`checklist` vacías confirmadas por grep (`oficina/inventario.md`). Priorizada hoy por el director de oficina según la regla de backlog (vacías primero).

## 3. El cargo (funciones, fases, documentos, coordinación)
Cargo **Dirección** (departamento Dirección, `app/herramientas.ts`). El director ve el material rodado cada día (dailies/visionado) y para cada toma/escena debe decidir: qué toma queda elegida ("circled take"), si hay tomas de respaldo, si algo debe repetirse y por qué, y qué nota de interpretación o nota técnica (foto/sonido/arte) deja para el resto del equipo. Hoy, sin software, esto se resuelve a mano en la hoja de reporte de cámara/sonido (donde el 1AD o script anota qué toma fue "circled") o verbalmente en la sala de visionado — no hay un registro estructurado por escena que sobreviva el día. Coordina con Script (continuidad de la toma elegida), Montaje (qué toma recibe primero) y Postproducción (notas técnicas que afectan VFX/color/sonido).

## 4. Necesidades y dolores (con fuente)
- La práctica de "circled take" está confirmada con fuente real: el "circle take" es la toma preferida del director, marcada en el reporte de cámara, el reporte de sonido y las notas del script supervisor para que montaje y laboratorio sepan cuáles importan ([How to Film School — Marking the Script](https://howtofilmschool.com/dictionary/marking-the-script/); [Wikipedia — Script supervisor](https://en.wikipedia.org/wiki/Script_supervisor)). El director suele marcar cada toma como "no good", "hold take" (aceptable, no perfecta) o "print take" (buena) — exactamente lo que el campo "Decisión" de esta herramienta estructura.
- Un foro de producción documenta que hasta un 30% de las tomas circled no coinciden entre el reporte de sonido y el de cámara, y recomienda una verificación de cruce al final del día — un riesgo real de descoordinación que un registro único y compartido (en vez de 3 papeles sueltos) ayuda a evitar ([ASK & DISCUSS — shootingpeople.org](https://shootingpeople.org/ask/view/34534119dee5088f856d6bfb)).
- Dolor concreto: sin un registro por escena, la decisión del director vive en su cabeza o en una nota de voz que no llega a Montaje hasta días después, retrasando el primer corte.
- Dolor concreto: "a repetir" sin motivo documentado genera reshoots mal justificados ante Producción.

## 5. Estado del arte (hoy sin software + competencia)
- **Hoy sin software**: hoja de reporte de cámara en papel/PDF (circled takes marcados a mano), notas de voz del director, comentarios verbales en la sala de visionado.
- **StudioBinder**: shot lists y breakdown de preproducción; no tiene un módulo dedicado a registrar la decisión posterior al visionado de dailies.
- **Movie Magic Scheduling**: foco en programación, no en revisión de material rodado.
- **Yamdu / SetHero**: gestión de producción y calendarios; ninguno documenta un flujo de "decisión de dailies por toma" como entidad propia con seguimiento de a quién se avisó.
- **Celtx**: notas de escena genéricas sin estructura de toma elegida/backup/motivo de repetición.
- **Carencia identificada (diferenciador real)**: el flujo real de la industria sigue siendo 3 papeles separados (cámara, sonido, script) que, según el propio foro de profesionales citado arriba, no siempre coinciden. Ningún competidor revisado (StudioBinder, Movie Magic, Yamdu, SetHero, Celtx) ofrece una ficha única de "decisión de dailies" que reemplace esos 3 registros y además trackee a quién se avisó — ese es el diferenciador de esta herramienta frente al estado del arte.

## 6. Propuesta (funcionalidades, flujos, contenido precargado)
Ficha por toma/escena (no tabla plana, ver sección 9), con tres pestañas:
- **Decisión**: escena/toma, fecha de visionado, decisión (Aprobada/circled, Backup, A repetir, Pendiente de ver), toma elegida, tomas de respaldo.
- **Notas**: nota de interpretación, nota técnica (foto/sonido/arte), motivo de repetición.
- **Seguimiento**: a quién avisar (chips: Montaje, Script/continuidad, Postproducción, Fotografía, Sonido, Producción) y estado del aviso (Sin avisar / Avisado / Confirmado por el destinatario).
Flujo: el director (o script, en su nombre) crea una ficha por cada toma decidida en la sesión de dailies, marca la decisión, deja las notas, y marca a quién avisar; el estado del aviso queda visible en la vista de lista (buscador por escena) sin abrir cada ficha.

## 7. Integración (departamento / proyecto / otros departamentos)
- **Departamento**: vive en el cargo Dirección, mismo alcance de permisos que el resto de herramientas de cargo (sin cambio de modelo de acceso).
- **Proyecto completo**: ninguna tabla/vista nueva de Supabase — reutiliza el motor genérico de `tipo: "tabla"` ya persistido para ~168 registros de herramientas existentes (sin cambio de esquema).
- **Otros departamentos**: el campo "Avisar a" es el gancho de integración — señala qué departamentos deben enterarse de la decisión (Montaje/Postproducción para la toma elegida y notas técnicas; Script para continuidad). Como en el expediente de `dir-notas-escena`, hoy esto es un campo visible, no una notificación activa entre departamentos — eso sería un expediente de integración transversal aparte.

## 8. Diseño visual (capturas móvil 390px, tablet 820px, escritorio 1440px)
**No se generaron capturas.** Se instaló Playwright y se levantó el servidor de desarrollo (`npm run dev`, `NODE_USE_ENV_PROXY=1`) sin problema, pero toda ruta autenticada devuelve 500: `Error: Your project's URL and Key are required to create a Supabase client!` — no hay `.env`/`.env.example` en el repo ni variables `NEXT_PUBLIC_SUPABASE_*` configuradas en este entorno, y esta sesión no tiene permiso para leer variables de entorno del sistema para confirmar si existen por otra vía. No se pudo loguear con la cuenta de QA de Dirección (`qa.dir-direccion@mailinator.com`, de `oficina-qa/cargos.md`) ni ver el panel real. Por disciplina de la oficina, no se fabricó ninguna captura de reemplazo.

## 9. Especificación técnica (componentes, modelo de datos, librerías y licencias)
- **Mentalidad de diseñador, no de planilla (regla de Nico, 18/11/2026)**: una decisión de dailies es una entidad con su propio detalle y seguimiento (foto de los dailies + nota + a quién avisar), no una fila de tabla con campos sueltos. Se usó **`EntidadTabsBoard`** (ficha con pestañas, patrón ya construido para Coproductores/Subvenciones/Agenda/Deliverables/Notas del Ejecutivo y Derechos de PI), en vez de la tabla por defecto.
- Cambios de código: `app/herramientas.ts` — columnas reales (`escena`, `fecha_visionado`, `decision` tipo `estado`, `toma_elegida`, `tomas_backup`, `nota_interpretacion`, `nota_tecnica`, `motivo_repeticion`, `avisar_a` tipo `chips`, `estado_aviso` tipo `estado`); `app/hoy/HerramientaPanel.tsx` — se agregó `"dir-decisiones-visionado"` a `ENTIDAD_TABS_IDS` y su entrada en `ENTIDAD_TABS_CONFIG` (titleKey `escena`, listCols `toma_elegida`/`fecha_visionado`/`estado_aviso`, `special: "buscador"`, 3 tabs).
- Sin librerías nuevas ni cambio de esquema de Supabase. `npx tsc --noEmit -p .` sin errores tras `npm install`.

## 10. Riesgos y preguntas abiertas
1. **Bloqueo de entorno (crítico para QA)**: sin credenciales de Supabase en este worktree no se puede validar el comportamiento real ni el responsive — este expediente queda archivado hasta poder correr QA real con esas credenciales (o en un entorno que ya las tenga).
2. La comparación de competencia se hizo por conocimiento ya documentado de cada producto (no se abrió cada sitio en este ciclo); el hallazgo central (circled take, discrepancias entre reportes) sí viene de WebSearch real.
3. El campo "Avisar a" no dispara notificación activa — posible expediente futuro de integración transversal.
4. Confirmar con Nico si corresponde fusionar o diferenciar este patrón de ficha con el de `post-checklist-mezcla` (Postproducción) para mantener consistencia de UX entre "revisar material y decidir" en distintos departamentos.

## 11. Fuentes
- `oficina/inventario.md` (estado "Vacía/placeholder" de `dir-decisiones-visionado`, confirmado por grep).
- `.claude/agents/comite-calidad.md`, sección "Mentalidad de diseñador de app, no de planilla" (regla de Nico, 18/11/2026).
- `oficina-qa/cargos.md` (rama `oficina-qa/2026-11-18-noche1`): cuenta de prueba `qa.dir-direccion@mailinator.com`.
- [How to Film School — Marking the Script](https://howtofilmschool.com/dictionary/marking-the-script/) (definición de circled/print take).
- [Wikipedia — Script supervisor](https://en.wikipedia.org/wiki/Script_supervisor) (rol del script supervisor registrando la preferencia del director).
- [ASK & DISCUSS (shootingpeople.org)](https://shootingpeople.org/ask/view/34534119dee5088f856d6bfb) (discrepancias documentadas entre reportes de cámara y sonido en las tomas circled).
