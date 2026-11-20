# Cola de merge — Oficina de Desarrollo de App CINEPACK

Expedientes validados por Nico ("Cumple" o "Supera las expectativas"), con su estado de merge dentro del repo de muestreo y de push al repo real (siempre manual, fuera del alcance de esta sesión).

| Expediente | PR | Calificación | Merge a `claude/oficina-agentes-cinepack-jv179i` | Push al repo real |
|---|---|---|---|---|
| Hoja de cálculo en blanco | #5 | Cumple (16/11) | **Mergeado** a `claude/oficina-agentes-cinepack-jv179i` (16/11) | **Corte dado** (20/11) — pendiente de que Nico lo ejecute a mano |
| Documento en blanco | #5 | Cumple (17/11) | Código ya incluido en el merge de arriba (comparte PR/rama con la hoja de cálculo) — **Mergeado** | **Corte dado** (20/11) — pendiente de que Nico lo ejecute a mano |
| Notas de dirección por escena | — | Cumple (17/11) | No aplica (patch aislado, no todo el expediente) | **Hecho vía Corte** (17/11) — commit `887aa77` en `main` real |
| 3 herramientas vacías (Auxiliar de cámara, Ayudantía de dirección de arte, Protagonista) | — | Cumple (18/11) | **Mergeado** (18/11), commit `d6f6761` | **Corte dado** (20/11) — pendiente de que Nico lo ejecute a mano: esta sesión no tiene acceso de escritura al repo/Supabase/Vercel reales |
| rrhh-plan-bienestar (Seguridad laboral y formación obligatoria) | #7 | Supera las expectativas (20/11) | **Mergeado** (20/11), commit `46adf5d` | **Corte dado** (20/11) — pendiente de que Nico lo ejecute a mano (main/migraciones/deploy reales) |
| dir-decisiones-visionado (Decisiones de visionado/dailies) | #11 | Cumple (20/11) | **Mergeado** (20/11), commit `1c89105` (conflicto real con rrhh-plan-bienestar resuelto en `app/hoy/HerramientaPanel.tsx`, ambos entries de `ENTIDAD_TABS_IDS`/`ENTIDAD_TABS_CONFIG` conservados) | **Corte dado** (20/11) — pendiente de que Nico lo ejecute a mano |
| post-checklist-mezcla (Checklist de mezcla y masterización de audio) | #8 | Supera las expectativas (20/11) | **Mergeado** (20/11), commit `ab8eb92` (conflicto real con rrhh-plan-bienestar resuelto: campo `itemsPrecargados` + `agruparPor` conservados en el tipo `Herramienta`; nota del parte diario 17/11 combinada) | **Corte dado** (20/11) — pendiente de que Nico lo ejecute a mano |

**Nota sobre "Corte dado" (20/11/2026):** Nico dio Corte vía el panel para varios expedientes a la vez. Esta sesión mergeó cada PR a `claude/oficina-agentes-cinepack-jv179i` (dentro de su alcance, ver `oficina/CLAUDE.md` regla 2), pero **no mergeó a `main`, no aplicó migraciones contra el proyecto real de Supabase ni disparó el deploy a Vercel** — el mismo `CLAUDE.md` dice explícitamente que esta sesión no tiene acceso de escritura al repo/base/deploy reales y que ese paso es 100% manual de Nico. No se marcó `corte_ejecutado:true` en ninguna de estas entregas del panel para no registrar como hecho algo que no se ejecutó de verdad.
