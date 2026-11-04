-- La fila de configuración del modo del Moodboard de Fotografía
-- (foto-lookbook-config) debe ser única por proyecto: "comprobar si
-- existe, si no insertarla" sin esta constraint permite crear dos filas
-- si dos llamadas a cambiarModo() coinciden (mismo patrón ya visto y
-- arreglado antes con personal_tools_tareas_unique y
-- herramienta_filas_plan_sonido_estado_unique).
create unique index if not exists herramienta_filas_moodboard_foto_modo_unique
  on public.herramienta_filas (project_id)
  where herramienta_id = 'foto-lookbook-config';
