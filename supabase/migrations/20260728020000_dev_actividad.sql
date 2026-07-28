-- Historial de desarrollo interno: registro de qué herramienta se tocó,
-- cuándo y en qué estado quedó. No es por proyecto: es meta-info del
-- catálogo de producto, visible solo para admins en /admin/desarrollo.
create table if not exists public.dev_actividad (
  id uuid primary key default gen_random_uuid(),
  fecha timestamptz not null default now(),
  departamento text not null,
  herramienta_id text not null,
  herramienta_nombre text not null,
  estado text not null check (estado in ('sin_revisar', 'confirmado', 'desplegado', 'rechazado', 'eliminado')),
  nota text,
  commit_sha text,
  autor text not null default 'Claude Code'
);

create index if not exists dev_actividad_herramienta_id_idx on public.dev_actividad (herramienta_id, fecha desc);
create index if not exists dev_actividad_fecha_idx on public.dev_actividad (fecha desc);

alter table public.dev_actividad enable row level security;

create policy "dev_actividad_select_admin" on public.dev_actividad
  for select using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin)
  );

create policy "dev_actividad_insert_admin" on public.dev_actividad
  for insert with check (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin)
  );
