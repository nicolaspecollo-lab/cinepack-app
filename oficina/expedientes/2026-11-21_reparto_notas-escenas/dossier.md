# Dossier — `rep-notas-escenas` ("Marcas de continuidad")

Oficina de Agentes CINEPACK. 21/11/2026.

## 1. Resumen ejecutivo

"Marcas de continuidad" es la herramienta exclusiva del cargo **Reparto
secundario** para registrar, escena a escena, la continuidad física
observable de su propio personaje — marca de posición en plató,
vestuario/prop en mano, entrada y salida de cuadro, dirección de mirada,
última palabra o gesto antes del corte. Resuelve una sola pregunta real:
**¿cómo estaba la última vez que rodé esta escena?** — crítica para un
actor que, a diferencia del protagonista, vuelve a su personaje en
jornadas muy separadas en el calendario y corre más riesgo de perder el
raccord. Se construyó como panel a medida (`MarcasContinuidad`), no como
tabla plana: agrupa por escena ordenando por la jornada más reciente, y
deja la ficha de la jornada anterior siempre visible al lado de la nueva.
Aprobada por comité (sin objeciones, ronda 1) tras 3 bugs reales
encontrados y corregidos por QA en dos pasadas. Pendiente de calificación
de Nico.

## 2. Origen de la idea

La entrada `rep-notas-escenas` ("Notas de escenas y marcas") ya estaba
reservada en el catálogo de la app (`app/herramientas.ts`, cargo Reparto
secundario) como placeholder vacío (`tipo: "nota"`, sin `hint`) — ver
`inventario.md`, donde figuraba marcada "Vacía". No es una herramienta
inventada hoy: es una de las entradas del backlog de placeholders por
cargo que la Oficina de Desarrollo eligió trabajar en el ciclo diario del
21/11/2026, junto con `dir-notas-ensayo` y `mo-memoria`.

## 3. El cargo

Reparto secundario es una categoría retributiva propia dentro del
convenio colectivo estatal de actores y actrices (tablas salariales 2025,
BOE-A-2025-5586, publicado 20/03/2025) — distinta de
protagonista, reparto y pequeñas partes). A diferencia del protagonista,
no tiene arco narrativo continuo ni presencia diaria en plató: interviene
en escenas puntuales, a veces separadas por semanas o meses en el
calendario de rodaje, sin necesariamente tener acceso constante al script
supervisor o al 1er AD en el día a día. Esto es inferencia razonada a
partir de la naturaleza del rol — marcada como hipótesis fundamentada en
`investigacion.md`, no como cita textual verificada.

## 4. Necesidades y dolores (con fuente)

- Las "marcas" de actor (cinta de color en el suelo marcando dónde
  pararse/moverse, fijadas en el ensayo de blocking) son una práctica real
  y documentada del oficio (Stand-In Central, "Stand-in 101: standing on
  your mark"; The Black and Blue, "Marking actors should be simple
  right?"). El código de color (rojo para el actor principal, azul para
  el secundario/apoyo más presente en la escena) y el uso de sacos de
  arena o palillos para localizar la marca en la oscuridad también están
  documentados en esas mismas fuentes.
- El/la script supervisor es quien hoy lleva el registro completo de
  continuidad fotográfica de la escena (todos los actores, cámara,
  atrezzo general) — ya existe en CINEPACK como herramienta del
  departamento Dirección/Script (`inventario.md`, tipo `galeria`, hint
  "Galería + notas de raccord"). El dolor real identificado: el actor de
  reparto secundario no tiene hoy una copia personal y simplificada de lo
  que a él le afecta (su marca, su vestuario, su prop, su entrada/salida)
  para consultar entre jornadas separadas en el tiempo, sin depender de
  pedirle el dato al script cada vez.
- No se encontró fuente española específica (sindicato, AISGE, foro
  profesional) que documente cómo maneja hoy sin software esta
  continuidad el reparto secundario en particular — marcado
  explícitamente como ausencia de fuente en `investigacion.md`, no como
  hallazgo inventado.

