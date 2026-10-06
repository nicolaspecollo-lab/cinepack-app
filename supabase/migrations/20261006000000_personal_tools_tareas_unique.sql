-- Evita duplicados del tablero "Tareas" (kanban personal auto-creado por
-- asegurarTareasPersonales): condición de carrera check-then-insert que se
-- manifiesta siempre en next dev (React Strict Mode duplica el efecto que lo
-- dispara) y ocasionalmente en producción (doble clic, red lenta). Un índice
-- único parcial es la defensa real; el código además maneja el conflicto.
create unique index if not exists personal_tools_tareas_unique
  on public.personal_tools (project_id, owner_id, departamento)
  where titulo = 'Tareas';
