-- Área 3 — el panel admin necesita listar perfiles por app_role (sección
-- Soporte, columna "proyecto asignado" en Usuarios). A diferencia del bug
-- de Área 1 (USING true, sin restricción), esta política solo deja pasar
-- al propio super_admin.
create policy "profiles_super_admin_select_all" on public.profiles
  for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.app_role = 'super_admin')
  );
