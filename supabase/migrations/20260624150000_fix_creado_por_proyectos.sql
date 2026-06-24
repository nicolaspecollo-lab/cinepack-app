-- Bug preexistente (no introducido en esta sesión): proyectos/nuevo/page.tsx
-- siempre insertó creado_por al crear un proyecto, pero la columna nunca
-- existió en la tabla. Aditivo, no afecta filas existentes.
alter table public.proyectos
  add column if not exists creado_por uuid references public.profiles(id);
