# QA — Hoja de cálculo y Documento en blanco (transversal)

Autor: QA. Expediente: `2026-11-16_transversal_hoja-documento-blanco`.
Rama: `oficina/2026-11-16-hoja-documento-blanco`.

## 0. Bloqueo de entorno (reportado tal cual, sin inventar)

Esta sesión **no tiene** `.env.local` ni credenciales de Supabase reales
(no hay proyecto Supabase disponible). Eso bloquea el flujo real:
`middleware.ts` (`lib/supabase/middleware.ts`) llama a
`supabase.auth.getUser()` en **toda** request — sin `NEXT_PUBLIC_SUPABASE_URL`/
`NEXT_PUBLIC_SUPABASE_ANON_KEY` el servidor devuelve 500 en cualquier ruta,
incluida `/hoy`. No pude loguearme ni navegar `HerramientasPanel` → pestaña
"Exclusivas" → botón "+ Hoja / Documento" tal como lo haría un usuario real.

Lo que hice para probar igual, sin inventar que "funcionó" si no lo vi correr:
1. Puse variables dummy (`https://example.invalid` + key placeholder) en
   `.env.local` (gitignorado, no se commitea) solo para que el middleware no
   tire 500 — `getUser()` devuelve `user: null` sin red real, consistente con
   "no autenticado".
2. Como `DocsBlancoPanel` no depende de Supabase (persiste en `localStorage`
   vía `app/hoy/docsBlanco.ts`, documentado ahí mismo como STUB explícito) y
   solo necesita `departamento`, `fullName`, `ownerId` como props, armé una
   página mínima de arnés en `app/qa-docs-blanco/page.tsx` que monta
   `DocsBlancoPanel` directo, con el mismo CSS real (`import "../hoy/dashboard.css"`,
   que a su vez importa `cp-theme.css`) y la clase `.hp-open` real que usa
   `HerramientasPanel` para envolver el panel abierto — mismo contenedor que
   en producción, sin tocar el componente bajo prueba.
3. Esta página es **solo de QA**, no se integra a la navegación del producto
   y no se commitea (ver más abajo). Serviría como evidencia para el comité,
   pero **no reemplaza** una prueba end-to-end real con login — eso queda
   pendiente de que exista un proyecto Supabase real (ver apartado 10 del
   dossier, riesgos).
4. Confirmé con `npm run build` (Next 16.2.9 + Turbopack) que la app completa
   compila sin errores con la ruta nueva incluida, y que `/hoy` sigue
   existiendo como ruta dinámica — no se rompió el build por el cambio.

## 1. Funcional — Hoja de cálculo

- Golden path: tarjeta "Nueva hoja de cálculo" → se abre `UniverHojaEditor`
  con grilla real (>350 nodos DOM de Univer renderizados, toolbar propia).
  OK.
- Nombrar la hoja (`docb-open-title`, blur/Enter) → persiste y se refleja en
  el listado al volver atrás con "←". OK.
- Al volver al listado, el ítem aparece con "Tuyo" / "Privado". OK.
- **No pude verificar dentro de Univer, por limitación de automatización**:
  escribir `=A1+A2` y evaluarlo, cambiar color/alineación de celda e
  insertar/eliminar fila por el menú contextual nativo de Univer — son
  interacciones dentro de un `<canvas>`/DOM propio de la librería que no
  expone selectores estables para un test de UI automatizado en el tiempo
  disponible. Confirmé que el editor carga y el contenedor de toolbar propio
  existe (según el dossier, con su propio scroll horizontal interno), pero
  **no verifiqué manualmente el cálculo de fórmulas ni el formato de celda** —
  dejo esto como pendiente explícito, no como "probado".
- Caso límite no probado por el mismo motivo: insertar/eliminar fila o
  columna.

## 2. Funcional — Documento

