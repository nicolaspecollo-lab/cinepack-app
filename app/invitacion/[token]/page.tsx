"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "../../useTheme";
import ThemeToggle from "../../components/ThemeToggle";
import "../../cp-theme.css";

type Invitacion = {
  email: string;
  full_name: string;
  departamento: string;
  cargo: string | null;
  proyecto_nombre: string;
  used: boolean;
};

export default function InvitacionPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;
  const { theme, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [invitacion, setInvitacion] = useState<Invitacion | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<"session" | "confirm" | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_invitation", { p_token: token });

      const inv = Array.isArray(data) ? data[0] : data;

      if (error || !inv) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setInvitacion(inv as Invitacion);
      setFullName((inv as Invitacion).full_name ?? "");
      setLoading(false);
    })();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!invitacion) return;

    setSubmitting(true);
    setMsg(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: invitacion.email,
      password,
      options: { data: { full_name: fullName, departamento: invitacion.departamento } },
    });

    if (error) {
      setSubmitting(false);
      setMsg({ type: "err", text: error.message });
      return;
    }

    if (data.session) {
      const { error: errAccept } = await supabase.rpc("accept_invitation", { p_token: token });
      setSubmitting(false);

      if (errAccept) {
        setMsg({ type: "err", text: errAccept.message });
        return;
      }

      setDone("session");
    } else {
      localStorage.setItem("cinepack-pending-invite-token", token);
      setSubmitting(false);
      setDone("confirm");
    }
  }

  if (loading) {
    return (
      <div className={`cp-dash ${theme === "light" ? "cp-light" : ""}`}>
        <div className="cp-auth-wrap">
          <div className="hexbg"></div>
          <div className="cp-theme-toggle-floating">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
          <div className="soon-box" style={{ position: "relative", zIndex: 1 }}>
            <span className="hex"></span>
            <h4>Cargando invitación…</h4>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !invitacion) {
    return (
      <div className={`cp-dash ${theme === "light" ? "cp-light" : ""}`}>
        <div className="cp-auth-wrap">
          <div className="hexbg"></div>
          <div className="cp-theme-toggle-floating">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
          <div className="soon-box" style={{ position: "relative", zIndex: 1 }}>
            <span className="hex"></span>
            <h4>Invitación no encontrada</h4>
            <p>Este link de invitación no es válido. Pedile a quien te invitó que te envíe uno nuevo.</p>
          </div>
        </div>
      </div>
    );
  }

  if (invitacion.used) {
    return (
      <div className={`cp-dash ${theme === "light" ? "cp-light" : ""}`}>
        <div className="cp-auth-wrap">
          <div className="hexbg"></div>
          <div className="cp-theme-toggle-floating">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
          <div className="soon-box" style={{ position: "relative", zIndex: 1 }}>
            <span className="hex"></span>
            <h4>Invitación ya utilizada</h4>
            <p>Esta invitación ya fue usada para crear una cuenta. Si es la tuya, podés iniciar sesión.</p>
            <Link href="/login" className="abtn" style={{ textDecoration: "none" }}>Ir a iniciar sesión</Link>
          </div>
        </div>
      </div>
    );
  }

  if (done === "session") {
    return (
      <div className={`cp-dash ${theme === "light" ? "cp-light" : ""}`}>
        <div className="cp-auth-wrap">
          <div className="hexbg"></div>
          <div className="cp-theme-toggle-floating">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
          <div className="soon-box" style={{ position: "relative", zIndex: 1 }}>
            <span className="hex"></span>
            <h4>Cuenta creada</h4>
            <p>Ya formás parte de “{invitacion.proyecto_nombre}”. Vamos a tu proyecto.</p>
            <button
              type="button"
              className="abtn"
              onClick={() => {
                router.push("/proyectos");
                router.refresh();
              }}
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (done === "confirm") {
    return (
      <div className={`cp-dash ${theme === "light" ? "cp-light" : ""}`}>
        <div className="cp-auth-wrap">
          <div className="hexbg"></div>
          <div className="cp-theme-toggle-floating">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
          <div className="soon-box" style={{ position: "relative", zIndex: 1 }}>
            <span className="hex"></span>
            <h4>Confirmá tu email</h4>
            <p>
              Te enviamos un email para confirmar tu cuenta. Después de confirmarla, iniciá sesión
              y vas a quedar asignado/a a “{invitacion.proyecto_nombre}” automáticamente.
            </p>
            <Link href="/login" className="abtn" style={{ textDecoration: "none" }}>Ir a iniciar sesión</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cp-dash">
      <div className="cp-auth-wrap">
        <div className="hexbg"></div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
          <div className="cp-auth-logo">
            <img src="/logo-cinepack.png" alt="CINE PACK" />
          </div>

          <div className="authcard">
            <div className="atabs">
              <span className="atab register active">Invitación</span>
            </div>

            <form onSubmit={handleSubmit} className="apanel register">
              <h3>Te invitaron a “{invitacion.proyecto_nombre}”</h3>
              <p className="asub">
                {invitacion.departamento}{invitacion.cargo ? ` · ${invitacion.cargo}` : ""}
              </p>

              <label className="afield">
                <span>Email</span>
                <input type="email" value={invitacion.email} readOnly disabled />
              </label>

              <label className="afield">
                <span>Nombre completo</span>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
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

              <button type="submit" disabled={submitting} className="abtn">
                {submitting ? "Creando cuenta..." : "Crear cuenta y entrar"}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"></path></svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
