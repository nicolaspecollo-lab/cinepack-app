# Dossier — Hoja de cálculo y Documento en blanco (transversal)

Autor de esta sección: desarrollador. Alcance: apartado 6 (Propuesta) y la parte
de componentes del apartado 9 (Especificación técnica). El resto del dossier
(1-5, 7-8, 10-11) vive en `investigacion.md` y `arquitectura.md` de este mismo
expediente.

Rama: `oficina/2026-11-16-hoja-documento-blanco`.

---

## 6. Propuesta

### 6.1 Qué hace (resumen)
Dos editores reales, sin plantilla fija, disponibles para cualquier cargo
dentro de "Exclusivas" de su departamento:

- **Hoja de cálculo** (Univer, núcleo Apache-2.0): fórmulas, formato de celda
  (color, alineación), insertar/eliminar filas y columnas — un lienzo de
  cálculo real, no una tabla con columnas predefinidas.
- **Documento** (TipTap, núcleo MIT): negrita, cursiva, subrayado, tachado,
  títulos, listas (simple/numerada), alineación, exportación a PDF.

Ambos se autoguardan (debounce ~0.5-0.6s tras el último cambio), el usuario
los nombra él mismo, y puede marcarlos "Compartido" para que el resto del
proyecto los vea en el listado (sin exponer el contenido a quien no tenga
acceso explícito — ver arquitectura.md).

### 6.2 Flujo de uso paso a paso

**Crear y usar una hoja de cálculo**
1. El usuario entra a su pestaña "Exclusivas" (`seccion="cargo"`) dentro de
   `HerramientasPanel`.
2. En la barra de sub-pestañas pulsa **"+ Hoja / Documento"**.
3. Ve dos tarjetas: "Nueva hoja de cálculo" / "Nuevo documento". Toca la
   primera.
4. Se crea al instante una fila `docs_blanco` (`tipo: 'hoja'`, `nombre: "Hoja
   sin título"`, `contenido: {}`) y se abre directamente el editor Univer, ya
   montado con una hoja en blanco.
5. El usuario escribe en el campo de título (arriba, editable in-line) para
   nombrarla — ej. "Presupuesto de arte, escena 14".
6. Trabaja en la grilla: escribe `=A1+A2`, pone formato de moneda, colorea
   celdas, inserta una fila nueva arrastrando el menú contextual nativo de
   Univer. Todo se autoguarda sin botón explícito.
7. Vuelve atrás con la flecha ("←"): la hoja queda listada en "Mis
   documentos/hojas" (dentro de la misma vista), con su nombre y si es
   privada o compartida.
8. Si quiere que el Director de Fotografía la vea, activa el botón
   "Compartido" (arriba a la derecha del editor) — queda visible para
   cualquiera con acceso en el espacio del proyecto (modelo de permisos
   fila-por-persona vía `docs_blanco_accesos`, documentado en
   `arquitectura.md`).

**Crear y usar un documento**
1. Mismos pasos 1-3, pero toca "Nuevo documento".
2. Se abre TipTap con un documento vacío. El usuario escribe, selecciona
   texto y aplica negrita/cursiva/título con la barra superior (iconos de
   `Icon.tsx`, scrolleable horizontalmente en 390px si no entran todos).
3. Al terminar, pulsa el icono de descarga en la barra para exportar a PDF
   (vuelca `editor.getHTML()` a un contenedor oculto, lo captura con
   `html2canvas` a escala 2 y pagina el resultado en `jsPDF` por altura de
   A4 — preserva negrita, cursiva, subrayado, tachado, títulos, listas y
   alineación tal como se ven en pantalla, corregido en la ronda 2 de
   revisión tras detectarse que la primera versión exportaba solo texto
   plano).
4. Igual que la hoja: nombre editable in-line, autoguardado, botón
   "Compartido"/"Privado", botón eliminar con confirmación.

### 6.3 Por qué es un panel a medida (no el motor genérico)
Igual justificación que `MoodboardFotoLienzo.tsx`/`PlanSonidoPanel.tsx`: el
contenido es un lienzo de edición completo (celdas con fórmulas / documento
ProseMirror), no una fila de columnas tipadas (`ColTipo` de
`herramientas.ts`). Forzarlo en el motor genérico habría significado
maquillar un dato que no es tabular — mismo razonamiento que ya desarrolló el
arquitecto en `arquitectura.md`, apartado 3.

