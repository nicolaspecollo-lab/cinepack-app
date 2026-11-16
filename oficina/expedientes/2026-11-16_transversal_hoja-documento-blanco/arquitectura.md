# Arquitectura — "Hoja de cálculo y Documento en blanco" (transversal)

Autor: arquitecto de integración. Alcance de este documento: apartado 7 (Integración) y la parte de modelo de datos/librerías del apartado 9 (Especificación técnica) del dossier.

**Nota de alcance**: esta herramienta es TRANSVERSAL (no pertenece a un departamento del `inventario.md`), la crea y nombra el propio usuario. No tiene columnas predefinidas por cargo, así que el modelo no puede ser un `Herramienta` tipo `tabla`/`ficha` convencional de `app/herramientas.ts` — se detalla más abajo por qué y qué se propone en su lugar, marcado explícitamente como mecanismo nuevo para que el comité lo evalúe.

---

## 1. Librerías — Hoja de cálculo

Candidatas evaluadas: **Univer**, **FortuneSheet**, **Handsontable**, y como alternativa adicional real **Luckysheet** (predecesor directo de FortuneSheet, lo menciono para descartarlo explícitamente).

| Librería | Licencia | Coste | Bundle / rendimiento móvil | Encaje Next.js 16 + React 19 |
|---|---|---|---|---|
| **Univer** | Apache-2.0 para el núcleo open-source (`@univerjs/*` core); hay un "Univer Pro" comercial con add-ons (colaboración en tiempo real, import/export avanzado) bajo licencia propietaria de pago. **Verificado**: el repo `dream-num/univer` en GitHub declara licencia Apache-2.0 — compatible con SaaS cerrado comercial, no hay obligación de publicar código. | Core gratis; funciones Pro (co-edición, algunas conversiones) de pago por asiento/empresa, precio no público sin contacto comercial (hipótesis: modelo "contactar ventas", no confirmado con cifra exacta). | Arquitectura modular por plugins (core + sheets + ui), lo que permite cargar solo lo necesario, pero el bundle total de la hoja completa es considerable (varios MB con todos los plugins de fórmulas/formato); no está documentado como "mobile-first", su UI de barra de herramientas está pensada para escritorio y requiere trabajo de adaptación para 390px. | Es framework-agnostic (vanilla JS + wrappers), se monta con `"use client"` sin problema de SSR si se inicializa en `useEffect`/dynamic import (`next/dynamic` con `ssr: false`), porque depende del DOM/canvas. No hay wrapper oficial de React 19 todavía — se usa su API imperativa dentro de un componente cliente. |
| **FortuneSheet** | MIT. Compatible sin reservas con SaaS comercial cerrado. | Gratis, sin edición "Pro" de pago (a diferencia de Univer). | Tiene wrapper React oficial (`@fortune-sheet/react`), pero su UI (barra de fórmulas, pestañas de hojas, menú contextual) está diseñada para mouse/teclado de escritorio; en pantallas táctiles pequeñas el scroll de celdas y el redimensionado de columnas son incómodos (reporte de usuarios en issues del repo — no hay benchmark oficial de móvil, lo marco como limitación conocida más que medida). Bundle moderado, menor que Univer por tener menos plugins. | Wrapper React existe y es sencillo de integrar; no declara aún soporte probado de React 19 en su documentación (construido sobre React 16-18 en su `peerDependencies` histórico) — riesgo a verificar al instalar (`npm install` puede requerir `--legacy-peer-deps` o forzar resolución). SSR: debe cargarse también vía `next/dynamic` sin SSR. |
| **Handsontable** | Hasta la v14 el núcleo pasó a ser de código fuente visible pero **no libre** para uso comercial sin licencia paga (modelo "non-free", requiere licencia comercial por dominio para cualquier proyecto que no sea open-source no comercial) — confirmar en su página oficial de pricing. Para CINEPACK (SaaS comercial B2B) esto implica pagar licencia por entorno de producción. | De pago: planes anuales por desarrollador/dominio, con cifras publicadas en su web de pricing (varían por tamaño de equipo); no es gratuito para uso comercial. | Es la más pulida en UX de grilla tipo Excel y tiene soporte táctil documentado, pero el coste de licencia la descarta igual que el bundle no es el problema aquí. | Tiene wrapper oficial `@handsontable/react`, compatible con versiones recientes de React, pero de nuevo: el coste de licencia es el filtro eliminatorio, no el encaje técnico. |

