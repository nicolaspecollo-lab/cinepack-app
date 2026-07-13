"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { safeKey } from "../../../../lib/storageKey";
import { DEPARTAMENTOS, ACCENTS } from "../../../../constants";
import { useAdminGuard } from "../../../useAdminGuard";
import AdminShell from "../../../AdminShell";

type Archivo = { name: string; nombre: string; path: string; size: number; created_at: string | null };
type TrashItem = {
  id: string;
  bucket: string;
  departamento: string | null;
  nombre: string;
  original_path: string;
  papelera_path: string;
  size: number | null;
  deleted_by_nombre: string | null;
  deleted_at: string;
};

// safeKey(depto) -> nombre legible, para etiquetar las carpetas de primer nivel.
const DEPTO_POR_KEY: Record<string, string> = Object.fromEntries(
  DEPARTAMENTOS.map((d) => [safeKey(d), d])
);

function fmtBytes(b: number) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function fileIcon(nombre: string) {
  if (/\.(pdf)$/i.test(nombre)) return "📄";
  if (/\.(jpg|jpeg|png|gif|webp)$/i.test(nombre)) return "🖼️";
  if (/\.(mp4|mov|avi|mkv)$/i.test(nombre)) return "🎬";
  if (/\.(mp3|wav|aac)$/i.test(nombre)) return "🎵";
  if (/\.(doc|docx)$/i.test(nombre)) return "📝";
  if (/\.(xls|xlsx|csv)$/i.test(nombre)) return "📊";
  return "📎";
}

