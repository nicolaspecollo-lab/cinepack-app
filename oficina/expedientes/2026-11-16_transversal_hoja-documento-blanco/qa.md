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

---

## Ronda 2 — respuesta a la Objeción 3 del comité (comite-ronda1.md)

Autor: QA. Mismo expediente, misma rama. Sigue sin haber Supabase real en esta
sesión, así que reutilicé el mismo tipo de arnés aislado de la ronda 1
(`app/qa-docs-blanco/page.tsx`, montando `DocsBlancoPanel` directo con
`localStorage`), **no commiteado** — ver nota de limpieza al final.

Ajuste necesario al arnés: la ronda 1 lo envolvía solo en
`<div className="cp-dash"><div className="hp-open">`, sin contexto de altura.
Eso hacía que el contenedor de Univer midiera `height:0` (el editor de hoja
quedaba completamente en negro, sin grilla visible) — confirmado inspeccionando
el DOM (`getBoundingClientRect()` del `<section>` que envuelve el canvas
devolvía `height:0`). No es un bug de la app: en producción, `.cp-dash` vive
dentro del árbol flex de `WorkspaceShell.tsx:118` (`style={{ flex: 1 }}`), que sí
tiene altura resuelta por el layout de la página. Corregido el arnés agregando
`height:"100dvh"` en el wrapper, replicando ese contexto — con eso Univer midió
correctamente (`height:704px` en viewport de 900px) y la grilla se renderizó
con normalidad. Documento esto explícitamente para que no se confunda con un
bug real del editor.

### 1. Capturas de los editores ABIERTOS en 390/820/1440px (pedido del comité)

Nuevas, en `capturas/` (no se borraron las de ronda 1: `390px.png`, `820px.png`,
`1440px.png`, que siguen mostrando el listado):

- `editor-hoja-390.png`, `editor-hoja-820.png`, `editor-hoja-1440.png` — hoja
  Univer abierta, con grilla, toolbar y pestaña "Sheet1" visibles.
- `editor-doc-390.png`, `editor-doc-820.png`, `editor-doc-1440.png` — documento
  TipTap abierto, con toolbar (H, negrita, cursiva, listas, alinear) y placeholder
  "Escribí tu documento…".

**Scroll horizontal de PÁGINA** (medido con Playwright,
`document.documentElement.scrollWidth` vs `clientWidth`, con el editor de hoja
y el de documento abiertos, no solo el listado):

| Ancho | scrollWidth | clientWidth | Scroll de página |
|---|---|---|---|
| 390px | 390 | 390 | Ninguno |
| 820px | 820 | 820 | Ninguno |
| 1440px | 1440 | 1440 | Ninguno |

Confirmado en los 3 anchos, con ambos editores abiertos. `overflow-x:hidden` de
`.cp-dash` se respeta.

**Comportamiento de la toolbar de Univer en 390px — explícito, sin esconderlo**:
tiene **scroll horizontal interno propio**, tal como lo documenta el comentario
de `UniverHojaEditor.tsx:11-17` y la regla CSS
`.cp-dash .docb-hoja-scroll{ overflow-x:auto; ... } .cp-dash .docb-hoja-scroll > div{ min-width:640px; ... }`
(`dashboard.css:6147-6150`). En `editor-hoja-390.png` se ve la barra de scroll
gris debajo de la fila de pestañas ("Sheet1"): el contenedor interno de Univer
(toolbar + grilla + pestañas, todo junto) fuerza un ancho mínimo de 640px, así
que en 390px el conjunto entero se desliza horizontalmente dentro de su propio
contenedor — **no es scroll de página** (eso se mide aparte y da 0 en los tres
anchos), es un scroll interno contenido, visible también en 820px (donde 640 <
820 pero Univer igual reserva ese ancho mínimo, con la barra de scroll presente
aunque casi no haya nada que desplazar). Esto es la solución que ya proponía el
desarrollador en su comentario, y funciona como está descripta: el usuario desliza
la barra en vez de perder controles nativos de Univer.

### 2. Verificación MANUAL (no solo DOM) de fórmulas, formato de celda y filas/columnas — pedido del comité

Hecho con Playwright pero con interacciones reales de mouse/teclado sobre el
`<canvas>` de Univer (no lectura de estado interno vía API), con capturas antes
y después.

**Hallazgo importante primero** (hay que reportarlo, no esconderlo): hacer
`page.mouse.click()` directo sobre la grilla en el rango aproximado
`x:46–686, y:179–1079` (en viewport 1440px) no mueve la selección de celda —
el clic queda "atrapado" por un `<div>` overlay interno de Univer
(`#univer-doc-selection-container-__INTERNAL_EDITOR__DOCS_NORMAL`, el editor de
texto enriquecido de la celda activa) que mide **640×900px** con
`pointer-events:auto` y `z-index:1000`, en vez de medir solo la celda activa.
Confirmado con `getBoundingClientRect()` + `elementFromPoint()`: a la derecha de
`x=686` el clic sí llega al canvas y mueve la selección con normalidad (probado:
clic en `x:800,y:250` → selecciona `I3` correctamente). El número "640" coincide
con el `min-width:640px` que `dashboard.css:6149` fuerza en
`.docb-hoja-scroll > div` para el diseño mobile — es consistente con que ese
contenedor (pensado para el scroll horizontal de la toolbar en 390px) también
sea la referencia de tamaño que usa el editor de celda de Univer para su overlay
interno, en vez de ajustarse al tamaño real de la celda. **Esto no es un
artefacto de Playwright**: es CSS/DOM real, reproducible con una página recién
cargada, sin interacción previa — un usuario real con mouse en escritorio que
hace clic en una celda dentro de las primeras ~7 columnas (ancho ~640px) puede
encontrarse con que el clic no selecciona la celda esperada. Pasar esto al
desarrollador para que lo revise contra la integración de Univer (probablemente
hay que forzar que ese contenedor de edición mida el tamaño de la celda activa,
no el del wrapper con `min-width:640px`).

