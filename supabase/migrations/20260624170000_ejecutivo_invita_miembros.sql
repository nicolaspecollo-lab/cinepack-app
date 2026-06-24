-- invitaciones solo tenía invitaciones_admin_all (is_admin). La nueva
-- herramienta "Agregar usuario nuevo" en Control la usa cualquier Ejecutivo
-- de proyecto (no solo super_admin), así que necesita poder insertar
-- invitaciones para su propio proyecto. Mismo patrón que ya existe en
-- proyectos."Ejecutivo can update project status".
create policy "invitaciones_ejecutivo_insert" on public.invitaciones
  for insert
  with check (
    exists (
      select 1 from public.profiles p
      join public.project_members pm on pm.user_id = p.id
      where p.id = auth.uid()
        and p.departamento = 'Ejecutivo'
        and pm.project_id = invitaciones.project_id
    )
  );
