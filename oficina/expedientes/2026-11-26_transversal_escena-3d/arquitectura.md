# Escena 3D — mapeo de arquitectura (arquitecto-integracion)
26/11/2026. Expediente transversal, máxima prioridad de Nico.

## Hallazgo clave: ya existe un 80% del mecanismo base
`app/hoy/EscenasPanel.tsx` (existente, en producción hoy) ya implementa casi exactamente el concepto de Nico, solo sin el carrusel 3D:
- Tabla `escenas` (real, por proyecto): `id, project_id, numero, int_ext, lugar, dia_noche, encabezado, descripcion, personajes[], dialogo jsonb, estado, orden`.
- Tabla `planos` (shot list técnico, real): `id, project_id, escena (texto, matchea escenas.numero), plano, tipo, mov_camara, lente, descripcion, notas`.
- **El identificador de escena cruzado entre departamentos ya existe**: es `escenas.numero` (no `escenas.id`). ~40 herramientas distintas, repartidas en casi todos los departamentos, tienen una columna `escena`/`escenas`/`secuencia` en su `herramienta_filas.datos` (confirmado por grep en `herramientas.ts`, líneas 379-2200+). `EscenasPanel` ya escanea genéricamente cualquier fila de `herramienta_filas` cuyo campo de escena contenga el número de la escena abierta, agrupa por `departamento`, y muestra un resumen ("Propuestas de todos los departamentos").
- Esto significa: **no hace falta crear un `escena_id` nuevo ni tocar el modelo de datos de cada departamento** — el campo ya existe y ya se usa de forma consistente (aunque es texto libre con matching por token numérico, no una FK estricta; ver riesgos).

## Las 10 caras — fuente real de datos para cada una

| # | Cara | Fuente real | Estado |
|---|------|------|--------|
| 1 | Guion (desglose) | Tabla `escenas` (encabezado, descripción, personajes, diálogo, int/ext, día/noche) | ✅ Ya existe, listo para reusar tal cual. |
| 2 | Guion técnico (shot list) | Tabla `planos` (escena, plano, tipo, mov_cámara, lente, descripción) vía `GuionTecnicoPanel.tsx` | ✅ Ya existe. |
| 3 | Storyboard | Plantilla genérica "storyboard" (`PlantillaCuadro.tsx` → `StoryboardView`), parte del sistema de `EspacioTrabajoPanel` | ⚠️ **Decisión para Nico**: el storyboard hoy es una plantilla de tablero genérica (tipo kanban/timeline/storyboard) que un departamento crea manualmente, NO está atada a una escena específica por diseño. Para que sea una cara real del cubo hace falta decidir: (a) crear instancias de storyboard una por escena automáticamente, o (b) dejar que el storyboard exista libre y la cara del cubo solo muestre las tarjetas de ese tablero cuyo campo escena matchee (mismo patrón que las demás) — **recomendación del arquitecto: opción (b)**, consistente con el resto, sin crear estructura nueva. Pendiente de confirmación.
| 4 | Plan de rodaje | `GENERAL_PLAN_RODAJE` (scope General), filtrado por escena si el plan reference escenas por jornada | ✅ Existe; falta confirmar si el plan de rodaje real ya lista escenas por día o solo por jornada genérica — a verificar por el desarrollador al construir esta cara. |
| 5 | Horarios del día (1AD) | `dir-control-horarios-1ad`, `herramienta_filas.datos` con campo escena/setup | ✅ Existe (ya tiene campo `escena`, ver inventario — columna confirmada en `herramientas.ts`). |
| 6 | Reparto (quién participa) | Tabla `escenas.personajes[]` (ya la tiene EscenasPanel) + fichas de Reparto (`rep-notas-preparacion`, etc.) cruzadas por nombre de personaje | ✅ Lo esencial (lista de personajes) ya existe en `escenas`. El cruce a la ficha completa de cada personaje es trabajo nuevo pero directo (join por nombre). |
| 7 | Vestuario/Maquillaje/Peluquería | "Desglose de vestuario por escena", "Desglose de maquillaje por escena" (`herramientas.ts` líneas 1987, 2053) — ambas con columna escena | ✅ Existen como herramientas Consolidadas, con campo escena. |
| 8 | Fotografía (plan técnico/shot list) | **Mismo dato que la cara 2** (tabla `planos`) | ⚠️ Nico pidió esta como cara separada de "Guion técnico" — en el repo real son la misma fuente de datos. Dos opciones: fusionar en una sola cara "Guion técnico / shot list", o diferenciar mostrando campos distintos de la misma fila (ej. cara 2 = narrativo/plano, cara 8 = técnico de cámara: lente, movimiento). Pendiente de confirmación con Nico — no inventar una segunda fuente de datos donde no la hay. |
| 9 | Continuidad/raccord (Script) | `dir-continuidad-foto` (ya rediseñada 25/11, 8 columnas con columna escena) | ✅ Existe, Consolidada. |
| 10 | Sonido | Plan de sonido directo (`PlanSonidoPanel.tsx`/`planSonidoFilas.ts`) — a confirmar si tiene columna escena | ⚠️ Pendiente de confirmar por el agente de departamento de Sonido si el plan de sonido se filtra por escena o solo por jornada/set. No asumido todavía.

