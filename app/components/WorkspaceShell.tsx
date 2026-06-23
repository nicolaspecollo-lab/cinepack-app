"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DEPARTAMENTOS } from "../constants";
import { useTheme } from "../useTheme";
import { setLocale } from "@/i18n/actions";
import { ACTIVE_LOCALES, LOCALE_NAMES, type Locale } from "@/i18n/config";
import "../cp-theme.css";

export default function WorkspaceShell({
  fullName,
  departamento,
  proyecto: proyectoProp,
  avatarUrl,
  isAdmin,
  homeDept,
  onDeptChange,
  children,
}: {
  fullName: string;
  departamento: string;
  proyecto?: string;
  avatarUrl?: string | null;
  isAdmin?: boolean;
  homeDept?: string;
  onDeptChange?: (dept: string) => void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const t = useTranslations("shell");
  const locale = useLocale() as Locale;
  const { theme, toggleTheme } = useTheme();
  const [, startLangTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [deptOpen, setDeptOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [proyecto, setProyecto] = useState(proyectoProp ?? "Marea Oscura");
  const [menuTop, setMenuTop] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!proyectoProp) {
      const savedProyecto = localStorage.getItem("cinepack-proyecto");
      if (savedProyecto) setProyecto(savedProyecto);
    }
  }, [proyectoProp]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setDeptOpen(false);
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  // Pista visual (degradado) de scroll horizontal en .cp-wtabs-nav — sin esto, en
  // móvil las pestañas se cortan de golpe en el borde sin indicar que hay más.
  useEffect(() => {
    function update(el: Element) {
      const canLeft = el.scrollLeft > 2;
      const canRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
      el.classList.toggle("can-left", canLeft);
      el.classList.toggle("can-right", canRight);
    }
    function scan() {
      document.querySelectorAll(".cp-wtabs-nav").forEach((el) => {
        update(el);
        if (!(el as HTMLElement).dataset.scrollFadeBound) {
          (el as HTMLElement).dataset.scrollFadeBound = "1";
          el.addEventListener("scroll", () => update(el), { passive: true });
        }
      });
    }
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", scan);
    return () => {
      mo.disconnect();
      window.removeEventListener("resize", scan);
    };
  }, []);

  function chooseLang(next: Locale) {
    setLangOpen(false);
    setOpen(false);
    if (next === locale) return;
    startLangTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className={`cp-dash ${theme === "light" ? "cp-light" : ""}`} style={{ flex: 1 }}>
      <header className="cp-topbar">
        <Link href="/proyectos" className="cp-logo"><img src={theme === "light" ? "/logo-cp-light.png" : "/logo-cp-dark.png"} alt="CINE PACK" /></Link>
        <span className="cp-proj">{proyecto}</span>
        <div className="cp-topbar-break" aria-hidden="true"></div>
        <div className="cp-spacer"></div>
        <div className="cp-topbar-actions">
          <div id="cp-header-controls" className="cp-header-controls"></div>
          <div className="cp-topbar-secondary">
          <button
            className="cp-topbar-theme-btn"
            onClick={toggleTheme}
            title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
          >◑</button>
          <div className="cp-menu" ref={menuRef}>
            <button
              className="cp-menu-btn"
              onClick={() => {
                if (!open && menuRef.current) {
                  setMenuTop(menuRef.current.getBoundingClientRect().bottom + 8);
                }
                setOpen((v) => !v);
              }}
            >
              <span className="hex"></span>
              {t("menu")}
            </button>
            {open && (
              <div
                className="cp-menu-drop"
                style={menuTop != null ? ({ "--menu-top": `${menuTop}px` } as React.CSSProperties) : undefined}
              >
              <div className="cp-menu-section">{t("account")}</div>
              <div className="cp-menu-item" style={{ cursor: "default" }}>
                <span>{fullName}</span>
                <span className="muted">{departamento}</span>
              </div>
              <Link href="/perfil" className="cp-menu-item" onClick={() => setOpen(false)}>
                <span>{t("myProfile")}</span>
                <span className="muted">{t("profileSub")}</span>
              </Link>
              <Link href="/proyectos" className="cp-menu-item" onClick={() => setOpen(false)}>
                <span>{t("changeProject")}</span>
                <span className="muted">{proyecto}</span>
              </Link>
              <button
                className="cp-menu-item"
                onClick={() => { window.dispatchEvent(new Event("cp-inbox-open")); setOpen(false); }}
              >
                <span>{t("notifications")}</span>
                <span className="muted">{t("notificationsSub")}</span>
              </button>

              {isAdmin && (
                <>
                  <div className="cp-menu-div"></div>
                  <Link href="/admin" className="cp-menu-item" onClick={() => setOpen(false)}>
                    <span>Panel de administrador</span>
                    <span className="muted">Usuarios, proyectos, feedback</span>
                  </Link>
                </>
              )}

              {isAdmin && onDeptChange && (
                <>
                  <div className="cp-menu-div"></div>
                  <div className="cp-menu-section">Modo de prueba</div>
                  <button className="cp-menu-item" onClick={() => setDeptOpen((v) => !v)}>
                    <span>Cambiar de departamento</span>
                    <span className="muted">{deptOpen ? "Ocultar ▲" : "Elegir ▼"}</span>
                  </button>
                  {deptOpen && (
                    <div className="cp-menu-deptlist">
                      {DEPARTAMENTOS.map((d) => (
                        <button
                          key={d}
                          className={`cp-menu-item cp-menu-dept ${d === departamento ? "active" : ""}`}
                          onClick={() => {
                            onDeptChange(d);
                            setDeptOpen(false);
                            setOpen(false);
                          }}
                        >
                          <span>{d}</span>
                          {d === departamento && <span className="muted">Viendo ahora</span>}
                        </button>
                      ))}
                      {homeDept && departamento !== homeDept && (
                        <button
                          className="cp-menu-item cp-menu-dept"
                          onClick={() => {
                            onDeptChange(homeDept);
                            setDeptOpen(false);
                            setOpen(false);
                          }}
                          style={{ color: "var(--lime)" }}
                        >
                          ← Volver a mi departamento ({homeDept})
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="cp-menu-div"></div>
              <div className="cp-menu-section">{t("preferences")}</div>
              <button className="cp-menu-item" onClick={() => { toggleTheme(); setOpen(false); }}>
                <span>{t("appearance")}</span>
                <span className="muted">{theme === "dark" ? t("dark") : t("light")}</span>
              </button>
              <button className="cp-menu-item" onClick={() => setLangOpen((v) => !v)}>
                <span>{t("language")}</span>
                <span className="muted">{locale.toUpperCase()} {langOpen ? "▲" : "▼"}</span>
              </button>
              {langOpen && (
                <div className="cp-menu-deptlist">
                  {ACTIVE_LOCALES.map((l) => (
                    <button
                      key={l}
                      className={`cp-menu-item cp-menu-dept ${l === locale ? "active" : ""}`}
                      onClick={() => chooseLang(l)}
                    >
                      <span>{LOCALE_NAMES[l]}</span>
                      {l === locale && <span className="muted">✓</span>}
                    </button>
                  ))}
                </div>
              )}

              <div className="cp-menu-div"></div>
              <div className="cp-menu-section">Contacta con nosotros</div>
              <Link className="cp-menu-item" href="/sugerencias" onClick={() => setOpen(false)}>
                <span>Sugiérenos</span>
                <span className="muted">Cuéntanos tu experiencia</span>
              </Link>
              <a
                className="cp-menu-item"
                href="mailto:info@cinepack.es?subject=Soporte%20CINE%20PACK"
                onClick={() => setOpen(false)}
              >
                {t("support")}
              </a>
              <button className="cp-menu-item" onClick={handleLogout}>
                {t("logout")}
              </button>
              </div>
            )}
          </div>
          </div>
        </div>
      </header>
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>{children}</div>
    </div>
  );
}