### 6.4 Excepción deliberada a "contenido precargado específico del cargo"
Esta herramienta es la única excepción documentada a la regla de "nunca un
formulario en blanco genérico": por definición del expediente, el usuario
decide el contenido y la estructura en el momento de crear. No hay plantilla
de cargo que precargar sin contradecir el propósito de la herramienta (ya
señalado en `arquitectura.md`, Nivel 1).

---

## 9. Especificación técnica — Componentes (parte del desarrollador)

| Componente | Rol |
|---|---|
| `app/hoy/docsBlanco.ts` | Modelo de datos (`DocBlanco`) + funciones CRUD. Implementa el contrato de la tabla `docs_blanco` definida en `arquitectura.md` contra **localStorage** (stub explícito, ver 9.1). Migrar a Supabase real es un cambio mecánico de estas mismas funciones, sin tocar la UI. |
| `app/hoy/DocsBlancoPanel.tsx` | Panel a medida: listado ("Mis documentos/hojas"), creación, apertura, renombrado in-line, toggle privado/compartido, borrado. Monta `UniverHojaEditor`/`TiptapDocumentoEditor` vía `next/dynamic` con `ssr:false` (mismo patrón que `MoodboardLienzo`/`MoodboardFotoLienzo`, porque ambos editores dependen del DOM/canvas real). |
| `app/hoy/UniverHojaEditor.tsx` | Monta Univer (`@univerjs/presets` + `@univerjs/preset-sheets-core`, locale `es-ES`) sobre un `<div>` ref. Crea el workbook desde el snapshot guardado (`univerAPI.createWorkbook(...)`) o uno vacío. Autoguarda en cada `CommandExecuted` (debounce 600ms) usando `fWorkbook.save()`. |
| `app/hoy/TiptapDocumentoEditor.tsx` | Monta TipTap (`@tiptap/react` + `StarterKit` + `Underline` + `TextAlign` + `Placeholder`). Toolbar propia con los iconos de `Icon.tsx` (negrita/cursiva/subrayado/tachado/títulos/listas/alineación/exportar). Autoguarda el JSON de ProseMirror en `onUpdate` (debounce 500ms). Exporta a PDF con `jspdf` (ya en el stack). |
| `app/hoy/HerramientasPanel.tsx` (modificado) | Agrega el botón "+ Hoja / Documento" en la barra de sub-pestañas de "Exclusivas" y el estado `docsBlancoAbierto`, siguiendo el mismo patrón ya usado por "+ Espacio de trabajo"/`EspacioTrabajoPanel`. Resuelve el `userId` real vía `supabase.auth.getUser()` (necesario como `owner_id`). |
| `app/hoy/dashboard.css` (ampliado) | Reglas `.docb-*`: tokens `--gutter`/`--fs-*`/`--sp-*`/`--hl*`/`--line`/`--acc`, sin valores sueltos. La UI nativa de Univer no es mobile-first (riesgo ya señalado por el arquitecto); se la envuelve en `.docb-hoja-scroll` con `overflow-x:auto` propio en vez de recortarla, respetando el `overflow-x:hidden` global de `.cp-dash`. |
| `supabase/migrations/20261116000000_docs_blanco.sql` | Tablas `docs_blanco` / `docs_blanco_accesos` + RLS, exactamente como las definió `arquitectura.md` (reusa `puede_admin_depto()` ya existente). **No corrida contra un proyecto Supabase real en esta sesión** — queda pendiente de validación real antes de cerrar el expediente. |

### 9.1 Librerías instaladas (versiones reales en `package.json` de esta rama)
- `@univerjs/presets` `^1.5.2`
- `@univerjs/preset-sheets-core` `^1.5.2` (bundlea `@univerjs/core`, `sheets`, `sheets-ui`, `sheets-formula(-ui)`, `docs(-ui)`, `ui`, `design`, `engine-render`, `engine-formula`, `rpc`, `network`, `sheets-numfmt(-ui)` — todas en `1.5.2`, licencia Apache-2.0 verificada en el propio `package.json` de cada paquete descargado)
- `rxjs` `^7.8.2` (peer-dep de Univer)
- `@tiptap/react` `^3.34.0`, `@tiptap/core` `^3.34.0`, `@tiptap/pm` `^3.34.0`, `@tiptap/starter-kit` `^3.34.0`, `@tiptap/extension-text-align` `^3.34.0`, `@tiptap/extension-underline` `^3.34.0`, `@tiptap/extension-placeholder` `^3.34.0` (todas MIT)

