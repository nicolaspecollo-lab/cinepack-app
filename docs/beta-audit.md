# Auditoría previa al beta — CINE PACK

Fecha: 2026-06-24. Cubre el trabajo de las Áreas 1-4 (aislamiento RLS, roles
globales, panel admin, cierre de registro) y el estado del código en ese
momento.

## 1. Seguridad

### RLS por tabla

Las 25 tablas de `public` tienen RLS activo (`relrowsecurity = true`). Al
empezar este bloque de trabajo había dos políticas con `USING (true)` que
anulaban el aislamiento por `project_members`:

- `profiles.profiles_select_all_authenticated` — cualquier usuario veía
  todos los perfiles de la plataforma.
- `archivos_carpetas.archivos_carpetas_all` — acceso total de lectura y
  escritura a carpetas de cualquier proyecto.

Ambas se eliminaron en el Área 1. El resto de las políticas ya estaban
correctamente acotadas por `project_members` / `is_admin` / `owner_id`.

Desde el Área 3 existe además una política SELECT adicional por tabla para
`app_role = 'super_admin'` (acceso de lectura tipo "soporte"), sin tocar
ninguna política de escritura — la edición sigue exigiendo ser
`project_member`.

### Rutas API sin validación de sesión explícita

De las 9 rutas en `app/api/`, 8 llaman a `supabase.auth.getUser()` (o
`requireAdmin()`, que internamente lo hace) antes de operar. Una no lo hace:

- **`app/api/check-email/route.ts`** — no valida sesión. Hoy es seguro en la
  práctica porque la única tabla que consulta sin filtrar (`invitaciones`)
  tiene una política RLS que solo deja pasar a `is_admin`, así que un
  llamado sin sesión (o de un usuario no admin) recibe siempre `not_found`.
  Pero la ruta depende por completo de que esa política RLS no cambie — no
  hay una segunda barrera en el código. Recomendación: agregar un chequeo
  de sesión explícito ahí, igual que en el resto de las rutas, para no
  depender de una sola capa.

### Variables de entorno expuestas en el cliente

Solo `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` están
prefijadas `NEXT_PUBLIC_*` (por diseño — la anon key es pública y depende
de RLS, no de mantenerse secreta). `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` y
`SUPABASE_SERVICE_ROLE_KEY` solo se usan en `app/api/*` y
`lib/supabase/admin.ts`; ningún componente `"use client"` las referencia.

## 2. Aislamiento de datos

Se revisaron todas las consultas `select("*")` del código (`app/hoy/*`,
`app/admin/*`, `app/api/*`). Todas las que leen tablas con `project_id`
filtran explícitamente por `.eq("project_id", projectId)`, excepto:

- Inserts que encadenan `.select("*").single()` para devolver la fila recién
  creada (no son lecturas abiertas, son el resultado del propio insert).
- `feature_flags` y `feedback_beta`, que son tablas globales/personales sin
  `project_id` por diseño.

No se encontró ninguna consulta que devuelva datos de un proyecto al que el
usuario no pertenece — el aislamiento depende de RLS (Área 1), no de que
cada componente recuerde filtrar correctamente, lo cual es la garantía más
sólida que se puede tener.

## 3. Estabilidad para modificaciones futuras

Componentes y funciones server-side cuya rotura bloquea el flujo principal:

- `lib/supabase/middleware.ts` (`proxy.ts`) — guard de sesión de `/hoy` y de
  `app_role` de `/admin/*`. Si se rompe, se cae el acceso a toda la app o al
  panel admin.
- `accept_invitation` (función Postgres) — único punto de alta de miembro.
  Si se rompe, nadie puede aceptar una invitación.
- `sync_profiles_app_role_is_admin` (trigger) — mantiene `is_admin` y
  `app_role` sincronizados. Si se rompe, las políticas RLS que todavía usan
  `is_admin` (la mayoría) y las que usan `app_role` (las nuevas del Área 2-3)
  empiezan a divergir silenciosamente.
