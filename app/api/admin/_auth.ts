import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type AdminOk = { ok: true; userId: string; nombre: string | null };
export type AdminFail = { ok: false; response: NextResponse };

// Verifica que quien llama sea super_admin real (misma fuente de verdad que
// el resto del panel: profiles.is_admin || app_role === 'super_admin').
// Se hace SIEMPRE antes de usar el service-role client (createAdminClient),
// que se salta RLS por completo.
export async function requireSuperAdmin(): Promise<AdminOk | AdminFail> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { ok: false, response: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, app_role, full_name")
    .eq("id", auth.user.id)
    .single();
  const esAdmin = !!profile?.is_admin || profile?.app_role === "super_admin";
  if (!esAdmin) {
    return { ok: false, response: NextResponse.json({ error: "No autorizado" }, { status: 403 }) };
  }
  return { ok: true, userId: auth.user.id, nombre: profile?.full_name ?? null };
}
