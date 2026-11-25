# Necesidad — Gestión documental administrativa (Administración)

**Cargo:** Administración (departamento Ejecutivo)
**Herramienta:** `ej-gestion-documental` — "Gestión documental administrativa"
**Clasificación previa:** Circunstancial — **corregida hoy a Consolidada** (ver abajo).

## Corrección de clasificación (hallazgo, mismo patrón que el error del 22/11 con inventario.md)

`inventario.md` línea 19 decía "Circunstancial — una sola tabla genérica, a confirmar alcance". Falso: ya existe un componente bespoke `GestionDocumentalBoard` (`app/hoy/HerramientaPanel.tsx`, líneas ~6111-6248), NO una tabla genérica, que:

- Calcula el vencimiento real del plazo legal de conservación por categoría vía `gdEstado()` (Contable 6 años/art. 30 Código de Comercio, Fiscal 4, Laboral 4, Seguros 5, Licencias 2, Societario = permanente).
- Muestra alerta agregada de documentos vencidos o por vencer (90 días).
- Filtra por categoría con chips, categoría editable vía datalist.
- Trackea validez de digitalización (Sin digitalizar / Solo copia / Certificada, referencia a RD 1619/2012) y adjunto de archivo.

Se recalifica como **Consolidada** en `inventario.md` (hecho en este mismo ciclo).

## Necesidad real que SÍ falta

Pese al buen diseño de retención legal, no cubre la necesidad central del cargo: correlacionar el documento con QUIÉN o QUÉ lo generó (proveedor, organismo, empleado). Hoy un documento solo tiene nombre + categoría + fecha + plazo — obliga a Administración a buscar ese contexto en Contratos/Facturas/RRHH cada vez.

## Relación con otras herramientas del departamento (sin duplicar)

- **Legal** ya cubre cadena de titularidad/derechos y NDAs — Administración no lleva contratos de cesión.
- **Financiación y Seguros** ya cubre pólizas — Administración solo archivaría la copia certificada del documento si cae en la categoría "Seguros" de conservación (ya existe, no se toca).
- **Tesorería** ya cubre altas/bajas SS y nóminas — Administración solo archiva el justificante/documento oficial si hace falta como evidencia legal.
- **Contratos** (herramienta compartida) lleva el contrato en sí — Administración archiva lo que NO es un contrato: correspondencia oficial, escrituras, poderes notariales, licencias/permisos administrativos, certificados (SS, Hacienda, Registro Mercantil), actas societarias.

## Propuesta de extensión (no reemplaza lo existente)

1. Nueva columna `entidad_referencia` (texto libre, autocompletado vía datalist, mismo patrón que `categoria`): a qué proveedor, organismo público (AEAT, TGSS, Ayuntamiento, Registro Mercantil) o departamento interno corresponde el documento.
2. Nueva columna `tipo_entidad` (estado: Proveedor / Organismo público / Empleado / Societario interno / Otro), filtrable con el mismo patrón de chips ya existente.
3. Nueva columna `requiere_renovacion` (estado/booleano): distingue conservación pasiva (ej. libro contable, solo guardar) de vigencia activa (ej. licencia municipal que vence y hay que renovar). Cuando está activo, cambia el lenguaje de la alerta de "vencido su plazo de conservación" a "pendiente de renovar" — problema operativo, no de archivo.
4. Sin cambios: digitalización certificada, archivo adjunto, categorías existentes — ya resueltas, no se tocan sin razón concreta.

## Entrega

- **Investigador**: confirmar plazos legales citados (6 años Código de Comercio art. 30, 4 años fiscal/laboral, RD 1619/2012 digitalización certificada); verificar si existe plazo único para licencias municipales de actividad en producción audiovisual (probablemente variable por municipio — marcar como tal, no como dato fijo).
- **Arquitecto-integración**: diseñar las 3 columnas nuevas en `ej-gestion-documental` (`app/herramientas.ts`) y extender `GestionDocumentalBoard`/`gdEstado()` (`app/hoy/HerramientaPanel.tsx`, ~líneas 6111-6248) para el filtro por entidad y el estado diferenciado de renovación.

Archivos leídos: `app/herramientas.ts` (líneas 2582-2598), `app/hoy/HerramientaPanel.tsx` (líneas 6111-6248), `oficina/inventario.md` (línea 19), `oficina/backlog.md`.

## Arquitectura

