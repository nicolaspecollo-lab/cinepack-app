"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAdminGuard } from "../useAdminGuard";
import AdminShell from "../AdminShell";

type Flag = { key: string; enabled: boolean; descripcion: string | null };

export default function AdminFlags() {
  const { checking, isAdmin } = useAdminGuard();
  const [flags, setFlags] = useState<Flag[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const { data, error } = await supabase.from("feature_flags").select("*").order("key");
    if (error) throw error;
    setFlags(data ?? []);
  }

  useEffect(() => {
    if (!isAdmin) return;
    load().catch((e) => setErr(e.message));
  }, [isAdmin]);

  async function toggle(key: string, current: boolean) {
    const supabase = createClient();
    const { error } = await supabase
      .from("feature_flags")
      .update({ enabled: !current, updated_at: new Date().toISOString() })
      .eq("key", key);
    if (error) {
      setErr(error.message);
      return;
    }
    setFlags((prev) => prev && prev.map((f) => (f.key === key ? { ...f, enabled: !current } : f)));
  }

  if (checking) return null;

  return (
    <AdminShell>
      {err && <div className="cp-admin-err">{err}</div>}
      <div className="cp-admin-section">
        <h3>Feature flags</h3>
        <p style={{ color: "var(--muted)", fontSize: "12.5px", marginBottom: "16px" }}>
          Activar/desactivar funciones sin tocar código ni redesplegar. <code>beta_mode</code> controla si crear un
          proyecto nuevo pide pago o no.
        </p>
        {flags === null && !err && <div className="cp-admin-empty">Cargando…</div>}
        {flags?.map((f) => (
          <div key={f.key} className="cp-admin-flagrow">
            <div>
              <div className="key">{f.key}</div>
              {f.descripcion && <div className="desc">{f.descripcion}</div>}
            </div>
            <button
              type="button"
              className={`cp-admin-toggle ${f.enabled ? "on" : ""}`}
              onClick={() => toggle(f.key, f.enabled)}
              aria-label={`${f.enabled ? "Desactivar" : "Activar"} ${f.key}`}
            >
              <span className="knob"></span>
            </button>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