**Recomendación**: **Univer** (núcleo Apache-2.0).

Justificación: es la única de las tres que combina (a) licencia permisiva verificada sin restricción para SaaS comercial cerrado, (b) coste cero para las funciones que CINEPACK necesita en esta primera versión (fórmulas, formato de celda, color, alineación, insertar/eliminar filas-columnas, import/export Excel vía `exceljs` que ya está en el stack — Univer expone import/export XLSX nativo, pero puede delegarse en `exceljs` para mantener una sola librería de lectura/escritura de Excel en todo el repo, decisión a validar con el desarrollador), y (c) una arquitectura de plugins que permite no cargar el editor de fórmulas avanzado si una hoja no lo necesita, mitigando parte del peso de bundle.

**Riesgo abierto declarado**: ninguna de las tres librerías está documentada como "mobile-first" de fábrica. En móvil (390px, requisito inviolable del sistema de diseño) habrá que envolver Univer en un contenedor con scroll horizontal controlado + una barra de herramientas simplificada propia (reutilizando `app/components/Icon.tsx` y tokens `--gutter`/`--fs-*`), no la UI nativa completa del plugin. Esto es trabajo de adaptación real que debe presupuestarse en el desarrollo, no un simple `npm install`. Lo marco como pregunta abierta para el comité: ¿se acepta una versión móvil con funcionalidad reducida (ver/editar celdas simples, sin editor de fórmulas complejo) en el primer release?

---

## 2. Librerías — Documento de texto enriquecido

Candidatas: **TipTap**, **Lexical** (Meta), **Slate**.

| Librería | Licencia | Coste | Encaje React 19 / móvil |
|---|---|---|---|
| **TipTap** | MIT para el núcleo (`@tiptap/core`, `@tiptap/react`, extensiones básicas). Hay extensiones "Pro"/Collaboration bajo licencia comercial de pago (edición colaborativa en tiempo real, comentarios, versionado) — el core de edición rica que pide este expediente (negrita, listas, títulos, exportación) está cubierto por el MIT gratuito. | Gratis para el alcance pedido aquí; colaboración en tiempo real (no pedida en este expediente) sería de pago si se quisiera más adelante. | Construido sobre ProseMirror; wrapper oficial `@tiptap/react` ya probado con React 18/19, uso extendido documentado con Next.js App Router vía `"use client"`. Ligero en comparación con un editor de hoja de cálculo, responde bien táctil (ProseMirror maneja `contenteditable` con buen soporte móvil). |
| **Lexical** | MIT. También compatible con SaaS cerrado. | Gratis. | Mantenido por Meta, muy orientado a React, también con buen rendimiento; algo menos maduro en plugins de exportación DOCX/PDF listos para usar que TipTap (hay que construir más a mano). |
| **Slate** | MIT. | Gratis. | Más bajo nivel (menos "baterías incluidas"): habría que construir toolbar, serialización e historial a mano, más trabajo de desarrollo que TipTap o Lexical. |

**Recomendación**: **TipTap** (núcleo MIT). Mejor relación entre madurez de extensiones ya construidas (negrita/cursiva/listas/títulos/alineación/tablas simples) y velocidad de desarrollo, con licencia sin riesgo y exportación a PDF combinable con `jspdf`/`pdf-lib` (ya en el stack) tomando el HTML/JSON de TipTap como fuente. Lexical queda como alternativa de respaldo si en producción surgiera un problema de rendimiento con TipTap, pero no hay evidencia de eso hoy — no se cambia sin motivo concreto.

