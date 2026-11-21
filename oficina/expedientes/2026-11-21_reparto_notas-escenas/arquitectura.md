# Arquitectura de integración — `rep-notas-escenas` ("Marcas de continuidad")

Arquitecto de integración, Oficina de Agentes CINEPACK. 21/11/2026.

Base: `investigacion.md` del mismo expediente. Esta herramienta se rediseña bajo la
regla nueva de Nico (21/11/2026, `comite-calidad.md`/`desarrollador.md`/`disenador-cinepack.md`):
se piensa como una app en sí misma, no una fila más de un catálogo. El valor real —
"cómo estaba la última vez que rodé esta escena"— tiene que ser lo primero visible,
no una tabla plana. Por eso el nombre que usaré en el dossier es más honesto que
"Notas de escenas y marcas" (que ya suena a `rep-notas-escenas-detalle`):
**"Marcas de continuidad"**.

## Decisión de nombre y alcance (para que quede explícito, no implícito)
`rep-notas-escenas-detalle` = interior del personaje (emociones, objetivo, beats).
`rep-notas-escenas` = exterior físico observable (marca de plató, vestuario/prop en
mano, entrada/salida, dirección de mirada/cuerpo), organizado para resolver una sola
pregunta cada vez que el actor abre la herramienta: *¿cómo estaba la última vez que
rodé esta escena/personaje?* Ninguna columna se repite entre ambas.

---

## 1. Integración con el propio departamento (Reparto)

Vía `deptTools("Reparto")` en `app/herramientas.ts`, hoy comparten departamento:
`rep-notas-escenas-detalle`, `rep-research-personaje`, `rep-pronunciacion`, y
(asumo, a confirmar contra el bloque completo de Reparto que no leí entero en esta
sesión) otras herramientas de vestuario/maquillaje si existen como exclusivas de
otro cargo del mismo departamento.

Flujo de datos concreto:
- **Con `rep-notas-escenas-detalle`**: comparten la misma clave de escena (`escena`,
  mismo formato de número/código que usa esa tabla, ej. "12", "12A"). No se duplica
  ninguna columna emocional. La vista de "Marcas de continuidad" puede, opcionalmente,
  mostrar como referencia de solo lectura el campo `objetivo_escena` de la fila
  equivalente en `rep-notas-escenas-detalle` si existe (mismo `escena` + mismo
  proyecto), pero nunca lo edita ni lo almacena duplicado — se lee en vivo.
  Si el actor de reparto secundario no tiene esa tabla cargada (es exclusiva de otro
  cargo), este cruce simplemente no se muestra: no es obligatorio.
- **Con `rep-pronunciacion`**: cruce opcional y liviano — si una "última palabra antes
  del corte" (campo propio de esta herramienta, ver modelo abajo) coincide con una
  entrada de `palabra_frase` en `rep-pronunciacion`, se puede mostrar un link/ícono
  de referencia. No es un join de base de datos, es una coincidencia de texto en el
  cliente — bajo riesgo, nada que migrar.
- **Con `rep-research-personaje`**: sin cruce de datos; son niveles distintos
  (research de fondo vs. continuidad física puntual). Se documenta la ausencia de
  cruce explícitamente para que nadie lo intente forzar más adelante.

## 2. Integración con el proyecto completo

Fuente de verdad del calendario/plan: `GENERAL_PLAN_RODAJE` (columnas `dia`, `fecha`,
`escenas`, `locacion`, `set`, `paginas`, `notas`) y `GENERAL_ORDEN_RODAJE` (callsheet
por jornada, incluida `escenas` JSON y `reparto_individual` JSON).

Flujo de datos concreto:
- **Entra a la herramienta** (lectura, nunca escritura): al crear una ficha nueva de
  escena en "Marcas de continuidad", el campo `fecha_jornada` se puede autocompletar
  buscando en `GENERAL_PLAN_RODAJE.escenas` o en `GENERAL_ORDEN_RODAJE.escenas_resumen`
  la jornada donde aparece el número de escena que el actor está anotando. Es
  asistencia de entrada de datos (autocompletar), no una referencia viva: si el plan
  cambia después, la ficha ya creada no se actualiza sola (evita que una nota de
  continuidad "se mueva" sola de fecha sin que el actor lo note).
