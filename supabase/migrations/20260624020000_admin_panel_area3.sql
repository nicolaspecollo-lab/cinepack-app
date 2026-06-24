-- Área 3 — panel de administrador
--
-- Crea lo que el código del admin ya referencia pero nunca se aplicó
-- (feature_flags, feedback_beta, columnas de beta en proyectos), más
-- audit_logs para la Sección 3 y el hook de login.

-- feature_flags: usado por /admin (KPI "modo beta") y /admin/flags.
create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  descripcion text,
  updated_at timestamptz not null default now()
);

alter table public.feature_flags enable row level security;

create policy "feature_flags_super_admin_all" on public.feature_flags
  for all
  using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.app_role = 'super_admin')
  )
  with check (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.app_role = 'super_admin')
  );

create policy "feature_flags_authenticated_select" on public.feature_flags
  for select
  using (auth.uid() is not null);

insert into public.feature_flags (key, enabled, descripcion)
values ('beta_mode', true, 'Controla si crear un proyecto nuevo pide pago o no.')
on conflict (key) do nothing;

-- feedback_beta: usado por /admin/feedback.
create table if not exists public.feedback_beta (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  mensaje text not null,
  pagina text,
  estado text not null default 'abierto' check (estado in ('abierto', 'resuelto')),
  created_at timestamptz not null default now()
);

alter table public.feedback_beta enable row level security;

create policy "feedback_beta_super_admin_all" on public.feedback_beta
  for all
  using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.app_role = 'super_admin')
  )
  with check (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.app_role = 'super_admin')
  );

create policy "feedback_beta_self_insert" on public.feedback_beta
  for insert
  with check (user_id = auth.uid());

create policy "feedback_beta_self_select" on public.feedback_beta
  for select
  using (user_id = auth.uid());

-- proyectos: columnas que ya usa /admin y /admin/proyectos.
alter table public.proyectos
  add column if not exists pago_estado text not null default 'beta_gratis';

alter table public.proyectos
  add constraint proyectos_pago_estado_check
  check (pago_estado in ('beta_gratis', 'pagado', 'pendiente_pago', 'pendiente_personalizado'));

alter table public.proyectos
  add column if not exists pack_tipo text;

alter table public.proyectos
  add column if not exists pack_config jsonb;

-- audit_logs: Sección 3 del panel admin.
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  project_id uuid references public.proyectos(id),
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_project_id_idx on public.audit_logs (project_id);

alter table public.audit_logs enable row level security;

create policy "audit_logs_super_admin_select" on public.audit_logs
  for select
  using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.app_role = 'super_admin')
  );

create policy "audit_logs_authenticated_insert" on public.audit_logs
  for insert
  with check (auth.uid() is not null);

-- Hook de login: Supabase no expone un evento "on sign in" directo, pero el
-- Custom Access Token Hook se ejecuta cada vez que se emite un JWT (login Y
-- refresh de token). Es la aproximación más cercana sin un servicio externo;
-- va a generar más filas "login" de las estrictamente necesarias (un refresh
-- cada ~1h también cuenta). Se documenta la limitación, no se filtra porque
-- el payload del hook no distingue login de refresh de forma confiable.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
as $$
declare
  claims jsonb;
begin
  insert into public.audit_logs (user_id, action, metadata)
  values (
    (event->>'user_id')::uuid,
    'login',
    jsonb_build_object('via', 'custom_access_token_hook')
  );

  claims := event->'claims';
  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
