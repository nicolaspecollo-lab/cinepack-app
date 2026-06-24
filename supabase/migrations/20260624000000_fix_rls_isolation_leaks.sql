-- Área 1 — aislamiento de proyectos
--
-- Auditoría (pg_policies en producción) encontró dos políticas con USING (true)
-- que anulan el aislamiento por project_members al combinarse vía OR con las
-- políticas correctas existentes:
--
--   1. profiles.profiles_select_all_authenticated (SELECT, true)
--      → cualquier usuario autenticado ve TODOS los perfiles de la plataforma,
--        no solo los de su proyecto. Es la causa de "aparecen usuarios de
--        otras sesiones de prueba sin estar vinculados al proyecto".
--   2. archivos_carpetas.archivos_carpetas_all (ALL, true / true)
--      → cualquier usuario autenticado puede leer/crear/editar/borrar
--        carpetas de cualquier proyecto.
--
-- El resto de las tablas auditadas (proyectos, project_members, guiones_tecnicos,
-- personal_tools, invitaciones) ya tienen políticas correctamente acotadas por
-- project_members / is_admin / owner_id y no se tocan.

drop policy if exists "profiles_select_all_authenticated" on public.profiles;

drop policy if exists "archivos_carpetas_all" on public.archivos_carpetas;

-- archivos_carpetas.project_id es text, project_members.project_id es uuid
create policy "archivos_carpetas_project_isolation" on public.archivos_carpetas
  for all
  using (
    project_id::uuid in (
      select project_members.project_id
      from public.project_members
      where project_members.user_id = auth.uid()
    )
  )
  with check (
    project_id::uuid in (
      select project_members.project_id
      from public.project_members
      where project_members.user_id = auth.uid()
    )
  );