## 5. Estado del arte

Ninguna de las herramientas de competencia investigadas (StudioBinder,
Yamdu, Celtx, SetHero; Movie Magic sin confirmar por falta de
documentación pública) ofrece una vista personal por actor de continuidad
física organizada por escena:

- **StudioBinder** tiene "Storyboard Blocking" (planeo de ángulos/
  movimiento sobre storyboard), pero pensado para el equipo de dirección/
  cámara, no como consulta personal del actor.
- **Celtx** tiene un "shot-blocker" dentro de su módulo de Storyboard,
  separado de Scheduling — mismo problema: herramienta de planificación
  de equipo, no de memoria personal del actor.
- **SetHero** es logística de hojas de llamada (call sheets), sin nada de
  blocking o continuidad de personaje.
- **Yamdu** y **Movie Magic**: sin documentación pública encontrada sobre
  blocking/marcas de actor — no se afirma que no lo tengan, se marca como
  no verificado.

Conclusión (marcada igual en `investigacion.md`): es terreno abierto —
ningún competidor investigado resuelve "cómo estaba la última vez que
rodé esta escena" desde la perspectiva personal del actor secundario.

## 6. Propuesta

"Marcas de continuidad" resuelve una sola pregunta cada vez que el actor de
reparto secundario abre la herramienta: **¿cómo estaba la última vez que rodé
esta escena?** No es un análisis emocional (eso es `rep-notas-escenas-detalle`,
de otro cargo) — es continuidad física observable: marca de plató, vestuario o
prop en mano, entrada/salida de cuadro, mirada, última palabra o gesto antes
del corte.

### Flujo de uso 1 — Rodando una escena por primera vez
1. El actor abre "Marcas de continuidad" dentro de su cargo (Reparto
   secundario). Si todavía no cargó nada, ve una tarjeta-ejemplo (ficha de la
   escena 8, con datos reales de muestra) con la barra "Borrar ejemplo y
   comenzar".
2. Pulsa "Añadir escena": se crea una ficha nueva, editable, marcada como
   "Esta jornada".
3. Completa escena, fecha de rodaje, marca de posición, vestuario/prop en
   mano, entrada y salida de cuadro, dirección de mirada, última palabra o
   gesto antes del corte, toma(s) de referencia y notas personales. Cada
   campo se guarda solo al salir de él (`onBlur`), sin botón de "Guardar"
   aparte — igual que el resto de fichas del motor de CINEPACK.
4. Si quiere, sube una foto de la marca/posición desde el campo de archivo.

### Flujo de uso 2 — Volviendo a rodar esa misma escena semanas o meses después
Este es el flujo que de verdad justifica la herramienta (y el panel a medida):
1. El actor abre "Marcas de continuidad" y ve las escenas agrupadas en
   tarjetas, ordenadas por la jornada **más reciente** de cada escena — no por
   número de escena de guion. La escena 5, rodada por última vez el
   2026-10-02, aparece antes que la escena 19 del 2026-08-03, aunque el
   número de escena sea mayor: lo que importa es qué rodó más recientemente.
2. Dentro de la tarjeta de la escena 5 ve, de entrada y sin tener que buscar
   nada: a la izquierda (o arriba en móvil) la ficha de "Esta jornada" en
   blanco para rellenar, y al lado — siempre visible, nunca escondida tras un
   clic — la "Ficha anterior · cómo estabas la última vez" de la jornada del
   2026-07-16, de solo lectura: el jersey con el agujero en el codo
   izquierdo, el farol de aceite, el escalón exacto de la escalera, la frase
   final.
3. El actor compara mientras rellena la ficha nueva (confirma marca de
   posición reutilizada, mismo vestuario, ajusta el gesto final según el
   pedido de dirección) sin cambiar de pantalla ni recordar de memoria.
