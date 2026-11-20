-- ============================================================================
-- "Hoja de cálculo y Documento en blanco" (herramienta transversal)
-- ============================================================================
-- Expediente: 2026-11-16_transversal_hoja-documento-blanco
-- Ver oficina/expedientes/2026-11-16_transversal_hoja-documento-blanco/arquitectura.md
-- (apartado 3, modelo de datos, autor: arquitecto de integración).
--
-- NOTA DE ALCANCE (corrección 21/11/2026): esta migración tenía un bug real
-- — `project_id` referenciaba `public.projects(id)`, una tabla que no existe
-- en este proyecto (la tabla real es `public.proyectos`). Nico lo encontró
-- al intentar aplicarla contra producción y la excluyó del Corte del 20/11
-- hasta corregirlo. Corregido acá; probada contra `cinepack-dev` antes de
-- pedir un Corte nuevo para hoja de cálculo / documento en blanco.
-- ============================================================================

create table if not exists public.docs_blanco (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.proyectos(id),
  tipo text not null check (tipo in ('hoja', 'documento')),
  nombre text not null,                  -- lo pone el usuario al crear
  contenido jsonb not null default '{}', -- snapshot Univer (hoja) / JSON ProseMirror TipTap (documento)
  owner_id uuid not null references auth.users(id),
  departamento text,                     -- opcional: agrupa en el listado del depto desde donde se creó
  visibilidad text not null default 'privado' check (visibilidad in ('privado', 'compartido')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists docs_blanco_project_owner_idx on public.docs_blanco (project_id, owner_id);

create table if not exists public.docs_blanco_accesos (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid not null references public.docs_blanco(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  rol text not null check (rol in ('editor', 'visionario')),
  created_at timestamptz not null default now(),
  unique (doc_id, user_id)
);

alter table public.docs_blanco enable row level security;
alter table public.docs_blanco_accesos enable row level security;

-- SELECT/UPDATE: el owner siempre; o cualquiera con fila de acceso cuando el
-- doc está en 'compartido'. 'editor' habilita update, 'visionario' solo select.
-- Mismo criterio que personal_tools (20260714000000): el contenido PRIVADO no
-- lo ve nadie más, ni siquiera super_admin.
drop policy if exists "docs_blanco_select" on public.docs_blanco;
create policy "docs_blanco_select" on public.docs_blanco
  for select
  using (
    owner_id = auth.uid()
    or (
      visibilidad = 'compartido'
      and exists (
        select 1 from public.docs_blanco_accesos a
        where a.doc_id = docs_blanco.id and a.user_id = auth.uid()
      )
    )
  );

drop policy if exists "docs_blanco_insert" on public.docs_blanco;
create policy "docs_blanco_insert" on public.docs_blanco
  for insert
  with check (owner_id = auth.uid());

drop policy if exists "docs_blanco_update" on public.docs_blanco;
create policy "docs_blanco_update" on public.docs_blanco
  for update
  using (
    owner_id = auth.uid()
    or (
      visibilidad = 'compartido'
      and exists (
        select 1 from public.docs_blanco_accesos a
        where a.doc_id = docs_blanco.id and a.user_id = auth.uid() and a.rol = 'editor'
      )
    )
  );

drop policy if exists "docs_blanco_delete" on public.docs_blanco;
create policy "docs_blanco_delete" on public.docs_blanco
  for delete
  using (owner_id = auth.uid());

-- docs_blanco_accesos: solo el owner del doc (o quien administre el depto del
-- doc, reusando puede_admin_depto()/is_super_admin() ya existentes) puede dar
-- o quitar accesos de Editor/Visionario a otros usuarios.
drop policy if exists "docs_blanco_accesos_select" on public.docs_blanco_accesos;
create policy "docs_blanco_accesos_select" on public.docs_blanco_accesos
  for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.docs_blanco d
      where d.id = docs_blanco_accesos.doc_id and d.owner_id = auth.uid()
    )
  );

drop policy if exists "docs_blanco_accesos_write" on public.docs_blanco_accesos;
create policy "docs_blanco_accesos_write" on public.docs_blanco_accesos
  for all
  using (
    exists (
      select 1 from public.docs_blanco d
      where d.id = docs_blanco_accesos.doc_id
        and (d.owner_id = auth.uid() or public.puede_admin_depto(d.departamento))
    )
  )
  with check (
    exists (
      select 1 from public.docs_blanco d
      where d.id = docs_blanco_accesos.doc_id
        and (d.owner_id = auth.uid() or public.puede_admin_depto(d.departamento))
    )
  );

-- trigger simple de updated_at, mismo patrón ya usado en el resto del esquema
-- (ver otras migraciones con updated_at) — si no existe la función genérica,
-- se deja la columna con default now() y se actualiza desde el cliente.
