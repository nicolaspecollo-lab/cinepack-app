-- El ciclo real: profiles."Members can view teammates profiles" consulta
-- project_members (via is_member_of), y project_members_super_admin_select
-- consulta profiles — cada tabla necesita resolver la otra para responder,
-- lo cual Postgres detecta como recursión (reportada bajo el nombre de
-- cualquiera de las dos tablas, en este caso "profiles"). Se rompe el
-- ciclo usando el claim del JWT en vez de consultar profiles otra vez.
drop policy if exists "project_members_super_admin_select" on public.project_members;

create policy "project_members_super_admin_select" on public.project_members
  for select
  using ((auth.jwt() ->> 'app_role') = 'super_admin');
