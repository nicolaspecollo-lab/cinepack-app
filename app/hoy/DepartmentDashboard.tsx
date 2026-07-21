"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import GeneralesPanel, { type Sub as GeneralesSub } from "./GeneralesPanel";
import ModoRodajePanel from "./ModoRodajePanel";
import CicloTimeline from "./CicloTimeline";
import CalendarioProyecto from "./CalendarioProyecto";
import HerramientasPanel, { useNombreHerramienta } from "./HerramientasPanel";
import ArchivosPanel from "./ArchivosPanel";
import AdminPanel from "./AdminPanel";
import ControlDeptoPanel from "./ControlDeptoPanel";
import ProyectoPulsoPanel from "./ProyectoPulsoPanel";
import { abrirTareasPersonales } from "./tareasPersonales";
import CommandPalette, { type PaletteItem } from "./CommandPalette";
import InboxPanel, { type InboxItem } from "./InboxPanel";
import { deptTools, cargoGroups } from "../herramientas";
import { createClient } from "@/lib/supabase/client";
import { safeKey } from "../lib/storageKey";
import { CLIENTE_DEPT, JERARQUIA_POR_DEPARTAMENTO } from "../constants";
import "./dashboard.css";

type Tab = "pulso" | "generales" | "departamento" | "exclusivas" | "archivos" | "admin";

