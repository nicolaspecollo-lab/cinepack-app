import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  return profile?.is_admin ? user : null;
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  const { user_id, project_id } = await req.json();
  if (!user_id || !project_id) {
    return NextResponse.json({ error: "Falta user_id o project_id." }, { status: 400 });
  }

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 501 });
  }

  // Un usuario solo puede tener un proyecto beta activo: revoca cualquier otro antes de habilitar el nuevo.
  await adminClient.from("beta_access").update({ status: "revoked" }).eq("user_id", user_id).eq("status", "active");

  const { error } = await adminClient
    .from("beta_access")
    .upsert(
      { user_id, project_id, status: "active", enabled_by: admin.id, enabled_at: new Date().toISOString() },
      { onConflict: "user_id,project_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  const { user_id, project_id } = await req.json();
  if (!user_id || !project_id) {
    return NextResponse.json({ error: "Falta user_id o project_id." }, { status: 400 });
  }

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 501 });
  }

  const { error } = await adminClient
    .from("beta_access")
    .update({ status: "revoked" })
    .eq("user_id", user_id)
    .eq("project_id", project_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
