# Stack técnico — CINEPACK (reconocimiento)

## Repos
- **Repo de muestreo (donde trabaja la oficina):** `nicolaspecollo-lab/cinepack-app` — duplicado donde trabajaba Jean-Antoine Guerrero Silva (`jeantuan2110@gmail.com`, rama de historial `jeantuan-dev` y PRs como `jeantuan-moodboard-fotografia`, `jeantuan-plan-sonido-directo`). Es el único repo al que esta sesión tiene acceso de lectura/escritura (confirmado con `list_repos`: un solo resultado).
- **Repo real de CINEPACK:** no está adjunto a esta sesión. **No se puede leer ni escribir en esta sesión.** Para el reconocimiento se ha tratado este mismo repo de muestreo como fuente de los tokens de diseño, ya que no hay otra fuente disponible. **Riesgo abierto:** si el repo real tiene tokens distintos a los que aquí se documentan, `sistema-diseno.md` quedaría desalineado — hay que validarlo contra el repo real a mano antes de dar por bueno cualquier dossier.

## Stack técnico
- **Framework:** Next.js 16.2.9, App Router, `next dev --webpack` (ver `package.json`). `next.config.ts` solo envuelve la config con `next-intl/plugin` — sin otras opciones.
- **UI:** React 19.2.4 / React DOM 19.2.4, TypeScript 5, Tailwind CSS 4 (vía `@tailwindcss/postcss`), ESLint 9 + `eslint-config-next`.
- **Backend/datos:** Supabase (`@supabase/ssr`, `@supabase/supabase-js`), con helpers en `lib/supabase/{client,server,middleware,admin}.ts`. Migraciones SQL versionadas en `supabase/migrations/` (RLS, roles, control de acceso por departamento/cargo, suscripciones, etc. — hay decenas de migraciones de endurecimiento de RLS, indicativo de un modelo de permisos fino por fila).
- **i18n:** `next-intl`, 3 idiomas: ES, EN, CA. Mensajes en `messages/{es,en,ca}.json` y también `i18n/messages/{es,en,ca}.json` (dos ubicaciones — aclarar con Nico cuál es la vigente antes de tocar textos). `i18n/request.ts`, `i18n/config.ts`, `i18n/actions.ts`.
- **Documentos / exportación:** `exceljs` (Excel), `jspdf` + `jspdf-autotable` (PDF), `pdf-lib` (manipulación de PDF), `pdf-parse` (lectura de PDF, usado en `app/api/guion/parse` y `app/api/guion-tecnico/parse`).
- **Canvas/gráficos:** `konva` + `react-konva`, usados en el Moodboard de Fotografía (`app/hoy/MoodboardFotoLienzo.tsx`).
- **IA:** `@anthropic-ai/sdk` y `@google/genai`. `@google/genai` (Gemini) está confirmado en uso en `app/api/asistente/route.ts` (asistente conversacional con contexto de departamento/cargo/catálogo de documentos) y en `app/api/guion/desglose/generar` y `app/api/plan-rodaje/generar` (generación de desglose de guion y plan de rodaje). No se verificó un uso activo de `@anthropic-ai/sdk` en las rutas revisadas — **hipótesis**: puede estar reservado para una migración o A/B de proveedor; confirmar antes de asumir que está en producción.
- **Email:** `resend`.
- **No hay librería de hoja de cálculo ni editor de texto enriquecido instalada todavía** (sin rastro de Univer, FortuneSheet, Handsontable ni TipTap en `package.json`/`package-lock.json`). Es trabajo pendiente del primer expediente (sección 7 del encargo).

## Estructura de las herramientas en el código
- **Registro central:** `app/herramientas.ts` (3839 líneas). Define tipos (`Herramienta`, `Columna`, `CargoTools`), construye cada herramienta como objeto tipado con `columnas`/`campos` específicos del cargo, y las agrupa en:
  - `HERRAMIENTAS: Record<departamento, Record<cargo, CargoTools>>` — el mapa maestro departamento → cargo → `{ departamento: Herramienta[], cargo: Herramienta[] }` (herramientas compartidas de departamento vs. exclusivas del cargo).
  - Herramientas "generales" del proyecto (`GENERAL_CALENDARIO`, `GENERAL_PLAN_RODAJE`, `GENERAL_ORDEN_RODAJE`, `GENERAL_CONTACTOS_EMERGENCIA`, `GENERAL_CHECKLIST_WRAP`), editables por cualquier integrante.
  - Funciones de consulta: `deptTools()`, `cargoGroups()`, `catalogoCompleto()`, `HERRAMIENTA_POR_ID`, `archivoColumnasDe()`.
- **Render de las herramientas:** `app/hoy/HerramientaPanel.tsx` (panel genérico que interpreta el tipo de herramienta: `tabla`, `nota`, `checklist`, `ficha`, `galeria`, `accesos`, `registro`) + paneles específicos cuando la lógica no cabe en el motor genérico (ej. `MoodboardFotoLienzo.tsx`/`MoodboardFotoFicha.tsx`, `PlanSonidoPanel.tsx`, `GuionTecnicoPanel.tsx`, `DossierConvocatoria.tsx`).
- **Navegación/shell:** `WorkspaceShell.tsx` (contenedor del espacio de trabajo con pestañas), `ToolMenu.tsx` (menú de herramientas por cargo), `CommandPalette.tsx`.
- **Permisos:** `GestionAccesosPanel.tsx` / `ControlDeptoPanel.tsx`, respaldados por políticas RLS en Supabase (ver migraciones `*_control_depto_permisos.sql`, `*_rls_personal_tools_owner.sql`, `*_rls_bloqueo_suspension.sql`).
- **Admin interno (equipo CINEPACK, no clientes):** `app/admin/*` — gestión de usuarios, proyectos, beta access, feedback, flags, actividad, soporte. Usa guard propio (`useAdminGuard.ts`) y auth separada (`app/api/admin/_auth.ts`).

## Cómo se ejecuta en local
```
npm install
npm run dev     # next dev --webpack, puerto 3000 por defecto
npm run build   # next build
npm run start   # next start (producción)
npm run lint     # eslint
```
Requiere variables de entorno de Supabase (no verificadas en este reconocimiento — no hay `.env.example` en el repo; revisar con Nico qué credenciales hacen falta para levantar el entorno).

## Nota sobre AGENTS.md
`AGENTS.md` advierte que esta versión de Next.js (16.2.9) puede tener cambios de ruptura respecto al conocimiento de entrenamiento y pide leer `node_modules/next/dist/docs/` antes de escribir código. **No se encontró ese directorio de docs** en este entorno (node_modules no está instalado en esta sesión de reconocimiento). El agente **desarrollador** debe, antes de escribir cualquier ruta o página nueva, instalar dependencias (`npm install`) y revisar `node_modules/next/dist/docs/` si existe, o en su defecto inspeccionar el código ya existente en `app/` como referencia de convenciones vigentes (App Router, Server/Client Components tal como se usan en `app/hoy/page.tsx`, `app/api/*/route.ts`).
