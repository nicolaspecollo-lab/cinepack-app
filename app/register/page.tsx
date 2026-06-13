"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const DEPARTAMENTOS = [
  "Dirección",
  "Fotografía",
  "Arte",
  "Guion",
  "Producción",
  "Ejecutivo",
  "Casting",
  "Reparto",
  "Making of",
  "Sonido",
  "Postproducción",
  "RRHH",
  "Sostenibilidad",
];

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [departamento, setDepartamento] = useState(DEPARTAMENTOS[0]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, departamento } },
    });

    setLoading(false);

    if (error) {
      setMsg({ type: "err", text: error.message });
      return;
    }

    setMsg({
      type: "ok",
      text: "Cuenta creada. Revisá tu email para confirmar la cuenta antes de iniciar sesión.",
    });
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-black px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-950 p-8">
        <h1 className="text-2xl font-semibold text-white">Crear cuenta</h1>
        <p className="mt-1 text-sm text-zinc-400">Registrate en CINE PACK.</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm text-zinc-300">Nombre completo</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-white outline-none focus:border-[#f37fb5]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-300">Departamento</label>
            <select
              value={departamento}
              onChange={(e) => setDepartamento(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-white outline-none focus:border-[#f37fb5]"
            >
              {DEPARTAMENTOS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-300">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-white outline-none focus:border-[#f37fb5]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-300">Contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-white outline-none focus:border-[#f37fb5]"
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
            className="mt-2 rounded-lg bg-[#f37fb5] px-4 py-2 font-medium text-black transition-opacity disabled:opacity-50"
          >
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-4 text-sm text-zinc-400">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="text-[#f37fb5] hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