- **Sale de la herramienta**: nada de "Marcas de continuidad" escribe de vuelta en
  `GENERAL_PLAN_RODAJE` ni en `GENERAL_ORDEN_RODAJE` — es información personal del
  actor, no un dato que el 1er AD o producción necesiten ver para armar el plan. Si
  en el futuro Script quisiera ver estas marcas (ver sección 3), sería una lectura
  cruzada entre departamentos, nunca una escritura hacia las herramientas generales.
- **Dato puente concreto**: el campo `escena` de esta herramienta debe usar el mismo
  formato de identificador de escena que `GENERAL_PLAN_RODAJE.escenas` para que el
  autocompletar funcione (ej. "12", "12A", no una descripción libre). Esto hay que
  normalizarlo también contra `rep-notas-escenas-detalle.escena`, que ya usa ese
  mismo campo.

## 3. Integración con otros departamentos

- **Script / continuidad fotográfica** (herramienta de departamento Dirección,
  `inventario.md` sección 2, tipo `galeria`, hint "Galería + notas de raccord"):
  son **complementarias, no se solapan**, según la propia investigación (sección 4,
  punto 1). Script lleva el registro completo de raccord fotográfico de TODA la
  escena (todos los actores, cámara, attrezzo general); "Marcas de continuidad" es
  la copia personal y simplificada del actor secundario sobre lo que le afecta a él
  únicamente. No hay cruce de escritura. Cruce de lectura **propuesto pero marcado
  como pregunta abierta** (no verificable en esta sesión sin acceso al repo real ni
  a cómo está modelada hoy esa galería de Script): si Script tuviera acceso de solo
  lectura a las fichas de "Marcas de continuidad" de los actores que rondan su set
  ese día, podría contrastar su propio registro — pero esto requiere que la galería
  de Script esté modelada por escena+actor, lo cual no pude confirmar porque no leí
  esa herramienta en detalle en esta sesión. **Dejo esto como pregunta abierta para
  el agente de departamento de Dirección/Script, no como integración resuelta.**
- **Vestuario / Maquillaje** (si existen como cargos de departamento propio — no
  confirmado en esta sesión si hoy tienen tabla de continuidad de vestuario por
  actor): el campo `vestuario_prop` de esta herramienta es value que a Vestuario le
  interesaría ver (qué llevaba puesto el actor la última vez), pero de nuevo sin
  acceso de escritura — solo lectura, si el cargo de Vestuario tiene una herramienta
  de continuidad propia donde cruzar el dato manualmente. **Pregunta abierta**: no
  verifiqué si existe tal herramienta de Vestuario hoy en `app/herramientas.ts`.
- **1er AD / Producción**: no necesita ver esto. Es deliberadamente una herramienta
  personal del actor secundario, no una pieza de logística de rodaje.

---

## 4. Modelo de datos

Tipo de herramienta (`ToolKind`): **`tabla`**, pero con una regla de interacción no
estándar (ver sección 5) — el tipo de dato sigue siendo tabla porque cada fila es una
ficha de escena con columnas tipadas; lo que cambia es el patrón de interacción con
el que se presenta, no el modelo.

`id`: `rep-notas-escenas` (se conserva el id ya reservado en el inventario — cambiar
el id rompería referencias existentes si las hubiera; solo cambia el `nombre`
mostrado a "Marcas de continuidad").

Columnas (`Columna[]`), usando solo los tipos ya existentes de `ColTipo`:

