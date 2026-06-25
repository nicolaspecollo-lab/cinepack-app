"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { JERARQUIA_POR_DEPARTAMENTO } from "../constants";
import { useTheme } from "../useTheme";
import ThemeToggle from "../components/ThemeToggle";
import PasswordField from "../components/PasswordField";
import PaisProvinciaField from "../components/PaisProvinciaField";
import "../cp-theme.css";

type Profile = {
  full_name: string;
  departamento: string;
  nombre_artistico: string | null;
  avatar_url: string | null;
  bio: string | null;
  telefono: string | null;
  cargo: string | null;
  pais_residencia: string | null;
  provincia_residencia: string | null;
  pais_produccion: string | null;
  provincia_produccion: string | null;
};

export default function PerfilPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [original, setOriginal] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [nombreArtistico, setNombreArtistico] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [bio, setBio] = useState("");
  const [telefono, setTelefono] = useState("");
  const [paisResidencia, setPaisResidencia] = useState("");
  const [provinciaResidencia, setProvinciaResidencia] = useState("");
  const [paisProduccion, setPaisProduccion] = useState("");
  const [provinciaProduccion, setProvinciaProduccion] = useState("");
  const [cargos, setCargos] = useState<string[]>([]);
  const [cargoNuevo, setCargoNuevo] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdMsg, setPwdMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [savingPwd, setSavingPwd] = useState(false);

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
        .select("full_name, departamento, nombre_artistico, avatar_url, bio, telefono, pais_residencia, provincia_residencia, pais_produccion, provincia_produccion")
        .eq("id", user.id)
        .single();

      if (profile) {
        setOriginal({ ...profile, cargo: null });
        setFullName(profile.full_name ?? "");
        setDepartamento(profile.departamento ?? "");
        setNombreArtistico(profile.nombre_artistico ?? "");
        setBio(profile.bio ?? "");
        setTelefono(profile.telefono ?? "");
        setAvatarUrl(profile.avatar_url ?? null);
        setPaisResidencia(profile.pais_residencia ?? "");
        setProvinciaResidencia(profile.provincia_residencia ?? "");
        setPaisProduccion(profile.pais_produccion ?? "");
        setProvinciaProduccion(profile.provincia_produccion ?? "");
      }

      // Cargar cargos del usuario de user_roles
      const { data: roles } = await supabase
        .from("user_roles")
        .select("cargo")
        .eq("user_id", user.id)
        .order("cargo");
      setCargos((roles ?? []).map((r) => r.cargo));

      setLoading(false);
    })();
  }, [router]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploadingAvatar(true);
    setMsg(null);

    const supabase = createClient();
    const path = `${userId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });

    if (uploadError) {
      setUploadingAvatar(false);
      setMsg({ type: "err", text: uploadError.message });
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    setUploadingAvatar(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !original) return;
    if (!paisResidencia || !provinciaResidencia || !paisProduccion || !provinciaProduccion) {
      setMsg({ type: "err", text: "Completá país y provincia de residencia y de producción." });
      return;
    }

    setSaving(true);
    setMsg(null);

    const supabase = createClient();

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        nombre_artistico: nombreArtistico || null,
        bio: bio || null,
        telefono: telefono || null,
        avatar_url: avatarUrl,
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

    const cambios: { campo: string; antes: string | null; ahora: string | null }[] = [
      { campo: "Nombre completo", antes: original.full_name, ahora: fullName },
      { campo: "Nombre artístico", antes: original.nombre_artistico, ahora: nombreArtistico || null },
      { campo: "Bio", antes: original.bio, ahora: bio || null },
      { campo: "Teléfono", antes: original.telefono, ahora: telefono || null },
      { campo: "Foto de perfil", antes: original.avatar_url, ahora: avatarUrl },
      { campo: "País de residencia", antes: original.pais_residencia, ahora: paisResidencia },
      { campo: "Provincia de residencia", antes: original.provincia_residencia, ahora: provinciaResidencia },
      { campo: "País de producción", antes: original.pais_produccion, ahora: paisProduccion },
      { campo: "Provincia de producción", antes: original.provincia_produccion, ahora: provinciaProduccion },
    ].filter((c) => (c.antes ?? "") !== (c.ahora ?? ""));

    if (cambios.length > 0) {
      await supabase.from("perfil_cambios").insert(
        cambios.map((c) => ({
          user_id: userId,
          user_nombre: fullName,
          campo: c.campo,
          valor_anterior: c.antes,
          valor_nuevo: c.ahora,
        }))
      );
    }

    setOriginal({
      full_name: fullName,
      departamento,
      nombre_artistico: nombreArtistico || null,
      avatar_url: avatarUrl,
      bio: bio || null,
      telefono: telefono || null,
      cargo: null,
      pais_residencia: paisResidencia,
      provincia_residencia: provinciaResidencia,
      pais_produccion: paisProduccion,
      provincia_produccion: provinciaProduccion,
    });

    setSaving(false);
    setMsg({ type: "ok", text: "Perfil actualizado. El Productor Ejecutivo fue notificado de los cambios." });
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    if (newPassword.length < 6) {
      setPwdMsg({ type: "err", text: "La contraseña debe tener al menos 6 caracteres." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: "err", text: "Las contraseñas no coinciden." });
      return;
    }

    setSavingPwd(true);
    setPwdMsg(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setSavingPwd(false);
      setPwdMsg({ type: "err", text: error.message });
      return;
    }

    await supabase.from("perfil_cambios").insert({
      user_id: userId,
      user_nombre: fullName,
      campo: "Contraseña",
      valor_anterior: "***",
      valor_nuevo: "***",
    });

    setNewPassword("");
    setConfirmPassword("");
    setSavingPwd(false);
    setPwdMsg({ type: "ok", text: "Contraseña actualizada. El Productor Ejecutivo fue notificado del cambio." });
  }

  if (loading) {
    return (
      <div className={`cp-dash ${theme === "light" ? "cp-light" : ""}`}>
        <div className="soon-box" style={{ margin: "24px 30px" }}>
          <span className="hex"></span>
          <h4>Cargando perfil…</h4>
        </div>
      </div>
    );
  }

  return (
    <div className={`cp-dash ${theme === "light" ? "cp-light" : ""}`} style={{ flex: 1 }}>
      <header className="cp-topbar">
        <Link href="/proyectos" className="cp-logo"><img src={theme === "light" ? "/logo-cp-light.png" : "/logo-cp-dark.png"} alt="CINE PACK" /></Link>
        <span className="cp-proj">Mi perfil</span>
        <div className="cp-spacer"></div>
        <Link href="/proyectos" className="cp-menu-btn" style={{ textDecoration: "none" }}>
          <span className="hex"></span> Volver a proyectos
        </Link>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <div style={{ padding: "30px 30px 60px", width: "100%" }}>
        <form onSubmit={handleSave} className="apanel">
          <h3>Datos de perfil</h3>
          <p className="asub">
            Esta información es compartida con tu equipo. Cualquier cambio se registra y es visible para el
            Productor Ejecutivo.
          </p>

          <div className="afields-grid">
            <div className="afield-span2" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  background: "var(--hl3)",
                  border: "1px solid var(--line)",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Foto de perfil" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span className="hex" style={{ width: "24px", height: "20px", background: "var(--lime)" }}></span>
                )}
              </div>
              <label className="afield" style={{ flex: 1 }}>
                <span>{uploadingAvatar ? "Subiendo…" : "Cambiar foto de perfil"}</span>
                <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={uploadingAvatar} />
              </label>
            </div>

            <label className="afield">
              <span>Email</span>
              <input type="email" value={email} disabled />
            </label>

            <label className="afield">
              <span>Departamento</span>
              <input type="text" value={departamento} disabled />
            </label>

            <label className="afield">
              <span>Nombre completo</span>
              <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </label>

            <label className="afield">
              <span>Nombre artístico (opcional)</span>
              <input
                type="text"
                placeholder="Como querés que te vean en créditos"
                value={nombreArtistico}
                onChange={(e) => setNombreArtistico(e.target.value)}
              />
            </label>

            <label className="afield">
              <span>Teléfono (opcional)</span>
              <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
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

            <div className="afield afield-span2">
              <span>Cargos</span>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                {cargos.length === 0 ? (
                  <span style={{ fontSize: "13px", color: "var(--muted)" }}>Sin cargos asignados</span>
                ) : (
                  cargos.map((c) => (
                    <div key={c} style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--hl3)", padding: "6px 10px", borderRadius: "4px", border: "1px solid var(--line)" }}>
                      <span>{c}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!userId) return;
                          const supabase = createClient();
                          await supabase.from("user_roles").delete().eq("user_id", userId).eq("cargo", c);
                          setCargos((prev) => prev.filter((x) => x !== c));
                        }}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "var(--pink)" }}
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div style={{ display: "flex", gap: "6px", alignItems: "flex-end" }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "600", letterSpacing: "0.06em", textTransform: "uppercase" }}>Agregar cargo</span>
                  <select value={cargoNuevo} onChange={(e) => setCargoNuevo(e.target.value)} style={{ padding: "10px 12px", border: "1px solid var(--line)", background: "var(--bg)", color: "var(--text)", borderRadius: "4px", fontSize: "14px" }}>
                    <option value="">Selecciona un cargo…</option>
                    {(JERARQUIA_POR_DEPARTAMENTO[departamento] ?? [])
                      .filter((c) => !cargos.includes(c))
                      .map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!userId || !cargoNuevo) return;
                    const supabase = createClient();
                    await supabase.from("user_roles").insert({ user_id: userId, cargo: cargoNuevo });
                    setCargos((prev) => [...prev, cargoNuevo].sort());
                    setCargoNuevo("");
                  }}
                  disabled={!cargoNuevo}
                  style={{ padding: "10px 12px", background: "var(--lime)", color: "var(--bg)", border: "none", borderRadius: "4px", cursor: cargoNuevo ? "pointer" : "default", opacity: cargoNuevo ? 1 : 0.5 }}
                >
                  +
                </button>
              </div>
            </div>

            <label className="afield afield-span2">
              <span>Bio (opcional)</span>
              <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
            </label>
          </div>

          {msg && <p className={`amsg ${msg.type === "err" ? "err" : "ok"}`}>{msg.text}</p>}

          <button type="submit" disabled={saving} className="abtn">
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>

        <div className="cp-menu-div" style={{ margin: "28px 0" }}></div>

        <form onSubmit={handlePasswordChange} className="apanel">
          <h3>Cambiar contraseña</h3>
          <div className="afields-grid">
            <PasswordField label="Nueva contraseña" value={newPassword} onChange={setNewPassword} minLength={6} />
            <PasswordField label="Confirmar contraseña" value={confirmPassword} onChange={setConfirmPassword} minLength={6} />
          </div>

          {pwdMsg && <p className={`amsg ${pwdMsg.type === "err" ? "err" : "ok"}`}>{pwdMsg.text}</p>}

          <button type="submit" disabled={savingPwd} className="abtn">
            {savingPwd ? "Guardando…" : "Actualizar contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}