4. Si esa escena se rodó más de una vez antes de la actual, todas las fichas
   anteriores aparecen apiladas como historial de solo lectura (se ve
   "Rodada N veces" en la cabecera del grupo).
5. El botón "Volver a rodar esta escena" dentro de cada grupo crea
   directamente una ficha nueva con el número de escena ya puesto, para no
   tener que volver a escribirlo.

### Flujo de uso 3 — Jefe de departamento de Reparto
El jefe de departamento Reparto entra con el mismo panel en modo edición
(mismo mecanismo `puede_admin_depto`/`es_jefe_de_depto` que el resto de
herramientas de cargo) y puede revisar o corregir cualquier ficha de
cualquier actor de reparto secundario a su cargo.

### Por qué no es una tabla plana
El motor genérico de tabla no agrupa por escena ordenando por la aparición
MÁS RECIENTE, ni deja la ficha anterior visible al lado de la nueva al crear
una entrada — ambos son el núcleo del valor real identificado en la
investigación y la arquitectura (un actor de reparto secundario vuelve a su
personaje en jornadas muy separadas en el calendario, con alto riesgo de
perder continuidad). Por eso esta herramienta es un panel a medida
(`MarcasContinuidad`, en `app/hoy/HerramientaPanel.tsx`), siguiendo el mismo
patrón ya usado por otros paneles bespoke de Reparto (`ActorScenes`,
`VestMaqReparto`, `GuiaPronunciacion`) y reutilizando el mismo motor de
persistencia de filas (`crearFila`/`guardarFila`/`borrarFila`) que ya usa
cualquier herramienta `tabla` — no se inventó backend ni almacenamiento
nuevo.

## 7. Integración

- **Con el propio departamento (Reparto)**: comparte clave `escena` con
  `rep-notas-escenas-detalle` (mismo formato de identificador), sin
  duplicar ninguna columna emocional — esa herramienta cubre el interior
  del personaje (emociones/objetivo/beats), esta cubre el exterior físico
  observable. Cruce opcional y liviano con `rep-pronunciacion` (coincidencia
  de texto en cliente, no join de base), sin cruce con `rep-research-
  personaje` (niveles distintos, documentado explícitamente para que nadie
  lo fuerce más adelante).
- **Con el proyecto completo**: lectura (nunca escritura) de
  `GENERAL_PLAN_RODAJE`/`GENERAL_ORDEN_RODAJE` para autocompletar
  `fecha_jornada` al crear una ficha nueva — es asistencia de entrada de
  datos, no una referencia viva (si el plan cambia después, la ficha ya
  creada no se mueve sola de fecha). Nada de esta herramienta escribe de
  vuelta en las herramientas generales de proyecto: es información
  personal del actor.
- **Con otros departamentos**: complementaria (no duplica) a la galería de
  continuidad fotográfica de Script/Dirección — Script lleva el raccord
  completo de toda la escena, esta es la copia personal simplificada del
  actor secundario sobre lo que a él le afecta. Un cruce de lectura
  Script↔esta herramienta queda como pregunta abierta explícita (sección
  10), no resuelta en este ciclo por falta de acceso al modelo de datos
  real de la galería de Script. Mismo tratamiento para un posible cruce con
  Vestuario/Maquillaje si existiera una herramienta de continuidad de
  vestuario propia (no confirmado). 1er AD/Producción no tiene acceso: es
  deliberadamente una herramienta personal del actor, no de logística de
  rodaje.
- **Permisos**: mismo mecanismo ya existente para herramientas de cargo
  con control de visibilidad/asignación (`herramienta_visibilidad`/
  `herramienta_asignaciones`, `puede_admin_depto`/`es_jefe_de_depto`) — no
  es una `personal_tool` aislada por usuario, es contenido de proyecto
  ligado al cargo Reparto secundario. Edita el propio actor dueño y el jefe
  de departamento Reparto; sin otros departamentos con acceso de lectura
  hasta que se resuelva la pregunta abierta de Script.

