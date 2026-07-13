-- ============================================================================
-- registrar_papelera(): RPC security-definer para insertar en archivos_papelera
-- ============================================================================
-- La policy RLS "papelera_insert_miembro" (creada en 20260712000000) no dejaba
-- insertar a un miembro real del proyecto pese a que la condición evaluaba
-- true en pruebas aisladas (auth.uid() correcto, exists() correcto) — se
-- verificó con una cuenta de prueba dedicada en el proyecto "marea alta" antes
-- de cambiar de enfoque. En vez de seguir depurando la policy, se sigue el
-- mismo patrón ya usado en el resto de la app para escrituras con lógica de
-- autorización (accept_invitation, admin_borrar_proyecto, puede_editar_calendario):
-- una función security-definer que verifica la membresía por su cuenta y hace
-- el insert con privilegios elevados, evitando depender de RLS directa sobre
-- la tabla para esta operación.
-- ============================================================================

create or replace function public.registrar_papelera(
  p_project_id     uuid,
  p_bucket         text,
  p_departamento   text,
  p_nombre         text,
  p_original_path  text,
  p_papelera_path  text,
  p_size           bigint
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text;
  v_id uuid;
begin
  if not exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = auth.uid()
  ) then
    raise exception 'no autorizado';
  end if;

  select full_name into v_nombre from public.profiles where id = auth.uid();

  insert into public.archivos_papelera (
    project_id, bucket, departamento, nombre, original_path, papelera_path,
    size, deleted_by, deleted_by_nombre
  ) values (
    p_project_id, p_bucket, p_departamento, p_nombre, p_original_path, p_papelera_path,
    p_size, auth.uid(), v_nombre
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.registrar_papelera(uuid, text, text, text, text, text, bigint) from public, anon;
grant execute on function public.registrar_papelera(uuid, text, text, text, text, text, bigint) to authenticated;

-- La policy de insert directo ya no se usa (la escritura real pasa por el RPC
-- de arriba); se retira para no dejar superficie muerta/confusa.
drop policy if exists papelera_insert_miembro on public.archivos_papelera;

-- Limpieza de las funciones de diagnóstico temporales usadas para depurar
-- el problema de RLS (ya no hacen falta).
drop function if exists public.debug_papelera_check(uuid, uuid);
drop function if exists public.debug_show_policy(text);
