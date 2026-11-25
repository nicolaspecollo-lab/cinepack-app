# Rediseño — Control de horarios y avisos (1AD) como panel a medida

**Motivo:** segundo rebote de Nico sobre `dir-control-horarios-1ad`. Primer rebote (texto introductorio) ya resuelto. Segundo rebote, de fondo: "esto no es una herramienta, es simplemente un cuadro" — aplica la regla endurecida del propio 25/11/2026 (commit `80eee8a`): panel a medida es el default, tabla genérica es la excepción reservada a contenido estrictamente tabular (presupuesto). Esto NO es ese caso: hay una jerarquía real (día → departamento → presencia/setups) que la tabla plana aplanaba.

Este documento reemplaza, para esta herramienta, la resolución de `necesidad.md` ("tipo: tabla, 7 columnas") por un panel a medida de 2 niveles + Gantt de presencia. No se borra `necesidad.md` (historial de la ronda 1 queda intacto); esta es la especificación vigente de la ronda 2.

## Interpretación de la idea de Nico (mensaje de voz)

- Nivel 1: una tarjeta por día de rodaje.
- Nivel 2 (al abrir la tarjeta): vista de barras tipo Gantt — una barra horizontal por departamento, mostrando su presencia real en el set a lo largo de la jornada (desde que llega hasta que se va), no solo su hora de citación.
- El registro de wrap previsto/real por setup (función original de la herramienta) no desaparece: se integra como el detalle que alimenta/anota cada barra o cada tramo del día.

## Nivel 1 — Tarjeta por día (cerrada)

Vista de inicio: grilla/lista de tarjetas, una por jornada de rodaje del proyecto. Cada tarjeta muestra, de un vistazo, sin abrir nada:

- Fecha y número de día (Día X/Y) — mismo formato que usa `GENERAL_ORDEN_RODAJE`/`GENERAL_PLAN_RODAJE` ("Día (X/Y)" + fecha), para que el 1AD reconozca la jornada sin tener que cruzar con otra herramienta.
- Cantidad de setups registrados ese día (conteo derivado de las entradas de nivel 2, no un campo separado a mantener a mano).
- Indicador cualitativo de overtime del día: si ALGUNA entrada del día tiene `overtime = "Confirmado"` → chip rojo/ámbar "Overtime"; si alguna tiene "Alerta" y ninguna "Confirmado" → chip ámbar más tenue; si todas "No" → sin chip (estado limpio, no un chip verde redundante).
- Resumen de wrap: hora de wrap más tardía registrada ese día entre todos los departamentos/setups (el dato que más le importa al 1AD de un vistazo: "¿a qué hora cerramos realmente anoche").

**Origen de la fecha/Día X-Y de la tarjeta**: no se duplica a mano. Se deriva leyendo `GENERAL_PLAN_RODAJE` (columna `dia`, `fecha`) — mismo patrón de lectura liviana ya implementado en la ronda 2 (ver sección "Integración con el plan de rodaje" más abajo, hereda la validación por subcadena ya construida sobre `escena_setup`). Si el 1AD abre un día que todavía no tiene entradas propias, la tarjeta existe igual (día vacío, ver estado vacío de nivel 2) porque la fuente de la lista de días es el plan de rodaje, no las propias entradas de esta herramienta.

## Nivel 2 — Vista de barras al abrir la tarjeta del día

Al tocar la tarjeta se abre el detalle del día:

- **Eje horizontal**: una línea de tiempo continua desde la hora de call más temprana hasta la hora de wrap más tardía registradas ese día (calculado de los datos del propio día; si no hay ninguna entrada todavía, fallback a un rango default razonable, p. ej. 06:00–22:00, editable al cargar la primera entrada). No es "call a wrap general del proyecto" fijo — cada día tiene su propio eje, porque la duración de la jornada varía.
- **Una barra horizontal por departamento** que tuvo presencia ese día (Fotografía, Arte, Vestuario, Reparto, Sonido, etc. — lista de departamentos reales del proyecto, no inventada). El inicio de la barra = hora de llegada de ese departamento ese día; el fin = hora de salida/wrap de ese departamento ese día. Así "Fotografía llega primero" se ve como una barra que arranca más a la izquierda, y "Reparto llega cuando ya está todo armado" se ve como una barra que arranca más centrada/a la derecha.
- Dentro de (o al tocar) la barra de un departamento: el detalle por setup de ESE departamento ese día — aquí vive, sin pérdida, el registro original: `escena_setup`, `hora_prevista_wrap`, `hora_real_wrap`, `delta_minutos`, `overtime`, `aviso_enviado`, `observacion`. Un departamento puede tener más de un setup en el día (p. ej. Fotografía con 3 setups), cada uno con su propio wrap previsto/real — esos son los segmentos internos de la barra, no una segunda barra aparte.
- **Estado vacío de nivel 2** (día recién abierto, sin entradas): no mostrar una línea de tiempo vacía sin contexto — mostrar un estado que invite a cargar el primer departamento/horario del día, con los departamentos reales del proyecto como accesos directos (no un formulario en blanco genérico).

