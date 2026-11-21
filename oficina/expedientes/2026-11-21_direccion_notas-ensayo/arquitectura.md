# Arquitectura de integración — `dir-notas-ensayo`

Cargo: Dirección de actores · Departamento: Dirección · Fecha: 21/11/2026
Investigación base: `investigacion.md` (mismo expediente). No se encontró en el repo acceso al sistema real de CINEPACK ni a Supabase `cinepack-dev` desde esta sesión — todo lo que sigue es especificación, no se verificó corriendo migraciones.

---

## 0. Decisión de fondo (regla de Nico 21/11): no es una tabla

El contenido real de esta herramienta tiene una jerarquía de tres niveles que una tabla plana destruye: **Personaje → Ensayo (sesión, fecha) → nota de esa sesión**, y además cada personaje tiene un **arco que progresa entre ensayos separados en semanas**. Si se aplana en filas de tabla (una fila = una nota, con columnas "personaje"/"fecha"/"nota"), se pierde exactamente lo que hace valiosa a la herramienta: ver la evolución de un personaje concreto a través del tiempo, no una lista de apuntes sueltos. Por eso el modelo de datos de abajo no usa `tipo: "tabla"` para el objeto raíz — ver sección 2.

## 1. Patrón de interacción recomendado (punto de partida para el desarrollador)

**Vista por personaje con línea de tiempo de ensayos**, en dos niveles de navegación:

1. **Nivel 1 — Selector de personaje** (tarjetas, no filas): una tarjeta por personaje del reparto (nombre, actor asignado si ya hay casting, miniatura si existe foto en `cast-ficha-reparto`/`rep-ficha-personaje`, y un resumen de "última nota" + fecha). Toca lo mismo que ya hace `vest-desglose-escenas`/`arte-desglose-vestuario` al agrupar por personaje, pero aquí la agrupación es la pantalla principal, no una columna.
2. **Nivel 2 — Dentro de un personaje: línea de tiempo vertical de sesiones de ensayo**, ordenada por fecha, cada sesión como una tarjeta expandible con: fecha del ensayo, escena(s) trabajadas ese día (vínculo a `guion-desglose-escenas`), objetivo de la escena, ajuste de interpretación trabajado, y un campo de "arco: qué cambió desde la última sesión" que lee (solo lectura, con link) la nota anterior más reciente del mismo personaje — así la continuidad del arco es visible sin que el director tenga que ir a buscarla.
3. Dentro de cada sesión, las notas pueden referirse a más de una escena (un ensayo de mesa puede cubrir 3 escenas) — por eso "escena" es multivaluado dentro de la sesión, no una columna 1:1.

Esto requiere un panel a medida (no el motor de tabla/ficha genérico tal cual), justificado explícitamente: ningún `tipo` existente (`tabla`, `ficha`, `nota`, `checklist`, `galeria`, `registro`) expresa "agrupar por entidad externa (personaje) y dentro de cada grupo mostrar una colección temporal expandible de sub-registros vinculados a otra entidad externa (escena)". El dato en sí sí se modela 100% con tipos existentes (sección 2) — es la *vista* la que necesita un componente propio, igual que `MoodboardFotoLienzo.tsx` se justificó por la interacción, no por el dato. Si el desarrollador encuentra que el motor genérico ya soporta agrupación por un campo tipo `chips`/referencia con columnas `repetible` anidadas de forma suficientemente cercana a esto, puede proponerlo como alternativa más barata — pero documentarlo, no asumirlo.

## 2. Modelo de datos

Sigue el patrón `Herramienta`/`Columna` de `app/herramientas.ts`. Tipo raíz propuesto: **`"ficha-repetible"` no existe hoy** — en su lugar se modela como `tipo: "tabla"` a nivel de motor de datos (para que quede guardado con el mismo mecanismo de filas que todo lo demás) pero **renderizado por un panel a medida** que agrupa esas filas por personaje y las presenta como línea de tiempo, no como tabla. Esto es consistente con cómo QA/comité ya evalúan: el tipo de dato puede ser `tabla` en el motor sin que la UI sea una tabla.

