"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "../../useTheme";
import ThemeToggle from "../../components/ThemeToggle";
import PasswordField from "../../components/PasswordField";
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
  const token = params?.token ?? "";
  const t = useTranslations("invitacion");
  const { theme, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [invitacion, setInvitacion] = useState<Invitacion | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [aceptaDatos, setAceptaDatos] = useState(false);
  const [aceptaNotificaciones, setAceptaNotificaciones] = useState(false);
  const [aceptaNewsletter, setAceptaNewsletter] = useState(false);
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

    if (password !== confirmPassword) {
      setMsg({ type: "err", text: t("errPasswordsMismatch") });
      return;
    }

    if (!aceptaDatos) {
      setMsg({ type: "err", text: t("errLegalRequired") });
      return;
    }

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
      const { error: errAccept } = await supabase.rpc("accept_invitation", {
        p_token: token,
        p_acepta_datos: aceptaDatos,
        p_acepta_notificaciones: aceptaNotificaciones,
        p_acepta_newsletter: aceptaNewsletter,
      });
      setSubmitting(false);

      if (errAccept) {
        setMsg({ type: "err", text: errAccept.message });
        return;
      }

      setDone("session");
    } else {
      localStorage.setItem("cinepack-pending-invite-token", token);
      localStorage.setItem(
        "cinepack-pending-invite-consent",
        JSON.stringify({ datos: aceptaDatos, notificaciones: aceptaNotificaciones, newsletter: aceptaNewsletter })
      );
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
            <h4>{t("loadingInvite")}</h4>
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
            <h4>{t("notFoundTitle")}</h4>
            <p>{t("notFoundDesc")}</p>
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
            <h4>{t("usedTitle")}</h4>
            <p>{t("usedDesc")}</p>
            <Link href="/login" className="abtn" style={{ textDecoration: "none" }}>{t("goToLogin")}</Link>
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
            <h4>{t("accountCreatedTitle")}</h4>
            <p>{t("accountCreatedDesc", { proyecto: invitacion.proyecto_nombre })}</p>
            <button
              type="button"
              className="abtn"
              onClick={() => {
                router.push("/proyectos");
                router.refresh();
              }}
            >
              {t("continueBtn")}
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
            <h4>{t("confirmEmailTitle")}</h4>
            <p>{t("confirmEmailDesc", { proyecto: invitacion.proyecto_nombre })}</p>
            <Link href="/login" className="abtn" style={{ textDecoration: "none" }}>{t("goToLogin")}</Link>
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
            <img src={theme === "light" ? "/logo-cp-light.png" : "/logo-cp-dark.png"} alt="CINE PACK" />
          </div>

          <div className="authcard">
            <div className="atabs">
              <span className="atab register active">{t("tab")}</span>
            </div>

            <form onSubmit={handleSubmit} className="apanel register">
              <h3>{t("invitedTo", { proyecto: invitacion.proyecto_nombre })}</h3>
              <p className="asub">
                {invitacion.departamento}{invitacion.cargo ? ` · ${invitacion.cargo}` : ""}
              </p>

              <label className="afield">
                <span>{t("email")}</span>
                <input type="email" value={invitacion.email} readOnly disabled />
              </label>

              <label className="afield">
                <span>{t("fullName")}</span>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </label>

              <PasswordField
                label={t("password")}
                value={password}
                onChange={setPassword}
                required
                minLength={6}
              />

              <PasswordField
                label={t("confirmPassword")}
                value={confirmPassword}
                onChange={setConfirmPassword}
                required
                minLength={6}
              />

              <div className="aconsent-group">
                <label className="aconsent">
                  <input
                    type="checkbox"
                    checked={aceptaDatos}
                    onChange={(e) => setAceptaDatos(e.target.checked)}
                  />
                  <span className="aconsent-required">
                    {t.rich("legalDatos", {
                      link: (chunks) => (
                        <a href="/legal/privacidad" target="_blank" rel="noopener noreferrer">{chunks}</a>
                      ),
                    })}
                  </span>
                </label>

                <label className="aconsent">
                  <input
                    type="checkbox"
                    checked={aceptaNotificaciones}
                    onChange={(e) => setAceptaNotificaciones(e.target.checked)}
                  />
                  <span>{t("legalNotificaciones")}</span>
                </label>

                <label className="aconsent">
                  <input
                    type="checkbox"
                    checked={aceptaNewsletter}
                    onChange={(e) => setAceptaNewsletter(e.target.checked)}
                  />
                  <span>{t("legalNewsletter")}</span>
                </label>
              </div>

              {msg && (
                <p className={`amsg ${msg.type === "err" ? "err" : "ok"}`}>{msg.text}</p>
              )}

              <button type="submit" disabled={submitting} className="abtn">
                {submitting ? t("creatingAccount") : t("createAndEnter")}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"></path></svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
