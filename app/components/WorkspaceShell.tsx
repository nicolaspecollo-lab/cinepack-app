"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DEPARTAMENTOS } from "../constants";
import { useTheme } from "../useTheme";
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
  const { theme, toggleTheme } = useTheme();
  const [lang, setLang] = useState<"ES" | "EN">("ES");
  const [open, setOpen] = useState(false);
  const [deptOpen, setDeptOpen] = useState(false);
  const [proyecto, setProyecto] = useState(proyectoProp ?? "Marea Oscura");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedLang = localStorage.getItem("cinepack-lang");
    if (savedLang === "EN") setLang("EN");
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
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function toggleLang() {
    const next = lang === "ES" ? "EN" : "ES";
    setLang(next);
    localStorage.setItem("cinepack-lang", next);
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
        <Link href="/proyectos" className="cp-logo"><img src="/logo-cinepack.png" alt="CINE PACK" /></Link>
        <span className="cp-proj">{proyecto} · {departamento}</span>
        <div className="cp-spacer"></div>
        <div id="cp-header-controls" className="cp-header-controls"></div>
        <div className="cp-menu" ref={menuRef}>
          <button className="cp-menu-btn" onClick={() => setOpen((v) => !v)}>
            <span className="hex"></span>
            MENÚ
          </button>
          {open && (
            <div className="cp-menu-drop">
              <div className="cp-menu-section">Cuenta</div>
              <div className="cp-menu-item" style={{ cursor: "default" }}>
                <span>{fullName}</span>
                <span className="muted">{departamento}</span>
              </div>
              <Link href="/perfil" className="cp-menu-item" onClick={() => setOpen(false)}>
                <span>Mi perfil</span>
                <span className="muted">Foto, datos, contraseña</span>
              </Link>
              <Link href="/proyectos" className="cp-menu-item" onClick={() => setOpen(false)}>
                <span>Cambiar de proyecto</span>
                <span className="muted">{proyecto}</span>
              </Link>

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
              <div className="cp-menu-section">Preferencias</div>
              <button className="cp-menu-item" onClick={() => { toggleTheme(); setOpen(false); }}>
                <span>Apariencia</span>
                <span className="muted">{theme === "dark" ? "Oscuro" : "Claro"}</span>
              </button>
              <button className="cp-menu-item" onClick={() => { toggleLang(); setOpen(false); }}>
                <span>Idioma</span>
                <span className="muted">{lang}</span>
              </button>

              <div className="cp-menu-div"></div>
              <a
                className="cp-menu-item"
                href="mailto:info@cinepack.es?subject=Soporte%20CINE%20PACK"
                onClick={() => setOpen(false)}
              >
                Contacto con soporte
              </a>
              <button className="cp-menu-item" onClick={handleLogout}>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </header>
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>{children}</div>
    </div>
  );
}