export default function DepartmentDashboard({
  nombre,
  accent,
  fullName,
  cargo,
  avatarUrl,
  isAdmin,
}: {
  nombre: string;
  accent: string;
  fullName: string;
  cargo?: string | null;
  avatarUrl?: string | null;
  isAdmin?: boolean;
}) {
  const tNav = useTranslations("nav");
  const nombreDe = useNombreHerramienta();
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
  const [generalesPendientes, setGeneralesPendientes] = useState(0);
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
  // El "jefe" del departamento = primer cargo de la jerarquía. Ese rol (o un
  // superadmin) ve la pestaña "Control" para administrar su departamento.
  const jefeCargo = JERARQUIA_POR_DEPARTAMENTO[nombre]?.[0];
  const esJefe = !!cargo && cargo === jefeCargo;
  const puedeControl = nombre === "Ejecutivo" || esJefe || !!isAdmin;

  useEffect(() => {
    (async () => {
      const projectId = localStorage.getItem("cinepack-proyecto-id");
      if (!projectId) return;
      const supabase = createClient();
      const base = `${projectId}/${safeKey(nombre)}/archivos`;
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

      const [{ data: tareas }, { data: alertas }, { data: consultas }, { data: comunicados }] = await Promise.all([
        supabase.from("tareas").select("id, titulo, para_departamento").eq("project_id", projectId).eq("completada", false),
        supabase.from("alertas").select("id, texto, para_departamento").eq("project_id", projectId).eq("leida", false),
        supabase.from("consultas").select("id").eq("project_id", projectId).eq("estado", "pendiente").contains("para_departamentos", [nombre]),
        supabase.from("comunicados").select("id").eq("project_id", projectId).gte("created_at", new Date(Date.now() - 86400000).toISOString()),
      ]);

      const misT = (tareas ?? []).filter((r) => !r.para_departamento || r.para_departamento === nombre);
      const misA = (alertas ?? []).filter((r) => !r.para_departamento || r.para_departamento === nombre);
      setMisTareas(misT.map((t) => ({ id: t.id, titulo: t.titulo })));
      setMisAlertas(misA.map((a) => ({ id: a.id, texto: a.texto })));
      setPulsoPendientes(misT.length + misA.length);
      setGeneralesPendientes((consultas?.length ?? 0) + (comunicados?.length ?? 0));
    })();
  }, [nombre, reloadToken]);

  // Realtime: refrescar badge cuando llegan nuevos comunicados o consultas
  useEffect(() => {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) return;
    const supabase = createClient();
    const channel = supabase.channel(`notif-${nombre}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comunicados", filter: `project_id=eq.${projectId}` },
        () => setReloadToken((t) => t + 1))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "consultas", filter: `project_id=eq.${projectId}` },
        () => setReloadToken((t) => t + 1))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "consultas", filter: `project_id=eq.${projectId}` },
        () => setReloadToken((t) => t + 1))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [nombre]);

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

  function onAskIA(_texto: string) {
    alert(tNav("askIaPlaceholder"));
  }

  const paletteItems = useMemo<PaletteItem[]>(() => {
    const items: PaletteItem[] = [
      { id: "tab-pulso", label: tNav("pulso"), group: tNav("palSection"), onSelect: () => setTab("pulso") },
      { id: "tab-generales", label: tNav("generales"), group: tNav("palSection"), onSelect: () => setTab("generales") },
      { id: "tab-departamento", label: tNav("departamentos"), group: tNav("palSection"), onSelect: () => setTab("departamento") },
      { id: "tab-exclusivas", label: tNav("exclusivas"), group: tNav("palSection"), onSelect: () => setTab("exclusivas") },
      { id: "tab-archivos", label: tNav("archivo"), group: tNav("palSection"), onSelect: () => setTab("archivos") },
    ];
    if (puedeControl) {
      items.push({ id: "tab-control", label: tNav("control"), group: tNav("palSection"), onSelect: () => setTab("admin") });
    }
    for (const h of deptTools(nombre)) {
      items.push({ id: `dept-${h.id}`, label: nombreDe(h), hint: h.hint, group: tNav("palDept"), onSelect: () => setTab("departamento") });
    }
    for (const g of cargoGroups(nombre)) {
      for (const h of g.tools) {
        items.push({ id: `cargo-${g.cargo}-${h.id}`, label: nombreDe(h), hint: g.cargo, group: tNav("palExclusive"), onSelect: () => setTab("exclusivas") });
      }
    }
    for (const t of misTareas) {
      items.push({
        id: `completar-${t.id}`,
        label: tNav("palComplete", { name: t.titulo }),
        group: tNav("palTasks"),
        onSelect: () => completarTareaPalette(t.id),
      });
    }
    for (const a of misAlertas) {
      items.push({
        id: `descartar-${a.id}`,
        label: tNav("palDismiss", { name: a.texto }),
        group: tNav("palAlerts"),
        onSelect: () => descartarAlertaPalette(a.id),
      });
    }
    for (const f of archivosDirectos) {
      items.push({
        id: `archivo-${f.path}`,
        label: `📎 ${f.nombre}`,
        hint: tNav("palFiles"),
        group: tNav("palFiles"),
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
        onClick={() => onAskIA("")}
        title="Asistente IA"
      >
        <span className="hex"></span> IA
      </button>
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
              <span className="proj">{tNav("clientView")}</span>
              <h2>{tNav("projectSummary")}</h2>
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
            {tNav("clientNote")}
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
            <span>{cargo ?? tNav("unassigned")}</span>
          </div>
        </div>
        <div className="cp-wtabs-nav">
          <button className={`wtab ${tab === "pulso" ? "active" : ""}`} onClick={() => setTab("pulso")}>
            {tNav("pulso")}{pulsoPendientes > 0 && <span className="wtab-badge">{pulsoPendientes}</span>}
          </button>
          <button className={`wtab ${tab === "generales" ? "active" : ""}`} onClick={() => setTab("generales")}>
            {tNav("generales")}{generalesPendientes > 0 && <span className="wtab-badge">{generalesPendientes}</span>}
          </button>
          <button className={`wtab ${tab === "departamento" ? "active" : ""}`} onClick={() => setTab("departamento")}>{tNav("departamentos")}</button>
          <button className={`wtab ${tab === "exclusivas" ? "active" : ""}`} onClick={() => setTab("exclusivas")}>{tNav("exclusivas")}</button>
          <button className={`wtab ${tab === "archivos" ? "active" : ""}`} onClick={() => setTab("archivos")}>{tNav("archivo")}</button>
          {puedeControl && (
            <button className={`wtab ${tab === "admin" ? "active" : ""}`} onClick={() => setTab("admin")}>{tNav("control")}</button>
          )}
          <div style={{ flex: 1 }} />
          <div id="cp-header-back" />
        </div>
      </div>

      {tab === "pulso" && (
        <div className="tpanel active">
          <CicloTimeline />
          <ModoRodajePanel onVerOrden={irAOrdenRodaje} />
          <CalendarioProyecto departamento={nombre} cargo={cargo} isAdmin={isAdmin} fullName={fullName} />
          <ProyectoPulsoPanel
            departamento={nombre}
            onIrAGenerales={(sub) => {
              setGeneralesJump((prev) => ({ sub, token: (prev?.token ?? 0) + 1 }));
              setTab("generales");
            }}
            onAbrirTareas={async () => {
              await abrirTareasPersonales(nombre);
              setTab("exclusivas");
            }}
          />
          <div className="note">
            {tNav("pulsoNote", { pulso: "Pulso", generales: "Generales", departamento: "Departamento", exclusivas: "Exclusivas" })}
          </div>
        </div>
      )}

      {tab === "generales" && (
        <div className="tpanel active">
          <GeneralesPanel departamento={nombre} cargo={cargo} fullName={fullName} jumpTo={generalesJump} />
        </div>
      )}

      {tab === "departamento" && (
        <div className="tpanel active">
          <HerramientasPanel departamento={nombre} cargo={cargo} fullName={fullName} seccion="departamento" isAdmin={isAdmin} />
        </div>
      )}

      {tab === "exclusivas" && (
        <div className="tpanel active">
          <HerramientasPanel departamento={nombre} cargo={cargo} fullName={fullName} seccion="cargo" isAdmin={isAdmin} />
        </div>
      )}

      {tab === "archivos" && (
        <div className="tpanel active">
          <ArchivosPanel departamento={nombre} />
        </div>
      )}

      {tab === "admin" && puedeControl && (
        <div className="tpanel active">
          {nombre === "Ejecutivo" ? <AdminPanel /> : <ControlDeptoPanel departamento={nombre} />}
        </div>
      )}

      {inboxPanel}
    </div>
  );
}
