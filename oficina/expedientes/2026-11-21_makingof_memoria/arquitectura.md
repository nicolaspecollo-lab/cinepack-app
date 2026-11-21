# Arquitectura — `mo-memoria` ("Memoria de making of / Línea editorial y restricciones")
Cargo: Dirección de making of. Departamento: Making of.

## 0. Encaje con la regla de Nico de hoy ("cada herramienta es una app en sí misma")
`mo-memoria` no es un documento de texto suelto: es una mini-app con dos vistas enlazadas —
(A) **Criterios** (documento de línea editorial, versión controlada) y
(B) **Tablero de restricciones por escena** (registro estructurado, una fila por escena, con flag).
Ambas comparten un mismo dato maestro: la lista de escenas del desglose real de guion. Esto es lo
que la distingue de un `tipo: "nota"` — y es exactamente el hueco de QA documentado en
`investigacion.md` (fila 42 de `oficina-qa/cargos.md`).

## 1. Integración con el propio departamento (Making of)
Las otras 3 herramientas de departamento ya construidas (`mo-cal-editorial`, `mo-cobertura-bts`,
`mo-material`, más `mo-cal-publicaciones` y `mo-derechos-bts`, confirmado por grep en
`app/herramientas.ts` líneas 987-1055) son **ejecutoras** de lo que `mo-memoria` decide. Flujo
concreto, campo por campo:

- **`mo-memoria.restricciones[].escena_id` → `mo-cobertura-bts.momento`**: al planear la jornada de
  cobertura BTS, el campo `objetivo`/`momento` de `mo-cobertura-bts` debe poder leer el flag de la
  escena correspondiente (vía `escena_id` compartido, ver §2) y bloquear/advertir si
  `flag_redes = "No apta"` antes de que el equipo BTS programe cubrir esa escena para redes.
  Lectura: cámara de making of (consulta, no edita el flag).
- **`mo-memoria.restricciones[].escena_id` → `mo-material.clip`**: cuando se sube/etiqueta un clip en
  "Listado de material grabado", el campo `estado` (Crudo/Seleccionado/Editado/Archivado) debería
  poder filtrarse por el flag de la escena de origen — así edición de contenido ve, antes de
  seleccionar un clip para montar, si esa escena está restringida. No se propone fusionar las
  tablas (el material grabado es un artefacto distinto), solo que el filtro/lookup lea
  `mo-memoria.restricciones` por `escena_id`.
- **`mo-memoria.restricciones[].flag_redes` → `mo-cal-publicaciones.estado`**: antes de pasar una
  pieza de `mo-cal-publicaciones` a estado "Programado"/"Publicado", el sistema debe poder verificar
  si el material de origen proviene de una escena con flag "No apta" o "Requiere consentimiento sin
  confirmar" — esto es el punto de bloqueo real que evita el bug de QA (publicar la escena de la
  menor). Community management lee el flag, no lo edita.
- **`mo-memoria.consentimientos` vs. `mo-derechos-bts`**: son dos cosas distintas y no se fusionan.
  `mo-derechos-bts` (ficha) es el consentimiento de **cesión de imagen del equipo/reparto para el
  making of en general** (alcance, territorio, vigencia). `mo-memoria` es el **criterio editorial +
  flag de restricción por escena concreta** (qué se puede mostrar de qué escena). Relación: una
  escena con flag "Requiere consentimiento" en `mo-memoria` debería poder enlazar (campo `link`, no
  duplicar datos) a la fila de `mo-derechos-bts` o a la persona concreta cuya cesión falta.

## 2. Integración con el proyecto completo
El requisito real de QA exige que el flag sea **por escena del desglose real**, no un campo de texto
libre. El desglose de escenas ya existe como dato canónico: `guion-desglose-escenas`
(`app/herramientas.ts` líneas 656-673), con `escena_id` oculto (no es columna de UI, lo genera la IA
al confirmar la escena en Guion — confirmado por el comentario en el propio archivo, línea ~652-656).

- **Lectura obligatoria**: `mo-memoria.restricciones` NO repite datos de la escena (locación,
  personajes, resumen) — cada fila guarda únicamente `escena_id` (foreign key real a
  `guion-desglose-escenas`, o al mínimo al identificador de escena usado en
  `GENERAL_PLAN_RODAJE`/`GENERAL_ORDEN_RODAJE`/`prod-stripboard`, que son las tres fuentes de verdad
  de "qué escena es cuál" a nivel de rodaje) y renderiza el resto (nº de escena, locación, día/noche)
  por lookup en vivo contra el desglose. Si se pierde esa referencia, el flag queda huérfano — por
  eso debe ser un selector de escena real (autocompletar contra el desglose), nunca un campo de texto
  "Escena 45-50" tecleado a mano.
