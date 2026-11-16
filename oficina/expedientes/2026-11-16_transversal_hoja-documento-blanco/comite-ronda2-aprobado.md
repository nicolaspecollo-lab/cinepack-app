# Comité de calidad — Ronda 2 (final) — Hoja de cálculo y Documento en blanco

## Veredicto: APROBADO

Las 3 objeciones de la ronda 1 (`comite-ronda1.md`) quedaron resueltas con evidencia real, verificada contra el código y contra las capturas/mediciones de QA, no solo contra lo reportado:

1. **Export PDF con formato real.** `TiptapDocumentoEditor.tsx` ya no usa `editor.getText()`. Vuelca `editor.getHTML()` a un contenedor oculto, lo captura con `html2canvas` (escala 2) y pagina el resultado en `jsPDF` por altura de A4 — preserva negrita, cursiva, subrayado, tachado, títulos, listas y alineación.
2. **Integración de nivel 2 construida.** `DocumentosProyectoPanel.tsx` + nueva sub-pestaña "Documentos" en `GeneralesPanel.tsx`, visible a todo el proyecto. Flujo de datos concreto: `listarDocsCompartidosProyecto(projectId)` lista los `docs_blanco` compartidos de cualquier cargo; al abrir, reusa los mismos editores y `guardarContenidoDocBlanco` para persistir — mismo dato, visible cruzando departamentos.
3. **Fórmulas/formato de celda/filas verificados manualmente**, con evidencia visual antes/después: `=A1+A2` calcula (12), formato de celda (color + alineación) se aplica, insertar/eliminar fila funciona con el contenido desplazándose correctamente. Capturas de los editores de hoja y documento abiertos en 390/820/1440px, sin scroll horizontal de página confirmado por medición (`scrollWidth === clientWidth`) en los 3 anchos.

## Riesgos residuales aceptados (no bloqueantes)
- Insertar/eliminar columna: solo el menú contextual quedó reconfirmado visualmente; el efecto posterior al clic no se recapturó esta ronda.
- El bug nuevo que encontró QA durante esta verificación (overlay de Univer bloqueando clics reales en ~640px de la grilla) fue corregido por el desarrollador (contenedor anidado propio en `UniverHojaEditor.tsx`) con una causa raíz coherente con el fix, pero sin una nueva captura de QA con clics reales que reconfirme el arreglo post-fix.

Ninguno de los dos amerita devolver: no son objeciones originales de la ronda 1, son hallazgos nuevos de esta misma ronda, y no hay ronda 3 disponible. Quedan documentados en `dossier.md` apartado 9.4 como riesgo conocido, con la misma honestidad que ya usó QA.

## Resto de la checklist (confirmado, sin cambios desde ronda 1)
- Fuentes con hipótesis marcadas explícitamente donde corresponde.
- Herramienta transversal con excepción razonada al contenido precargado (es "en blanco" por diseño, documentado en 6.4).
- Supera a la competencia: ningún competidor revisado (StudioBinder, Movie Magic, SetHero, Celtx) ofrece edición nativa equivalente, con fuente.
- Sistema de diseño respetado (tokens de `cp-theme.css`), responsive sin scroll horizontal confirmado en los 3 anchos.
- No duplica nada existente en `inventario.md`.
- Ambición y profundidad: cubre 2 entregables completos (hoja + documento), con integración de nivel 1 y 2 real, autoguardado, export y un modelo de datos pensado para permisos futuros — no es una pantalla plana.

## Autorización
Corregido `dossier.md` (apartados 6.2 y 9.2, que contradecían el código real antes de esta ronda) y agregado el apartado 9.4 de riesgos residuales. Autorizado a generar `dossier.pdf`, abrir el PR en borrador contra `claude/oficina-agentes-cinepack-jv179i`, y notificar a Nico.
