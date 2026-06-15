"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Plano = {
  id: string;
  escena: string;
  plano: string;
  tipo: string | null;
  mov_camara: string | null;
  lente: string | null;
  descripcion: string;
  notas: string | null;
  autor_id: string;
};

export default function GuionTecnicoPanel() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [escena, setEscena] = useState("");
  const [plano, setPlano] = useState("");
  const [tipo, setTipo] = useState("");
  const [movCamara, setMovCamara] = useState("");
  const [lente, setLente] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [notas, setNotas] = useState("");

  const load = useCallback(async () => {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setLoading(false);
      return;
    }
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);

    const { data } = await supabase
      .from("planos")
      .select("*")
      .eq("project_id", projectId)
      .order("orden", { ascending: true })
      .order("created_at", { ascending: true });
    setPlanos(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setEscena("");
    setPlano("");
    setTipo("");
    setMovCamara("");
    setLente("");
    setDescripcion("");
    setNotas("");
    setMsg(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setMsg({ type: "err", text: "No se encontró el proyecto activo." });
      return;
    }

    setSending(true);
    setMsg(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSending(false);
      return;
    }

    const { error } = await supabase.from("planos").insert({
      project_id: projectId,
      escena,
      plano,
      tipo: tipo || null,
      mov_camara: movCamara || null,
      lente: lente || null,
      descripcion,
      notas: notas || null,
      orden: planos.length,
      autor_id: user.id,
    });

    setSending(false);

    if (error) {
      setMsg({ type: "err", text: error.message });
      return;
    }

    resetForm();
    setShowForm(false);
    await load();
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("planos").delete().eq("id", id);
    await load();
  }

  return (
    <div className="tools">
      <div className="tool">
        <div className="tool-head">
          <span className="hex"></span>
          <h3>Desglose técnico</h3>
          <span className="tag">previo al Parte de Script</span>
        </div>
        <p className="tool-sub">
          Planificación de cámara previa al rodaje. El Parte de Script registra después lo que realmente se rodó de
          cada plano.
        </p>
        <div className="chips" style={{ padding: "0 18px 14px" }}>
          <span className="chip">PG = Plano General</span>
          <span className="chip">PM = Plano Medio</span>
          <span className="chip">PP = Primer Plano</span>
          <span className="chip">DET = Detalle</span>
        </div>
        <div className="twrap">
          <table className="t">
            <tbody>
              <tr>
                <th>Esc.</th>
                <th>Plano</th>
                <th>Tipo</th>
                <th>Mov. cámara</th>
                <th>Lente</th>
                <th>Encuadre / Descripción</th>
                <th>Notas</th>
                <th></th>
              </tr>
              {loading && (
                <tr>
                  <td colSpan={8}>Cargando…</td>
                </tr>
              )}
              {!loading && planos.length === 0 && (
                <tr>
                  <td colSpan={8}>Todavía no hay planos cargados para este proyecto.</td>
                </tr>
              )}
              {planos.map((p) => (
                <tr key={p.id}>
                  <td className="mono"><b>{p.escena}</b></td>
                  <td className="mono">{p.plano}</td>
                  <td>{p.tipo || "—"}</td>
                  <td>{p.mov_camara || "—"}</td>
                  <td className="mono">{p.lente || "—"}</td>
                  <td>{p.descripcion}</td>
                  <td>{p.notas || "—"}</td>
                  <td>
                    {p.autor_id === userId && (
                      <span className="chip" style={{ cursor: "pointer" }} onClick={() => handleDelete(p.id)}>
                        Eliminar
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="cons-new" style={{ paddingTop: 0 }}>
        <button className="btn acc" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancelar" : "+ Añadir plano"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="cons-new" style={{ flexDirection: "column", maxWidth: "560px", paddingTop: 0 }}>
          <label className="afield">
            <span>Escena</span>
            <input type="text" required value={escena} onChange={(e) => setEscena(e.target.value)} placeholder="Ej. 1" />
          </label>
          <label className="afield">
            <span>Plano</span>
            <input type="text" required value={plano} onChange={(e) => setPlano(e.target.value)} placeholder="Ej. 1A" />
          </label>
          <label className="afield">
            <span>Tipo</span>
            <input type="text" value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="PG, PM, PP, DET…" />
          </label>
          <label className="afield">
            <span>Movimiento de cámara</span>
            <input type="text" value={movCamara} onChange={(e) => setMovCamara(e.target.value)} placeholder="Fijo, Steadicam, Travelling…" />
          </label>
          <label className="afield">
            <span>Lente</span>
            <input type="text" value={lente} onChange={(e) => setLente(e.target.value)} placeholder="35mm" />
          </label>
          <label className="afield">
            <span>Encuadre / Descripción</span>
            <textarea required value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2} placeholder="Qué se ve en el plano" />
          </label>
          <label className="afield">
            <span>Notas</span>
            <input type="text" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Notas de rodaje (opcional)" />
          </label>

          {msg && <p className={`amsg ${msg.type === "err" ? "err" : "ok"}`}>{msg.text}</p>}

          <button type="submit" className="abtn" disabled={sending}>
            {sending ? "Guardando…" : "Añadir plano"}
          </button>
        </form>
      )}
    </div>
  );
}