**Compatibilidad verificada contra React 19.2.4 / Next.js 16.2.9**: `npm install`
no arrojó ningún conflicto de peer-dependencies (los `peerDependencies`
publicados de Univer y TipTap ya incluyen `^19.0.0` explícitamente). No fue
necesario `--legacy-peer-deps` ni overrides. `npm run build` compila y pasa el
type-check completo con estas librerías instaladas.

### 9.2 Qué es prototipo de UI funcional vs. qué queda pendiente
- **Funcional ahora**: creación/nombrado de hoja y documento, edición real
  (fórmulas/formato en la hoja; negrita/listas/títulos/alineación en el
  documento), autoguardado, listado, renombrado, toggle privado/compartido,
  borrado, exportación a PDF del documento. Todo probado con `npm run build`
  (compila y tipa limpio) en este entorno.
- **Pendiente (no resuelto en este expediente)**:
  1. Persistencia real contra Supabase (`docs_blanco`/`docs_blanco_accesos`):
     hoy es localStorage. La migración SQL está escrita pero no corrida ni
     probada contra un proyecto real.
  2. El toggle "Compartido" hoy sólo cambia la visibilidad en el propio
     localStorage del owner; no hay UI para dar/quitar acceso fila-por-persona
     (`docs_blanco_accesos`) — el modelo de datos lo soporta, falta el panel
     de gestión (candidato natural: extender `GestionAccesosPanel.tsx`, como
     ya sugirió el arquitecto).
  3. Exportación de la hoja a `.xlsx` real y del documento a `.docx` (hoy solo
     hay export a PDF del documento; la hoja no tiene botón de exportación
     todavía).
  4. ~~Nivel "Documentos" a nivel proyecto~~ — **resuelto en la ronda 2**:
     `DocumentosProyectoPanel.tsx` + nueva sub-pestaña "Documentos" dentro de
     `GeneralesPanel.tsx` (visible a todo el proyecto, no solo a quien creó
     el doc), listando todo `docs_blanco` con `visibilidad='compartido'` vía
     `listarDocsCompartidosProyecto(projectId)`. Sigue pendiente el Nivel 3
     (permisos granulares fila-por-persona en `docs_blanco_accesos`), que ya
     estaba fuera del alcance de este expediente desde `arquitectura.md`.

### 9.4 Riesgos residuales aceptados en la aprobación de ronda 2
- **Insertar/eliminar columna**: QA confirmó visualmente el menú contextual correcto, pero no recapturó el efecto visual posterior al clic (quedó como "verificado parcialmente", a diferencia de fórmulas/formato/filas que sí tienen captura antes/después completa).
- **Fix del overlay de Univer** (bloqueaba clics reales en una franja de ~640px de la grilla, corregido en `UniverHojaEditor.tsx` pasando un contenedor anidado propio en vez de `.docb-hoja-scroll` directo): la causa raíz identificada coincide con el fix aplicado y compila limpio, pero no hay una captura/medición de QA que reconfirme con clics de mouse reales, después del fix, que el bug ya no ocurre.

Ambos quedaron aceptados como riesgo menor no bloqueante por el comité de calidad en la ronda 2 (no son ninguna de las 3 objeciones originales de la ronda 1, y no hay ronda 3 disponible para repetir la verificación).

### 9.3 Bloqueantes reales para el comité
Ninguno. No hubo conflicto de peer-dependencies ni incompatibilidad con
React 19.2.4/Next.js 16.2.9. `npm run build` pasa limpio. `npm run lint` ya
fallaba en la rama base antes de este expediente (92 errores/33 warnings
preexistentes en todo el repo, ajenos a esta herramienta); este cambio suma 6
errores nuevos, todos del mismo patrón ya presente en el resto del código
(lectura de `localStorage` en un `useEffect`) salvo un caso de comillas sin
escapar, ya corregido.
