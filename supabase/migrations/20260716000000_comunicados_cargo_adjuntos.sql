-- ============================================================================
-- Rediseño de Comunicados (jul-2026): se agrega el cargo del autor y adjuntos
-- (PDF/imágenes). Se elimina el selector de "Tipo" (info/sugerencia/consulta)
-- del formulario y de la tarjeta — la columna `tipo` deja de ser obligatoria
-- pero no se borra, por si hay filas viejas que la usan.
-- ============================================================================

alter table public.comunicados
  add column if not exists autor_cargo text;

alter table public.comunicados
  alter column tipo drop not null;

create table if not exists public.comunicado_adjuntos (
  id             uuid primary key default gen_random_uuid(),
  comunicado_id  uuid not null references public.comunicados(id) on delete cascade,
  nombre         text not null,
  path           text not null,
  mime           text,
  size           bigint,
  created_at     timestamptz default now()
);

alter table public.comunicado_adjuntos enable row level security;

drop policy if exists "adjuntos_select_miembros" on public.comunicado_adjuntos;
create policy "adjuntos_select_miembros" on public.comunicado_adjuntos
  for select using (
    exists (
      select 1 from public.comunicados c
      join public.project_members pm on pm.project_id = c.project_id and pm.user_id = auth.uid()
      where c.id = comunicado_adjuntos.comunicado_id
    )
  );

drop policy if exists "adjuntos_insert_autor" on public.comunicado_adjuntos;
create policy "adjuntos_insert_autor" on public.comunicado_adjuntos
  for insert with check (
    exists (
      select 1 from public.comunicados c
      where c.id = comunicado_adjuntos.comunicado_id
        and c.autor_id = auth.uid()
    )
  );