### Confirmación contra el código real: ¿existe ya un campo de "hora de llegada/salida por departamento"?

Se verificó `GENERAL_ORDEN_RODAJE` (`app/herramientas.ts:3961-3983`). Tiene una columna `llamadas` ("Llamadas por departamento (JSON)", `tipo: "largo"`) — es un blob JSON de formato libre, sin esquema fijado en código ni parser en `HerramientaPanel.tsx` (mismo hallazgo que la ronda 2 ya documentó para la columna `escenas` del mismo callsheet: no hay ningún `JSON.parse` de este campo renderizado hoy). Es decir: **existe la noción de "hora de llamada por departamento" en el callsheet, pero como texto libre sin estructura garantizada, generado por Producción para imprimir el callsheet, no pensado para ser leído programáticamente por otra herramienta.**

Conclusión: no hay hoy ningún campo estructurado y confiable de "hora de llegada/salida real por departamento" en ninguna herramienta general existente. `llamadas` del callsheet es la hora de CITACIÓN planeada (antes del día), no la hora de llegada/salida REAL registrada en el día — son datos de naturaleza distinta (plan vs. bitácora real), igual que ya se decidió para `hora_prevista_wrap` vs. `hora_real_wrap` en la ronda 1. No se debe intentar parsear `llamadas` para alimentar las barras: dato nuevo, campo nuevo, propio de esta herramienta.

**Campo nuevo necesario**: `hora_llegada_real` y `hora_salida_real` por departamento, por día — vive exclusivamente en esta herramienta (no existe en ningún lado del proyecto hoy). El 1AD es quien lo registra en el día real de rodaje (de ahí viene naturalmente: es la persona que controla el reloj del set).

## Modelo de datos

Esto deja de ser una tabla plana de filas sueltas (una fila = un setup). Pasa a ser, siguiendo el mismo patrón ya resuelto en el repo para datos anidados por jornada (`GENERAL_ORDEN_RODAJE`, que guarda `citaciones`/`localizaciones`/`llamadas`/`escenas`/`reparto_individual` como columnas `tipo: "largo"` conteniendo JSON de formato libre, una fila = una jornada completa): **una fila (documento) por día de rodaje, con un array anidado de entradas de departamento dentro de esa fila**, expresado en `herramienta_filas.datos` (jsonb) con la misma convención ya usada por esa herramienta.

Columnas de la fila de día (en `app/herramientas.ts`, aunque el render es bespoke, no motor de tabla genérico — la metadata de columnas sigue sirviendo de contrato de datos para el desarrollador):

| key | tipo | contenido |
|---|---|---|
| `dia_fecha` | fecha | fecha de la jornada (clave de correlación 1:1 con `GENERAL_PLAN_RODAJE.fecha`) |
| `departamentos` | largo (JSON) | array de entradas, una por departamento con presencia ese día: `{ departamento, hora_llegada_real, hora_salida_real, setups: [{ escena_setup, hora_prevista_wrap, hora_real_wrap, delta_minutos, overtime, aviso_enviado, observacion }] }` |

No se propone ningún `ColTipo` nuevo: el array anidado se expresa igual que `GENERAL_ORDEN_RODAJE` ya lo hace, como JSON de formato libre dentro de una columna `largo`, con el parseo/render hecho por el componente bespoke (no por el motor genérico de tabla). Si en algún ciclo futuro se quisiera un `ColTipo` dedicado a "repetible anidado con sub-repetible" (departamento → setups), hoy ya existe `repetible` con `sub: Columna[]` para un nivel de anidamiento — pero esta herramienta necesita DOS niveles (departamento → setup), y `repetible` tal como está definido (`sub?: Columna[]`) no declara anidamiento recursivo de un repetible dentro de otro. **Esto se resuelve igual sin tipo nuevo porque el render es bespoke** (el componente a medida interpreta el JSON libre con la estructura que necesite, como ya hace `GENERAL_ORDEN_RODAJE` con sus columnas JSON) — se documenta la limitación de `repetible` como nota al desarrollador, no como bloqueo.

El registro original de wrap previsto/real por setup no se pierde: es exactamente el array `setups` dentro de cada entrada de `departamentos`, ahora anidado dos niveles (día → departamento → setup) en vez de ser filas sueltas sin agrupación.

## Espacio común vs. privado del cargo

Todo el contenido de esta herramienta (tarjetas de día, barras, setups) vive en el **espacio común del proyecto**: es información operativa que Producción y los jefes de departamento necesitan poder consultar (ver integración nivel 3 abajo). No hay campo que deba ser privado del 1AD — a diferencia de notas de preparación personales, esto es un registro de hechos del día de rodaje, por definición compartido. No se propone ninguna tabla/columna privada.

## Permisos

Mismo mecanismo que la ronda 1 ya fijó, sin cambios: herramienta de departamento (Dirección), cargo 1er asistente de dirección. Edición: 1AD y jefe de departamento de Dirección vía `control_depto_permisos` (`es_jefe_de_depto` + `caller_departamento()`). Lectura: resto del equipo con acceso al proyecto, mismo patrón RLS que cualquier herramienta de departamento no personal (no aplica el patrón `personal_tools`). No se requiere migración de RLS nueva — el cambio de forma de panel genérico a panel bespoke no cambia quién puede leer/escribir sobre `herramienta_filas` para este `herramienta_id`, solo cambia la forma del `datos` (jsonb) que se guarda y cómo se renderiza.