## 8. Diseño visual

Panel a medida `MarcasContinuidad` (no el motor genérico de tabla): cada
escena es una tarjeta (`hp-mc-group`) con cabecera (número de escena +
"Rodada N veces" si hay historial), la ficha "Esta jornada" editable con
tag de estado (`hp-mc-actual-tag`) y, al lado — nunca escondida tras un
clic — la o las fichas anteriores de solo lectura en formato ficha
("Ficha anterior · cómo estabas la última vez", con fecha). Usa los
tokens reales del sistema de diseño (`var(--sp-*)`, `var(--fs-*)`,
`var(--acc)`, `var(--bg-2)`, `var(--panel)`, `var(--line)`), tipografía
Poppins para rótulos y Courier New para el contenido de los campos, igual
que el resto de la app. Mobile-first: en ≤640px la ficha actual y las
anteriores se apilan en una columna; en ≥900px se ven lado a lado (60/40).
Datos de ejemplo (`EJ_MARCAS_CONTINUIDAD`) muestran el caso real que
justifica la herramienta: la escena 5 rodada dos veces, con el detalle
completo de vestuario/marca/gesto repitiéndose y cambiando entre ambas
jornadas — no un caso pelado de una sola fila.

## 9. Componentes (implementación)

- **Definición de la herramienta** — `app/herramientas.ts`:
  - `repMarcasContinuidad` (id `rep-notas-escenas`, se conserva el id ya
    reservado; nombre visible actualizado a "Marcas de continuidad"), tipo
    `tabla`, columnas: `escena` (texto), `fecha_jornada` (fecha),
    `marca_posicion` (texto), `foto_marca` (archivo), `vestuario_prop`
    (largo), `entrada_salida` (largo), `direccion_mirada` (texto),
    `ultima_frase_gesto` (texto), `tomas_relevantes` (texto), `notas_libres`
    (largo) — exactamente los tipos de columna ya existentes (`ColTipo`), sin
    tipo nuevo, tal como fijó la arquitectura.
  - Reemplaza la entrada vacía anterior (`{ id: "rep-notas-escenas", nombre:
    "Notas de escenas y marcas", tipo: "nota" }`) en el cargo "Reparto
    secundario".

- **Panel a medida** — `app/hoy/HerramientaPanel.tsx`:
  - `MarcasContinuidad(...)`: agrupa las filas por `escena`; dentro de cada
    grupo ordena por `fecha_jornada` descendente (una fila sin fecha todavía
    se trata como la más reciente, para que la ficha que se está rellenando
    quede siempre arriba); los grupos de escena se ordenan entre sí por la
    fecha más reciente de cada uno. Renderiza la ficha más reciente de cada
    grupo como tarjeta editable ("Esta jornada") y cualquier ficha anterior
    del mismo grupo como tarjeta de solo lectura ("Ficha anterior · cómo
    estabas la última vez"), siempre visible al lado, nunca oculta tras un
    clic. Reutiliza los helpers ya existentes del motor (`gVal`, `gLbl`,
    `ghostFilas`, `esGhost`, `stripHtml`, `AdoptarEjemplos`, `ArchivoCell`) —
    mismo patrón que `ActorScenes`/`VestMaqReparto`/`GuiaPronunciacion`.
  - Registrado en `tablaTieneVistaBespoke` (id `rep-notas-escenas`) y en el
    `switch` de render de `HerramientaData` (bloque junto a `rep-vest-maq`).
  - `EJ_MARCAS_CONTINUIDAD`: 4 fichas de ejemplo repartidas en 3 escenas
    distintas (8, 5, 19); la escena 5 tiene **dos** fichas (2026-07-16 y
    2026-10-02, un pickup varios meses después) para demostrar en los datos
    de ejemplo el patrón real de "ficha anterior visible al crear la
    siguiente" (mismo jersey con el mismo agujero en el codo, mismo escalón
    de la escalera, gesto final cambiado por pedido de dirección).