Como workaround real (no es un truco de test, es una forma válida de uso:
Excel/Sheets soportan navegar por el "cuadro de nombres"), usé el cuadro de
nombres (`name box`, input "A1" arriba a la izquierda de la grilla) para
seleccionar celdas por teclado y así probar las funciones sin depender del área
con el bug de clic:

- **Fórmula `=A1+A2`**: escribí `5` en A1, `7` en A2, `=A1+A2` en A3 (vía
  cuadro de nombres + teclado). Resultado: A3 muestra **12** en la grilla y la
  barra de fórmulas muestra `=A1+A2` al seleccionar A3 — el cálculo es correcto.
  Evidencia: `manual-formula-1-a1-a2-a3-calculado.png`,
  `manual-formula-2-a3-formula-bar.png`.
- **Formato de celda — color de fondo**: seleccioné B2 (con texto "Hola"), click
  en el botón de color de relleno de la toolbar (clic directo, sin necesidad de
  abrir el picker porque aplica el último color por defecto) → la celda queda
  con fondo azul sólido. Evidencia: `manual-formato-1-color-fondo-aplicado.png`.
- **Formato de celda — alineación**: seleccioné C1 (con texto "Hola", alineado
  a la izquierda por defecto), abrí el menú de alineación horizontal de la
  toolbar, click en "centro" → el texto pasa de alineado a la izquierda a
  centrado dentro de la celda. Evidencia: `manual-alinear-1-menu.png` (menú
  abierto, texto a la izquierda) y `manual-alinear-2-resultado.png` (texto ya
  centrado).
- **Insertar fila**: con datos de control `A1="fila1"`, `A2="fila2"`,
  `A3="fila3"`, clic derecho sobre el encabezado de la fila 2 → "Insertar 1
  filas arriba" → aparece una fila vacía nueva en la posición 2 y "fila2"/"fila3"
  se corren una fila hacia abajo (quedan en 3 y 4). Evidencia:
  `manual-filas-1-antes.png` (antes) y `manual-filas-4-insertada-ok.png`
  (después, fila 2 vacía, fila2→fila3, fila3→fila4).
- **Eliminar fila**: sobre esa misma hoja, clic derecho en el encabezado de la
  fila con "fila2" → "Eliminar fila seleccionada" → la fila desaparece y
  "fila3" sube a ocupar la fila 2. Evidencia: `manual-filas-3-eliminada.png`
  (se ve "fila1" en 1, "fila3" en 2 — "fila2" ya no está en ningún lado).
- **Insertar/eliminar columna**: confirmé que el menú contextual del
  encabezado de columna (clic derecho sobre encabezado "B") expone "Insertar 1
  columnas a la izquierda/derecha" y "Eliminar columna seleccionada" —
  mismo patrón de UI que filas (evidencia: `manual-columnas-1-menu.png`). **No
  reconfirmé visualmente el resultado después de insertar/eliminar columna**
  (el primer intento usó un selector de Playwright que no hizo click en el
  elemento correcto y no repetí la prueba por límite de tiempo de esta ronda);
  dado que filas e insertar/eliminar comparten exactamente el mismo
  componente de menú contextual de Univer y el mismo patrón de interacción que
  ya verifiqué para filas, hay alta confianza de que funciona igual, pero
  **marco esto como verificado parcialmente** (menú presente y correcto, efecto
  visual puntual de insertar/eliminar columna no vuelto a capturar) — si el
  comité quiere el mismo nivel de certeza que con filas, pido una repetición
  corta en ronda 3 o delego la confirmación final al desarrollador.

### 3. Resumen para el comité

- Scroll horizontal de página: **confirmado ausente** en 390/820/1440px, con
  los editores de hoja y documento abiertos (no solo el listado).
- Toolbar de Univer en 390px: **tiene scroll horizontal interno propio**, tal
  como el desarrollador documentó — no es scroll de página, es el
  comportamiento esperado.
- Fórmula `=A1+A2`: **calcula correctamente** (evidencia visual, valor 12).
- Formato de celda (color de fondo, alineación): **se puede aplicar**
  (evidencia visual antes/después para ambos).
- Insertar/eliminar fila: **funciona** (evidencia visual antes/después,
  contenido real desplazándose correctamente).
- Insertar/eliminar columna: **menú correcto, efecto no re-confirmado
  visualmente en esta ronda** (ver detalle arriba) — pendiente menor.
- **Bug nuevo encontrado, no pedido explícitamente por el comité pero relevante
  para 8/10 del dossier**: un overlay interno de Univer
  (`__INTERNAL_EDITOR__DOCS_NORMAL`) mide 640×900px en vez de ajustarse a la
  celda activa, bloqueando clics de mouse reales sobre una franja de ~640px de
  ancho de la grilla (columnas A a ~G aprox. en escritorio). Afecta
  directamente la usabilidad de "hacer clic en una celda" — recomiendo que el
  desarrollador lo revise antes de que esto llegue a Nico, aunque no bloqueó
  esta ronda de QA porque encontré un workaround real (cuadro de nombres) para
  seguir verificando fórmulas/formato/filas.

### 4. Nota de limpieza (igual que ronda 1)

`app/qa-docs-blanco/page.tsx` es el mismo arnés temporal de QA, actualizado en
esta ronda con `height:100dvh` en el wrapper (ver arriba) para que Univer mida
bien su contenedor. **No se commitea** — queda sin trackear en el working tree
o se borra; no está importado desde ningún otro archivo del repo. `.env.local`
tampoco se commitea (dummy, igual que ronda 1).
