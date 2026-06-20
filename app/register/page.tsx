"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DEPARTAMENTOS } from "../constants";
import { useTheme } from "../useTheme";
import ThemeToggle from "../components/ThemeToggle";
import "../cp-theme.css";

export default function RegisterPage() {
  const { theme, toggleTheme } = useTheme();
  const [fullName, setFullName] = useState("");
  const [departamento, setDepartamento] = useState("");
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
    <div className={`cp-dash ${theme === "light" ? "cp-light" : ""}`}>
      <div className="cp-auth-wrap">
        <div className="hexbg"></div>
        <div className="cp-theme-toggle-floating">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
          <div className="cp-auth-logo">
            <img src={theme === "light" ? "/logo-cp-light.png" : "/logo-cp-dark.png"} alt="CINE PACK" />
          </div>

          <div className="authcard">
            <div className="atabs">
              <Link href="/login" className="atab">Iniciar sesión</Link>
              <span className="atab register active">Registrarse</span>
            </div>

            <form onSubmit={handleSubmit} className="apanel register">
              <h3>Crea tu cuenta</h3>
              <p className="asub">Te damos acceso según tu departamento y rol.</p>

              <label className="afield">
                <span>Nombre completo</span>
                <input
                  type="text"
                  placeholder="Nombre y apellidos"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </label>
              <label className="afield">
                <span>Email</span>
                <input
                  type="email"
                  placeholder="tu@productora.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="afield">
                <span>Departamento</span>
                <select
                  required
                  value={departamento}
                  onChange={(e) => setDepartamento(e.target.value)}
                >
                  <option value="" disabled>Selecciona tu departamento</option>
                  {DEPARTAMENTOS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </label>
              <label className="afield">
                <span>Contraseña</span>
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>

              {msg && (
                <p className={`amsg ${msg.type === "err" ? "err" : "ok"}`}>{msg.text}</p>
              )}

              <button type="submit" disabled={loading} className="abtn">
                {loading ? "Creando cuenta..." : "Crear cuenta"}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"></path></svg>
              </button>

              <p className="aswitch">
                ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