- **Estilos** — `app/hoy/dashboard.css`: bloque `.hp-mc-*` (añadido junto a
  `.rasc-*`/`.rvm-*`/`.rpron-*`, mismos tokens: `var(--sp-*)`, `var(--fs-*)`,
  `var(--acc)`, `var(--bg-2)`, `var(--panel)`, `var(--line)`). Mobile-first:
  por defecto la ficha actual y las anteriores se apilan en columna (1
  columna en ≤640px para los campos cortos); a partir de 900px de ancho se
  muestran lado a lado (60%/40%) para aprovechar el espacio en tablet/desktop.

- **Traducciones** — `messages/{es,en,ca}.json`, namespace `hp`: claves
  nuevas `mcCurrent`, `mcPrevious`, `mcScene`, `mcTimesShot`, `mcAddScene`,
  `mcAddShoot` (las demás cadenas de la UI reutilizan claves ya existentes:
  `delete`, `ejChip`, `noScene`, `noDate`).

- Verificación: `npx tsc --noEmit` limpio (sin errores) tras los cambios.

## 10. Correcciones de QA (2026-11-21)

QA encontró 2 problemas reales en el commit inicial, corregidos antes de
pasar a comité:

- **Bug 1 (crítico) — `escena` no era editable.** `FichaActual` (la tarjeta
  "Esta jornada" dentro de `MarcasContinuidad`) renderizaba
  `marca_posicion`, `direccion_mirada`, `ultima_frase_gesto`,
  `tomas_relevantes`, `vestuario_prop`, `entrada_salida` y `notas_libres`,
  pero nunca un campo para `escena`, pese a que la columna existe en el
  modelo de datos. El botón "+ Añadir escena" (`onCrear({})`) crea la fila
  sin escena asignada, y como nada en la vista permitía corregirla después,
  esa fila quedaba agrupada para siempre bajo "Sin escena" — rompiendo el
  valor central de la herramienta (agrupar y comparar por escena a lo largo
  del rodaje). Corrección: se agregó un campo de texto editable `escena` en
  la cabecera de `FichaActual` (`hp-mc-esc`/`hp-mc-esc-in`, mismos tokens de
  estilo que el resto del panel — `var(--sp-*)`, `var(--fs-*)`,
  `var(--line)`, familia Courier New para el input, igual que `hp-mc-fecha`),
  junto a la fecha de jornada, de forma que al crear una ficha desde "+
  Añadir escena" el actor puede asignarle su número de escena de inmediato
  y la fila se reagrupa correctamente al guardar (`onBlur` → `set(f,
  "escena", ...)`, mismo patrón que el resto de los campos del panel).
  Nota: filas ya creadas sin escena antes de este fix (si existen en datos
  reales) siguen apareciendo bajo "Sin escena" hasta que alguien les
  complete el campo manualmente — no se hizo migración de datos, es
  autocorrectivo desde la UI.

- **Bug 2 — línea de depuración en el commit.** `MarcasContinuidad` tenía
  `if (typeof window !== 'undefined') { (window).__qaMC = { filasLen:
  filas.length, filas }; }`, que rompía `npx tsc --noEmit` (`Property
  '__qaMC' does not exist`) y agregaba errores a `npm run lint`. Se quitó
  por completo. De paso se encontró y quitó un segundo rastro de
  instrumentación de depuración, `console.log('QA-LOAD', ...)` dentro de
  `load()` (el fetch genérico de filas en `HerramientaData`, usado por
  todas las herramientas tipo `tabla`/`galeria`/`nota`/etc., no solo por
  esta) — tampoco pertenecía al commit final.

  Verificación tras ambas correcciones: `npx tsc --noEmit` limpio (ya no
  tira el error de `__qaMC`); `npm run lint` da el mismo total de errores
  en `HerramientaPanel.tsx` antes y después del fix (55, todos
  preexistentes y ajenos a `MarcasContinuidad`) — no se introdujeron
  errores nuevos atribuibles a este archivo.