- Golden path completo, verificado por DOM real (no solo visualmente):
  - Nombrar el documento (`docb-open-title`). OK.
  - Escribir texto. OK.
  - Negrita: seleccionar texto y click en "Negrita" → el HTML real del
    editor pasa a `<p><strong>Hola mundo</strong></p>`. OK.
  - Lista: click en "Lista" sobre el párrafo en negrita →
    `<ul><li><p><strong>Hola mundo</strong></p></li></ul>`. OK.
  - Alineación: click en "Centrar" → `<p style="text-align: center;">...`.
    OK.
  - Exportar a PDF: dispara un evento de descarga real (`download` de
    Playwright, archivo `.pdf`) sin errores de consola. OK en cuanto a que
    "dispara la descarga".
- **Bug real encontrado** (`app/hoy/TiptapDocumentoEditor.tsx:65-72`,
  función `exportarPdf`): usa `editor.getText()` para armar el PDF, que
  **descarta todo el formato rico** — negrita, cursiva, subrayado, tachado,
  títulos, listas y alineación no llegan al PDF, solo texto plano en una
  sola tipografía/tamaño. El dossier (apartado 6.1) promete "documento de
  texto enriquecido... exportación a PDF" sin aclarar que el PDF es texto
  plano — esto es una discrepancia entre lo prometido y lo entregado, no un
  detalle cosmético: un usuario que arma un documento con títulos y listas
  va a exportar un PDF que no se parece a lo que ve en pantalla. Reportar al
  desarrollador antes de pasar al comité.
- Caso límite probado: documento recién creado sin contenido (`<p></p>`) no
  rompe el editor ni la carga del toolbar.

## 3. No regresión

- `npm run build` (Next 16.2.9, Turbopack): **compila sin errores**, 46
  páginas generadas, incluida `/hoy` (ƒ, dinámica) y la ruta de arnés
  `/qa-docs-blanco`. El cambio no rompe el build del resto de la app.
- `npm run lint`: el repo **ya tiene 92 errores / 33 warnings preexistentes**
  en archivos no tocados por este expediente (`PlantillaCuadro.tsx`,
  `useTheme.ts`, `RegistroActividadPanel.tsx`, etc.) — no es un baseline
  limpio, así que no puedo decir "lint pasa". Específicamente en los
  archivos de este expediente, `app/hoy/DocsBlancoPanel.tsx` tiene **2
  errores** de `react-hooks/set-state-in-effect` (líneas 55 y 63: `setState`
  síncrono dentro de un efecto). Es el mismo patrón que ya usa
  `app/useTheme.ts:10` y `app/hoy/PlantillaCuadro.tsx:62` en el resto del
  repo (consistente con la convención existente, no es una regresión nueva
  de estilo), pero sigue siendo un error de lint real — lo dejo para que el
  desarrollador decida si vale la pena envolver en un callback o dejarlo
  igual que el resto del repo.
- Consola del navegador durante la prueba de la hoja: aparece
  `Attempted to synchronously unmount a root while React was already
  rendering` (dos veces, al crear/cerrar la hoja de Univer). No impidió que
  el flujo funcionara (título, listado, etc. siguieron bien) pero es un
  warning real de React 19 por cómo `UniverHojaEditor.tsx` dispone del
  `univer`/`univerAPI` en el cleanup del efecto — vale que el desarrollador
  lo revise, podría volverse un error duro en otra versión de React.
- No se tocó `HerramientaPanel.tsx` ni `WorkspaceShell.tsx`/`ToolMenu.tsx`
  en este expediente — no corresponde regresión ahí; no encontré señales de
  que la integración en `HerramientasPanel.tsx` (botón "+ Hoja / Documento",
  líneas ~221-303) rompa las demás sub-pestañas de "Exclusivas" (el cambio
  es aditivo: nuevo estado `docsBlancoAbierto`, no toca las ramas
  existentes).

## 4. Responsive (Playwright, Chromium)

Capturas reales en
`oficina/expedientes/2026-11-16_transversal_hoja-documento-blanco/capturas/`:
- `390px.png` — móvil, viewport completo (no fullPage).
- `820px.png` — tablet.
- `1440px.png` — escritorio.

Las tres muestran la vista de listado de "Hoja de cálculo y Documento en
blanco" con las dos tarjetas de creación y el estado vacío
("Todavía no creaste nada"), dentro del contenedor real `.hp-open` con
`dashboard.css`/`cp-theme.css` cargados.

