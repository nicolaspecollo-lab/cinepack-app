# Cargos de la Oficina de QA — ~50 especialistas, 1 cuenta de prueba cada uno

Fuente: `/oficina/inventario.md` (17 departamentos reales de CINEPACK). Convención de email de prueba: `qa.<cargo-slug>@mailinator.com`, password fija descartable `CinepackQA-2026!tester` (solo para `cinepack-dev`, nunca real). Cada cargo trabaja siempre sobre el proyecto `[PROYECTO TEST] La sed de los almendros`.

**Nota (18/11/2026):** los emails de esta tabla ya tienen sufijo numérico (2/3/4) — las cuentas base sin sufijo se crearon antes de que el trigger `on_auth_user_created` funcionara en `cinepack-dev` y quedaron sin fila de `profiles`/membresía. Las 51 cuentas listadas acá SÍ tienen perfil completo y ya son miembro del proyecto de prueba.

**Corrección (21/11/2026):** la afirmación de arriba ("SÍ tienen perfil completo") ya no es confiable — se encontraron 2 cuentas más (`qa.ej-legal2`, `qa.sost-direccion4`) con `profiles` vacío pese a tener sufijo y ser miembro del proyecto. Se completaron esas 2 esta noche, pero el resto de la tabla no está re-verificado. Antes de asumir que una cuenta está lista para probar, confirmarlo (login real + chequeo de `profiles`), no darlo por hecho solo porque tiene sufijo numérico.

