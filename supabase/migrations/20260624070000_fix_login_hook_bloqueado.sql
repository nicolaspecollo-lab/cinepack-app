-- URGENTE: custom_access_token_hook bloqueaba el login. Corría sin
-- "security definer", así que se ejecutaba con los privilegios de
-- supabase_auth_admin; el INSERT en audit_logs chocaba con la política RLS
-- "audit_logs_authenticated_insert" (auth.uid() is not null), que en el
-- contexto del hook es null porque todavía no hay sesión. Se marca
-- security definer para que corra con los privilegios del dueño de la
-- función (que sí puede saltarse RLS) y se fija el search_path por
-- seguridad.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  claims jsonb;
  ya_logueado boolean;
begin
  select exists (
    select 1 from public.audit_logs
    where user_id = (event->>'user_id')::uuid
      and action = 'login'
      and created_at > now() - interval '30 minutes'
  ) into ya_logueado;

  if not ya_logueado then
    insert into public.audit_logs (user_id, action, metadata)
    values (
      (event->>'user_id')::uuid,
      'login',
      jsonb_build_object('via', 'custom_access_token_hook')
    );
  end if;

  claims := event->'claims';
  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
