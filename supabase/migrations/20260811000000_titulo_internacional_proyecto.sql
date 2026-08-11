-- Título internacional del proyecto (opcional), se completa al crear el
-- proyecto o desde Control — igual que los créditos (ver
-- 20260624160000_creditos_proyecto.sql).
alter table public.proyectos
  add column if not exists titulo_internacional text;