| # | Departamento | Cargo | Herramienta(s) principal(es) | Cuenta de prueba | Personalidad exigente/proactiva |
|---|---|---|---|---|---|
| 1 | Ejecutivo | Producción ejecutiva | Presupuesto, Plan de financiación, Gestión de coproductores, Deliverables | qa.ej-produccion-ejecutiva2@mailinator.com | Previsora y numérica: si un capítulo del presupuesto no cuadra con el desglose de guion, lo señala como bug de integración, no lo deja pasar. |
| 2 | Ejecutivo | Dirección financiera | Modelo financiero y proyección | qa.ej-direccion-financiera2@mailinator.com | Exige escenarios reales (optimista/base/pesimista) cargables, no un solo número; cuestiona cualquier campo que no distinga moneda/IVA. |
| 3 | Ejecutivo | Tesorería | Pagos/nóminas/caja chica | qa.ej-tesoreria2@mailinator.com | Puntillosa con altas/bajas en Seguridad Social — si el campo no distingue régimen, lo reporta. |
| 4 | Ejecutivo | Administración | Gestión documental administrativa | qa.ej-administracion2@mailinator.com | Proactiva: propone que cada documento administrativo quede enlazado al contrato correspondiente de Legal. |
| 5 | Ejecutivo | Legal | Cadena de titularidad, NDAs | qa.ej-legal2@mailinator.com | Exige trazabilidad legal completa: si un NDA no tiene fecha de vencimiento visible, es bug. |
| 6 | Ejecutivo | Financiación y Seguros | Pólizas de seguro | qa.ej-seguros2@mailinator.com | Dado el doble de acción del proyecto test, exige que la póliza de riesgo quede vinculada a la escena 51-55 — si no hay forma de asociarlo, lo reporta. |
| 7 | Dirección | Dirección | Notas de dirección por escena, Plan de rodaje | qa.dir-direccion2@mailinator.com | Exigente con la narrativa de cada escena — si el campo de notas no permite adjuntar referencia visual, lo marca como falta real. |
| 8 | Dirección | 1er ayudante de dirección | Control de horarios y avisos (1AD) | qa.dir-1ad2@mailinator.com | Cronometrador: exige que el control de horarios calcule overtime automáticamente, no a mano. |
| 9 | Dirección | Asistencia de dirección | Control de horarios y avisos | qa.dir-asistencia2@mailinator.com | Nota que esta herramienta duplica la de 1AD sin diferenciarse — propone fusión o diferenciación real de permisos. |
| 10 | Dirección | 2ª Asistencia de dirección | Listado de figuración por escena | qa.dir-2ad2@mailinator.com | Exige que el listado de figuración de la escena de asamblea (25 figurantes) soporte alta masiva, no fila por fila. |
| 11 | Dirección | Script/Continuidad | Continuidad fotográfica (raccord) | qa.dir-script2@mailinator.com | Obsesiva con el raccord — exige comparación lado a lado de fotos entre tomas, no solo galería suelta. |
| 12 | Dirección | Dirección de actores | Notas de ensayo por actor | qa.dir-actores2@mailinator.com | Exige vincular cada nota de ensayo al arco del personaje (Reparto), no un campo de texto aislado. |
| 13 | Dirección | Secretaría de rodaje | Actas y archivo administrativo | qa.dir-secretaria2@mailinator.com | Exige buscador real sobre el archivo de actas, no solo lista cronológica. |
| 14 | Producción | Dirección de producción | Stripboard, Parte de producción diario | qa.prod-direccion2@mailinator.com | Máxima exigencia: el stripboard debe reflejar las 3 localizaciones separadas por 40-70km sin romper el orden de rodaje. |
| 15 | Producción | Jefatura de producción | Parte de producción diario, Control de transporte | qa.prod-jefatura2@mailinator.com | Exige que el transporte descentralizado (sin alojamiento cercano) se pueda planificar por tramo, no como un solo trayecto. |
| 16 | Producción | Asistencia de producción | Tareas administrativas diarias | qa.prod-asistencia2@mailinator.com | Señala que esta herramienta está vacía (confirmado en inventario) — exige contenido precargado mínimo antes de aprobarla como usable. |
| 17 | Producción | Coordinación de producción | Catering y dietas | qa.prod-coordinacion2@mailinator.com | Propone integración con RRHH para los descansos legales del rodaje de 22 días. |
| 18 | Producción | Jefatura de locaciones | Localizaciones | qa.prod-locaciones2@mailinator.com | Exige campos de permiso de organismo de cuenca para la localización del embalse — si no existen, bug real. |
| 19 | Producción | Scouting | Localizaciones | qa.prod-scouting2@mailinator.com | Exige galería comparativa de localizaciones alternativas, no una sola foto por sitio. |
| 20 | Producción | Logística | Control de transporte y vehículos | qa.prod-logistica2@mailinator.com | Puntillosa con el traslado de equipo pesado entre las 3 localizaciones del proyecto test. |
| 21 | Producción | Driver | Checklist de vehículos | qa.prod-driver2@mailinator.com | Exige checklist con fecha de última revisión de cada vehículo, no solo un sí/no genérico. |
| 22 | Fotografía | Dirección de fotografía | Plan técnico de cámara, Look book | qa.foto-direccion2@mailinator.com | Máxima exigencia visual: el look book debe soportar comparación de referencias por escena (ya existe, lo pone a prueba con la luz dorada del almendral). |
| 23 | Fotografía | Operación de cámara | Herramientas de cámara | qa.foto-camara2@mailinator.com | Exige metadata técnica real por toma (lente, apertura), no solo nombre de archivo. |
| 24 | Fotografía | Foquista | Plan técnico de cámara | qa.foto-foquista2@mailinator.com | Exige marcas de foco por toma asociadas al plano, no un campo de texto libre. |
| 25 | Fotografía | Auxiliar de cámara | Checklist de descarga/backup de tarjetas | qa.foto-aux-camara2@mailinator.com | Confirmado "Vacía" en inventario — exige que el checklist tenga pasos reales de verificación de checksum antes de aprobarlo. |
| 26 | Fotografía | Maquinista | Plan técnico de cámara | qa.foto-maquinista2@mailinator.com | Exige que el equipo de grúa/dolly para la pasarela de la secuencia de riesgo quede reservado con antelación en el inventario de equipo. |
| 27 | Fotografía | Eléctricos/Gaffer | Plan de iluminación | qa.foto-gaffer2@mailinator.com | Exige plan de iluminación específico para la ventana de 2h/día de luz dorada del almendral — si no se puede marcar franja horaria, bug. |
| 28 | Fotografía | DIT | Backup y verificación de material | qa.foto-dit3@mailinator.com | Confirmado "Vacía" en inventario — exige checksum real verificable, no solo un check manual. |
| 29 | Arte | Dirección de arte | Moodboard, Planos de decorado | qa.arte-direccion3@mailinator.com | Exige coherencia visual entre moodboard y planos de decorado de la nave agrícola del Acto III. |
| 30 | Arte | Ayudantía de dirección de arte | Checklist de seguimiento por escena | qa.arte-ayudantia3@mailinator.com | Confirmado "Vacía" — exige que el checklist esté atado a escena real del desglose, no suelto. |
| 31 | Arte | Construcción de decorados | Presupuesto y proveedores de arte | qa.arte-decorados2@mailinator.com | Exige que el presupuesto de decorado de la nave distinga materiales reutilizables vs. de un solo uso. |
| 32 | Arte | Atrezzo | Desglose de atrezzo por escena | qa.arte-atrezzo2@mailinator.com | Exige que el atrezzo del almendral (maquinaria agrícola antigua) tenga ficha de procedencia/alquiler. |
| 33 | Arte | Vestuario | Desglose de vestuario por personaje | qa.arte-vestuario2@mailinator.com | Exige continuidad de vestuario de luto del Acto I vinculada a cada escena, no una lista suelta por personaje. |
| 34 | Arte | Maquillaje | Desglose de vestuario/maquillaje | qa.arte-maquillaje2@mailinator.com | Exige ficha de continuidad de maquillaje para la escena nocturna de la presa (humedad, sudor por tensión). |
| 35 | Arte | Peluquería | Desglose de vestuario/peluquería | qa.arte-peluqueria3@mailinator.com | Exige registro de continuidad de peinado entre Acto I (duelo) y Acto III (asamblea), separados por semanas de rodaje. |
| 36 | Guion | Guion | Historial de versiones, Desglose de escenas | qa.guion-guion3@mailinator.com | Exige diff real entre versiones del guion, no solo archivos sueltos con fecha. |
| 37 | Guion | Script doctor | Informes de análisis | qa.guion-script-doctor2@mailinator.com | Exige que el informe de análisis pueda referenciar escena exacta del desglose (23-34, embalse) y no solo texto libre. |
| 38 | Casting | Dirección de casting | Listado de candidatos, Convocatoria | qa.casting-direccion2@mailinator.com | Exige filtro de candidatos por personaje y rango de edad (la sobrina de 12 años necesita candidatas menores con tutor registrado). |
| 39 | Casting | Casting de figuración | Convocatoria de figuración | qa.casting-figuracion3@mailinator.com | Exige alta masiva para los ~25 figurantes de la asamblea, no uno por uno. |
| 40 | Reparto | Protagonista | Diario de personaje/preparación | qa.rep-protagonista3@mailinator.com | Confirmado "Vacía" — exige que el diario de personaje permita vincular escenas del desglose, no texto suelto. |
| 41 | Reparto | Reparto secundario | Notas de escenas y marcas | qa.rep-secundario2@mailinator.com | Exige marcas de posición por toma para el doble de acción de la secuencia de riesgo. |
| 42 | Making of | Dirección de making of | Memoria de making of, Plan de cobertura BTS | qa.mo-direccion2@mailinator.com | Exige que el plan de cobertura BTS distinga qué escenas son aptas para redes (la del menor, no) — si no hay flag de restricción, bug serio. |
| 43 | Sonido | Dirección de sonido | Plan de sonido directo, Plan de frecuencias | qa.sonido-direccion3@mailinator.com | Máxima exigencia en la escena coral de la asamblea: exige plan de frecuencias para 25+ micros sin solapes. |
| 44 | Sonido | Microfonía | Lista de micrófonos por escena | qa.sonido-microfonia3@mailinator.com | Exige que la lista de micros de la secuencia junto a la presa marque protección contra humedad/viento. |
| 45 | Postproducción | Dirección de postproducción | Plan de montaje, Lista de planos VFX | qa.post-direccion2@mailinator.com | Exige que los 9 planos VFX de extensión del embalse queden trackeados con estado (pendiente/en proceso/aprobado). |
| 46 | Postproducción | VFX | Lista de planos VFX | qa.post-vfx2@mailinator.com | Exige referencia de placa real vs. plano final por toma, no una lista plana de nombres. |
| 47 | Postproducción | Sonorización final | Checklist de mezcla y masterización | qa.post-sonorizacion3@mailinator.com | Confirmado "Vacía"/recién entregada (post-checklist-mezcla) — la pone a prueba con la escena coral de 25+ pistas. |
| 48 | RRHH | Dirección de RRHH | Listado de equipo, Control de horas, Protocolo PRL | qa.rrhh-direccion4@mailinator.com | Máxima exigencia legal: exige que el permiso de trabajo de la menor (12 años) bloquee automáticamente turnos fuera de horario escolar. |
| 49 | Sostenibilidad | Dirección de sostenibilidad | Huella de carbono, Plan de residuos | qa.sost-direccion4@mailinator.com | Exige que el transporte descentralizado del rodaje (3 localizaciones) se refleje en el cálculo de huella de carbono, no un número genérico. |
| 50 | Distribución | Jefatura de distribución | Listado de festivales, Plan de distribución | qa.dist-jefatura4@mailinator.com | Exige filtrar los 127 festivales precargados por los que aceptan drama de autor de +90min — si el filtro no existe, lo reporta. |
| 51 | General (todos) | Cualquier integrante | Callsheet, Checklist de wrap | qa.general-callsheet4@mailinator.com | Exige que la callsheet del día de la secuencia de riesgo incluya al coordinador de especialistas y al equipo de rescate acuático como citación obligatoria. |