Verificación explícita de scroll horizontal de página en los 3 anchos
(`document.documentElement.scrollWidth` vs `clientWidth`, medido con
Playwright, no a ojo):
- 390px → `scrollWidth: 390` = `clientWidth: 390`. **Sin scroll horizontal.**
- 820px → `scrollWidth: 820` = `clientWidth: 820`. **Sin scroll horizontal.**
- 1440px → `scrollWidth: 1440` = `clientWidth: 1440`. **Sin scroll horizontal.**

El gutter lateral en 390px se ve de ~16-18px, consistente con
`--gutter` bajando a 16px en `≤640px` según `sistema-diseno.md`.

**No verificado**: el scroll horizontal interno de la toolbar de Univer
dentro del editor de hoja en 390px (el desarrollador dice haberlo envuelto
en su propio contenedor con scroll horizontal propio). No llegué a abrir el
editor de hoja en viewport de 390px durante la sesión de capturas — lo que
sí confirmé es que el **listado** (pantalla antes/después de abrir un
editor) no tiene scroll de página en ningún ancho. Pendiente: QA de
seguimiento debería abrir específicamente la hoja en 390px y repetir la
misma medición de `scrollWidth` para cerrar este punto.

## 5. Resumen para el apartado 8 del dossier ("Diseño visual")

Las 3 capturas (`390px.png`, `820px.png`, `1440px.png`) muestran la pantalla
de listado de la herramienta respetando el sistema de diseño (`cp-dash`,
tipografía Poppins en títulos, Courier New en cuerpo, colores de acento
`--cyan`/`--lime` en las tarjetas, `.hex` decorativo). No se detectaron
violaciones visuales del sistema de diseño en esta vista. **No se incluye**
captura del editor de hoja o de documento abiertos — quedó fuera por el
límite de tiempo de esta sesión de QA; recomendado para una segunda tanda de
capturas antes de que el comité cierre el apartado 8.

## 6. Resumen para el apartado 10 ("Riesgos y preguntas abiertas")

1. **Exportar a PDF pierde todo el formato rico** (bug funcional real, ver
   sección 2) — hay que decidir si se corrige antes de la primera ronda del
   comité o se deja como limitación conocida documentada en el dossier.
2. **No hay Supabase real disponible en ningún entorno de esta cadena de
   agentes** (ni desarrollador ni QA tuvieron credenciales) — el flujo de
   autenticación/datos reales (incluida la migración `docs_blanco` con RLS)
   nunca se probó de punta a punta. Es un riesgo que viene arrastrándose del
   dossier (`docsBlanco.ts` ya lo marca como STUB) y que QA no pudo despejar
   por la misma razón.
3. Warning de consola en React 19 al crear/cerrar hojas de Univer
   (`Attempted to synchronously unmount a root...`) — revisar el cleanup de
   `UniverHojaEditor.tsx` antes de que esto se vuelva un error duro.
4. Falta verificar fórmulas, formato de celda e inserción/eliminación de
   fila/columna dentro de Univer con una prueba real (automatizada o manual)
   — no cubierto en esta ronda de QA por falta de selectores estables desde
   afuera del canvas/DOM propio de la librería en el tiempo disponible.
5. Falta la captura del editor de hoja en 390px para confirmar el scroll
   horizontal interno de la toolbar de Univer que el desarrollador dice
   haber resuelto — no es scroll de página (eso sí se confirmó: cero scroll
   horizontal en los 3 anchos sobre el listado), es específicamente el
   comportamiento interno de la toolbar de Univer.

## 7. Nota de limpieza

`app/qa-docs-blanco/page.tsx` es un arnés de prueba temporal, no forma parte
del producto. **No se incluye en el commit de este expediente** — si el
comité o el desarrollador quieren reusarlo para una ronda siguiente de QA,
queda en el working tree sin trackear; si no, se puede borrar sin impacto
(no está importado desde ningún otro archivo del repo). Igual con
`.env.local` (gitignorado, nunca se commiteó): contiene solo valores dummy
(`https://example.invalid` + placeholder) para destrabar el middleware, no
son credenciales reales de nada.