| key | label | tipo | notas |
|---|---|---|---|
| `escena` | Escena | `texto` | mismo formato que `GENERAL_PLAN_RODAJE.escenas` y `rep-notas-escenas-detalle.escena` |
| `fecha_jornada` | Fecha de rodaje | `fecha` | autocompletable desde `GENERAL_PLAN_RODAJE`/`GENERAL_ORDEN_RODAJE`, editable a mano si no hay match |
| `marca_posicion` | Marca de posición | `texto` | descripción corta: color de cinta + referencia ("cinta roja, 2 pasos a la derecha de la puerta") |
| `foto_marca` | Foto de la marca / posición | `archivo` | opcional; ver nota RGPD en riesgos |
| `vestuario_prop` | Vestuario / prop en mano | `largo` | descripción física concreta, no interpretativa |
| `entrada_salida` | Entrada y salida de cuadro | `largo` | de dónde viene, hacia dónde sale, con qué mano/gesto |
| `direccion_mirada` | Dirección de mirada/cuerpo | `texto` | |
| `ultima_frase_gesto` | Última palabra o gesto antes del corte | `texto` | ancla mnemotécnica concreta que pide la investigación |
| `tomas_relevantes` | Toma(s) de referencia | `texto` | número de toma que Script marcó como buena, si el actor lo sabe |
| `notas_libres` | Notas personales | `largo` | campo de volcado libre, privado de verdad (ver sección 6) |

No hace falta ningún `ColTipo` nuevo: todo lo anterior se expresa con `texto`,
`largo`, `fecha` y `archivo` ya existentes. No hay caso para proponer un tipo nuevo.

## 5. Patrón de interacción (dirección, no implementación cerrada)

Nico pide explícitamente que "cómo estaba la última vez" sea lo primero que se ve,
no una tabla de filas sueltas. Dirección propuesta para que el desarrollador la
resuelva:

1. **Agrupar, no listar**: la vista de entrada no es una tabla con todas las filas
   visibles a la vez — es una **lista de escenas** (una tarjeta por `escena`),
   ordenada por `fecha_jornada` de la aparición **más reciente** de esa escena
   (descendente), no por orden de escena de guion. El actor de reparto secundario
   no rueda en orden de guion ni todos los días; lo que necesita resolver primero es
   "¿qué rodé más recientemente y qué toca ahora?".
2. **La ficha anterior siempre visible al crear la siguiente**: cuando el actor va a
   rodar de nuevo esa misma escena (o esa misma línea de personaje) en otra jornada
   separada en el calendario, el flujo de "agregar entrada nueva" para esa escena
   no abre un formulario vacío — abre un formulario con la **ficha anterior de esa
   misma escena mostrada en paralelo, de solo lectura, arriba o al costado**, para
   que el actor compare mientras llena la nueva. Esto es lo que resuelve literalmente
   el dolor identificado en la investigación (perder continuidad entre jornadas
   separadas).
3. Dentro de cada tarjeta de escena puede haber más de una ficha histórica (una por
   jornada en que se rodó esa escena) — se modela como `repetible` dentro de la fila
   de escena si el desarrollador prefiere una sola fila por escena con historial
   anidado, o como filas independientes con `escena` repetido si prefiere mantener
   el modelo plano de tabla estándar. Dejo esto abierto a favor del desarrollador,
   siempre que el resultado visual cumpla el punto 2 (ficha anterior visible al crear
   la siguiente) — es una decisión de implementación, no de arquitectura de datos.
4. Mobile-first (regla del sistema de diseño): en 390px esto implica que la tarjeta
   de escena y su ficha anterior tienen que apilarse verticalmente sin quedar
   cortadas ni requerir scroll horizontal — a verificar por QA, no decisión de este
   expediente.

## 6. Espacio común vs. privado, y permisos

- **Privado del cargo (no del espacio común del proyecto)**: `notas_libres` es
  anotación personal de preparación del propio actor — nadie más del equipo necesita
  verla ni debería verla por defecto. El resto de columnas (`marca_posicion`,
  `vestuario_prop`, `entrada_salida`, etc.) son datos de continuidad física real de
  la escena: en principio son del actor, pero no son "secretos" — si algún día Script
  quisiera consultarlas (sección 3, pregunta abierta), tendría sentido que sean
  visibles en modo lectura para quien tenga acceso de visualización a esa herramienta
  vía el mecanismo ya existente de `herramienta_asignaciones` (ver abajo), no que
  vivan en una tabla aparte "privada" como `personal_tools`.