### Modelo de datos final

Extiende las columnas declaradas en `app/herramientas.ts` (bloque `ej-gestion-documental`, tipo `tabla`) — se agregan al final, sin tocar las 7 existentes:

| key | tipo | notas |
|---|---|---|
| `nombre` | texto | existente, sin cambios |
| `categoria` | estado | existente, sin cambios |
| `fecha_documento` | fecha | existente, sin cambios |
| `anios_conservacion` | num | existente, sin cambios |
| `permanencia` | estado | existente, sin cambios |
| `estado_digitalizacion` | estado | existente, sin cambios |
| `archivo` | archivo | existente, sin cambios |
| `entidad_referencia` | texto | **nuevo** — texto libre con datalist, mismo patrón que `categoria` (ver `setCategoria`/`categoriasVistas` en `GestionDocumentalBoard`) |
| `tipo_entidad` | estado | **nuevo** — opciones: Proveedor, Organismo público, Empleado, Societario interno, Otro |
| `requiere_renovacion` | estado | **nuevo** — se modela como `estado` con opciones ["No", "Sí"] en lugar de un tipo booleano nuevo, para reutilizar el componente `EstadoSeg` ya usado en `permanencia`/`estado_digitalizacion` (mismo patrón visual, sin tocar `ColTipo`) |

No se propone ningún `ColTipo` nuevo: `texto`+datalist y `estado` con 2 opciones cubren el caso sin necesitar un tipo `booleano` dedicado.

### Extensión de `GestionDocumentalBoard` / `gdEstado()` (`app/hoy/HerramientaPanel.tsx` ~6111-6248)

Cambios concretos, sin rediseño:

1. **Filtro por entidad** (nuevo, en paralelo al filtro de categoría ya existente): agregar un segundo bloque de chips `hp-gd-filtros` análogo al de `categoriasVistas`, construido igual (`Array.from(new Set([...colEntidad?.opciones ?? [], ...filas.map(f => f.datos?.entidad_referencia)]))`), con su propio `datalist` (`hp-gd-entidades-list`) y su propio estado `filtroEntidad` — el filtrado visible (`visibles`) pasa de un solo predicado a la conjunción de ambos filtros (categoría Y entidad) cuando ambos están activos.
2. **Input de `entidad_referencia`**: un campo de texto con `list="hp-gd-entidades-list"` en `hp-gd-row1`, junto al input de categoría (mismo patrón visual, no requiere nueva fila de layout).
3. **`tipo_entidad`**: un `EstadoSeg` adicional en `hp-gd-row2`, igual a como ya se renderiza `permanencia`.
4. **`requiere_renovacion` y el lenguaje de la alerta**: este es el cambio de comportamiento, no solo de layout. Se propone extender `gdEstado()` así (pseudocódigo, para que el desarrollador lo implemente):

```
function gdEstado(f: Fila): { label: string; tono } {
  const renovacion = (f.datos?.requiere_renovacion ?? "No") === "Sí";
  if (permanente) return { label: "Conservación permanente", tono: "neutral" };
  ...
  if (dias < 0) return { label: renovacion ? `Vencida, pendiente de renovar (${fechaTxt})` : `Vencido (${fechaTxt})`, tono: "bad" };
  if (dias <= 90) return { label: renovacion ? `Por renovar antes del ${fechaTxt}` : `Vence ${fechaTxt}`, tono: "warn" };
  return { label: renovacion ? `Renovación vigente hasta ${fechaTxt}` : `Vigente hasta ${fechaTxt}`, tono: "ok" };
}
```

Es decir: **mismo cálculo de plazo y mismos tonos** (`ok`/`warn`/`bad`/`neutral`, sin tono nuevo), solo cambia el texto del label según `requiere_renovacion`. El contador agregado (`vencidosOVenciendo.length`, línea ~6179 y el mensaje de alerta global ~6189-6193) también debería diferenciar el texto: si todos los vencidos/por vencer de ese conjunto tienen `requiere_renovacion = "Sí"`, el mensaje puede decir "pendientes de renovar" en vez de "vencido su plazo de conservación" — o, más simple y menos propenso a casos mixtos raros, dejar el contador agregado con texto neutro ("requieren atención") y que el detalle por tarjeta sea el que distinga. Se recomienda al desarrollador la segunda opción (más simple, menos riesgo de texto incoherente en casos mixtos).

