-- Bloque 6 — el feedback de usuarios nunca llegaba al admin porque el
-- formulario "/sugerencias" inserta en la tabla `sugerencias`, pero el
-- panel admin leía de `feedback_beta` (tabla creada en el Área 3 en la que
-- nadie escribe). Se conecta el admin a la tabla real y se le agrega la
-- columna que falta para poder marcar como resuelto, más una política para
-- que el super_admin vea y actualice todas las filas (antes solo existían
-- políticas de "ver/crear las propias").
alter table public.sugerencias
  add column if not exists resuelto boolean not null default false;

create policy "sugerencias_super_admin_select" on public.sugerencias
  for select
  using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.app_role = 'super_admin')
  );

create policy "sugerencias_super_admin_update" on public.sugerencias
  for update
  using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.app_role = 'super_admin')
  );
