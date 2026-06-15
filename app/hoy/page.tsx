import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WorkspaceShell from "../components/WorkspaceShell";
import HoyWorkspace from "./HoyWorkspace";

export default async function HoyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, departamento, is_admin, avatar_url, cargo")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return (
      <WorkspaceShell fullName={user.email ?? "Usuario"} departamento="—">
        <div className="view active">
          <div className="soon-box">
            <span className="hex"></span>
            <h4>Perfil sin sincronizar</h4>
            <p>
              Sesión iniciada como {user.email}, pero tu perfil todavía no está sincronizado
              (tabla `profiles`).
            </p>
          </div>
        </div>
      </WorkspaceShell>
    );
  }

  return (
    <HoyWorkspace
      fullName={profile.full_name}
      departamento={profile.departamento}
      isAdmin={!!profile.is_admin}
      avatarUrl={profile.avatar_url}
      cargo={profile.cargo}
    />
  );
}