Ningún cambio toca el cálculo de `anios_conservacion`/`GD_DEFAULT_ANIOS`, la digitalización certificada, ni la estructura de `<table>` (sigue sin usarse, son tarjetas) — se confirma que la extensión no rompe lo existente.

### Librerías

No aplica: `GestionDocumentalBoard` es un componente bespoke en React/TypeScript ya construido sobre el stack existente (ver `/oficina/stack.md`), no una hoja de cálculo ni un editor de texto enriquecido — no corresponde comparar Univer/FortuneSheet/Handsontable/TipTap aquí (esa comparación es para la herramienta transversal "Hoja y documento en blanco", ya resuelta en `expedientes/2026-11-16_transversal_hoja-documento-blanco/`, Univer+TipTap). No hay necesidad de introducir ninguna librería nueva para estas 3 columnas: son inputs/datalist/EstadoSeg ya existentes en el mismo archivo.

### Integración nivel 1 — con el propio departamento (Administración / Ejecutivo)

- `ej-presupuesto-costos`, `ej-contratos`, `ej-facturas` (herramientas de departamento Ejecutivo): cuando `tipo_entidad = "Proveedor"`, `entidad_referencia` debería idealmente coincidir con el nombre de proveedor usado en Facturas/Contratos — convención de nomenclatura, no hay FK (mismo límite estructural que `escena` en las otras dos herramientas de hoy: no existe tabla normalizada de proveedores/entidades en el repo). No se construye join automático en este ciclo.
- `ej-cesion-nda` (Legal): archiva NDAs, no se toca — Administración solo archivaría la copia certificada si cae en "Seguros"/"Societario", ya resuelto, sin relación con las 3 columnas nuevas.

### Integración nivel 2 — con el proyecto

- Sin relación directa con `GENERAL_PLAN_RODAJE`/`GENERAL_ORDEN_RODAJE`/`GENERAL_CALENDARIO`: la gestión documental administrativa no tiene fecha de rodaje asociada. Única relación posible: si una licencia municipal con `requiere_renovacion = "Sí"` vence durante el rodaje, sería deseable una alerta cruzada al calendario general — no existe mecanismo de alertas cross-herramienta en el repo hoy (las alertas de `gdEstado` son locales al panel). Se documenta como mejora futura, no se implementa.

### Integración nivel 3 — con otros departamentos

- **RRHH**: cuando `tipo_entidad = "Empleado"`, RRHH (Altas y bajas, Control de horas) podría necesitar ver (lectura) qué documentación oficial de un empleado está archivada aquí — ej. certificados de alta en SS. No hay campo de relación estructurada (`entidad_referencia` es texto libre, no referencia a una fila de la tabla de personal de RRHH). Se deja como lectura manual/convención de nombres, igual límite que en los otros dos expedientes de hoy.
- **Tesorería**: ya archivaba justificantes de alta/baja SS y nóminas en sus propias herramientas; con `tipo_entidad`/`entidad_referencia` esta tabla puede ahora, al menos, filtrar visualmente los documentos vinculados a esos trámites sin necesidad de ver las herramientas de Tesorería — mejora de usabilidad dentro de Administración, no una integración de datos nueva entre departamentos.

### Permisos

Sin cambios respecto al patrón ya vigente de esta herramienta (departamento Ejecutivo, cargo Administración): edición para Administración y jefe de departamento Ejecutivo (`control_depto_permisos`), lectura para el resto del equipo salvo `herramienta_visibilidad.oculta`. Las 3 columnas nuevas son datos de departamento, **no privados del cargo** — no hay necesidad de modelo de nota personal aquí (a diferencia de, por ejemplo, notas de preparación de un actor). No se requiere migración RLS nueva: son columnas de metadata en `app/herramientas.ts`, las filas ya existentes siguen siendo válidas (campos nuevos quedan vacíos/"No" por defecto hasta que se editen).

### Riesgo / pregunta abierta

No se pudo verificar contra el repo real de producción si `GestionDocumentalBoard` tiene alguna dependencia adicional no visible en este checkout (ej. columnas calculadas server-side, triggers de Supabase que dependan del shape exacto de `datos`); el desarrollador debe confirmar antes de mergear que agregar claves nuevas a `datos` (JSON) no choca con alguna validación de schema no vista en esta sesión.

## Investigación

