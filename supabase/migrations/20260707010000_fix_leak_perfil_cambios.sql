-- BUG DE AISLAMIENTO: la política original dejaba que CUALQUIER Ejecutivo viera
-- los cambios de perfil de TODOS los usuarios de la plataforma, sin cruzar por
-- proyecto. Un proyecto nuevo mostraba actividad de gente de otros proyectos.
-- Fix: un Ejecutivo solo puede ver perfil_cambios de usuarios que comparten
-- al menos un proyecto con él (project_members). Super_admin sigue viendo todo
-- (ya tenía necesidad legítima de auditoría global).

drop policy if exists "Ejecutivo can view all perfil_cambios" on public.perfil_cambios;

create policy "Ejecutivo ve perfil_cambios de companeros de proyecto"
on public.perfil_cambios for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.departamento = 'Ejecutivo'
  )
  and exists (
    select 1
    from public.project_members pm_yo
    join public.project_members pm_otro
      on pm_otro.project_id = pm_yo.project_id
    where pm_yo.user_id = auth.uid()
      and pm_otro.user_id = perfil_cambios.user_id
  )
);

drop policy if exists "Super admin ve todos los perfil_cambios" on public.perfil_cambios;

create policy "Super admin ve todos los perfil_cambios"
on public.perfil_cambios for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (p.is_admin = true or p.app_role = 'super_admin')
  )
);
