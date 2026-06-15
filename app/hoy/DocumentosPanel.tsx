"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DOCUMENTOS_POR_DEPARTAMENTO } from "../constants";

type DocRow = {
  id: string;
  categoria: string;
  nombre: string;
  file_path: string;
  file_name: string;
  estado: string;
  subido_por: string;
  created_at: string;
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ayer";
  return `hace ${days} días`;
}

export default function DocumentosPanel({
  departamento,
  fullName,
  readOnly,
}: {
  departamento: string;
  fullName: string;
  readOnly?: boolean;
}) {
  const grupos = DOCUMENTOS_POR_DEPARTAMENTO[departamento] ?? [];
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const { data } = await supabase
      .from("documentos")
      .select("*")
      .eq("project_id", projectId)
      .eq("departamento", departamento)
      .order("created_at", { ascending: false });
    setDocs(data ?? []);
    setLoading(false);
  }, [departamento]);

  useEffect(() => {
    load();
  }, [load]);

  async function subir(categoria: string, nombre: string, file: File) {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setMsg({ type: "err", text: "No se encontró el proyecto activo." });
      return;
    }
    setSubiendo(`${categoria}::${nombre}`);
    setMsg(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSubiendo(null);
      return;
    }

    const path = `${projectId}/${departamento}/${categoria}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("documentos").upload(path, file);
    if (upErr) {
      setSubiendo(null);
      setMsg({ type: "err", text: upErr.message });
      return;
    }

    const { error } = await supabase.from("documentos").insert({
      project_id: projectId,
      departamento,
      categoria,
      nombre,
      file_path: path,
      file_name: file.name,
      subido_por: fullName,
      subido_por_id: user.id,
    });

    setSubiendo(null);
    if (error) {
      setMsg({ type: "err", text: error.message });
      return;
    }
    await load();
  }

  async function descargar(path: string, fileName: string) {
    const supabase = createClient();
    const { data, error } = await supabase.storage.from("documentos").createSignedUrl(path, 60);
    if (error || !data) {
      setMsg({ type: "err", text: error?.message ?? "No se pudo generar el enlace." });
      return;
    }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = fileName;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  }

  if (grupos.length === 0) {
    return (
      <div className="soon-box">
        <span className="hex"></span>
        <h4>Documentos de {departamento}</h4>
        <p>Todavía no hay un catálogo de documentos definido para este departamento.</p>
      </div>
    );
  }

  const total = grupos.reduce((acc, g) => acc + g.docs.length, 0);
  const completados = grupos.reduce(
    (acc, g) => acc + g.docs.filter((d) => docs.some((row) => row.categoria === g.titulo && row.nombre === d.nombre)).length,
    0
  );

  return (
    <>
      <div className="doc-status">
        <span className={`spill ${completados === 0 ? "pub" : "pub"}`}>
          ● {completados}/{total} documentos
        </span>
        <span className="txt">
          {readOnly ? (
            <>
              Visionado de documentos de <b>{departamento}</b> — solo lectura. Tu equipo edita y publica
              estos documentos desde su propio panel.
            </>
          ) : (
            <>
              Espacio de trabajo de documentos de <b>{departamento}</b>. Sube cada documento cuando esté listo;
              el resto del equipo lo verá publicado aquí.
            </>
          )}
        </span>
      </div>

      {loading && <p className="cons-text">Cargando documentos…</p>}

      {!loading &&
        grupos.map((g) => (
          <div key={g.titulo} style={{ padding: "0 30px 8px" }}>
            <div
              className="mbsection-title"
              style={{ display: "flex", alignItems: "center", gap: "8px", margin: "18px 0 12px" }}
            >
              <span className="hex" style={{ width: "12px", height: "10px", background: g.color }}></span>
              {g.titulo}
            </div>
            <div className="com-list" style={{ padding: 0, gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))" }}>
              {g.docs.map((d) => {
                const subido = docs.find((row) => row.categoria === g.titulo && row.nombre === d.nombre);
                const key = `${g.titulo}::${d.nombre}`;
                return (
                  <div className="com" key={d.nombre} style={{ borderLeft: `3px solid ${g.color}` }}>
                    <div className="com-top">
                      <div className="com-title">{d.nombre}</div>
                      <span className={`pill ${subido ? "p-ok" : "p-warn"}`}>{subido ? "Subido" : "Vacío"}</span>
                    </div>
                    <div className="com-text">{d.desc}</div>
                    {subido ? (
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px", alignItems: "center" }}>
                        <span className="cons-meta">
                          {subido.file_name} · {subido.subido_por} · {timeAgo(subido.created_at)}
                        </span>
                      </div>
                    ) : null}
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
                      {subido && (
                        <button className="btn" onClick={() => descargar(subido.file_path, subido.file_name)}>
                          Descargar
                        </button>
                      )}
                      {!readOnly && (
                        <label className="btn" style={{ cursor: "pointer" }}>
                          {subiendo === key ? "Subiendo…" : subido ? "Reemplazar" : "Subir archivo"}
                          <input
                            type="file"
                            style={{ display: "none" }}
                            disabled={subiendo !== null}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) subir(g.titulo, d.nombre, file);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

      {msg && (
        <p className={`amsg ${msg.type === "err" ? "err" : "ok"}`} style={{ margin: "0 30px" }}>
          {msg.text}
        </p>
      )}

      <div className="note" style={{ marginTop: "20px" }}>
        El resto del equipo puede pedir acceso de visionado a un documento concreto desde la pestaña{" "}
        <b>Accesos</b>.
      </div>
    </>
  );
}
