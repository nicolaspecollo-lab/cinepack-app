# Comité de calidad — Ronda 1 — Hoja de cálculo y Documento en blanco

## Veredicto: DEVUELTO A RONDA 2 (no aprobado, no archivado)

Revisión contra los 7 puntos de `/oficina/CLAUDE.md`.

### Objeción 1 — Bug funcional real en lo que el dossier promete (→ desarrollador)
`app/hoy/TiptapDocumentoEditor.tsx:64-73`, función `exportarPdf`, usa `editor.getText()`: descarta negrita, cursiva, subrayado, tachado, títulos, listas y alineación — el PDF exportado sale en texto plano. El dossier (6.1) presenta el documento como "negrita, cursiva, subrayado, tachado, títulos, listas... exportación a PDF" sin matizar la limitación ahí; la aclaración queda enterrada en 6.2 paso 3 como "mejora futura", cuando es la función insignia del editor (exportar lo que ves) y hoy no cumple lo anunciado. QA lo confirmó con evidencia de DOM real.

**Qué se espera**: corregir `exportarPdf` para que preserve el formato rico (renderizar el HTML real de TipTap a PDF), o si se acepta la limitación para v1, reescribir el dossier 6.1 para que no prometa "documento tipo Word con exportación" sin matizarlo ahí mismo.

### Objeción 2 — Integración de nivel 2 diseñada pero no construida (→ desarrollador)
`arquitectura.md` (apartado 4, Nivel 2) especifica que un doc "Compartido" debe aparecer en un listado "Documentos" a nivel proyecto en `WorkspaceShell.tsx`. El propio `dossier.md` (9.2, pendiente #4) admite que solo se integró a nivel 1 (cargo/usuario), dentro de "Exclusivas". Hoy un doc compartido no aparece en ningún listado fuera de la pestaña de quien lo creó. El punto 4 de la checklist exige los tres niveles con flujo de datos concreto — no está cumplido.

**Qué se espera**: construir la sección "Documentos" a nivel proyecto en `WorkspaceShell.tsx` (docs con `visibilidad='compartido'`, propios + compartidos conmigo) tal como ya lo especificó el arquitecto; o reclasificar explícitamente la integración de nivel 2 como pendiente en el dossier, a validar en ronda 2 si eso basta para una v1 (hoy no basta).

### Objeción 3 — Capturas insuficientes y funciones centrales "no probadas" (→ QA, con verificación del desarrollador)
Las 3 capturas (390/820/1440px) solo muestran la pantalla de listado, nunca los editores abiertos. QA dejó explícitamente como "no probado" (no como "funciona"): fórmulas (`=A1+A2`), formato de celda, e insertar/eliminar fila/columna en Univer — funciones centrales anunciadas en 6.1 del dossier. Tampoco se verificó el comportamiento del scroll interno de la toolbar de Univer en 390px.

**Qué se espera**: una ronda de QA de seguimiento que capture los editores de hoja y documento abiertos en los 3 anchos, confirme ausencia de scroll horizontal de página, y verifique manualmente (no solo por DOM) que las fórmulas calculan, el formato de celda se aplica y filas/columnas se insertan/eliminan — con evidencia visual.

### Puntos que sí pasan
- Fuentes: investigación con fuentes reales, hipótesis marcadas explícitamente.
- Específica del cargo: excepción al contenido precargado razonada en 6.4 (es "en blanco" por diseño).
- Supera a la competencia: ningún competidor revisado ofrece edición nativa equivalente, con fuente.
- No duplica nada existente: herramienta transversal nueva, correctamente señalada como tal.

### Reparto de correcciones (ronda 2)
- Desarrollador: Objeción 1 (export PDF) y Objeción 2 (integración nivel 2) o reclasificación explícita en el dossier.
- QA: Objeción 3 — nueva tanda de capturas + verificación manual de fórmulas/formato de celda/filas-columnas.

Máximo 2 rondas totales — esta fue la ronda 1. Si en la ronda 2 persiste cualquiera de estas objeciones, el expediente se archiva y no llega a Nico.