**Nota de alcance**: 51 cargos, cubriendo los 17 departamentos reales. Making of (Cámara/Edición/Community) y Marketing/Difusión interno quedan fuera de esta primera tanda a propósito — son herramientas ya "Consolidadas" sin complejidad nueva que aporte el proyecto test; se agregan en una ronda siguiente si el director-qa lo considera necesario.

## Verificación de acceso real — 25/11/2026 (pedido directo de Nico, por encima de buscar bugs en cargos nuevos esta noche)

Verificación sistemática de las 51 cuentas: login real (API Supabase Auth, password grant) + lectura de `profiles` (propio registro) + lectura de `project_members` (propia fila, con join a `proyectos.nombre`). Password fija de todas: `CinepackQA-2026!tester`.

**Resultado: las 51/51 cuentas confirman LOGIN_OK y son miembro real (`project_members`) de `[PROYECTO TEST] La sed de los almendros`.** El acceso de autenticación y de membresía al proyecto está sano para toda la tabla — no es un problema (como sí lo fue el 18/11 con las cuentas sin sufijo).

**Perfil (`profiles`): de las 51, 37 tenían `full_name`/`departamento`/`cargo` en `null`** (perfil vacío, igual que advertía la nota del 21/11 — la suposición de "cuenta con sufijo = perfil completo" volvió a fallar). Se completaron las 37 esta noche vía self-update RLS (login propio + `PATCH /rest/v1/profiles?id=eq.<propio id>`), con `full_name`, `departamento` y `cargo` exacto según `JERARQUIA_POR_DEPARTAMENTO` (`app/constants.ts`), `pais_residencia`/`provincia_residencia`/`pais_produccion`/`provincia_produccion` = "España"/"Madrid" (dato de prueba razonable, no real), y `acepta_tratamiento_datos = true`.

