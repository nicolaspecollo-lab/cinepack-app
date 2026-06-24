-- Riesgos del informe de Área 5:
-- 1. audit_logs.login sobrecuenta (refresh de token cada ~1h). Se reduce el
--    ruido: solo inserta un nuevo "login" si no hay uno del mismo usuario en
--    los últimos 30 minutos. No distingue login real de refresh con certeza
--    (el payload del hook no lo permite), pero evita una fila por hora de
--    sesión activa.
-- 2. personal_tools_super_admin_select no tiene sentido: personal_tools es
--    configuración personal (owner_id), no contenido de proyecto — "Ver como
--    soporte" no debería destapar la configuración personal de cada usuario.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
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

drop policy if exists "personal_tools_super_admin_select" on public.personal_tools;