### Plazo contable — 6 años (Código de Comercio art. 30)
Dato de derecho mercantil español consolidado: el art. 30 del Código de Comercio obliga a conservar libros, correspondencia, documentación y justificantes de la empresa durante 6 años desde el último asiento en los libros, salvo disposiciones específicas que amplíen el plazo. No se encontró en esta sesión ninguna fuente que lo contradiga; se mantiene **confirmado** como dato de derecho mercantil estándar y no controvertido (no se pudo abrir el texto consolidado directo del BOE en esta sesión por restricción de red del entorno, pero es un dato jurídico de aplicación constante y ampliamente documentado en España).

### Plazo fiscal — 4 años (parcialmente confirmado, con matiz)
La FAQ de la Agencia Tributaria sobre sistemas informáticos de facturación (SIF/Veri*Factu) indica que el plazo de conservación del art. 19.1 del Reglamento del IVA depende de la operación y las circunstancias, pudiendo ser de **al menos 4 años** desde el fin del plazo de presentación de la declaración o autoliquidación correspondiente (Agencia Tributaria, FAQ — https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/preguntas-frecuentes/caracteristicas-requisitos-sif-conservacion-accesibilidad-legibilidad.html). Esto es consistente con el plazo general de prescripción tributaria de la Ley General Tributaria (4 años), que es la base habitual de la cifra ya usada en `gdEstado()`. **Matiz importante:** no es un número absoluto para todo documento fiscal — el plazo práctico puede extenderse si hay comprobaciones en curso sobre ejercicios no prescritos. Se mantiene como aproximación razonable, no como regla sin excepciones.

### Plazo laboral — 4 años (no verificado directamente, marcado como hipótesis de uso extendido)
**No se encontró en esta sesión una fuente directa y específica** que confirme el plazo de 4 años para documentación laboral usado en `gdEstado()`. Es una cifra de uso extendido en la práctica de asesorías laborales españolas, habitualmente vinculada a los plazos de prescripción de infracciones del orden social (Ley de Infracciones y Sanciones en el Orden Social, RDLeg 5/2000), pero esta sesión no pudo verificar el artículo exacto por restricción de acceso a BOE.es desde este entorno. **Se marca explícitamente como hipótesis razonable, no como dato confirmado** — pendiente de verificación literal en un ciclo con acceso a BOE.es.

### RD 1619/2012 — digitalización certificada (confirmado, con alerta de posible modificación reciente)
Confirmado: el RD 1619/2012 (Reglamento de obligaciones de facturación), art. 8, regula la conservación de facturas y permite la digitalización certificada, exigiendo mantener autenticidad de origen, integridad del contenido y legibilidad desde la fecha de expedición durante todo el periodo de conservación, con software de digitalización homologado por la AEAT (Resolución de 24/10/2007, vigente en lo no contradicho por normativa posterior). Fuentes: Ministerio de Hacienda, texto del RD 1619/2012 — https://www.hacienda.gob.es/DocLeyes/onlinelt/C01.07.01.2012.11.30.rd.1619.facturacion_te_32776.htm.

**Alerta de vigencia normativa — importante para el arquitecto/desarrollador:** la búsqueda detectó un Real Decreto publicado en el BOE el 31/3/2026 que modificaría los arts. 6, 7 y 8 del RD 1619/2012 — justo el artículo de digitalización (art. 8). **No se pudo verificar el contenido de esa modificación en esta sesión** (restricción de red a boe.es desde este entorno). Antes de dar por cerrado este punto normativo, un ciclo próximo con acceso a BOE.es debería confirmar si cambia algo sustancial para la funcionalidad de "digitalización certificada" ya implementada en `GestionDocumentalBoard`. Referencia detectada (sin verificar contenido): BOE, eli/es/rd/2026/03/25/238.

### Licencias municipales — NO existe un plazo único; es variable por municipio (confirmado)
Confirmado: no hay un plazo de vigencia único a nivel estatal para licencias municipales de actividad vinculadas a rodajes; cada ordenanza municipal regula sus propios plazos de tramitación y vigencia, y varían entre sí:

