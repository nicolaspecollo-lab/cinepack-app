import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./logout-button";

export default async function HoyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, departamento")
    .eq("id", user.id)
    .single();

  return (
    <main className="flex flex-1 flex-col bg-black px-4 py-16">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-white">Hoy</h1>
          <LogoutButton />
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-6">
          <p className="text-zinc-300">
            Sesión iniciada como <span className="text-white">{user.email}</span>
          </p>
          {profile && (
            <p className="mt-1 text-zinc-300">
              {profile.full_name} · <span className="text-[#c8ff5e]">{profile.departamento}</span>
            </p>
          )}
          {!profile && (
            <p className="mt-1 text-sm text-zinc-500">
              Tu perfil todavía no está sincronizado (tabla `profiles`).
            </p>
          )}
        </div>

        <p className="mt-6 text-sm text-zinc-500">
          Esta es la primera pantalla del MVP. Próximamente: Plan de Rodaje, Registro de la Obra y Consultas.
        </p>
      </div>
    </main>
  );
}