```ts
const notasEnsayo: Herramienta = {
  id: "dir-notas-ensayo",
  nombre: "Notas de ensayo por actor/personaje",
  tipo: "tabla", // dato; el render es un panel a medida (ver vista 2.1 del dossier)
  hint: "Una fila por sesión de ensayo con un personaje. Agrupado y mostrado por personaje, en línea de tiempo.",
  columnas: [
    { key: "personaje", label: "Personaje" }, // texto libre hoy; ver 3.1 sobre vínculo real a rep-ficha-personaje
    { key: "actor", label: "Actor/Actriz" },
    { key: "fecha", label: "Fecha de ensayo", tipo: "fecha" },
    { key: "escenas", label: "Escenas trabajadas", tipo: "chips" }, // multivaluado: ids/etiquetas de escena del desglose
    { key: "objetivo_escena", label: "Objetivo de la escena", tipo: "largo" },
    { key: "ajuste_interpretacion", label: "Ajuste de interpretación trabajado", tipo: "largo" },
    { key: "continuidad_arco", label: "Continuidad del arco desde el ensayo anterior", tipo: "largo" },
    { key: "pendiente_proximo", label: "Pendiente para el próximo ensayo", tipo: "largo" },
    { key: "privada", label: "Nota privada del director de actores", tipo: "estado", opciones: ["Visible al equipo", "Privada"] },
    { key: "adjuntos", label: "Adjuntos (audio/foto de ensayo)", tipo: "repetible", sub: [
      { key: "nombre", label: "Nombre" },
      { key: "archivo", label: "Archivo", tipo: "archivo" },
    ]},
  ],
};
```

Notas sobre tipos:
- `chips` para `escenas_trabajadas` (no `texto` libre): permite multivaluado sin inventar tipo nuevo, y es el mismo tipo ya usado en el motor para listas cortas de etiquetas.
- `adjuntos` como `repetible` con sub-columnas `nombre`/`archivo`: mismo patrón que `documentos` en media docenas de herramientas ya existentes (ej. línea 232, 2558, 2599) — notas de ensayo reales suelen incluir audio del ensayo o foto de blocking, confirmado como necesidad razonable aunque no con fuente directa (ver investigación, hipótesis de cuaderno de dirección).
- `privada` como `estado` con dos opciones, no un tipo booleano nuevo: evita proponer un tipo que el motor no tiene. Controla visibilidad (sección 4), no solo cosmética.
- No se propone ningún tipo `ColTipo` nuevo. Todo cabe en `texto | largo | fecha | chips | estado | repetible | archivo`.

### 2.1 Qué vive en el espacio común vs. privado del cargo
- **Común del proyecto** (visible según permisos de departamento, sección 4): todas las columnas excepto cuando `privada = "Privada"`.
- **Privado del cargo**: cualquier fila marcada `"Privada"` — notas de preparación personal del director de actores que todavía no está listo para compartir con Dirección general (ej. una duda sobre si un actor está logrando el objetivo, antes de decidir si vale la pena plantearlo en dailies). Esto reutiliza el mismo mecanismo ya existente para `personal_tools` (ver `20260714000000_rls_personal_tools_owner.sql`): el filtro por `owner_id`/visibilidad debe aplicarse a nivel de fila (RLS), no solo ocultar la columna en el cliente, siguiendo exactamente la advertencia de esa migración ("el cliente tampoco filtraba... agravando el problema").

## 3. Integración — tres niveles

### 3.1 Con el propio departamento (Dirección)
- **`dir-notas-escena`** (cargo Dirección, post-toma, hoy vacía igual que esta): comparte el campo `escenas` — cuando Dirección registra una nota de escena ya rodada, debería poder ver, para esa misma escena, si hubo una nota de ensayo previa con el mismo `escenas` (join por valor de chip, no hay FK real hoy porque `guion-desglose-escenas` tampoco expone un id estable fuera del campo oculto `escena_id` usado por el generador de IA — ver comentario en `app/herramientas.ts` línea ~654). **Pregunta abierta real**: hasta que `dir-notas-ensayo` y `dir-notas-escena` compartan el mismo identificador de escena que usa `desgloseEscenas` (`escena_id`), el cruce será por texto libre de `escenas`/chip, frágil. Lo dejo como riesgo para el desarrollador, no asumido resuelto.
- **`calendarioEnsayos`** (herramienta de departamento, ya Consolidada, compartida por todos los cargos de Dirección incluido Dirección de actores): el campo `foco` de `calendarioEnsayos` debería poder pre-rellenar `objetivo_escena` de una nueva sesión en `dir-notas-ensayo` al crear la fila desde una fecha de ese calendario (mismo patrón que "Vinculado a la Orden de rodaje general" ya usado en `rep-citaciones`). Flujo concreto: `calendarioEnsayos.escena` (texto) → sugiere valor inicial de `notasEnsayo.escenas` (chips) al crear sesión para esa fecha.
- **`dirDecisionesVisionado`** (dailies, cargo Dirección): si una nota de ensayo marcó `pendiente_proximo` sobre un ajuste de interpretación, y la escena correspondiente ya se rodó, Dirección en dailies puede necesitar ver esa nota para evaluar si el ajuste se logró en cámara. Flujo: lectura cruzada por `escenas` (mismo riesgo de FK que arriba).

