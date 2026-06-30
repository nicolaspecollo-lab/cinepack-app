"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { safeKey } from "../lib/storageKey";
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

function timeAgo(iso: string, t: ReturnType<typeof useTranslations>) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t("timeNow");
  if (mins < 60) return t("timeMinsAgo", { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("timeHoursAgo", { n: hours });
  const days = Math.floor(hours / 24);
  if (days === 1) return t("timeYesterday");
  return t("timeDaysAgo", { n: days });
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
  const t = useTranslations("documentos");
  const tc = useTranslations("documentosCatalogo");
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
      setMsg({ type: "err", text: t("errNoProject") });
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

    const path = `${projectId}/${safeKey(departamento)}/${categoria}/${Date.now()}-${safeKey(file.name)}`;
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
      setMsg({ type: "err", text: error?.message ?? t("errNoLink") });
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
        <h4>{t("noDeptTitle", { dept: departamento })}</h4>
        <p>{t("noDeptDesc")}</p>
      </div>
    );
  }

  const total = grupos.reduce((acc, g) => acc + g.docs.length, 0);
  const completados = grupos.reduce(
    (acc, g) => acc + g.docs.filter((d) => docs.some((row) => row.categoria === g.id && row.nombre === d.id)).length,
    0
  );

  return (
    <>
      <div className="doc-status">
        <span className={`spill ${completados === 0 ? "pub" : "pub"}`}>
          ● {t("countDocs", { n: completados, total })}
        </span>
        <span className="txt">
          {readOnly ? t("readOnlyDesc", { dept: departamento }) : t("editDesc", { dept: departamento })}
        </span>
      </div>

      {loading && <p className="cons-text">{t("loading")}</p>}

      {!loading &&
        grupos.map((g) => (
          <div key={g.id} style={{ padding: "0 30px 8px" }}>
            <div
              className="mbsection-title"
              style={{ display: "flex", alignItems: "center", gap: "8px", margin: "18px 0 12px" }}
            >
              <span className="hex" style={{ width: "12px", height: "10px", background: g.color }}></span>
              {tc(`${departamento}.${g.id}.titulo`)}
            </div>
            <div className="com-list" style={{ padding: 0, gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))" }}>
              {g.docs.map((d) => {
                const subido = docs.find((row) => row.categoria === g.id && row.nombre === d.id);
                const key = `${g.id}::${d.id}`;
                return (
                  <div className="com" key={d.id} style={{ borderLeft: `3px solid ${g.color}` }}>
                    <div className="com-top">
                      <div className="com-title">{tc(`${departamento}.${g.id}.docs.${d.id}.nombre`)}</div>
                      <span className={`pill ${subido ? "p-ok" : "p-warn"}`}>{subido ? t("uploaded") : t("empty")}</span>
                    </div>
                    <div className="com-text">{tc(`${departamento}.${g.id}.docs.${d.id}.desc`)}</div>
                    {subido ? (
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px", alignItems: "center" }}>
                        <span className="cons-meta">
                          {subido.file_name} · {subido.subido_por} · {timeAgo(subido.created_at, t)}
                        </span>
                      </div>
                    ) : null}
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
                      {subido && (
                        <button className="btn" onClick={() => descargar(subido.file_path, subido.file_name)}>
                          {t("download")}
                        </button>
                      )}
                      {!readOnly && (
                        <label className="btn" style={{ cursor: "pointer" }}>
                          {subiendo === key ? t("uploading") : subido ? t("replace") : t("uploadFile")}
                          <input
                            type="file"
                            style={{ display: "none" }}
                            disabled={subiendo !== null}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) subir(g.id, d.id, file);
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
        {t("accessNote", { tab: "Accesos" })}
      </div>
    </>
  );
}