**Importante para el comité**: ni Univer ni TipTap están hoy en `package.json`/`package-lock.json` (confirmado en `oficina/stack.md`). Instalarlas es trabajo del desarrollador en su expediente, con `npm install` y verificación de peer-dependencies contra React 19.2.4 — lo marco como paso pendiente, no asumido resuelto.

---

## 3. Modelo de datos

### Por qué no es un `Herramienta` del motor genérico existente
El motor de `app/herramientas.ts` (`ColTipo`: `texto|largo|num|money|fecha|estado|archivo|link|chips|repetible`) está pensado para **columnas fijas definidas por el equipo de CINEPACK para un cargo concreto**. "Hoja en blanco" y "Documento en blanco" son el caso opuesto: el usuario decide el contenido, la estructura y el nombre en el momento de crearlas, y el contenido no es una fila de valores tipados sino una estructura de hoja de cálculo (celdas/fórmulas/estilos) o un documento rico (HTML/JSON de nodos). Forzarlo dentro de `Columna`/`ColTipo` sería maquillar un dato que no es tabular.

**Propuesta explícita al comité** (no reutiliza un `ColTipo` existente, es mecanismo nuevo — se señala para que se vote, no se asume aprobado):

- Nuevo tipo de entidad, **fuera de `Herramienta`** tal como existe hoy, pero registrado en el mismo espacio de trabajo. Dos tablas nuevas en Supabase:

```sql
-- Documentos/hojas en blanco creados por el usuario dentro de un proyecto.
create table public.docs_blanco (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  tipo text not null check (tipo in ('hoja', 'documento')),
  nombre text not null,                 -- lo pone el usuario al crear
  contenido jsonb not null default '{}', -- snapshot serializado (Univer workbook JSON / TipTap JSON)
  owner_id uuid not null references auth.users(id),      -- quién lo creó
  departamento text,                    -- opcional: si se crea desde el espacio de un depto, para agruparlo en su listado
  visibilidad text not null default 'privado' check (visibilidad in ('privado', 'compartido')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Quién más, además del owner, puede ver/editar un doc marcado "compartido".
create table public.docs_blanco_accesos (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid not null references public.docs_blanco(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  rol text not null check (rol in ('editor', 'visionario')),
  created_at timestamptz not null default now(),
  unique (doc_id, user_id)
);
```

- `contenido jsonb`: para `tipo = 'hoja'` guarda el snapshot exportable del workbook de Univer (celdas, fórmulas, formato, filas/columnas) en su formato JSON nativo; para `tipo = 'documento'` guarda el documento JSON de TipTap (ProseMirror doc). Ninguno de los dos cabe en `ColTipo` existente — es el único campo nuevo de tipo libre que se propone, justificado porque el contenido es, por definición de este expediente, de estructura libre decidida por el usuario, no una fila tipada.
- Export a `.xlsx`/`.docx`/`.pdf` es una operación on-demand (botón "Exportar"), no un campo guardado: usa `exceljs` (hoja) y `jspdf`/`pdf-lib` (PDF) ya instalados; no se necesita librería de export adicional para el primer release.

### Espacio compartido del proyecto vs. privado del cargo
- **Privado** (default al crear, `visibilidad = 'privado'`): solo lo ve/edita el `owner_id`. Vive en el listado personal del usuario dentro de su panel ("Mis documentos/hojas"), igual patrón que `personal_tools` (ver migración `20260714000000_rls_personal_tools_owner.sql`): nadie más, **ni siquiera super_admin**, puede leerlo mientras esté en privado — mismo criterio de "configuración/contenido personal no es contenido de proyecto" que ya aplica el repo.
- **Compartido** (`visibilidad = 'compartido'`, lo decide el owner con un toggle explícito): aparece en el espacio de trabajo del proyecto, visible para los cargos listados en `docs_blanco_accesos` (o para todo el departamento del owner, a definir con Nico si se quiere un nivel intermedio "todo mi depto" sin fila por persona — lo marco como pregunta abierta, el modelo de arriba ya soporta fila-por-persona que es el patrón más granular y seguro).

