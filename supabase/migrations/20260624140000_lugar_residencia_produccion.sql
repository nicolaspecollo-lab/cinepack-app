-- Bloque 10 (Card B) — en vez de geolocalizar por IP (el login es 100%
-- client-side, no hay ningún punto del servidor que vea esa request), se
-- pide el lugar de residencia y el lugar de producción directamente en el
-- perfil. Es más simple, más confiable, y más útil para el negocio.
alter table public.profiles
  add column if not exists lugar_residencia text;

alter table public.profiles
  add column if not exists lugar_produccion text;
