-- ============================================================================
-- Fix: admin_borrar_proyecto() fallaba si alguna tabla tenía project_id
-- tipado como text en vez de uuid ("operator does not exist: text = uuid").
-- Encontrado probando el borrado definitivo end-to-end sobre un proyecto
-- descartable ("QA PRUEBA") antes de dar el feature por bueno.
-- ============================================================================
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
    select c.table_name, c.data_type
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.column_name = 'project_id'
      and c.table_name <> 'proyectos'
  loop
    if r.data_type = 'uuid' then
      execute format('delete from public.%I where project_id = $1', r.table_name)
        using p_project_id;
    else
      execute format('delete from public.%I where project_id = $1', r.table_name)
        using p_project_id::text;
    end if;
  end loop;

  delete from public.proyectos where id = p_project_id;
end;
$$;

revoke all on function public.admin_borrar_proyecto(uuid) from public, anon;
grant execute on function public.admin_borrar_proyecto(uuid) to authenticated;