**Además, 1 cuenta (#48, RRHH) tenía `cargo` desalineado**: guardaba `"Coordinación de bienestar"` en vez de `"Dirección de RRHH"` (el cargo correcto según esta tabla y según `JERARQUIA_POR_DEPARTAMENTO`). Corregido esta noche con el mismo mecanismo de self-update.

**Confirmado 25/11: perfil OK, acceso OK, miembro OK — las 51 cuentas**, con el detalle de qué se tocó:
1. Producción ejecutiva — perfil completado esta noche.
2. Dirección financiera — perfil completado esta noche.
3. Tesorería — perfil completado esta noche.
4. Administración — perfil completado esta noche.
5. Legal — ya estaba completo (confirmado 21/11), re-confirmado hoy.
6. Financiación y Seguros — perfil completado esta noche.
7. Dirección — ya estaba completo, re-confirmado hoy.
8. 1er ayudante de dirección — perfil completado esta noche.
9. Asistencia de dirección — ya estaba completo, re-confirmado hoy.
10. 2ª Asistencia de dirección — perfil completado esta noche.
11. Script/Continuidad — perfil completado esta noche (cargo real en BD: `"Script"`, no `"Script/Continuidad"` — así está en `JERARQUIA_POR_DEPARTAMENTO`, es solo nombre más largo en esta tabla).
12. Dirección de actores — ya estaba completo, re-confirmado hoy.
13. Secretaría de rodaje — ya estaba completo, re-confirmado hoy.
14. Dirección de producción — perfil completado esta noche.
15. Jefatura de producción — perfil completado esta noche.
16. Asistencia de producción — ya estaba completo, re-confirmado hoy.
17. Coordinación de producción — perfil completado esta noche.
18. Jefatura de locaciones — perfil completado esta noche.
19. Scouting — perfil completado esta noche.
20. Logística — perfil completado esta noche.
21. Driver — ya estaba completo, re-confirmado hoy.
22. Dirección de fotografía — perfil completado esta noche.
23. Operación de cámara — perfil completado esta noche.
24. Foquista — perfil completado esta noche.
25. Auxiliar de cámara — perfil completado esta noche.
26. Maquinista — perfil completado esta noche.
27. Eléctricos/Gaffer — perfil completado esta noche (cargo real en BD: `"Eléctricos / Gaffer"` con espacios, ojo si se compara el string literal).
28. DIT (Imagen Digital) — ya estaba completo (confirmado 22/11), re-confirmado hoy.
29. Dirección de arte — perfil completado esta noche.
30. Ayudantía de dirección de arte — perfil completado esta noche.
31. Construcción de decorados — perfil completado esta noche.
32. Atrezzo — perfil completado esta noche.
33. Vestuario — perfil completado esta noche.
34. Maquillaje — perfil completado esta noche.
35. Peluquería — perfil completado esta noche.
36. Guion — perfil completado esta noche.
37. Script doctor — perfil completado esta noche.
38. Dirección de casting — perfil completado esta noche.
39. Casting de figuración — perfil completado esta noche.
40. Protagonista — perfil completado esta noche.
41. Reparto secundario — ya estaba completo, re-confirmado hoy.
42. Dirección de making of — ya estaba completo, re-confirmado hoy.
43. Dirección de sonido — perfil completado esta noche.
44. Microfonía — perfil completado esta noche.
45. Dirección de postproducción — perfil completado esta noche.
46. VFX — perfil completado esta noche.
47. Sonorización final — ya estaba completo (`es_tester:true`, nota aparte — no se tocó ese flag), re-confirmado hoy.
48. Dirección de RRHH — **cargo corregido hoy** (tenía `"Coordinación de bienestar"` guardado, no `"Dirección de RRHH"`).
49. Dirección de sostenibilidad — ya estaba completo (confirmado 21/11), re-confirmado hoy.
50. Jefatura de distribución — ya estaba completo (confirmado 22/11), re-confirmado hoy.
51. Cualquier integrante (callsheet) — perfil completado esta noche (asignado departamento "Producción"/cargo "Dirección de producción" como dato de prueba razonable, ya que el cargo real es "cualquier integrante").

**No verificado todavía (pendiente próxima noche, por tiempo)**: interacción real en vivo (click a click, vía navegador) dentro de "Exclusivas"/"Departamentos" para confirmar que cada cargo *ve* sus herramientas listadas tras el fix de perfil — esto se confirmó por API (perfil + membresía), no por UI, para poder cubrir las 51 cuentas en la ventana de 2 horas. Ya se sabe (ver `bugs/2026-11-25.md`) que **editar/abrir sub-pestañas seguirá bloqueado para los 6 departamentos fuera de `MODULOS_BETA_ACTIVOS`** aunque el perfil esté perfecto — ese es un bug de código aparte, no de datos de cuenta.