- **Hacia el plan/calendario general**: `GENERAL_ORDEN_RODAJE` (callsheet) y `GENERAL_PLAN_RODAJE`
  ya agrupan escenas por jornada. `mo-memoria` no escribe en esos documentos generales, pero debería
  poder **leer** la jornada de una escena (vía `escena_id`) para que el tablero de restricciones se
  pueda filtrar/agrupar "por jornada de rodaje" igual que lo hace `mo-cobertura-bts` (su hint ya dice
  "Vinculado a la Orden de rodaje general" — mismo patrón de lookup, no copiar el dato).
- Dato concreto que **entra** a `mo-memoria` desde el proyecto: la lista de escenas (id, número,
  locación, día/noche, personajes) desde `guion-desglose-escenas`.
- Dato concreto que **sale** de `mo-memoria` hacia el resto del proyecto: el flag de restricción por
  `escena_id`, consumible por cualquier herramienta de Making of que necesite saber "¿esta escena se
  puede publicar?" (ver §1).

## 3. Integración con otros departamentos
- **RRHH (permisos de menores)**: el dato real del proyecto de prueba (sobrina de 12 años, escenas
  45-50, `oficina-qa/proyecto-test/desglose-guion.md` línea 11) hoy no tiene ninguna herramienta de
  RRHH que lo capture explícitamente como tabla con escena vinculada — RRHH solo tiene
  `rrhh-protocolo-riesgos` (ficha genérica de PRL, campo `ambito`/`riesgos` de texto libre, sin
  vínculo a escena) y `Memoria de RRHH` (hoy vacía/placeholder, `inventario.md` línea 84). **No hay
  hoy una fuente estructurada de "esta escena tiene un menor" o "esta escena es de riesgo" fuera del
  propio guion/desglose** — es un hueco real del inventario, no algo que se pueda asumir resuelto.
  Por eso `mo-memoria.restricciones[]` debe poder originarse o confirmarse desde Dirección de making
  of mismo (lectura del desglose + criterio editorial propio), con un campo `origen_restriccion`
  (ver modelo de datos) que registre si el flag vino de una fuente externa (RRHH/Producción) cuando
  esa información exista, sin bloquear la herramienta a que esa integración exista primero.
