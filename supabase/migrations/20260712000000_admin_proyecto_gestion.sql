-- ============================================================================
-- Gestión de proyectos desde el panel admin + papelera de archivos
-- ============================================================================
-- Añade el ciclo de vida operativo del proyecto (archivado, suspensión por
-- impago en dos escalones: aviso y bloqueo real), la papelera de archivos por
-- proyecto, y una función de borrado definitivo en cascada para super_admin.
--
-- Reusa el helper existente public.is_super_admin() (security definer, no
-- recursivo — ver 20260624090000_fix_inlining_is_super_admin.sql).
-- ============================================================================

-- 1) Estados de ciclo de vida del proyecto -----------------------------------
alter table public.proyectos
  add column if not exists archivado_at        timestamptz,
  add column if not exists suspendido_at       timestamptz,
  add column if not exists aviso_impago_at     timestamptz,
  add column if not exists aviso_bloqueo_fecha date,
  add column if not exists suspension_motivo   text;

-- 2) Papelera de archivos por proyecto ---------------------------------------
create table if not exists public.archivos_papelera (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.proyectos(id) on delete cascade,
  bucket            text not null default 'documentos',
  departamento      text,
  nombre            text not null,           -- nombre legible (sin el prefijo timestamp)
  original_path     text not null,           -- ruta completa antes de borrar
  papelera_path     text not null,           -- ruta actual dentro de _papelera
  size              bigint,
  deleted_by        uuid,
  deleted_by_nombre text,
  deleted_at        timestamptz not null default now()
);

create index if not exists idx_archivos_papelera_project
  on public.archivos_papelera (project_id, deleted_at desc);

alter table public.archivos_papelera enable row level security;

-- Un miembro del proyecto puede registrar sus propios borrados.
drop policy if exists papelera_insert_miembro on public.archivos_papelera;
create policy papelera_insert_miembro on public.archivos_papelera
  for insert
  with check (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = archivos_papelera.project_id
        and pm.user_id = auth.uid()
    )
  );

-- La lectura/gestión de la papelera es solo para super_admin desde el panel
-- (la ruta admin usa service role igualmente, esto cubre el acceso directo).
drop policy if exists papelera_select_admin on public.archivos_papelera;
create policy papelera_select_admin on public.archivos_papelera
  for select
  using (public.is_super_admin());

drop policy if exists papelera_delete_admin on public.archivos_papelera;
create policy papelera_delete_admin on public.archivos_papelera
  for delete
  using (public.is_super_admin());

-- 3) Borrado definitivo en cascada (solo super_admin) ------------------------
-- Borra las filas hijas de TODAS las tablas public que tengan columna
-- project_id (a prueba de futuro: no hay que enumerarlas a mano) y el propio
-- proyecto. La limpieza de los ficheros reales en Storage la hace la ruta admin
-- (app/api/admin/borrar-proyecto) vía la Storage API ANTES de llamar a este RPC.
create or replace function public.admin_borrar_proyecto(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if not public.is_super_admin() then
    raise exception 'no autorizado';
  end if;

  for r in
    select table_name
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'project_id'
      and table_name <> 'proyectos'
  loop
    execute format('delete from public.%I where project_id = $1', r.table_name)
      using p_project_id;
  end loop;

  delete from public.proyectos where id = p_project_id;
end;
$$;

revoke all on function public.admin_borrar_proyecto(uuid) from public, anon;
grant execute on function public.admin_borrar_proyecto(uuid) to authenticated;

-- 4) Storage: permitir mover archivos dentro de "documentos" (Papelera) -----
-- El bucket "documentos" ya tenía políticas de SELECT/INSERT/DELETE para
-- miembros del proyecto (creadas desde el dashboard de Supabase), pero
-- NINGUNA de UPDATE — y storage.move() hace internamente un UPDATE sobre
-- storage.objects. Sin esto, el soft-delete a la Papelera falla en silencio
-- con "Object not found" (RLS deniega el UPDATE, no es que falte el archivo;
-- verificado con una cuenta de prueba real antes de escribir esta policy).
-- Política aditiva: no reemplaza ni toca las existentes, solo añade el
-- permiso de UPDATE que faltaba, con la misma regla de aislamiento por
-- proyecto (primer segmento de la ruta = project_id, cruzado con
-- project_members — mismo patrón que el resto de la app).
drop policy if exists "documentos_miembro_update" on storage.objects;
create policy "documentos_miembro_update" on storage.objects
  for update
  using (
    bucket_id = 'documentos'
    and exists (
      select 1 from public.project_members pm
      where pm.project_id = (storage.foldername(name))[1]::uuid
        and pm.user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'documentos'
    and exists (
      select 1 from public.project_members pm
      where pm.project_id = (storage.foldername(name))[1]::uuid
        and pm.user_id = auth.uid()
    )
  );
-- Nota: el explorador admin (Carpeta Maestra) usa createAdminClient()
-- (service role), que se salta RLS por completo — no depende de esta policy.
