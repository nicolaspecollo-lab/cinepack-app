-- Bloque 8 — esqueleto de "Gestión" (ingresos y pagos). Solo la gestión de
-- planes es real (flag en BD); el resumen financiero y las transacciones
-- son datos mockeados en el código hasta conectar una pasarela de pago.
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric not null default 0,
  features jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.subscription_plans enable row level security;

create policy "subscription_plans_super_admin_all" on public.subscription_plans
  for all
  using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.app_role = 'super_admin')
  )
  with check (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.app_role = 'super_admin')
  );