- **Producción (seguridad, escenas de riesgo)**: mismo caso — la secuencia de riesgo con doble de
  acción (escenas 51-55) está en `guion-desglose-escenas`/`plan-rodaje-esquema.md`, pero no hay hoy
  una herramienta de Producción que marque "escena de riesgo" como dato estructurado (no se
  encontró en el grep de `app/herramientas.ts`; los cargos de Producción están "pendiente de detalle
  fino" según `inventario.md` línea 38). Riesgo abierto, no resuelto en esta arquitectura: si en un
  expediente futuro Producción construye una herramienta de "escenas de riesgo/seguridad", el campo
  natural de enlace sería el mismo `escena_id`, y `mo-memoria` debería poder leer (no editar) ese
  flag de riesgo como sugerencia automática de "No apta para redes sin revisión" — hoy eso no existe
  y no se puede verificar en esta sesión (solo acceso al repo de muestreo).
- **Dirección (de la película) y Producción**: el propio flujo real (ver investigación §3) es que
  Dirección/Producción **acuerdan** la línea editorial con Dirección de making of antes de rodaje —
  esto es edición humana por reunión, no un campo automático; se refleja en el modelo de datos como
  `aprobado_por`/`fecha_aprobacion` en el documento de criterios (texto, no integración de sistema).
- **Difusión/Distribución (prensa, EPK)**: cadena de uso ya documentada en la investigación
  (making of → prensa → distribución). El dato concreto que debería poder viajar hacia
  `Dossier de prensa`/`Listado de medios` (Difusión, `inventario.md` línea 97) es: qué piezas de
  `mo-cal-publicaciones` (ya con flag verificado) están autorizadas para kit de prensa. Hoy ese
  enlace de datos no existe en el repo (confirmado por la propia investigación, §3) — se deja como
  oportunidad para un expediente futuro de Difusión, no se construye acá.

## 4. Modelo de datos
Se propone **un solo `Herramienta` compuesto** (consistente con el patrón "una tabla con dos tipos de
fila" ya usado en `guion-notas-reescritura`, o con secciones fijas tipo ficha+tabla como
`arte-presupuesto`/`ej-presupuesto-costos`), con dos bloques bien diferenciados en la misma pantalla:

### Bloque A — Documento de criterios (nivel general, versión controlada)
Tipo de dato: equivalente a `nota`/ficha versionada, NO tabla de filas repetidas. Campos:
- `tono_objetivo` (`largo`): tono y objetivo del BTS.
- `criterios_cobertura` (`largo`): qué priorizar / qué evitar en general.
- `zonas_restringidas` (`largo`): zonas de set o momentos sin cámara BTS, en general (no ligado a
  una escena concreta — ej. "camerinos", "pausas de concentración").
- `version` (`texto`, igual patrón que `guion-historial.version`), `estado` (`estado`, opciones
  `ESTADO_DOC` ya existente: Borrador/En revisión/Aprobado/Bloqueado — reutilizar, no inventar un
  nuevo set de estados).
- `aprobado_por` (`texto`), `fecha_aprobacion` (`fecha`).
- Este bloque es **espacio común del proyecto**: visible para todo el equipo de Making of
  (departamento), editable solo por Dirección de making of (ver §5 permisos).

### Bloque B — Tablero de restricciones por escena (el requisito real de QA)
Tipo de dato: `tabla`, una fila por escena marcada (no todas las escenas del guion necesitan fila —
solo las que Dirección de making of decide marcar). Columnas:

```
{ key: "escena_id", label: "Escena", tipo: "texto", soloLectura: true }
  // en UI: selector/autocompletar contra guion-desglose-escenas, no texto libre;
  // soloLectura: true porque el valor mostrado (nº escena + locación) es lookup, no editable a mano.
{ key: "flag_redes", label: "Restricción para redes", tipo: "estado",
  opciones: ["Apta", "No apta", "Requiere consentimiento", "Uso exclusivo de prensa"] }
{ key: "motivo", label: "Motivo", tipo: "largo" }
  // ej. "Menor de edad en escena", "Escena de riesgo con doble de acción"
{ key: "origen_restriccion", label: "Origen del flag", tipo: "estado",
  opciones: ["Dirección de making of", "RRHH (menores)", "Producción (seguridad)", "Dirección"] }
{ key: "consentimiento_vinculado", label: "Consentimiento relacionado", tipo: "link" }
  // enlaza a la fila/persona de mo-derechos-bts cuando el flag es "Requiere consentimiento"
{ key: "revisado_por", label: "Revisado por", tipo: "texto" }
{ key: "fecha_revision", label: "Fecha de revisión", tipo: "fecha" }
```

No se necesita ningún `ColTipo` nuevo — todo se expresa con los tipos existentes
(`texto`, `largo`, `estado`, `fecha`, `link`). No hay que proponer ampliar `ColTipo` al comité.

### Privado del cargo vs. espacio común
- **Espacio común del proyecto** (visible a todo el departamento Making of, y en lectura a quien
  necesite el flag desde otra herramienta, §1): Bloque A completo, y Bloque B completo salvo lo
  indicado abajo.
- **Privado del cargo** (solo Dirección de making of): ningún campo de Bloque A/B necesita ser
  privado — a diferencia de notas de preparación personal (ej. `rep-notas-preparacion`), este
  documento existe precisamente para que el equipo lo consulte; ocultarlo rompería su propósito. Si
  Dirección de making of quiere borradores de criterios no publicados, se resuelve con
  `estado: "Borrador"` (visible pero marcado, mismo patrón que el resto del repo con `ESTADO_DOC`),
  no con un campo oculto nuevo.

## 5. Permisos (patrón RLS existente, no se inventa mecanismo nuevo)
Sigue el patrón de `20260702000000_control_depto_permisos.sql` (helper `puede_admin_depto`) y el
régimen de `herramienta_asignaciones` (Editor/Visionario) que ya maneja `GestionAccesosPanel`:
- **Edita** Bloque A y B: Dirección de making of (su cargo) + jefe de departamento Making of (si
  existe ese rol) + `super_admin`, vía el mismo mecanismo de `herramienta_asignaciones` (asignación
  de Editor) que ya cubre cualquier otra herramienta de departamento/cargo.
- **Solo visualiza** (lectura): cámara de making of, edición de contenido, community management
  (los otros 3 cargos del departamento) — vía asignación de Visionario, mismo patrón que cualquier
  herramienta compartida de departamento ya existente (ej. `mo-cobertura-bts` es de departamento,
  visible a todos los cargos del área).
- **No es una `personal_tool`**: a diferencia de `rep-notas-preparacion` (nota privada del actor,
  RLS tipo `personal_tools_solo_owner`, owner-only), `mo-memoria` vive en el espacio de proyecto
  normal (tablas de herramienta de cargo estándar, RLS por `departamento`/`cargo` vía
  `herramienta_asignaciones`), porque su función es ser consultada por otros, no un espacio personal.
- Lectura cross-departamento (RRHH, Producción, Difusión, §3) **no se resuelve hoy** con una policy
  nueva — no hay todavía una tabla estructurada del lado de RRHH/Producción con la que enlazar, y
  esta sesión no puede verificar contra el repo real si existe algo adicional. Se deja como pregunta
  abierta para el comité, no como integración ya resuelta.

## 6. Patrón de interacción recomendado (dirección, no implementación cerrada)
Una sola pantalla, mobile-first, con dos secciones apiladas (en escritorio pueden ir lado a lado,
documento arriba/izquierda y tablero abajo/derecha, pero en 390px es scroll vertical único, sin
tabs ocultos — la regla de "ninguna herramienta es una pantalla plana" pide que ambas convivan
visibles, no escondidas detrás de una pestaña):
1. **Arriba: documento de criterios** (Bloque A) — lectura tipo ficha/nota larga con badge de
   `estado` (reutilizar el componente de badge de `ESTADO_DOC` ya existente en otras herramientas
   de documento versionado, ej. `guion-historial`).
2. **Abajo: tablero de escenas con flag** (Bloque B) — lista/tabla filtrable por `flag_redes` y por
   jornada (lookup a la escena), con el flag renderizado como chip de color fuerte y consistente
   (ej. rojo "No apta", ámbar "Requiere consentimiento", verde "Apta") siguiendo la convención de
   acento por valor que ya usan las columnas `estado` del repo (`sinAcento` se desactiva a propósito
   acá: este es exactamente el caso donde el color sí comunica algo crítico).
3. Acción rápida desde el tablero: "Agregar escena" abre el selector contra el desglose real
   (`guion-desglose-escenas`), nunca un campo de texto en blanco.
4. Las otras 3 herramientas de Making of (§1) deberían, en una futura iteración de desarrollo,
   mostrar el flag de la escena actual como badge de solo lectura cuando corresponda (ej. en
   `mo-cobertura-bts` al lado de "Momento / Escena a cubrir") — se deja como recomendación de
   integración futura, no como requisito de esta primera entrega de `mo-memoria`.

## 7. Librerías
No se necesita ninguna librería nueva. Ambos bloques se construyen con los componentes de
tabla/ficha/documento ya existentes en el sistema (`DocStatusBoard` o equivalente para el documento
versionado del Bloque A, el componente de tabla estándar para el Bloque B) — es exactamente el tipo
de herramienta para el que ya existe infraestructura compartida en el repo. No aplica la comparación
de librerías de hoja de cálculo/documento enriquecido (Univer/FortuneSheet/Handsontable/TipTap): esa
comparación corresponde únicamente al expediente transversal "Hoja y documento en blanco", ya
resuelto (`inventario.md` línea 114, PR #5 aprobado 16/11). `mo-memoria` no requiere esa
infraestructura — es una tabla + documento corto con componentes ya estándar del repo.

## 8. Riesgos y preguntas abiertas (explícitas, no resueltas acá)
- No existe hoy, verificable en este repo de muestreo, una herramienta estructurada de RRHH que
  marque "escena con menor" ni de Producción que marque "escena de riesgo" — por lo tanto el campo
  `origen_restriccion` hoy será casi siempre "Dirección de making of" en la práctica, hasta que esos
  departamentos construyan su propia pieza. No asumir que esa integración ya funciona.
- El `escena_id` como foreign key real depende de que `guion-desglose-escenas` tenga, en la
  implementación real (Supabase), una columna de id estable por fila — esto se infiere del comentario
  del propio archivo (`escena_id` oculto, generado por IA) pero no se verificó contra el esquema real
  de Supabase en esta sesión; el desarrollador debe confirmarlo antes de construir el selector.
- No se pudo verificar contra el repo real de CINEPACK (fuera de alcance de esta sesión) si existe
  ya alguna tabla de permisos de menores o seguridad fuera de este repo de muestreo.