- Zaragoza (Film Office) exige solicitudes con 10 días hábiles de antelación para actividades de complejidad media y 15 días hábiles para el resto, con silencio administrativo negativo si no hay respuesta en plazo (Ayuntamiento de Zaragoza, Film Office, "Guías explicativas" — https://www.zaragoza.es/sede/portal/film-office/rodar/guias-explicativas).
- Las Rozas tiene su propia Ordenanza de Rodajes con su régimen de licencias/comunicaciones (https://transparencia.lasrozas.es/wp-content/uploads/2024/10/20240904_Otros_Ordenanza-Rodajes_signed.pdf).
- Sevilla está modificando su ordenanza para reducir el plazo de tramitación de 15 a 5 días hábiles, señal de que estos plazos son objeto de política municipal activa y cambiante (La Administración al Día / INAP — https://laadministracionaldia.inap.es/noticia.asp?id=1100605).
- Puerto del Rosario (Ordenanza Municipal nº 4) y otros municipios tienen ordenanzas propias, con sus propios plazos y causas de revocación (https://www.puertodelrosario.org/wp-content/uploads/Ordenanza-Municipal-4.pdf).

**Conclusión para diseño:** el plazo fijo de "2 años" para la categoría "Licencias" visto en `gdEstado()` debe entenderse como un plazo **de conservación documental administrativa por defecto**, no como el plazo normativo de vigencia de la licencia municipal en sí (que depende de cada ordenanza local y no tiene cifra única). Esto refuerza la pertinencia de la columna `requiere_renovacion` ya propuesta en este expediente: la fecha de vencimiento real de una licencia debería quedar como dato editable por el usuario caso por caso, no asumida por el sistema con un número fijo.

### Fuentes
- Agencia Tributaria, FAQ "Características y requisitos... conservación, accesibilidad, legibilidad" (SIF/Veri*Factu) — https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/preguntas-frecuentes/caracteristicas-requisitos-sif-conservacion-accesibilidad-legibilidad.html
- Agencia Tributaria, "Obligación de conservar facturas" (Manual práctico IVA 2025) — https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/manual-iva-2025/capitulo-10-obligac-formales-suj-registro/obligaciones-materia-facturacion/obligacion-conservar-facturas.html
- Ministerio de Hacienda, texto del RD 1619/2012 — https://www.hacienda.gob.es/DocLeyes/onlinelt/C01.07.01.2012.11.30.rd.1619.facturacion_te_32776.htm
- BOE, texto consolidado RD 1619/2012 (referencia general, contenido completo no verificado en esta sesión por restricción de red) — https://boe.gob.es/buscar/pdf/2012/BOE-A-2012-14696-consolidado.pdf
- BOE, posible modificación de arts. 6/7/8 del RD 1619/2012, 31/3/2026 (detectada, contenido no verificado) — BOE eli/es/rd/2026/03/25/238
- Ayuntamiento de Zaragoza, Film Office, "Guías explicativas" — https://www.zaragoza.es/sede/portal/film-office/rodar/guias-explicativas
- Ayuntamiento de Las Rozas, Ordenanza de Rodajes — https://transparencia.lasrozas.es/wp-content/uploads/2024/10/20240904_Otros_Ordenanza-Rodajes_signed.pdf
- La Administración al Día (INAP), "La ordenanza de rodajes de Sevilla se modificará para atraer al sector audiovisual" — https://laadministracionaldia.inap.es/noticia.asp?id=1100605
- Ayuntamiento de Puerto del Rosario, Ordenanza Municipal nº 4 — https://www.puertodelrosario.org/wp-content/uploads/Ordenanza-Municipal-4.pdf

### Pendiente de verificación
- Artículo exacto que sustenta el plazo de "4 años" para documentación laboral en `gdEstado()` — no verificado en esta sesión; marcado como hipótesis de uso extendido en el sector, pendiente de confirmar contra LISOS (RDLeg 5/2000) o norma equivalente cuando haya acceso a BOE.es.
- Contenido de la posible modificación de 2026 a los arts. 6-8 del RD 1619/2012 — no verificado; puede afectar la lógica de "digitalización certificada" ya implementada en `GestionDocumentalBoard`.
- Confirmado como variable (no pendiente): no hay plazo único de vigencia de licencia municipal de actividad para rodajes — depende de la ordenanza de cada ayuntamiento. No usar un número fijo del sistema para esto; dejar fecha editable por el usuario (coherente con la columna `requiere_renovacion` ya propuesta).

## QA (25/11/2026)

**Cuenta usada:** `qa.ej-administracion2@mailinator.com` (cargo "Administración", perfil ya completo).

### Funcional
- Confirmado contra `app/herramientas.ts` (línea ~2586) y el componente bespoke `GestionDocumentalBoard`: las 3 columnas nuevas (`entidad_referencia`, `tipo_entidad`, `requiere_renovacion`) están implementadas y visibles.
- La herramienta arranca con una tarjeta de ejemplo de solo-lectura (banner "Así se completa. Esto son ejemplos...") con botón "Borrar ejemplo y comenzar" — al limpiarla queda una tarjeta real vacía editable. Esto es comportamiento esperado del componente, no un bug (el ejemplo reaparece en una sesión/navegador nueva si no se volvió a pulsar el botón en esa sesión, aun cuando ya existan filas reales guardadas — ver nota abajo).
- Cargué 2 documentos reales:
  - "Licencia municipal de rodaje - Plaza Mayor", categoría Licencias, entidad "Ayuntamiento de Madrid", tipo_entidad "Organismo público", `requiere_renovacion = "Sí"` → la tarjeta mostró la etiqueta **"RENOVACIÓN VIGENTE HASTA 10/6/2028"** (tono ok/verde), distinta del texto estándar.
  - "Factura seguro RC 2026", categoría Seguros, entidad "Mapfre", `requiere_renovacion = "No"` (default) → mostró el texto estándar **"VIGENTE HASTA 1/1/2031"**, sin mención de renovación.
  - Confirma exactamente el comportamiento documentado en este expediente: mismo cálculo de plazo (`anios_conservacion`) y mismos tonos, solo cambia el label según `requiere_renovacion`. No se rompió el cálculo existente en ninguno de los dos casos.
- **Filtro por entidad**: al cargar documentos con `entidad_referencia` rellena, aparecieron automáticamente chips de filtro "Todas las entidades / Ayuntamiento de Madrid / Mapfre" junto a los chips de categoría ya existentes — funciona en paralelo sin interferir con el filtro de categoría.
- Verifiqué persistencia por dos vías: (a) re-navegación normal (logout/login + Exclusivas → Gestión documental) y (b) consulta directa a `herramienta_filas` vía API — ambas confirman que `entidad_referencia`, `tipo_entidad` y `requiere_renovacion` quedan guardados tal cual se cargaron.
- Caso límite: documento sin `fecha_documento` (quedó "mm/dd/yyyy" vacío en una de mis filas, error mío de script de prueba, no de la herramienta) no rompe el render de la tarjeta ni el resto de columnas.

### No regresión
- No se tocó el cálculo de `anios_conservacion`/`GD_DEFAULT_ANIOS`, la digitalización certificada ni la estructura general del tablero — confirmado también por lectura de código en el expediente antes de QA.
- `npm run lint` / `npm run build`: mismos resultados que en los otros 2 expedientes de hoy (ver `dir-continuidad-foto` para el detalle) — sin regresiones nuevas atribuibles, build no evaluable por el symlink roto de `node_modules` en este worktree.
- No se reprodujo el bug de "datos que desaparecen tras ~1 segundo" que sí afectó a `dir-control-horarios-1ad` — este componente tuvo un parpadeo breve inicial (demo → datos reales) pero se estabilizó correctamente y no revirtió.

### Responsive
- **390px**: sin scroll horizontal (`scrollWidth === clientWidth === 390`). Las tarjetas se apilan en una columna, los chips de filtro (categoría + entidad) envuelven en varias líneas sin cortarse ni superponerse, todos los controles (inputs, botones, checkboxes tono) quedan completos y usables. Pude completar el flujo principal en este ancho: crear tarjeta, llenar campos, fijar "Requiere renovación = Sí" y ver la etiqueta cambiar.
- **820px / 1440px**: sin scroll horizontal, misma estructura con más aire.
- `qa_responsive_ok: true` para esta herramienta.

### Riesgos / preguntas abiertas (apartado 10)
- Pendiente de verificación normativa ya señalada por investigación (plazo laboral de 4 años sin fuente directa confirmada, posible modificación 2026 del RD 1619/2012) — sin cambios de este QA, queda igual para un ciclo con acceso a BOE.es.
- Nota de UX menor: el banner de ejemplo reaparece en cada sesión/navegador nuevo mientras no haya filas reales визibles para ESE cliente (aunque sí las haya en la base) — no es grave pero puede confundir a un usuario que reabre la herramienta en otro dispositivo y cree que perdió sus datos. No es parte del alcance de hoy pero lo dejo anotado para que el desarrollador lo evalúe si surge como queja real.