- **Riesgo abierto (no bloqueante, para que QA reverifique) —
  inconsistencia "ejemplos" vs. "fila real huérfana".** QA reportó que la
  vista alterna entre mostrar los ejemplos (`EJ_MARCAS_CONTINUIDAD`) y
  mostrar una fila real sin escena en cargas repetidas del mismo usuario.
  Hipótesis más probable, no confirmada con reproducción propia en esta
  sesión: antes de la corrección del Bug 1, cualquier fila creada con "+
  Añadir escena" quedaba grabada en la base con `escena` vacía (fila
  huérfana real, no un ejemplo). Como `hayFilas = filas.length > 0`
  decide entre ejemplos (`ghostFilas`) y datos reales, y el `useEffect`
  que dispara `load()` en `HerramientaData` depende de `departamento` y
  `herramienta.id` (línea ~377-379 de `HerramientaPanel.tsx`), si esos
  valores llegan en un primer render con un valor transitorio distinto
  (p. ej. `departamento` resuelto async desde el perfil del usuario antes
  de montar este panel) el primer fetch puede traer 0 filas → se muestran
  ejemplos — y un segundo fetch, tras resolverse `departamento`
  correctamente, trae la fila huérfana real, dando la sensación de
  alternancia entre "ejemplos" y "una fila real" que describe QA. No se
  pudo confirmar esta hipótesis con una reproducción determinística en el
  tiempo disponible de esta corrección. Con el Bug 1 ya resuelto no deberían
  crearse más filas huérfanas desde ahora, pero el riesgo de carga
  inconsistente del `departamento`/`herramienta.id` en el primer render de
  `HerramientaData` queda como riesgo abierto a reverificar por QA — si
  persiste con datos ya correctamente escenados, hay que instrumentar el
  valor de `departamento` en el primer vs. segundo render de `load()`.

## 11. QA post-fix (2026-11-21, segunda pasada, commit b9e0be0)

QA reverificó de punta a punta contra `cinepack-dev` real (`qa.rep-secundario2@mailinator.com`),
interactuando (no solo capturas), en 390/820/1440px:

- **Bug 1 y Bug 2 confirmados resueltos**: campo `escena` editable probado
  end-to-end (ficha existente + ficha nueva vía "+ Añadir escena", ambas
  reagrupadas correctamente tras recarga, confirmado además por inspección
  directa de `herramienta_filas` en Supabase); sin rastro de `__qaMC` ni
  `console.log('QA-LOAD'...)`. `npx tsc --noEmit` limpio; `npm run lint`
  sin errores nuevos atribuibles a `MarcasContinuidad`.
- **Responsive (regla de Nico) cumplida en los 3 anchos**, interactuando de
  verdad: edición real del campo escena en 390px con persistencia
  confirmada, sin scroll horizontal ni superposición en ningún ancho. Nota
  menor no atribuible a esta herramienta: el widget flotante global "N" se
  superpone levemente sobre la etiqueta "TOMA(S) DE REFERENCIA" en 390px —
  reportado para `sistema-diseno.md`, no bloqueante.
