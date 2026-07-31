-- Distribución en festivales: seguimiento de a qué festivales se inscribió
-- cada proyecto audiovisual, en qué estado está cada envío y qué resultado dio.
-- No es por proyecto de CINE PACK (los proyectos aquí son texto libre): es una
-- herramienta interna de distribución, visible solo para admins en
-- /admin/festivales (ruta no listada en el nav).
create table if not exists public.festival_submissions (
  id uuid primary key default gen_random_uuid(),
  proyecto text not null,
  festival text not null,
  pais text,
  -- A = Oscar-qualifying · B = no calificador con +10 años · C = no calificador joven/indie
  clase text not null default 'C' check (clase in ('A', 'B', 'C')),
  plataforma text,
  fee text,
  anios_activo text,
  deadline date,
  categoria text,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'registrado', 'aceptado', 'rechazado', 'seleccionado', 'cerrado', 'descartado')),
  fecha_registro date,
  resultado text,
  nota text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists festival_submissions_proyecto_idx on public.festival_submissions (proyecto, clase, festival);
create index if not exists festival_submissions_deadline_idx on public.festival_submissions (deadline) where deadline is not null;

alter table public.festival_submissions enable row level security;

create policy "festival_submissions_admin_all" on public.festival_submissions
  for all using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin)
  ) with check (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin)
  );
