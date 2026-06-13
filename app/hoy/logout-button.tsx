"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-300 hover:border-[#f37fb5] hover:text-[#f37fb5]"
    >
      Cerrar sesión
    </button>
  );
}
