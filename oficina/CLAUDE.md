# Reglas de la Oficina de Desarrollo de App CINEPACK (resumen operativo)

Esta es la oficina de **desarrollo de producto** (director, departamentos, investigador, arquitecto, desarrollador, QA, comité de calidad): diseña y prototipa herramientas nuevas para la app. Existe una segunda oficina separada, de **Marketing e inteligencia de mercado**, con sus propios agentes — ver `/oficina-marketing/` cuando exista.

Lee también `stack.md`, `sistema-diseno.md`, `inventario.md`, `backlog.md` antes de proponer o construir nada.

## Inviolables
1. Solo se trabaja en este repo (muestreo, `nicolaspecollo-lab/cinepack-app`). Esta sesión no tiene acceso al repo real de CINEPACK: es solo-lectura y fuera de alcance aquí. Nunca commit/push/PR/branch sobre él.
2. Nunca merge a `main` de este repo. Cada expediente va en su propia rama `oficina/AAAA-MM-DD-<herramienta>` y llega como PR **en borrador**. Solo Nico aprueba y hace merge, siempre a mano.
3. Calidad antes que volumen, sin atarse a un reloj de 24h: la oficina trabaja de forma continua hasta reunir hasta 2 expedientes completos y validados (comité + Nico). Se presentan en cuanto estén listos, tarden lo que tarden. Si no alcanzan el nivel, se entrega 1 o ninguno — nunca relleno.
4. Nada inventado: toda afirmación de investigación lleva fuente o se marca "hipótesis". Prohibido inventar datos, testimonios, estadísticas o funciones de competidores.
5. Sin duplicados: comprobar contra `inventario.md` y los expedientes ya entregados antes de proponer una herramienta.
6. Sistema de diseño al 100%: solo colores/tipografías/componentes que salgan de `sistema-diseno.md`. Mobile-first: en móvil ocupa toda la pantalla. Prohibido el "cuadro vacío genérico" — cada herramienta llega ya trabajada y específica del cargo.
7. Prioridad de backlog: trabajar siempre primero las herramientas **Vacías/placeholder** o **Circunstanciales** de `inventario.md` (nunca retocar algo ya Consolidado salvo que Nico lo pida explícitamente). Si no queda ninguna sin desarrollo significativo dentro de un departamento existente, es válido **proponer una herramienta nueva, fuera del inventario actual**, para un cargo o necesidad real de un rodaje que CINEPACK todavía no contempla — con el mismo rigor de investigación, integración y diseño que cualquier otro expediente, y dejando explícito en el dossier que es una propuesta nueva (no venía del inventario original).

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

## Ciclo diario
1. Director lee backlog/expedientes/partes y elige hasta 2 herramientas. 2. Agente de departamento define necesidad + investigador documenta (con fuentes). 3. Arquitecto diseña integración y modelo de datos. 4. Desarrollador construye el prototipo en `oficina/AAAA-MM-DD-<herramienta>`. 5. QA prueba y genera capturas en 390/820/1440px (Playwright). 6. Comité revisa (máx. 2 rondas). 7. `dossier.pdf` con capturas. 8. PR en borrador en este repo, con dossier y PDF adjuntos — nunca merge. 9. Actualizar backlog, inventario y parte diario.

## Entrega a Nico (en cuanto el comité aprueba)
PDF del expediente + enlace al PR en borrador + resumen de 5 líneas. Al cerrar la jornada: parte diario con qué se entregó, qué se archivó y por qué, qué queda pendiente, qué decisiones necesitan la intervención de Nico.
