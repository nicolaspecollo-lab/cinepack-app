-- personal_tools: herramientas personales creadas desde Espacio de Trabajo
-- Aparecen exclusivamente en la pestaña "Exclusivas" del usuario creador.

create table if not exists public.personal_tools (
  id          uuid primary key default gen_random_uuid(),
  project_id  text not null,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  owner_name  text not null,
  departamento text not null,
  titulo      text not null,
  tipo        text not null check (tipo in ('tabla', 'nota')),
  created_at  timestamptz default now()
);

alter table public.personal_tools enable row level security;

-- Solo el propietario puede ver y modificar sus herramientas personales
create policy "personal_tools_owner"
  on public.personal_tools
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
