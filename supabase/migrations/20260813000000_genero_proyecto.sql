-- "tipo" (Cortometraje de ficción, Largometraje documental, etc.) no incluye
-- el género (Drama, Thriller...) — hacía falta un campo separado para que
-- los exportables (Presupuesto y los que sigan) puedan mostrar
-- "Cortometraje de ficción - Drama" como dato fijo del proyecto.
alter table public.proyectos
  add column if not exists genero text;