### Permisos (encaje con RLS existente)
Sigue el mismo patrón ya usado en `herramienta_asignaciones` / `control_depto_permisos` (roles "Editor" / "Visionario" gestionados desde `GestionAccesosPanel.tsx`):
- RLS en `docs_blanco`: `select`/`update` permitido si `owner_id = auth.uid()` OR existe fila en `docs_blanco_accesos` para ese `doc_id`+`auth.uid()` con `visibilidad = 'compartido'`. `rol = 'editor'` habilita `update` de `contenido`/`nombre`; `rol = 'visionario'` solo `select`.
- RLS en `docs_blanco_accesos`: solo el `owner_id` del doc (vía policy con subquery a `docs_blanco`) o `is_super_admin()`/`puede_admin_depto()` (reusando el helper ya existente de la migración `control_depto_permisos`) puede escribir filas de acceso — es decir, dar o quitar Editor/Visionario a otros.
- No se reinventa el mecanismo: se reutilizan los helpers `is_super_admin()`, `es_jefe_de_depto()`, `caller_departamento()`, `puede_admin_depto()` ya existentes, igual que hace `herramienta_asignaciones`.
- **Riesgo/pregunta abierta real**: estas dos tablas y sus policies no existen hoy en el repo — es trabajo de migración nuevo para el desarrollador, a verificar con `npm run build`/pruebas de RLS reales contra Supabase local antes de dar por bueno (no se puede confirmar en esta sesión que la sintaxis SQL exacta corra sin errores contra el esquema real, dado que no hay entorno Supabase levantado en este reconocimiento).

---

## 4. Integración en los 3 niveles

### Nivel 1 — Con el cargo/usuario que la crea
- Flujo de datos: el usuario pulsa "Nueva hoja" / "Nuevo documento" desde su panel (`ToolMenu.tsx` o un botón nuevo "+" en el espacio de trabajo) → se crea una fila en `docs_blanco` con `owner_id = auth.uid()`, `nombre` tecleado por el usuario, `departamento = caller_departamento()` si se crea desde dentro de un depto. El contenido se autoguarda (`contenido jsonb`, debounce de edición) en esa misma fila — no hay tabla intermedia de "borradores".
- No hay dato precargado (es "en blanco" por definición de este expediente) — a diferencia de otras herramientas de CINEPACK, aquí no aplica la regla de "contenido precargado específico del cargo" del apartado 6 del dossier; se documenta como excepción justificada en el propio dossier.

### Nivel 2 — Con el proyecto en su conjunto
- **No escribe automáticamente en `GENERAL_PLAN_RODAJE` / `GENERAL_ORDEN_RODAJE` / `GENERAL_CALENDARIO`** — es una herramienta de propósito libre, no de datos estructurados de rodaje. El único flujo de datos concreto hacia el espacio general del proyecto es de **listado/descubrimiento**, no de contenido: cuando un doc pasa a `visibilidad = 'compartido'`, su `nombre` + `tipo` + `departamento` aparece en el índice del espacio de trabajo del proyecto (mismo lugar donde hoy se listan las herramientas generales), para que cualquier cargo con acceso lo encuentre — sin exponer su `contenido` a quien no tenga fila en `docs_blanco_accesos`.
- Si en una fase futura se quisiera, por ejemplo, que una hoja en blanco compartida alimente el `GENERAL_PLAN_RODAJE` (p. ej. un desglose hecho a mano en una hoja libre que luego se vuelca a la tabla oficial), eso requeriría una acción explícita de "exportar/copiar a..." hecha por el usuario — nunca una sincronización automática de campo a campo, porque el contenido de `docs_blanco` no tiene columnas tipadas que mapeen 1:1 contra `Columna[]` de `GENERAL_PLAN_RODAJE`. Lo marco como posible expediente futuro, no parte de este.