## Integración (hereda y preserva lo ya construido en la ronda 2)

### Con el plan de rodaje general (nivel 2 — proyecto)

La validación de `escena_setup` contra `GENERAL_PLAN_RODAJE.escenas` (texto libre, coincidencia por subcadena, implementada en `HerramientaPanel.tsx` condicionada a `herramienta.id === "dir-control-horarios-1ad" && col.key === "escena_setup"`) sigue siendo válida y debe preservarse — se traslada al nuevo componente bespoke: el input de `escena_setup` dentro del detalle de setup (nivel 2, dentro de cada barra de departamento) sigue disparando el mismo `onBlur` con la misma query de lectura contra `herramienta_filas` donde `herramienta_id = "gen-plan-rodaje"`, mismo indicador check/alert-triangle, mismo criterio de "no bloquea el guardado". Es lógica de validación, no de layout — no depende de que el campo esté en una celda de tabla genérica; se adjunta igual a un input dentro de un panel a medida.

Adicionalmente, nivel 1 (lista de tarjetas de día) lee `GENERAL_PLAN_RODAJE.dia`/`fecha` para generar la lista de tarjetas (ver sección Nivel 1 arriba) — lectura pura, sin escritura cruzada, mismo criterio de "sin impacto en presupuesto/calendario" ya documentado en la ronda 2.

### Con el propio departamento (nivel 1)

Sin cambios respecto a la ronda 2: `dir-control-horarios` (Asistencia de dirección) sigue siendo el puente conceptual vía `aviso_enviado` (ahora un campo dentro de cada setup anidado, no una columna de tabla plana), sin integración automática de datos.

### Con otros departamentos (nivel 3)

Sin cambios de fondo respecto a la ronda 2 (Producción como lectura del resumen de overtime del día; RRHH como relación potencial futura sin conectar). Se agrega un matiz nuevo que habilita el propio rediseño: como ahora el dato de "hora de llegada/salida real por departamento" existe de forma estructurada por primera vez en el proyecto, cada jefe de departamento (Fotografía, Arte, Vestuario, etc.) tiene, por primera vez, un motivo real para querer LEER (no editar) la barra de su propio departamento en días pasados — útil para negociar llamados en días futuros similares. Se documenta como posibilidad de lectura cross-departamento, no se construye ningún mecanismo de permisos nuevo para esto en este ciclo (ver limitación abajo).

## Librerías para el Gantt de presencia

No hace falta una librería de Gantt completa (tipo `dhtmlx-gantt`, pensada para proyectos/dependencias de tareas, pesada y de escritorio). El caso de uso es un Gantt de UN SOLO eje temporal por día, con pocas barras (una por departamento, típicamente menos de 15), sin dependencias entre tareas ni drag-to-reschedule. Esto se resuelve con CSS puro: cada barra es un `div` posicionado con `left`/`width` en porcentaje, calculado client-side a partir de `(hora - inicio_eje) / (fin_eje - inicio_eje)` — mismo patrón que ya usa el repo para "data bars" en columnas numéricas del motor de tabla (`sinAcento`/tono descrito en `Columna`). No se propone ninguna dependencia nueva; es consistente con mobile-first (nada que cargar, nada que paginar, se adapta a 390px apilando las barras verticalmente con scroll vertical, no horizontal).

## Riesgos / preguntas abiertas

- El límite de dos niveles de anidamiento (día → departamento → setup) expresado como JSON libre dentro de `largo` depende enteramente de que el componente bespoke lo parsee bien — no hay validación de esquema a nivel de `ColTipo` ni de Supabase (jsonb sin schema). Mismo riesgo estructural que ya acepta `GENERAL_ORDEN_RODAJE` hoy; no es nuevo de esta herramienta, pero se duplica el riesgo. Si en un ciclo futuro el repo decide invertir en una columna `repetible` recursiva (repetible-dentro-de-repetible) como `ColTipo`, esta herramienta sería la segunda candidata a migrar (la primera sería el propio `GENERAL_ORDEN_RODAJE`).
- No se migra ningún dato real existente en este documento — las 2 filas de prueba cargadas en la ronda 2 (`E22/Setup A`, `E23/Setup B`) quedaron en el modelo plano viejo; si el comité aprueba este rediseño, el desarrollador necesita decidir si migra esas 2 filas al nuevo formato anidado o las descarta como datos de QA (no de producción real) — no se puede verificar desde este expediente si hay datos de producción real que dependan del modelo plano, se marca como pregunta abierta para el ciclo de desarrollo.
- La lectura cross-departamento mencionada en integración nivel 3 (jefe de Fotografía viendo su propia barra en días pasados) no tiene mecanismo de permisos definido en este documento — se señala como posibilidad, no se diseña su RLS; si Nico la quiere, es un expediente aparte.