## Decisiones abiertas para Nico (no asumidas, no inventadas)
1. **Cara 3 (Storyboard)**: ¿confirmás que se muestre el storyboard existente filtrado por escena (opción b arriba), en vez de crear una estructura nueva por escena?
2. **Caras 2 y 8 (Guion técnico vs. Fotografía)**: en el repo real son la misma fuente de datos (tabla `planos`). ¿Las fusionamos en una sola cara, o las separamos mostrando distintos campos de la misma fila (narrativo vs. técnico de cámara)?
3. **Cara 10 (Sonido)**: falta confirmar con el departamento de Sonido si el plan de sonido directo tiene de verdad un campo de escena utilizable o solo de jornada — no se asume.

## Componente del carrusel 3D — propuesta técnica
- Mobile-first, deslizable (swipe horizontal), efecto de rotación tipo "cube carousel" (el nombre técnico es **"3D cube carousel"** o "coverflow", confirmado — es una técnica de UI conocida, no una tecnología nueva).
- Implementación recomendada: CSS 3D transforms puro (`transform-style: preserve-3d`, `rotateY`, sin librería externa ni WebGL) — más liviano, más fácil de mantener dentro del sistema de diseño existente (`cp-theme.css`), funciona bien en mobile. WebGL/three.js sería sobre-ingeniería para este caso (no hay geometría real, solo tarjetas planas rotando).
- Cada cara es un componente propio (reusa los paneles ya existentes donde aplica: `EscenasPanel`, `GuionTecnicoPanel`, etc., adaptados a formato "cara de cubo" en vez de panel completo de página).
- Si una cara no tiene datos para esa escena, no se oculta del carrusel (generaría confusión de "se perdió una cara al girar") — se muestra con un estado vacío claro y breve ("Sin vestuario cargado para esta escena todavía"), nunca un cuadro genérico vacío sin contexto.
- Entrada: desde cualquier herramienta que ya liste escenas (el índice de `EscenasPanel`, o un buscador de escena nuevo accesible desde Exclusivas), se abre el cubo en la cara más relevante al contexto desde donde se entró (ej. si entrás desde Vestuario, abre en esa cara).

## Riesgos técnicos a vigilar
- El matching de escena es por **token numérico en texto libre** (`CAMPOS_ESCENA.map(...).join(" ")`, regex `\d+`), no una FK real — funciona hoy pero es frágil (ej. "escenas 12-14" matchea 12 y 14 pero también matchearía "Toma 12" de otro contexto si ese campo se reusa mal). Para el cubo, que agrega MUCHAS más fuentes que `EscenasPanel` original, este riesgo crece. Recomendación: no tocar el modelo de datos existente ahora, pero documentar el riesgo y evaluar más adelante una migración a `escena_id` real si el cubo demuestra que el matching por texto da falsos positivos/negativos en uso real.
- Performance: 10 caras × posible fetch por cara en vivo → vigilar que la carga sea perezosa (solo la cara activa + las 2 adyacentes para la animación), no las 10 de una.

## Estado real de avance (no fingido)
- Mapeo de las 10 caras: **completo** salvo las 3 decisiones abiertas de arriba.
- Diseño del componente carrusel: **propuesto, no construido**.
- Código nuevo: **ninguno todavía** — este pase fue 100% de arquitectura/mapeo, como corresponde antes de que el desarrollador toque nada.
- Próximo paso real: una vez Nico resuelva las 3 decisiones abiertas, el desarrollador puede empezar por el componente del carrusel + las caras que ya tienen fuente 100% confirmada (1, 2, 4, 5, 6, 7, 9 — 7 de las 10 ya no tienen ninguna duda pendiente).