- **Bug 3 (nuevo, corregido en esta sesión) — valores de la ficha actual
  quedaban "pegados" al ejemplo tras la carga real.** QA acotó con más
  precisión el riesgo abierto de la sección 10: no era solo un parpadeo
  cosmético de encabezado — en algunas cargas, el grupo de escena mostraba
  ya el encabezado correcto (escena/fecha/"Rodada N veces") con datos
  reales, pero los `<input>`/`<textarea>` de "Esta jornada" seguían
  mostrando el texto de `EJ_MARCAS_CONTINUIDAD` ("jersey marrón", "farol",
  etc.). Causa confirmada: `FichaActual` se invoca como función
  (`{FichaActual(actual)}`, no `<FichaActual .../>`) y su `<div
  className="hp-mc-actual">` raíz no llevaba `key`; cuando el primer
  render pintaba el ejemplo/ghost y un render posterior traía la fila real
  en la misma posición del árbol, React reutilizaba los `input`
  (`defaultValue`, no controlados) en vez de remontarlos, y el texto
  quedaba desincronizado del dato real aunque el agrupado sí se
  recalculaba bien — riesgo serio porque un actor podía creer que esas
  marcas de continuidad eran las suyas. **Corregido**: se agregó
  `key={f.id}` al `<div className="hp-mc-actual">` para forzar el
  remonte de los campos cuando cambia la fila real detrás de la ficha.
  `npx tsc --noEmit` limpio tras el cambio.
- **Hallazgo de entorno, preexistente, no introducido por este expediente
  — `MODULOS_BETA_ACTIVOS` bloquea a Reparto.** "Reparto" no está en la
  lista de departamentos beta (`app/constants.ts`) y ningún usuario real
  no-admin de ese departamento puede hoy editar nada en Exclusivas (se
  bloquea silenciosamente, sin error visible). QA necesitó un bypass
  temporal local, revertido antes de terminar, solo para poder ejercer el
  flujo de edición real pedido por Nico. No se tocó este archivo en este
  expediente — queda para que el director-oficina decida si Reparto debe
  sumarse a la lista beta o si hace falta una cuenta QA con `is_admin` para
  probar departamentos aún no-beta.

Con el Bug 3 corregido y verificado, este expediente queda listo para
pasar a `comite-calidad`. **Aprobado por comité en ronda 1, sin
objeciones**, condicionado a que estas secciones (1-5, 7-8) se completaran
antes del dossier final — ya completadas arriba.

## 12. Fuentes

- [Stand-In Central — "Stand-in 101: standing on your mark"](https://standincentral.com/2018/03/28/stand-in-101-standing-on-your-mark/)
- [The Black and Blue — "Marking actors should be simple right?"](https://www.theblackandblue.com/?p=8388)
- [Robert Carr / The Film Look — "Technical Blocking using T-Marks & Tape"](https://robert-carr-j2fj.squarespace.com/thefilmlook-video/technical-blocking-using-t-marks-tape)
- [No Film School — "How to Set Marks for Your Actors to Achieve Proper Blocking and Focus"](https://nofilmschool.com/2013/01/how-to-set-marks-for-actors)
- [StudioBinder — "Storyboard Blocking"](https://www.studiobinder.com/storyboard-blocking/)
- [Celtx Blog — "Block a film scene"](https://blog.celtx.com/block-film-scene)
- [Celtx — Scheduling / Stripboard](https://celtx.com/product/pre-production/schedule)
- [SetHero — SetHero vs Celtx](https://sethero.com/?p=13235)
- [BOE — Acta de la comisión negociadora, tablas salariales 2025, convenio de actores y actrices (BOE-A-2025-5586, 20/03/2025)](https://boe.es/boe/dias/2025/03/20/pdfs/BOE-A-2025-5586.pdf) — acceso al PDF completo bloqueado por red en esta sesión; confirmado solo vía resumen de búsqueda.
- `app/herramientas.ts`, `oficina/inventario.md` — verificación de no-duplicado y de herramienta de Script ya existente.

### Pendientes de verificación explícitos
- Definición literal de "reparto secundario" en el articulado del convenio (no solo tablas salariales) — bloqueado por red.
- Confirmación de si Movie Magic tiene o no alguna función de blocking/marcas.
- Fuente española específica sobre manejo analógico de marcas/continuidad para reparto secundario en España — no localizada.
- Cruce de lectura Script↔esta herramienta (sección 7) y existencia de herramienta de Vestuario con continuidad propia — ambos sin confirmar, quedan para el agente de departamento de Dirección en un ciclo futuro.
