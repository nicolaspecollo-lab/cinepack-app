import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente con la service_role key — SOLO para uso en servidor (Server
// Components, Route Handlers, Server Actions). Nunca importar este archivo
// desde un componente "use client". Se salta RLS por completo: toda
// verificación de permisos (is_admin) debe hacerse ANTES de llamar a esto.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY en las variables de entorno. " +
        "Conseguila en Supabase → Project Settings → API → service_role secret."
    );
  }
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
