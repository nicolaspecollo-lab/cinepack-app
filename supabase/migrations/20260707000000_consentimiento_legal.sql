-- Consentimiento legal en el alta de usuario (RGPD): tratamiento de datos
-- (obligatorio), alertas por email del proyecto y newsletter (ambos
-- opcionales, sin tildar por defecto). Se registra también la fecha de
-- aceptación del consentimiento obligatorio como evidencia.

alter table public.profiles
  add column if not exists acepta_tratamiento_datos boolean not null default false,
  add column if not exists acepta_tratamiento_datos_at timestamptz,
  add column if not exists acepta_notificaciones_email boolean not null default false,
  add column if not exists acepta_newsletter boolean not null default false;

create or replace function public.accept_invitation(
  p_token uuid,
  p_acepta_datos boolean default false,
  p_acepta_notificaciones boolean default false,
  p_acepta_newsletter boolean default false
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  inv public.invitaciones;
  user_email text;
begin
  if not p_acepta_datos then
    raise exception 'Es obligatorio aceptar el tratamiento de datos para crear la cuenta';
  end if;

  select * into inv from public.invitaciones where token = p_token and used = false;
  if inv.id is null then
    raise exception 'Invitación inválida o ya utilizada';
  end if;

  select email into user_email from auth.users where id = auth.uid();
  if user_email is distinct from inv.email then
    raise exception 'El email de la cuenta no coincide con la invitación';
  end if;

  update public.profiles
    set full_name = inv.full_name,
        departamento = inv.departamento,
        cargo = inv.cargo,
        acepta_tratamiento_datos = true,
        acepta_tratamiento_datos_at = now(),
        acepta_notificaciones_email = p_acepta_notificaciones,
        acepta_newsletter = p_acepta_newsletter
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

grant execute on function public.accept_invitation(uuid, boolean, boolean, boolean) to authenticated;