### 3.2 Con el proyecto en su conjunto
- **`GENERAL_PLAN_RODAJE`**: no se escribe nada automáticamente ahí (el plan de rodaje es de producción, no de interpretación). Pero la fecha de un ensayo (`notasEnsayo.fecha`) debería poder consultarse contra `GENERAL_PLAN_RODAJE.fecha`/`escenas` para que el director de actores vea si el ensayo es antes o después de que esa escena esté agendada para rodarse — lectura, no escritura, de `GENERAL_PLAN_RODAJE.escenas` y `.fecha`.
- **`GENERAL_CALENDARIO`**: cada sesión de ensayo registrada podría reflejarse como hito (`hito: "Ensayo — <personaje/escena>"`, `fase: "Preproducción"`) para que el calendario general del proyecto no dependa solo de `calendarioEnsayos` (que es solo de Dirección) para saber que hubo actividad de ensayo. **Esto es una propuesta, no algo confirmado por el arquitecto de `GENERAL_CALENDARIO` existente** — lo dejo como sugerencia a validar con el director de oficina, porque implicaría escritura automática cruzada entre un cargo y una herramienta general, patrón que no vi usado hoy en el repo (las `GENERAL_*` parecen alimentarse manualmente). Riesgo/pregunta abierta.
- **`GENERAL_ORDEN_RODAJE`**: no aplica edición directa (orden de rodaje es de Producción/1AD). Lectura posible del campo `escenas` del día para que el director de actores anticipe, antes del rodaje, qué personajes están citados ese día y filtre su línea de tiempo por ellos.
- **Desglose de guion** (`guion-desglose-escenas`, cargo Guion/dept. Dirección vía Script según el árbol): este es el vínculo real de "escena" que falta formalizar (ver 3.1). Campo concreto: `desgloseEscenas.personajes` (texto) y el `escena_id` oculto deberían ser la fuente de verdad para poblar el selector de personajes de nivel 1 de la vista (sección 1), no una lista escrita a mano en Dirección de actores. Flujo: lectura de `guion-desglose-escenas.personajes`/`escena_id` → opciones del selector de personaje y de `escenas` (chips) en `dir-notas-ensayo`.
- **Reparto / `rep-ficha-personaje`** (departamento Reparto, cargo no especificado en el árbol visto pero existe como objeto): `fichaPersonaje.personaje`, `.arco`, `.objetivo` son la fuente natural de verdad del personaje y de su arco dramático "de guion". La vista de línea de tiempo de ensayo (sección 1) debería mostrar, como cabecera fija de cada personaje, `rep-ficha-personaje.arco`/`objetivo` (solo lectura) antes de listar las sesiones — así "continuidad del arco entre ensayos" se ancla al arco de guion real, no queda huérfana. Flujo: lectura de `rep-ficha-personaje.arco` + `.objetivo` → cabecera de la vista de personaje en `dir-notas-ensayo`.

### 3.3 Con otros departamentos
- **Reparto → Dirección de actores**: `cast-ficha-reparto`/`rep-ficha-personaje` (actor asignado a cada personaje) debe poder leerse para poblar automáticamente el campo `actor` al elegir `personaje` en una nueva sesión — evita que el director de actores escriba el nombre del actor a mano y que se desincronice si hay un cambio de casting. Flujo: lectura de `cast-ficha-reparto.actor` por `personaje` → autocompleta `notasEnsayo.actor`.
- **Dirección de actores → Script/Continuidad** (`dirFotosContinuidad`/`dirScriptLog`, cargo Script dentro de Dirección): si una nota de ensayo definió un gesto o detalle de interpretación específico ("el personaje siempre se toca el anillo cuando miente"), Script necesitaría poder *ver* esa nota (no editarla) al registrar continuidad de la toma real, para no contradecirla. Flujo: lectura de `notasEnsayo.ajuste_interpretacion` filtrado por `escenas`, visible desde el panel de Script como referencia, no editable.
- **Dirección de actores → Vestuario/Maquillaje** (`vest-desglose-escenas`, departamento Vestuario): si el ajuste de interpretación implica algo físico (ej. "personaje más encorvado en esta escena por el arco"), Vestuario podría necesitar visibilidad de `ajuste_interpretacion` para una escena concreta — **hipótesis razonable de flujo, no confirmada con fuente real**, se deja como sugerencia abierta al departamento, no como requisito cerrado.
- No se encontró necesidad real de que otros departamentos (Cámara, Sonido, Arte técnico, Producción) necesiten ver esta herramienta — el contenido es interpretativo y de uso casi exclusivo de Dirección/Reparto. Si el director de oficina considera que algún otro cargo lo necesita, no está confirmado por esta investigación.

