-- Área 3 — instrumenta audit_logs en los puntos ya existentes:
-- alta de miembro (accept_invitation) y cambio de rol (trigger de app_role).
-- La creación de proyecto se loguea desde el código (es un insert client-side).

create or replace function public.accept_invitation(p_token uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  inv public.invitaciones;
  user_email text;
begin
  select * into inv from public.invitaciones where token = p_token and used = false;
  if inv.id is null then
    raise exception 'Invitación inválida o ya utilizada';
  end if;

  select email into user_email from auth.users where id = auth.uid();
  if user_email is distinct from inv.email then
    raise exception 'El email de la cuenta no coincide con la invitación';
  end if;

  update public.profiles
    set full_name = inv.full_name, departamento = inv.departamento, cargo = inv.cargo
    where id = auth.uid();

  insert into public.project_members (project_id, user_id, rol)
  values (inv.project_id, auth.uid(), inv.departamento)
  on conflict (project_id, user_id) do update set rol = excluded.rol;

  update public.invitaciones set used = true where id = inv.id;

  insert into public.audit_logs (user_id, project_id, action, metadata)
  values (
    auth.uid(),
    inv.project_id,
    'member_added',
    jsonb_build_object('departamento', inv.departamento, 'cargo', inv.cargo)
  );
end;
$function$;

create or replace function public.sync_profiles_app_role_is_admin()
returns trigger as $$
begin
  if tg_op = 'UPDATE' and new.app_role is distinct from old.app_role then
    new.is_admin := (new.app_role = 'super_admin');
    insert into public.audit_logs (user_id, action, metadata)
    values (
      auth.uid(),
      'role_changed',
      jsonb_build_object('target_user_id', new.id, 'old_role', old.app_role, 'new_role', new.app_role)
    );
  elsif tg_op = 'UPDATE' and new.is_admin is distinct from old.is_admin then
    new.app_role := case when new.is_admin then 'super_admin' else 'executive_producer' end;
    insert into public.audit_logs (user_id, action, metadata)
    values (
      auth.uid(),
      'role_changed',
      jsonb_build_object('target_user_id', new.id, 'old_role', old.app_role, 'new_role', new.app_role)
    );
  end if;
  return new;
end;
$$ language plpgsql;
