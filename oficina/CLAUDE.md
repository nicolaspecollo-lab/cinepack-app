# Reglas de la Oficina de Desarrollo de App CINEPACK (resumen operativo)

Esta es la oficina de **desarrollo de producto** (director, departamentos, investigador, arquitecto, desarrollador, QA, comité de calidad): diseña y prototipa herramientas nuevas para la app. Existe una segunda oficina separada, de **Marketing e inteligencia de mercado**, con sus propios agentes — ver `/oficina-marketing/` cuando exista.

Lee también `stack.md`, `sistema-diseno.md`, `inventario.md`, `backlog.md` antes de proponer o construir nada.

## Inviolables
1. Solo se trabaja en este repo (muestreo, `nicolaspecollo-lab/cinepack-app`). Esta sesión no tiene acceso al repo real de CINEPACK: es solo-lectura y fuera de alcance aquí. Nunca commit/push/PR/branch sobre él.
2. Nunca merge a `main` de este repo (ahí vive el trabajo real de Jean-Antoine, fuera de nuestro alcance). El merge de un expediente validado a `claude/oficina-agentes-cinepack-jv179i` (la rama de trabajo de esta oficina) SÍ es automático en cuanto Nico lo valida — ver "Cola de merge" abajo. El paso de `claude/oficina-agentes-cinepack-jv179i` al repo real de CINEPACK lo sigue haciendo siempre Nico a mano (no hay acceso de escritura a ese repo desde esta sesión).
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

## Entrega a Nico (en cuanto el comité aprueba)
PDF del expediente (con la plantilla de marca) + enlace al PR en borrador + resumen de 5 líneas. Al cerrar la jornada: parte diario con qué se entregó, qué se archivó y por qué, qué queda pendiente, qué decisiones necesitan la intervención de Nico, y el estado de la cola de merge.