## 4. Permisos y RLS

Sigue el patrón ya existente, no un mecanismo nuevo:
- **Edición**: el cargo "Dirección de actores" (y, por jerarquía, "Dirección" como jefe de departamento — mismo criterio que `puede_admin_depto` en `20260702000000_control_depto_permisos.sql`, vía `es_jefe_de_depto`/`caller_departamento`).
- **Visualización (solo lectura)**: resto del departamento Dirección (1AD, Script) por ser herramienta de cargo visible a nivel de departamento según `herramienta_asignaciones`/`herramienta_visibilidad` ya existentes — no hace falta tabla nueva, solo una fila de asignación de "ver" para esos cargos sobre `dir-notas-ensayo`.
- **Filas `privada = "Privada"`**: visibles solo para el `owner_id` que las creó, aplicando el mismo criterio restrictivo que `personal_tools_solo_owner` (policy `restrictive`, `using (owner_id = auth.uid())`), pero a nivel de **fila** dentro de la tabla de datos de esta herramienta de cargo (no de toda la herramienta, que sigue siendo de cargo/departamento) — esto es una variante nueva del patrón, porque las migraciones de referencia aplican el filtro a toda una tabla (`personal_tools`), no a un subconjunto de filas de una herramienta de cargo. **Debe confirmarse con el desarrollador/una migración real cómo se almacena hoy el contenido de una herramienta `tipo: "tabla"` de cargo** (¿fila por fila en una tabla genérica con `herramienta_id`+`project_id`+`data jsonb`, o algo distinto?) antes de escribir la policy — no verifiqué el esquema real de almacenamiento de filas en esta sesión. Dejo esto como pregunta abierta explícita, no asumida.
- Ningún actor/elenco tiene acceso de login a la app (no hay cargo "Actor" en el inventario visto) — no hace falta modelar su acceso.

## 5. Librerías

No se requiere ninguna librería nueva. El dato se modela 100% con el motor genérico (`tabla` + tipos existentes). La única pieza nueva es el panel de render a medida (línea de tiempo agrupada por personaje), que es composición de componentes React/CSS propios del sistema de diseño ya existente (tarjetas, acordeón/expandible) — no requiere una librería de terceros (ni siquiera una de calendarios/timeline: con `--sp-*`/flex vertical del sistema de diseño alcanza para una lista cronológica de tarjetas). Si el desarrollador encuentra que necesita algo más (ej. reproductor de audio para los adjuntos de audio de ensayo), evaluar en ese momento — no se anticipa aquí porque no hay evidencia de que sea indispensable para el MVP.

## 6. Riesgos y preguntas abiertas (explícitas)

1. No hay FK real de "escena" compartida entre `dir-notas-ensayo`, `dir-notas-escena`, `guion-desglose-escenas` y `GENERAL_PLAN_RODAJE` — todas usan texto/chips libres. El cruce automático descrito en 3.1/3.2 es aspiracional hasta que exista un identificador de escena estable y expuesto (ya existe `escena_id` oculto en `desgloseEscenas`, pero no se confirmó si está expuesto a otras herramientas).
2. No verifiqué el esquema real de almacenamiento de filas de una herramienta `tabla` de cargo en Supabase (¿jsonb genérico, tabla dedicada?) — la policy de fila privada de la sección 4 depende de esto y no puede darse por resuelta sin esa confirmación.
3. La propuesta de reflejar sesiones de ensayo como hitos en `GENERAL_CALENDARIO` (3.2) no tiene precedente confirmado de escritura automática cruzada en el repo — se entrega como sugerencia, no como requisito.
4. Esta sesión no tiene acceso al repo real de CINEPACK ni a `cinepack-dev`: nada de lo anterior fue probado contra una base real.
