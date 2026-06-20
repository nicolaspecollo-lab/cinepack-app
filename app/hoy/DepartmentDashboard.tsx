"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import HoyPanel from "./HoyPanel";
import GeneralesPanel, { type Sub as GeneralesSub } from "./GeneralesPanel";
import ModoRodajePanel from "./ModoRodajePanel";
import HerramientasPanel from "./HerramientasPanel";
import ArchivosPanel from "./ArchivosPanel";
import EquipoMini from "./EquipoMini";
import ProyectoPulsoPanel from "./ProyectoPulsoPanel";
import CommandPalette, { type PaletteItem } from "./CommandPalette";
import InboxPanel, { type InboxItem } from "./InboxPanel";
import { deptTools, cargoGroups } from "../herramientas";
import { createClient } from "@/lib/supabase/client";
import { CLIENTE_DEPT } from "../constants";
import "./dashboard.css";

type Tab = "pulso" | "generales" | "departamento" | "exclusivas" | "archivos";

export default function DepartmentDashboard({
  nombre,
  accent,
  fullName,
  cargo,
  avatarUrl,
}: {
  nombre: string;
  accent: string;
  fullName: string;
  cargo?: string | null;
  avatarUrl?: string | null;
}) {
  const [tab, setTab] = useState<Tab>("pulso");
  const [pulsoPendientes, setPulsoPendientes] = useState(0);
  const [generalesJump, setGeneralesJump] = useState<{ sub: GeneralesSub; token: number } | null>(null);
  const [misTareas, setMisTareas] = useState<{ id: string; titulo: string }[]>([]);
  const [misAlertas, setMisAlertas] = useState<{ id: string; texto: string }[]>([]);

  const inboxItems: InboxItem[] = useMemo(
    () => [
      ...misTareas.map((t) => ({ id: t.id, tipo: "tarea" as const, texto: t.titulo })),
      ...misAlertas.map((a) => ({ id: a.id, tipo: "alerta" as const, texto: a.texto })),
    ],
    [misTareas, misAlertas]
  );
  const [reloadToken, setReloadToken] = useState(0);
  const [archivosDirectos, setArchivosDirectos] = useState<{ nombre: string; path: string }[]>([]);
  const [headerMounted, setHeaderMounted] = useState(false);
  const [jornadaActiva, setJornadaActiva] = useState<{ dia_numero: number; dia_total: number } | null>(null);

  useEffect(() => {
    setHeaderMounted(!!document.getElementById("cp-header-controls"));
  }, []);

  useEffect(() => {
    (async () => {
      const projectId = localStorage.getItem("cinepack-proyecto-id");
      if (!projectId) return;
      const supabase = createClient();
      const hoy = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("jornadas")
        .select("dia_numero, dia_total")
        .eq("project_id", projectId)
        .eq("fecha", hoy)
        .maybeSingle();
      if (data) setJornadaActiva(data);
    })();
  }, []);
  const accVar = `var(--${accent})`;

  useEffect(() => {
    (async () => {
      const projectId = localStorage.getItem("cinepack-proyecto-id");
      if (!projectId) return;
      const supabase = createClient();
      const base = `${projectId}/${nombre}/archivos`;
      const { data } = await supabase.storage.from("documentos").list(base, { limit: 200 });
      if (data) {
        const found: { nombre: string; path: string }[] = [];
        for (const item of data) {
          if (item.id !== null) found.push({ nombre: item.name.replace(/^\d+-/, ""), path: `${base}/${item.name}` });
        }
        setArchivosDirectos(found);
      }
    })();
  }, [nombre]);

  function irAOrdenRodaje() {
    setGeneralesJump((prev) => ({ sub: "orden", token: (prev?.token ?? 0) + 1 }));
    setTab("generales");
  }

  useEffect(() => {
    (async () => {
      const projectId = localStorage.getItem("cinepack-proyecto-id");
      if (!projectId) return;
      const supabase = createClient();
      const [{ data: tareas }, { data: alertas }] = await Promise.all([
        supabase.from("tareas").select("id, titulo, para_departamento").eq("project_id", projectId).eq("completada", false),
        supabase.from("alertas").select("id, texto, para_departamento").eq("project_id", projectId).eq("leida", false),
      ]);
      const misT = (tareas ?? []).filter((r) => !r.para_departamento || r.para_departamento === nombre);
      const misA = (alertas ?? []).filter((r) => !r.para_departamento || r.para_departamento === nombre);
      setMisTareas(misT.map((t) => ({ id: t.id, titulo: t.titulo })));
      setMisAlertas(misA.map((a) => ({ id: a.id, texto: a.texto })));
      setPulsoPendientes(misT.length + misA.length);
    })();
  }, [nombre, reloadToken]);

  async function completarTareaPalette(id: string) {
    const supabase = createClient();
    await supabase.from("tareas").update({ completada: true }).eq("id", id);
    setReloadToken((t) => t + 1);
  }

  async function descartarAlertaPalette(id: string) {
    const supabase = createClient();
    await supabase.from("alertas").update({ leida: true }).eq("id", id);
    setReloadToken((t) => t + 1);
  }

  async function onCrearTarea(texto: string) {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) return;
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("tareas").insert({
      project_id: projectId,
      para_departamento: nombre,
      de_departamento: nombre,
      titulo: texto,
      etiqueta: "Hoy",
      tipo: "warn",
      completada: false,
      autor_id: auth.user?.id ?? null,
      autor_nombre: fullName,
    });
    setReloadToken((t) => t + 1);
  }

  function onAskIA(texto: string) {
    window.dispatchEvent(new CustomEvent("cp-asistente-ask", { detail: { texto } }));
  }

  const paletteItems = useMemo<PaletteItem[]>(() => {
    const items: PaletteItem[] = [
      { id: "tab-pulso", label: "Pulso", group: "Sección", onSelect: () => setTab("pulso") },
      { id: "tab-generales", label: "Generales", group: "Sección", onSelect: () => setTab("generales") },
      { id: "tab-departamento", label: "Departamento", group: "Sección", onSelect: () => setTab("departamento") },
      { id: "tab-exclusivas", label: "Exclusivas", group: "Sección", onSelect: () => setTab("exclusivas") },
      { id: "tab-archivos", label: "Archivos", group: "Sección", onSelect: () => setTab("archivos") },
    ];
    for (const h of deptTools(nombre)) {
      items.push({ id: `dept-${h.id}`, label: h.nombre, hint: h.hint, group: "Departamento", onSelect: () => setTab("departamento") });
    }
    for (const g of cargoGroups(nombre)) {
      for (const h of g.tools) {
        items.push({ id: `cargo-${g.cargo}-${h.id}`, label: h.nombre, hint: g.cargo, group: "Exclusivas", onSelect: () => setTab("exclusivas") });
      }
    }
    for (const t of misTareas) {
      items.push({
        id: `completar-${t.id}`,
        label: `✓ Completar: ${t.titulo}`,
        group: "Tareas",
        onSelect: () => completarTareaPalette(t.id),
      });
    }
    for (const a of misAlertas) {
      items.push({
        id: `descartar-${a.id}`,
        label: `✓ Descartar: ${a.texto}`,
        group: "Alertas",
        onSelect: () => descartarAlertaPalette(a.id),
      });
    }
    for (const f of archivosDirectos) {
      items.push({
        id: `archivo-${f.path}`,
        label: `📎 ${f.nombre}`,
        hint: "Archivos",
        group: "Archivos",
        onSelect: () => setTab("archivos"),
      });
    }
    return items;
  }, [nombre, misTareas, misAlertas, archivosDirectos]);

  const headerControls = (
    <div className="cp-dash-controls">
      <CommandPalette items={paletteItems} onCrearTarea={onCrearTarea} onAskIA={onAskIA} />
      <button
        className="cp-dash-ctrl-btn"
        onClick={() => window.dispatchEvent(new Event("cp-asistente-open"))}
        title="Asistente IA"
      >
        <span className="hex"></span> IA
      </button>
      <EquipoMini departamento={nombre} />
    </div>
  );

  // El Inbox ya no tiene botón en la barra: se abre desde el menú del shell
  // (evento cp-inbox-open). Se monta como panel flotante, fuera de la barra.
  const inboxPanel = (
    <InboxPanel
      items={inboxItems}
      onCompletar={completarTareaPalette}
      onDescartar={descartarAlertaPalette}
      onIrAPulso={() => setTab("pulso")}
    />
  );

  if (nombre === CLIENTE_DEPT) {
    return (
      <div className="view active" style={{ "--acc": accVar } as React.CSSProperties}>
        {headerMounted && createPortal(headerControls, document.getElementById("cp-header-controls")!)}
        <div className="dhead">
          <div className="dhead-top">
            <span className="hex"></span>
            <div className="dhead-info">
              <span className="proj">Vista de cliente / productora · Solo lectura</span>
              <h2>Resumen del proyecto</h2>
            </div>
            <div className="dhead-user">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="role-avatar" />
              ) : (
                <span className="role-avatar role-avatar-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>
                </span>
              )}
              <span className="dhead-user-name"><b>{fullName}</b></span>
            </div>
          </div>
        </div>

        <div className="tpanel active">
          <ProyectoPulsoPanel />
          <div className="note">
            Esta es una vista de solo lectura pensada para compartir el estado del proyecto con clientes y
            productoras. No incluye herramientas internas de los departamentos ni opciones de edición.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="view active" style={{ "--acc": accVar } as React.CSSProperties}>
      {headerMounted && createPortal(headerControls, document.getElementById("cp-header-controls")!)}
      <div className="wtabs">
        <div className="cp-wdept-label">
          <span className="hex" />
          <span>{nombre}</span>
        </div>
        <button className={`wtab ${tab === "pulso" ? "active" : ""}`} onClick={() => setTab("pulso")}>
          Pulso{pulsoPendientes > 0 && <span className="wtab-badge">{pulsoPendientes}</span>}
        </button>
        <button className={`wtab ${tab === "generales" ? "active" : ""}`} onClick={() => setTab("generales")}>Generales</button>
        <button className={`wtab ${tab === "departamento" ? "active" : ""}`} onClick={() => setTab("departamento")}>Departamentos</button>
        <button className={`wtab ${tab === "exclusivas" ? "active" : ""}`} onClick={() => setTab("exclusivas")}>Exclusivas</button>
        <button className={`wtab ${tab === "archivos" ? "active" : ""}`} onClick={() => setTab("archivos")}>Archivo</button>
        <div style={{ flex: 1 }} />
        <div className="cp-wuser-block">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="cp-wuser-avatar" />
          ) : (
            <span className="cp-wuser-avatar cp-wuser-avatar-icon">
              <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>
            </span>
          )}
          <div className="cp-wuser-info">
            <b>{fullName}</b>
            <span>{cargo ?? "Sin asignar"}</span>
          </div>
        </div>
      </div>

      {tab === "pulso" && (
        <div className="tpanel active">
          <ModoRodajePanel onVerOrden={irAOrdenRodaje} />
          <HoyPanel deDepartamento={nombre} fullName={fullName} />
          <ProyectoPulsoPanel />
          <div className="note">
            <b>Pulso</b> es tu jornada y lo que el equipo espera de ti, más el resumen general del proyecto: tareas y
            alertas pendientes de todos los departamentos, avance global de checklists y estado del presupuesto. Las{" "}
            <b>Generales</b> son las herramientas compartidas por todo el proyecto; en{" "}
            <b>Departamento</b> y <b>Exclusivas</b> tenés las tuyas según tu cargo.
          </div>
        </div>
      )}

      {tab === "generales" && (
        <div className="tpanel active">
          <GeneralesPanel departamento={nombre} fullName={fullName} jumpTo={generalesJump} />
        </div>
      )}

      {tab === "departamento" && (
        <div className="tpanel active">
          <HerramientasPanel departamento={nombre} cargo={cargo} fullName={fullName} seccion="departamento" />
        </div>
      )}

      {tab === "exclusivas" && (
        <div className="tpanel active">
          <HerramientasPanel departamento={nombre} cargo={cargo} fullName={fullName} seccion="cargo" />
        </div>
      )}

      {tab === "archivos" && (
        <div className="tpanel active">
          <ArchivosPanel departamento={nombre} />
        </div>
      )}

      {inboxPanel}
    </div>
  );
}
