-- ============================================================================
-- Endurecer con RLS el bloqueo de proyectos suspendidos/archivados
-- ============================================================================
-- Hoy el bloqueo de un proyecto suspendido/archivado (ver
-- 20260712000000_admin_proyecto_gestion.sql) se aplica solo a nivel de
-- aplicación (HoyWorkspace.tsx). Cubre el 100% del uso real por interfaz,
-- pero no evita que un miembro real, con sesión válida, llame directamente
-- a la API de Supabase saltándose la app.
--
-- Enfoque elegido (bajo riesgo): UNA policy RESTRICTIVE sobre
-- `project_members`, en vez de tocar cada tabla del proyecto una por una.
-- En Postgres, las policies RESTRICTIVE se combinan con AND sobre TODAS las
-- policies PERMISSIVE existentes para el mismo comando, sin necesidad de
-- conocer ni reescribir su lógica. Como prácticamente todas las demás tablas
-- (herramienta_filas, eventos_proyecto, documentos, invitaciones,
-- workspace_blocks, archivos_carpetas, consultas, comunicados, y las
-- policies de storage.objects) verifican membresía con
-- `exists (select 1 from project_members where project_id=... and
-- user_id=auth.uid())`, y esa subconsulta queda sujeta a la RLS de
-- project_members, bloquear ahí se propaga en cascada a todo lo demás.
--
-- Precaución de recursión (ver memoria "Bug de recursión RLS" —
-- 20260624080000/090000/100000/110000_fix_*recursion*.sql): las funciones
-- usadas aquí (is_super_admin, proyecto_bloqueado) SOLO consultan `profiles`
-- y `proyectos` respectivamente — ninguna vuelve a consultar
-- `project_members`, así que no hay ciclo.
-- ============================================================================

create or replace function public.proyecto_bloqueado(p_project_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select (suspendido_at is not null or archivado_at is not null)
     from public.proyectos
     where id = p_project_id),
    false
  );
$$;

revoke all on function public.proyecto_bloqueado(uuid) from public, anon;
grant execute on function public.proyecto_bloqueado(uuid) to authenticated;

drop policy if exists "project_members_bloqueo_suspension" on public.project_members;
create policy "project_members_bloqueo_suspension" on public.project_members
  as restrictive
  for all
  using (public.is_super_admin() or not public.proyecto_bloqueado(project_id))
  with check (public.is_super_admin() or not public.proyecto_bloqueado(project_id));