- `app/proyectos/nuevo/page.tsx` — alta de proyecto + invitaciones; es la
  única vía para crear un proyecto.
- `lib/supabase/admin.ts` (`createAdminClient`) — service role; lo usan
  todas las rutas `/api/admin/*`. Si falla, se cae impersonación,
  ban/unban, borrado de usuarios y el listado de usuarios del admin.

Para modificar cualquiera de estos sin romper lo existente: migraciones
aditivas (como las que ya se vienen usando en `supabase/migrations/`,
nunca `DROP`/`ALTER ... DROP COLUMN`), y mantener el patrón de triggers de
sincronización en vez de migrar de golpe una columna vieja a una nueva.

**Sobre feature flags:** ya existe `feature_flags` (creada en el Área 3,
con UI en `/admin/flags`) con una sola flag (`beta_mode`). Es exactamente el
mecanismo que se necesita para activar/desactivar funciones sin
redesplegar — se recomienda usarla para cualquier cambio riesgoso futuro en
vez de feature-gatear con variables de entorno (que requieren redeploy).

## 4. Herramientas mínimas de soporte

| Necesidad | Estado |
|---|---|
| Impersonación segura (ver como el usuario) | ✅ `/api/admin/impersonate` + botón "Suplantar" en `/admin/usuarios`. Nota: es impersonación completa (con permisos de escritura), no de solo lectura — distinto de "Ver como soporte" en `/admin/proyectos`, que sí es de solo lectura vía RLS. |
| Ver proyecto en modo lectura sin ser miembro | ✅ Botón "Ver como soporte" en `/admin/proyectos` (Área 3), garantizado por políticas RLS de solo SELECT. |
| Reset de contraseña manual | ❌ No implementado. Existe `generateLink` (usado para impersonar) pero no un botón que dispare `resetPasswordForEmail` ni `generateLink({ type: "recovery" })` desde `/admin/usuarios`. |
| Revocación de acceso de emergencia | ✅ Botón "Suspender" en `/admin/usuarios` (ban vía `ban_duration`). |
| Log de último acceso por usuario | ✅ Columna "Último acceso" en `/admin/usuarios` (`last_sign_in_at`). Además, desde el Área 3, `audit_logs` registra `login` vía el Custom Access Token Hook (con la salvedad de que también cuenta refresh de token, no solo logins reales). |

## Resumen de riesgos antes del lanzamiento (10 líneas)

1. Reset de contraseña manual por admin no está implementado — si un cliente beta se traba con su contraseña, hoy solo se puede impersonar su cuenta, no resetearla.
2. `check-email` no valida sesión explícitamente; funciona hoy solo porque RLS de `invitaciones` lo protege — agregar el chequeo de sesión es barato y quita esa dependencia única.
3. La impersonación actual es de escritura completa, no de solo lectura — para soporte real conviene distinguirla de "Ver como soporte".
4. `audit_logs.login` sobrecuenta (también registra refresh de token cada ~1h de sesión activa); si se usa para detectar accesos sospechosos, hay que filtrar ruido.
5. El rol `support` y `support_access` están creados pero sin usuarios reales asignados todavía — falta probarlo end-to-end con un usuario de soporte real.
6. `personal_tools` quedó con override de lectura para super_admin igual que las tablas de proyecto, pero es una tabla de configuración personal (`owner_id`), no de proyecto — vale la pena revisar si tiene sentido que el soporte la vea.
7. No hay tests automatizados sobre las políticas RLS — cualquier migración futura que toque una política puede reintroducir un agujero como el de `profiles_select_all_authenticated` sin que nada lo detecte.
8. El flujo de pago (Stripe) sigue sin conectar — los proyectos quedan en `pendiente_pago`/`pendiente_personalizado` indefinidamente sin notificación automática.
9. `feature_flags` solo tiene una flag (`beta_mode`); falta decidir qué otros cambios de riesgo del beta conviene meter detrás de un flag antes de lanzar.
10. El esqueleto de `/register` para el flujo post-pago está comentado pero no implementado — si el pago se conecta antes que esto, no hay ruta de alta automática lista.
