"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setMsg({ type: "err", text: error.message });
      return;
    }

    router.push("/hoy");
    router.refresh();
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-black px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-950 p-8">
        <h1 className="text-2xl font-semibold text-white">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-zinc-400">Accedé a tu cuenta de CINE PACK.</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm text-zinc-300">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-white outline-none focus:border-[#c8ff5e]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-300">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-white outline-none focus:border-[#c8ff5e]"
            />
          </div>

          {msg && (
            <p className={msg.type === "err" ? "text-sm text-[#f37fb5]" : "text-sm text-[#c8ff5e]"}>
              {msg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-lg bg-[#c8ff5e] px-4 py-2 font-medium text-black transition-opacity disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-4 text-sm text-zinc-400">
          ¿No tenés cuenta?{" "}
          <Link href="/register" className="text-[#c8ff5e] hover:underline">
            Registrate
          </Link>
        </p>
      </div>
    </main>
  );
}
