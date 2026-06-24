import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const APP_ROLES = ["super_admin", "support", "executive_producer"] as const;

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  return profile?.is_admin ? user : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  const { id } = await params;
  const { app_role } = await req.json();
  if (!APP_ROLES.includes(app_role)) {
    return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
  }

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 501 });
  }

  const { error } = await adminClient.from("profiles").update({ app_role }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // El trigger de sync ya inserta un audit_log al cambiar app_role, pero corre
  // con auth.uid() nulo porque esta ruta usa la service role key (no hay JWT
  // de usuario en esa conexión). Se inserta un segundo registro con el actor
  // real para no perder esa información.
  await adminClient.from("audit_logs").insert({
    user_id: admin.id,
    action: "role_changed",
    metadata: { target_user_id: id, new_role: app_role, via: "admin_ui" },
  });

  return NextResponse.json({ ok: true });
}
