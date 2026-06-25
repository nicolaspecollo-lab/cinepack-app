"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { JERARQUIA_POR_DEPARTAMENTO } from "../constants";
import { useTheme } from "../useTheme";
import ThemeToggle from "../components/ThemeToggle";
import PaisProvinciaField from "../components/PaisProvinciaField";
import "../cp-theme.css";

// Primer acceso obligatorio: bloquea el resto de la app hasta completar los
// datos que se usan luego en las estadísticas del panel admin.
export default function CrearPerfilPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [departamento, setDepartamento] = useState("");

  const [fullName, setFullName] = useState("");
  const [cargo, setCargo] = useState("");
  const [paisResidencia, setPaisResidencia] = useState("");
  const [provinciaResidencia, setProvinciaResidencia] = useState("");
  const [paisProduccion, setPaisProduccion] = useState("");
  const [provinciaProduccion, setProvinciaProduccion] = useState("");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);
      setEmail(user.email ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, departamento, cargo, pais_residencia, provincia_residencia, pais_produccion, provincia_produccion")
        .eq("id", user.id)
        .single();

      if (profile) {
        const completo =
          !!profile.full_name && !!profile.cargo && !!profile.pais_residencia &&
          !!profile.provincia_residencia && !!profile.pais_produccion && !!profile.provincia_produccion;
        if (completo) {
          router.push("/hoy");
          return;
        }
        setFullName(profile.full_name ?? "");
        setDepartamento(profile.departamento ?? "");
        setCargo(profile.cargo ?? "");
        setPaisResidencia(profile.pais_residencia ?? "");
        setProvinciaResidencia(profile.provincia_residencia ?? "");
        setPaisProduccion(profile.pais_produccion ?? "");
        setProvinciaProduccion(profile.provincia_produccion ?? "");
      }

      setLoading(false);
    })();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;

    if (!fullName.trim() || !cargo || !paisResidencia || !provinciaResidencia || !paisProduccion || !provinciaProduccion) {
      setMsg({ type: "err", text: "Completá todos los campos para continuar." });
      return;
    }

    setSaving(true);
    setMsg(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        cargo,
        pais_residencia: paisResidencia,
        provincia_residencia: provinciaResidencia,
        pais_produccion: paisProduccion,
        provincia_produccion: provinciaProduccion,
        lugar_residencia: `${provinciaResidencia}, ${paisResidencia}`,
        lugar_produccion: `${provinciaProduccion}, ${paisProduccion}`,
      })
      .eq("id", userId);

    if (error) {
      setSaving(false);
      setMsg({ type: "err", text: error.message });
      return;
    }

    await supabase.from("user_roles").upsert({ user_id: userId, cargo }, { onConflict: "user_id,cargo" });

    setSaving(false);
    router.push("/hoy");
    router.refresh();
  }

  if (loading) {
    return (
      <div className={`cp-dash ${theme === "light" ? "cp-light" : ""}`}>
        <div className="soon-box" style={{ margin: "24px 30px" }}>
          <span className="hex"></span>
          <h4>Cargando…</h4>
        </div>
      </div>
    );
  }

  return (
    <div className={`cp-dash ${theme === "light" ? "cp-light" : ""}`} style={{ flex: 1 }}>
      <header className="cp-topbar">
        <span className="cp-logo"><img src={theme === "light" ? "/logo-cp-light.png" : "/logo-cp-dark.png"} alt="CINE PACK" /></span>
        <span className="cp-proj">Crear perfil</span>
        <div className="cp-spacer"></div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <div style={{ padding: "30px 30px 60px", width: "100%", maxWidth: "760px", margin: "0 auto" }}>
        <form onSubmit={handleSubmit} className="apanel">
          <h3>Completá tu perfil para empezar</h3>
          <p className="asub">
            Estos datos son obligatorios para usar CINE PACK: los usamos para identificarte ante tu equipo y
            para las estadísticas de uso del panel de administración. No podés continuar sin completarlos.
          </p>

          <div className="afields-grid">
            <label className="afield">
              <span>Email</span>
              <input type="email" value={email} disabled />
            </label>

            <label className="afield">
              <span>Nombre completo</span>
              <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </label>

            <label className="afield afield-span2">
              <span>Cargo</span>
              <select
                required
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                style={{ padding: "10px 12px", border: "1px solid var(--line)", background: "var(--bg)", color: "var(--text)", borderRadius: "4px", fontSize: "14px" }}
              >
                <option value="">Seleccioná tu cargo…</option>
                {(JERARQUIA_POR_DEPARTAMENTO[departamento] ?? []).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>

            <PaisProvinciaField
              label="Lugar de residencia"
              pais={paisResidencia}
              provincia={provinciaResidencia}
              onChangePais={setPaisResidencia}
              onChangeProvincia={setProvinciaResidencia}
              required
            />

            <PaisProvinciaField
              label="Lugar de producción"
              pais={paisProduccion}
              provincia={provinciaProduccion}
              onChangePais={setPaisProduccion}
              onChangeProvincia={setProvinciaProduccion}
              required
            />
          </div>

          {msg && <p className={`amsg ${msg.type === "err" ? "err" : "ok"}`}>{msg.text}</p>}

          <button type="submit" disabled={saving} className="abtn">
            {saving ? "Guardando…" : "Continuar a CINE PACK"}
          </button>
        </form>
      </div>
    </div>
  );
}
