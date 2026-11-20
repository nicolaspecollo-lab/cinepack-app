# Cola de merge — Oficina de Desarrollo de App CINEPACK

Expedientes validados por Nico ("Cumple" o "Supera las expectativas"), con su estado de merge dentro del repo de muestreo y de push al repo real.

| Expediente | PR | Calificación | Merge a `claude/oficina-agentes-cinepack-jv179i` | Push al repo real |
|---|---|---|---|---|
| Hoja de cálculo en blanco | #5 | Cumple (16/11) | **Mergeado** a `claude/oficina-agentes-cinepack-jv179i` (16/11) | **Hecho vía Corte** (20/11) — merge a `main` real, commit `ff84628`. Migración `docs_blanco.sql` NO aplicada aún contra Supabase real (sin credenciales de producción desde esta sesión) — UI sigue sobre stub de `localStorage` hasta que se aplique. |
| Documento en blanco | #5 | Cumple (17/11) | Código ya incluido en el merge de arriba (comparte PR/rama con la hoja de cálculo) — **Mergeado** | **Hecho vía Corte** (20/11) — merge a `main` real, commit `ff84628` (misma migración pendiente que la fila de arriba). |
| Notas de dirección por escena | — | Cumple (17/11) | No aplica (patch aislado, no todo el expediente) | **Hecho vía Corte** (17/11) — commit `887aa77` en `main` real |
| 3 herramientas vacías (Auxiliar de cámara, Ayudantía de dirección de arte, Protagonista) | — | Cumple (18/11) | **Mergeado** (18/11), commit `d6f6761` | **Hecho vía Corte** (20/11) — merge a `main` real, commit `ff84628`. Sin migración (no hacía falta). |
| rrhh-plan-bienestar (Seguridad laboral y formación obligatoria) | #7 | Supera las expectativas (20/11) | **Mergeado** (20/11), commit `46adf5d` | **Hecho vía Corte** (20/11) — merge a `main` real, commit `ff84628`. Sin migración nueva (reusa motor genérico). |
| dir-decisiones-visionado (Decisiones de visionado/dailies) | #11 | Cumple (20/11) | **Mergeado** (20/11), commit `1c89105` (conflicto real con rrhh-plan-bienestar resuelto en `app/hoy/HerramientaPanel.tsx`, ambos entries de `ENTIDAD_TABS_IDS`/`ENTIDAD_TABS_CONFIG` conservados) | **Hecho vía Corte** (20/11) — merge a `main` real, commit `ff84628`. Sin migración nueva. |
| post-checklist-mezcla (Checklist de mezcla y masterización de audio) | #8 | Supera las expectativas (20/11) | **Mergeado** (20/11), commit `ab8eb92` (conflicto real con rrhh-plan-bienestar resuelto: campo `itemsPrecargados` + `agruparPor` conservados en el tipo `Herramienta`; nota del parte diario 17/11 combinada) | **Hecho vía Corte** (20/11) — merge a `main` real, commit `ff84628`. Sin migración nueva. |

**Nota sobre "Corte" (20/11/2026, aclaración de Nico):** Corte significa merge real a `main` para que la herramienta llegue a la app de verdad — mismo mecanismo que el primer Corte (dir-notas-escena, `887aa77`). Esta sesión aplicó el código de las 6 entregas de arriba como patch aislado (12 archivos de `app/`+`supabase/migrations/`, sin traer el resto de la rama de oficina) directamente sobre `main` real: `887aa77..ff84628`, verificado con `tsc --noEmit` y `next build --webpack` limpios antes de pushear.

**Lo que queda pendiente, no por regla sino por falta de credenciales reales en esta sesión:**
- **Migración `docs_blanco.sql`**: no se corrió contra el proyecto Supabase real (esta sesión solo tiene las credenciales de `cinepack-dev`, no el project ref/service role key de producción). La propia migración ya documenta en su cabecera que no se había corrido contra ningún Supabase real. Sin ella, hoja/documento en blanco sigue persistiendo en `localStorage` — no hay regresión, pero tampoco hay guardado real todavía.
- **Deploy a Vercel**: no confirmable ni disparable directamente desde esta sesión (sin token de Vercel). Si el proyecto tiene la integración Vercel-GitHub activada sobre `main`, el push ya debería haber disparado un deploy solo.

Si Nico quiere que esta sesión también ejecute la migración y/o dispare el deploy directamente, hace falta darle las credenciales reales correspondientes (Supabase service role + project ref de producción, y/o token de Vercel) — con `request_credential` se le puede pedir de forma segura sin que el valor pase por el chat.
