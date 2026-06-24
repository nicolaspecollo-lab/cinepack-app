-- Postgres prohíbe que una política sobre una tabla necesite volver a
-- consultar esa misma tabla para resolverse, incluso a través de una
-- función security definer con bypassrls — es una restricción estructural
-- de la fase de reescritura de la consulta, no algo que se pueda evitar con
-- privilegios. Por eso is_super_admin() seguía causando recursión en
-- profiles aunque corriera como postgres (bypassrls=true).
--
-- Solución: meter app_role dentro del JWT en el momento en que se emite
-- (login/refresh), vía el access token hook que ya existe, y que la
-- política lea el valor desde ahí (auth.jwt()) en vez de volver a
-- consultar profiles. Esto no es recursivo porque no es una consulta a la
-- tabla — es leer un valor que ya viene en el token.
--
-- Nota: el cambio de rol tarda hasta que el usuario vuelva a iniciar
-- sesión (o se refresque el token) en reflejarse en el JWT.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  claims jsonb;
  ya_logueado boolean;
  rol text;
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

  select app_role into rol from public.profiles where id = (event->>'user_id')::uuid;

  claims := event->'claims';
  claims := jsonb_set(claims, '{app_role}', to_jsonb(coalesce(rol, 'executive_producer')));
  return jsonb_set(event, '{claims}', claims);
end;
$$;

drop policy if exists "profiles_super_admin_select_all" on public.profiles;

create policy "profiles_super_admin_select_all" on public.profiles
  for select
  using ((auth.jwt() ->> 'app_role') = 'super_admin');
