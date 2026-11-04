-- La fila de estado del Plan de sonido directo (son-plan-directo-estado) debe
-- ser única por proyecto: "comprobar si existe, si no insertarla" sin esta
-- constraint permite crear dos filas si dos llamadas a publicar() coinciden
-- (mismo patrón ya visto y arreglado antes con personal_tools_tareas_unique).
create unique index if not exists herramienta_filas_plan_sonido_estado_unique
  on public.herramienta_filas (project_id)
  where herramienta_id = 'son-plan-directo-estado';
