-- Área 2 — roles globales (super_admin / support / executive_producer)
--
-- No se reemplaza profiles.is_admin: sigue siendo el flag que ya usan las
-- políticas RLS existentes (proyectos_admin_select_all, invitaciones_admin_all,
-- etc.) y las rutas server-side (requireAdmin()). Se agrega app_role como
-- nueva fuente de verdad y un trigger la mantiene sincronizada con is_admin
-- para no tener que tocar ninguna política existente.

alter table public.profiles
  add column if not exists app_role text not null default 'executive_producer';

alter table public.profiles
  add constraint profiles_app_role_check
  check (app_role in ('super_admin', 'support', 'executive_producer'));

-- Backfill: todo lo que hoy es is_admin=true pasa a super_admin.
update public.profiles set app_role = 'super_admin' where is_admin = true;

-- Mantiene is_admin sincronizado con app_role hacia adelante (en cualquier
-- dirección) para que las políticas RLS basadas en is_admin sigan vigentes.
create or replace function public.sync_profiles_app_role_is_admin()
returns trigger as $$
begin
  if tg_op = 'UPDATE' and new.app_role is distinct from old.app_role then
    new.is_admin := (new.app_role = 'super_admin');
  elsif tg_op = 'UPDATE' and new.is_admin is distinct from old.is_admin then
    new.app_role := case when new.is_admin then 'super_admin' else 'executive_producer' end;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_profiles_app_role_is_admin on public.profiles;
create trigger trg_sync_profiles_app_role_is_admin
  before update on public.profiles
  for each row
  execute function public.sync_profiles_app_role_is_admin();

-- beta_access: habilitación explícita de un Productor Ejecutivo para un
-- proyecto durante el beta. Un usuario solo puede tener un proyecto activo.
create table if not exists public.beta_access (
  user_id uuid not null references public.profiles(id),
  project_id uuid not null references public.proyectos(id),
  status text not null default 'active' check (status in ('active', 'revoked')),
  enabled_at timestamptz not null default now(),
  enabled_by uuid references public.profiles(id),
  primary key (user_id, project_id)
);

create unique index if not exists beta_access_one_active_per_user
  on public.beta_access (user_id)
  where status = 'active';

alter table public.beta_access enable row level security;

create policy "beta_access_super_admin_all" on public.beta_access
  for all
  using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.app_role = 'super_admin')
  )
  with check (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.app_role = 'super_admin')
  );

create policy "beta_access_self_select" on public.beta_access
  for select
  using (user_id = auth.uid());

-- support_access: qué proyectos puede supervisar un usuario de soporte, en
-- modo lectura. Por ahora no se conecta a las políticas de las demás tablas
-- (eso implicaría tocar la política SELECT de cada tabla de aislamiento del
-- Área 1); queda preparado para cuando el rol soporte entre en uso real.
create table if not exists public.support_access (
  user_id uuid not null references public.profiles(id),
  project_id uuid not null references public.proyectos(id),
  status text not null default 'active' check (status in ('active', 'revoked')),
  granted_at timestamptz not null default now(),
  granted_by uuid references public.profiles(id),
  primary key (user_id, project_id)
);

alter table public.support_access enable row level security;

create policy "support_access_super_admin_all" on public.support_access
  for all
  using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.app_role = 'super_admin')
  )
  with check (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.app_role = 'super_admin')
  );

create policy "support_access_self_select" on public.support_access
  for select
  using (user_id = auth.uid());