### Nivel 3 — Con otros departamentos
- Flujo de datos concreto: compartir un doc es dar de alta una fila en `docs_blanco_accesos` (`doc_id`, `user_id`, `rol`) para un usuario de **cualquier** departamento, no solo el propio — el modelo no limita por `departamento` del documento, así que, por ejemplo, un Jefe de Producción puede dar acceso de "Visionario" a su hoja de presupuesto libre al Director de Fotografía sin que este pertenezca a Producción.
- Quién ve qué: solo las filas de `docs_blanco_accesos` que el owner (o quien tenga `puede_admin_depto` sobre el departamento del doc) haya creado explícitamente — igual filosofía que `GestionAccesosPanel.tsx` ya usa para Editor/Visionario en el resto de herramientas, así que desde la perspectiva de UI puede vivir en el mismo panel, con una pestaña o sección "Mis documentos/hojas" añadida a `GestionAccesosPanel.tsx` en vez de crear un panel de permisos nuevo y paralelo.

---

## 5. Dónde vive en el espacio de trabajo (UI, sin decidir el sistema visual)
- Se certifica que el modelo de datos es compatible con el patrón ya resuelto: la lista de "Mis documentos/hojas" + botón de creación puede vivir como una sección más dentro de `WorkspaceShell.tsx` (pestaña nueva "Documentos" a nivel proyecto, visible a todos, que lista lo propio + lo compartido conmigo), igual que hoy conviven pestañas por departamento. El editor en sí (Univer/TipTap montado) necesita un panel a medida — no cabe en `HerramientaPanel.tsx` genérico (`tabla|nota|checklist|ficha|galeria`) porque ninguno de esos tipos sirve para un lienzo de edición completo — mismo criterio ya aplicado a `MoodboardFotoLienzo.tsx`/`GuionTecnicoPanel.tsx` para casos que "no caben en tabla/nota/checklist/ficha/galería".
- No se decide aquí ningún color/tipografía/espaciado — eso corresponde al desarrollador/QA respetando `sistema-diseno.md` (gutter, `--fs-*`, iconos propios de `Icon.tsx`, sin scroll horizontal no controlado en 390px).

---

## 6. Riesgos y preguntas abiertas (resumen para el apartado 10 del dossier)
1. Ni Univer ni TipTap están instalados; falta validar peer-dependencies reales contra React 19.2.4/Next.js 16.2.9 con `npm install` en el entorno real (no verificable en esta sesión de solo-reconocimiento).
2. UX móvil de un editor de hoja de cálculo tipo Excel en 390px es un desafío real de ninguna de las 3 librerías evaluadas — requiere una capa de UI simplificada propia, no la toolbar nativa.
3. Las tablas `docs_blanco`/`docs_blanco_accesos` y sus policies RLS son propuesta nueva, no verificada contra el esquema real de Supabase (no hay entorno levantado en esta sesión) — el desarrollador debe probarlas contra una base real antes de dar el expediente por cerrado.
4. Nivel intermedio de compartición "todo mi departamento" (sin fila por persona) no está resuelto — pendiente de decisión de Nico; el modelo actual ya soporta el caso más granular (fila por persona) como mínimo viable.
5. Licencia Apache-2.0 de Univer y MIT de TipTap verificadas por descripción de licencia en sus repos públicos de GitHub — no se tuvo acceso a un abogado ni a verificación legal formal; para un SaaS comercial que vaya a escalar, se recomienda que Nico confirme con asesoría legal antes de depender de ellas en producción, especialmente si en el futuro se activa alguna extensión "Pro" de Univer sin revisar sus términos comerciales.