- Esta herramienta **no es** una `personal_tool` en el sentido de
  `20260714000000_rls_personal_tools_owner.sql` (esa migración trata configuración
  personal pura, tipo "Mis herramientas" exclusivas de un usuario fuera del proyecto
  — ahí ni super_admin puede ver lo de otro). "Marcas de continuidad" es contenido
  de proyecto ligado al cargo Reparto secundario, así que su patrón de permisos
  correcto es el que ya existe para herramientas de cargo con control de
  visibilidad/asignación: `herramienta_visibilidad` y `herramienta_asignaciones`
  (de `20260702000000_control_depto_permisos.sql`), filtrado por
  `puede_admin_depto(departamento)` para quién administra, y por las policies de
  lectura/escritura estándar del motor de "tabla" que ya usan el resto de
  herramientas de cargo (no pude confirmar en esta sesión el nombre exacto de la
  tabla genérica de filas de herramientas tipo "tabla" — es una referencia de patrón,
  no una migración nueva que yo esté especificando aquí; el desarrollador debe
  seguir el mismo mecanismo que ya usa cualquier otra herramienta `tabla` de cargo,
  sin inventar una tabla ni una policy ad-hoc).
- **Quién edita**: el propio actor de reparto secundario (su cargo) y el jefe de
  departamento Reparto (`es_jefe_de_depto` + `caller_departamento() = "Reparto"`,
  mismo patrón que `puede_admin_depto`). Quién solo visualiza: a definir según si se
  resuelve la pregunta abierta de Script/Vestuario — por ahora, sin otros
  departamentos con acceso de lectura hasta que el agente de Dirección/Script
  confirme si tiene sentido real para su flujo.

## 7. Librerías

No hace falta ninguna librería nueva. Es una tabla/ficha más del motor ya existente
de CINEPACK (mismo tipo `tabla`, mismos tipos de columna `texto/largo/fecha/archivo`
ya soportados por los componentes genéricos de tabla). El único elemento no trivial
es la comparación lado a lado de "ficha anterior vs. ficha nueva", que es maquetación
con el sistema de diseño existente (ver `sistema-diseno.md`), no una librería externa.
Si el campo `foto_marca` (tipo `archivo`) termina usándose con fotos reales del
rostro/cuerpo del actor, aplica la consideración de RGPD/LOPDGDD ya señalada en la
investigación — a resolver en diseño/legal, no con una librería.

## 8. Riesgos y preguntas abiertas (explícitas, no asumidas como resueltas)

1. No verifiqué en esta sesión el modelo de datos real de la galería de Script
   (continuidad fotográfica) para confirmar si un cruce de lectura escena+actor es
   técnicamente viable — pendiente para el agente de departamento de Dirección.
2. No confirmé si existe hoy una herramienta de departamento Vestuario/Maquillaje
   con continuidad de vestuario por actor — si existe, hay un cruce de lectura
   simétrico a evaluar; si no existe, no hay nada que integrar todavía.
3. No tengo acceso al repo real de CINEPACK ni a la base `cinepack-dev` en esta
   sesión: el nombre exacto de la tabla genérica donde el motor de "tabla" persiste
   filas de herramientas de cargo no está verificado aquí — el desarrollador debe
   seguir el patrón ya aplicado a cualquier otra herramienta `tabla` existente, sin
   que esta arquitectura invente una migración nueva de almacenamiento.
4. Decisión de implementación abierta (punto 5.3): fila por jornada vs. `repetible`
   anidado por escena — queda a criterio del desarrollador siempre que cumpla el
   requisito de interacción (ficha anterior siempre visible al crear la siguiente).
