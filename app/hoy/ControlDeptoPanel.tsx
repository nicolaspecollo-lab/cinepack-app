"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { JERARQUIA_POR_DEPARTAMENTO } from "../constants";
import { deptTools, cargoGroups, type Herramienta } from "../herramientas";
import { useNombreHerramienta } from "./HerramientasPanel";
import GestionAccesosPanel from "./GestionAccesosPanel";
import CpSelect from "../components/CpSelect";

type Miembro = {
  user_id: string;
  full_name: string;
  cargo: string | null;
  avatar_url: string | null;
  cargosCompartidos: string[];
};
type HerramientaDept = { h: Herramienta; cargo: string | null };

// Panel de control de departamento reutilizable: lo usan la página
// /control-depto (con su topbar/auth) y la pestaña "Control" del dashboard
// (para el jefe de cada departamento). Trabaja sobre el `departamento` que
// recibe por prop — no lee el perfil propio.
export default function ControlDeptoPanel({ departamento }: { departamento: string }) {
  const t = useTranslations("controlDepto");
  const nombreDe = useNombreHerramienta();
  const [projectId, setProjectId] = useState("");
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [cargoCompartidoNuevo, setCargoCompartidoNuevo] = useState<Record<string, string>>({});
  const [cargosCustom, setCargosCustom] = useState<string[]>([]);
  const [cargoNuevoInput, setCargoNuevoInput] = useState("");
  const [cargoNuevoMsg, setCargoNuevoMsg] = useState<string | null>(null);
  const [herramientasOcultas, setHerramientasOcultas] = useState<Set<string>>(new Set());
  const [togglingTool, setTogglingTool] = useState<string | null>(null);

  const jerarquia = [...(JERARQUIA_POR_DEPARTAMENTO[departamento] ?? []), ...cargosCustom];

  async function cargarCargosCustom(supabase: ReturnType<typeof createClient>, pid: string, dept: string) {
    const { data } = await supabase
      .from("cargos_personalizados")
      .select("nombre")
      .eq("project_id", pid)
      .eq("departamento", dept)
      .order("created_at");
    setCargosCustom((data ?? []).map((r) => r.nombre));
  }

  async function cargarVisibilidad(supabase: ReturnType<typeof createClient>, pid: string, dept: string) {
    const { data } = await supabase
      .from("herramienta_visibilidad")
      .select("herramienta")
      .eq("project_id", pid)
      .eq("departamento", dept)
      .eq("oculta", true);
    setHerramientasOcultas(new Set((data ?? []).map((r) => r.herramienta)));
  }

  async function cargarMiembros(supabase: ReturnType<typeof createClient>, pid: string, dept: string) {
    // Los integrantes del depto son quienes tienen fila en project_members
    // PARA ESTE proyecto con rol=dept — nunca filtrar profiles.departamento
    // directo, ese campo es global de la cuenta (se pisa entre proyectos).
    const { data: members } = await supabase
      .from("project_members")
      .select("user_id")
      .eq("project_id", pid)
      .eq("rol", dept);
    const memberIds = (members ?? []).map((m) => m.user_id);
    if (memberIds.length === 0) {
      setMiembros([]);
      return;
    }
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, cargo, avatar_url")
      .in("id", memberIds);
    const { data: roles } = await supabase.from("user_roles").select("user_id, cargo").in("user_id", memberIds);
    setMiembros(
      (profiles ?? []).map((p) => ({
        user_id: p.id,
        full_name: p.full_name,
        cargo: p.cargo,
        avatar_url: p.avatar_url,
        cargosCompartidos: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.cargo),
      }))
    );
  }

  useEffect(() => {
    const pid = typeof window !== "undefined" ? localStorage.getItem("cinepack-proyecto-id") : null;
    if (!pid) return;
    setProjectId(pid);
    const supabase = createClient();
    cargarMiembros(supabase, pid, departamento);
    cargarCargosCustom(supabase, pid, departamento);
    cargarVisibilidad(supabase, pid, departamento);
  }, [departamento]);

  async function crearCargo(e: React.FormEvent) {
    e.preventDefault();
    const nombre = cargoNuevoInput.trim();
    if (!nombre || !projectId) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("cargos_personalizados")
      .insert({ project_id: projectId, departamento, nombre });
    if (error) { setCargoNuevoMsg(t("errCreateRole", { msg: error.message })); return; }
    setCargosCustom((prev) => [...prev, nombre]);
    setCargoNuevoInput("");
    setCargoNuevoMsg(null);
  }

  async function toggleHerramienta(herramientaId: string, ocultarAhora: boolean) {
    if (!projectId) return;
    setTogglingTool(herramientaId);
    const supabase = createClient();
    const { error } = await supabase
      .from("herramienta_visibilidad")
      .upsert(
        { project_id: projectId, departamento, herramienta: herramientaId, oculta: ocultarAhora },
        { onConflict: "project_id,departamento,herramienta" }
      );
    setTogglingTool(null);
    if (error) { alert(t("errToggleTool", { msg: error.message })); return; }
    setHerramientasOcultas((prev) => {
      const next = new Set(prev);
      if (ocultarAhora) next.add(herramientaId); else next.delete(herramientaId);
      return next;
    });
  }

  async function cambiarCargo(userId: string, nuevoCargo: string) {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ cargo: nuevoCargo }).eq("id", userId);
    if (error) { alert(t("errChangeRole", { msg: error.message })); return; }
    setMiembros((prev) => prev.map((m) => (m.user_id === userId ? { ...m, cargo: nuevoCargo } : m)));
  }

  async function agregarCargoCompartido(userId: string) {
    const cargo = cargoCompartidoNuevo[userId];
    if (!cargo) return;
    const supabase = createClient();
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, cargo });
    if (error) { alert(t("errAddSharedRole", { msg: error.message })); return; }
    setMiembros((prev) => prev.map((m) => (m.user_id === userId ? { ...m, cargosCompartidos: [...m.cargosCompartidos, cargo].sort() } : m)));
    setCargoCompartidoNuevo((prev) => ({ ...prev, [userId]: "" }));
  }

  async function quitarCargoCompartido(userId: string, cargo: string) {
    const supabase = createClient();
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("cargo", cargo);
    if (error) { alert(t("errRemoveSharedRole", { msg: error.message })); return; }
    setMiembros((prev) => prev.map((m) => (m.user_id === userId ? { ...m, cargosCompartidos: m.cargosCompartidos.filter((c) => c !== cargo) } : m)));
  }

  // --- Checklist de puesta a punto (auto-derivado de datos reales) ---
  const jefeCargo = JERARQUIA_POR_DEPARTAMENTO[departamento]?.[0];
  const totalTools =
    deptTools(departamento).length + cargoGroups(departamento).reduce((n, g) => n + g.tools.length, 0);
  const checklist = [
    { ok: miembros.some((m) => m.cargo === jefeCargo), label: t("chkHead", { cargo: jefeCargo ?? "—" }) },
    { ok: miembros.length >= 2, label: t("chkTeam") },
    { ok: miembros.length > 0 && miembros.every((m) => !!m.cargo), label: t("chkAllRoles") },
    { ok: totalTools > 0 && herramientasOcultas.size < totalTools, label: t("chkToolsActive") },
  ];
  const hechos = checklist.filter((c) => c.ok).length;

  return (
    <div className="cdp-wrap">
      <h2 className="cdp-title"><span className="hex" /> {t("controlOf", { dept: departamento })}</h2>
      <p className="cdp-sub">{t("manageDesc")}</p>

      <div className="cdp-card">
        <h3 className="cdp-h3">{t("checklistTitle")} <span className="cdp-count">{hechos}/{checklist.length}</span></h3>
        <div className="cdp-checklist">
          {checklist.map((c, i) => (
            <div key={i} className={`cdp-check ${c.ok ? "ok" : ""}`}>
              <span className="cdp-check-box">{c.ok ? "✓" : ""}</span>
              <span>{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="cdp-card">
        <h3 className="cdp-h3">{t("membersTitle", { n: miembros.length })}</h3>
        <div className="cdp-members">
          {miembros.length === 0 ? (
            <span className="cdp-muted">{t("noMembers")}</span>
          ) : (
            miembros.map((m) => (
              <div key={m.user_id} className="cdp-member">
                <div className="cdp-member-top">
                  <div className="cdp-avatar">
                    {m.avatar_url ? <img src={m.avatar_url} alt={m.full_name} /> : <span className="hex" />}
                  </div>
                  <div className="cdp-member-name">
                    {m.full_name}
                    {m.cargo === jerarquia[0] && <span className="cdp-jefe-badge">{t("headBadge")}</span>}
                  </div>
                  <CpSelect value={m.cargo ?? ""} options={jerarquia} onChange={(v) => cambiarCargo(m.user_id, v)} placeholder={t("noRole")} />
                </div>
                <div className="cdp-shared">
                  <div className="cdp-shared-lbl">{t("sharedRoles")}</div>
                  <div className="cdp-shared-chips">
                    {m.cargosCompartidos.length === 0 ? (
                      <span className="cdp-muted">{t("none")}</span>
                    ) : (
                      m.cargosCompartidos.map((c) => (
                        <div key={c} className="cdp-chip">
                          <span>{c}</span>
                          <button type="button" onClick={() => quitarCargoCompartido(m.user_id, c)}>✕</button>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="cdp-shared-add">
                    <CpSelect
                      value={cargoCompartidoNuevo[m.user_id] ?? ""}
                      options={jerarquia.filter((c) => c !== m.cargo && !m.cargosCompartidos.includes(c))}
                      onChange={(v) => setCargoCompartidoNuevo((prev) => ({ ...prev, [m.user_id]: v }))}
                      placeholder={t("addSharedRolePh")}
                    />
                    <button type="button" className="cp-btn cp-btn-acc" disabled={!cargoCompartidoNuevo[m.user_id]} onClick={() => agregarCargoCompartido(m.user_id)}>{t("add")}</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="cdp-card">
        <h3 className="cdp-h3">{t("rolesTitle")}</h3>
        <p className="cdp-sub">{t("rolesDesc")}</p>
        <form onSubmit={crearCargo} className="cdp-inline-form">
          <input type="text" className="cdp-input" value={cargoNuevoInput} onChange={(e) => setCargoNuevoInput(e.target.value)} placeholder={t("newRolePh")} />
          <button type="submit" className="cp-btn cp-btn-acc" disabled={!cargoNuevoInput.trim()}>{t("createRole")}</button>
        </form>
        {cargoNuevoMsg && <p className="cdp-err">{cargoNuevoMsg}</p>}
      </div>

      <div className="cdp-card">
        <h3 className="cdp-h3">{t("toolsTitle")}</h3>
        <p className="cdp-sub">{t("toolsDesc")}</p>
        <ListaHerramientasDept departamento={departamento} ocultas={herramientasOcultas} togglingTool={togglingTool} onToggle={toggleHerramienta} nombreDe={nombreDe} t={t} />
      </div>

      <div className="cdp-card">
        <h3 className="cdp-h3">{t("accessTitle")}</h3>
        <p className="cdp-sub">{t("accessDesc")}</p>
        <GestionAccesosPanel departamento={departamento} scope="departamento" />
      </div>
    </div>
  );
}

function ListaHerramientasDept({
  departamento, ocultas, togglingTool, onToggle, nombreDe, t,
}: {
  departamento: string;
  ocultas: Set<string>;
  togglingTool: string | null;
  onToggle: (id: string, ocultarAhora: boolean) => void;
  nombreDe: (h: Herramienta) => string;
  t: ReturnType<typeof useTranslations>;
}) {
  const lista: HerramientaDept[] = [
    ...deptTools(departamento).map((h) => ({ h, cargo: null })),
    ...cargoGroups(departamento).flatMap((g) => g.tools.map((h) => ({ h, cargo: g.cargo }))),
  ];
  if (lista.length === 0) return <span className="cdp-muted">{t("noTools")}</span>;
  return (
    <div className="cdp-tools">
      {lista.map(({ h, cargo }) => {
        const oculta = ocultas.has(h.id);
        return (
          <div key={`${cargo ?? "dept"}-${h.id}`} className={`cdp-tool ${oculta ? "oculta" : ""}`}>
            <div className="cdp-tool-name">
              <span>{nombreDe(h)}</span>
              {cargo && <span className="cdp-tool-cargo">{cargo}</span>}
            </div>
            <button type="button" className="cp-btn" disabled={togglingTool === h.id} onClick={() => onToggle(h.id, !oculta)}>
              {oculta ? t("restoreTool") : t("hideTool")}
            </button>
          </div>
        );
      })}
    </div>
  );
}