export default function CarpetaMaestra() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id ?? "";
  const t = useTranslations("carpetaMaestra");
  const { checking, isAdmin } = useAdminGuard();

  const [nombreProyecto, setNombreProyecto] = useState<string>("");
  const [bucket, setBucket] = useState<"documentos" | "guiones">("documentos");
  const [enPapelera, setEnPapelera] = useState(false);
  const [pathStack, setPathStack] = useState<string[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [files, setFiles] = useState<Archivo[]>([]);
  const [trash, setTrash] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const currentPath = [projectId, ...pathStack].join("/");

  const api = useCallback(async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/admin/carpeta-maestra", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId, ...payload }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error || `Error ${res.status}`);
    return j;
  }, [projectId]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      if (enPapelera) {
        const j = await api({ action: "trash" });
        setTrash(j.items ?? []);
      } else {
        const j = await api({ action: "list", bucket, path: currentPath });
        setFolders((j.folders ?? []).filter((f: string) => f !== "_papelera"));
        setFiles(j.files ?? []);
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [api, bucket, currentPath, enPapelera]);

  useEffect(() => {
    if (!isAdmin) return;
    load();
  }, [isAdmin, load]);

  useEffect(() => {
    if (!isAdmin || !projectId) return;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("proyectos").select("nombre").eq("id", projectId).single();
      if (data) setNombreProyecto(data.nombre);
    })();
  }, [isAdmin, projectId]);

  async function descargar(path: string) {
    try {
      const j = await api({ action: "signed", bucket, path });
      window.open(j.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function borrar(path: string) {
    if (!confirm(t("confirmDelete"))) return;
    setBusy(true);
    try {
      await api({ action: "delete", bucket, path });
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function mover(f: Archivo) {
    // El soporte indica la ruta destino relativa al proyecto (depto/carpeta/archivo).
    const relActual = f.path.startsWith(`${projectId}/`) ? f.path.slice(projectId.length + 1) : f.path;
    const nuevaRel = prompt(t("promptMove"), relActual);
    if (!nuevaRel || nuevaRel === relActual) return;
    setBusy(true);
    try {
      await api({ action: "move", bucket, from: f.path, to: `${projectId}/${nuevaRel}` });
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function restaurar(item: TrashItem) {
    setBusy(true);
    try {
      await api({ action: "restore", bucket: item.bucket, papelera_id: item.id });
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function borrarPapelera(item: TrashItem) {
    if (!confirm(t("confirmDeleteTrash"))) return;
    setBusy(true);
    try {
      await api({ action: "delete", bucket: item.bucket, path: item.papelera_path });
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function abrirCarpeta(name: string) {
    setPathStack((s) => [...s, name]);
  }

  function irA(i: number) {
    setPathStack((s) => s.slice(0, i));
  }

  function cambiarBucket(b: "documentos" | "guiones") {
    setBucket(b);
    setEnPapelera(false);
    setPathStack([]);
  }

  function etiquetaSegmento(seg: string, esRaizDepto: boolean) {
    return esRaizDepto ? (DEPTO_POR_KEY[seg] ?? seg) : seg;
  }

  // Color de acento del departamento (mismo token que usa el resto de la app)
  // para el punto de color de cada carpeta de primer nivel.
  function deptAccentVar(nombreCarpeta: string, esRaizDepto: boolean): React.CSSProperties {
    if (!esRaizDepto) return {};
    const depto = DEPTO_POR_KEY[nombreCarpeta] ?? nombreCarpeta;
    const token = ACCENTS[depto];
    return token ? ({ "--dept": `var(--${token})` } as React.CSSProperties) : {};
  }

  if (checking) return null;

  return (
    <AdminShell>
      {err && <div className="cp-admin-err">{err}</div>}
      <div className="cp-admin-section">
        <div className="cp-cm-head">
          <span className="hex"></span>
          <h3 style={{ margin: 0 }}>{t("title", { nombre: nombreProyecto || "…" })}</h3>
        </div>
        <p className="cp-cm-sub">{t("subtitle")}</p>

        <div className="cp-cm-tabs">
          <button className={`cp-cm-tab ${!enPapelera && bucket === "documentos" ? "active" : ""}`} onClick={() => cambiarBucket("documentos")}>
            {t("tabDocumentos")}
          </button>
          <button className={`cp-cm-tab ${!enPapelera && bucket === "guiones" ? "active" : ""}`} onClick={() => cambiarBucket("guiones")}>
            {t("tabGuiones")}
          </button>
          <button className={`cp-cm-tab ${enPapelera ? "active" : ""}`} onClick={() => { setEnPapelera(true); setPathStack([]); }}>
            {t("tabPapelera")}
            {trash.length > 0 && <span className="cp-cm-count">{trash.length}</span>}
          </button>
        </div>

        {loading ? (
          <div className="cp-admin-empty">{t("loading")}</div>
        ) : enPapelera ? (
          trash.length === 0 ? (
            <div className="cp-admin-empty">{t("trashEmpty")}</div>
          ) : (
            <div className="cp-cm-trash">
              {trash.map((it) => (
                <div key={it.id} className="cp-cm-trash-row">
                  <span className="hex"></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="cp-cm-file-name">{it.nombre}</div>
                    <div className="cp-cm-file-meta">
                      {t("deletedMeta", {
                        quien: it.deleted_by_nombre ?? "—",
                        cuando: new Date(it.deleted_at).toLocaleString(),
                        depto: it.departamento ?? "—",
                      })}
                    </div>
                  </div>
                  <button className="cp-cm-delete-btn" disabled={busy} onClick={() => borrarPapelera(it)}>{t("deleteForever")}</button>
                  <button className="cp-cm-restore-btn" disabled={busy} onClick={() => restaurar(it)}>{t("restore")}</button>
                </div>
              ))}
            </div>
          )
        ) : (
          <>
            <div className="cp-cm-breadcrumb">
              <button onClick={() => irA(0)}>{t("root")}</button>
              {pathStack.map((seg, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="sep">›</span>
                  {i < pathStack.length - 1 ? (
                    <button onClick={() => irA(i + 1)}>{etiquetaSegmento(seg, i === 0)}</button>
                  ) : (
                    <span className="current">{etiquetaSegmento(seg, i === 0)}</span>
                  )}
                </span>
              ))}
            </div>

            {folders.length === 0 && files.length === 0 ? (
              <div className="cp-admin-empty">{t("folderEmpty")}</div>
            ) : (
              <>
                {folders.length > 0 && (
                  <>
                    <div className="cp-cm-label">{t("colDept")}</div>
                    <div className="cp-cm-folder-grid">
                      {folders.map((c) => (
                        <button
                          key={c}
                          className="cp-cm-folder-card"
                          style={deptAccentVar(c, pathStack.length === 0)}
                          onClick={() => abrirCarpeta(c)}
                        >
                          {pathStack.length === 0 && <span className="cp-cm-folder-dot"></span>}
                          <span className="hex"></span>
                          <span className="cp-cm-folder-name">{etiquetaSegmento(c, pathStack.length === 0)}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {files.length > 0 && (
                  <>
                    <div className="cp-cm-label">{t("colFile")}</div>
                    <div className="cp-cm-files">
                      {files.map((f) => (
                        <div key={f.path} className="cp-cm-file-row">
                          <span style={{ fontSize: 16, flexShrink: 0 }}>{fileIcon(f.nombre)}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="cp-cm-file-name">{f.nombre}</div>
                            <div className="cp-cm-file-meta">{fmtBytes(f.size)}</div>
                          </div>
                          <div className="cp-cm-file-actions">
                            <button className="cp-cm-icon-btn" disabled={busy} onClick={() => descargar(f.path)} title={t("download")}>⬇</button>
                            <button className="cp-cm-icon-btn" disabled={busy} onClick={() => mover(f)} title={t("move")}>⇄</button>
                            <button className="cp-cm-icon-btn danger" disabled={busy} onClick={() => borrar(f.path)} title={t("delete")}>✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </AdminShell>
  );
}
