-- CALENDARIO DEL PROYECTO — núcleo único de planificación.
-- Alimenta la línea de tiempo del Pulso y (a futuro) los avisos.
-- Cada evento tiene una fecha, un tipo por etapa y sus campos propios en jsonb.
--
-- Permisos (modelo pedido por Nicolás): la VISTA la tiene cualquier miembro del
-- proyecto; la EDICIÓN la tienen el Productor Ejecutivo (jefe de "Ejecutivo") y
-- el super_admin SIEMPRE, y los jefes de Producción / Dirección / Postproducción
-- (Montaje) / Distribución SOLO si el Ejecutivo los habilita en
-- calendario_editores. Usa los helpers security-definer existentes
-- (is_super_admin, es_jefe_de_depto, caller_departamento) para no consultar
-- profiles inline (evita recursión de RLS).

-- 1) Tablas -----------------------------------------------------------------
create table if not exists public.eventos_proyecto (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.proyectos(id) on delete cascade,
  fecha date not null,
  tipo text not null,
  titulo text not null default '',
  datos jsonb not null default '{}'::jsonb,
  aviso_dias int not null default 7,
  creado_por text,
  creado_por_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists eventos_proyecto_project_fecha_idx
  on public.eventos_proyecto (project_id, fecha);

create table if not exists public.calendario_editores (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.proyectos(id) on delete cascade,
  departamento text not null,
  habilitado boolean not null default true,
  created_at timestamptz not null default now(),
  unique (project_id, departamento)
);

alter table public.eventos_proyecto enable row level security;
alter table public.calendario_editores enable row level security;

-- 2) Helper: ¿el usuario puede editar el calendario de ESTE proyecto? --------
create or replace function public.puede_editar_calendario(p_project uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return public.is_super_admin()
    or (
      public.es_jefe_de_depto(auth.uid())
      and (
        public.caller_departamento() = 'Ejecutivo'
        or exists (
          select 1 from public.calendario_editores ce
          where ce.project_id = p_project
            and ce.departamento = public.caller_departamento()
            and ce.habilitado
        )
      )
    );
end;
$$;
grant execute on function public.puede_editar_calendario(uuid) to authenticated;

-- 3) eventos_proyecto RLS ----------------------------------------------------
drop policy if exists "eventos_select" on public.eventos_proyecto;
create policy "eventos_select" on public.eventos_proyecto
  for select to authenticated
  using (
    public.is_super_admin()
    or exists (
      select 1 from public.project_members pm
      where pm.project_id = eventos_proyecto.project_id and pm.user_id = auth.uid()
    )
  );

drop policy if exists "eventos_write" on public.eventos_proyecto;
create policy "eventos_write" on public.eventos_proyecto
  for all to authenticated
  using (public.puede_editar_calendario(project_id))
  with check (public.puede_editar_calendario(project_id));

-- 4) calendario_editores RLS (solo el Ejecutivo/super_admin gestiona) --------
drop policy if exists "cal_edit_select" on public.calendario_editores;
create policy "cal_edit_select" on public.calendario_editores
  for select to authenticated
  using (
    public.is_super_admin()
    or exists (
      select 1 from public.project_members pm
      where pm.project_id = calendario_editores.project_id and pm.user_id = auth.uid()
    )
  );

drop policy if exists "cal_edit_write" on public.calendario_editores;
create policy "cal_edit_write" on public.calendario_editores
  for all to authenticated
  using (
    public.is_super_admin()
    or (public.es_jefe_de_depto(auth.uid()) and public.caller_departamento() = 'Ejecutivo')
  )
  with check (
    public.is_super_admin()
    or (public.es_jefe_de_depto(auth.uid()) and public.caller_departamento() = 'Ejecutivo')
  );

-- 5) super_admin read-only override (coherente con el resto de tablas) -------
drop policy if exists "eventos_super_admin_select" on public.eventos_proyecto;
create policy "eventos_super_admin_select" on public.eventos_proyecto
  for select using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.app_role = 'super_admin')
  );
