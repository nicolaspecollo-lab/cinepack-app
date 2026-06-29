"use client";

import { useState } from "react";

export default function CreditosChips({
  label,
  placeholder,
  valores,
  onChange,
  addLabel = "+ Agregar",
}: {
  label: string;
  placeholder: string;
  valores: string[];
  onChange: (next: string[]) => void;
  addLabel?: string;
}) {
  const [input, setInput] = useState("");

  function agregar() {
    const v = input.trim();
    if (!v || valores.includes(v)) return;
    onChange([...valores, v]);
    setInput("");
  }

  function quitar(v: string) {
    onChange(valores.filter((x) => x !== v));
  }

  return (
    <div className="cp-np-block">
      <span className="label">{label}</span>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: valores.length > 0 ? "8px" : 0 }}>
        {valores.map((v) => (
          <span
            key={v}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--hl3)", padding: "6px 10px", border: "1px solid var(--line)", fontSize: "13px" }}
          >
            {v}
            <button type="button" onClick={() => quitar(v)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--pink)", fontSize: "12px" }}>✕</button>
          </span>
        ))}
      </div>
      <div className="cp-deptcustom">
        <input
          type="text"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregar(); } }}
        />
        <button type="button" className="abtn" onClick={agregar}>{addLabel}</button>
      </div>
    </div>
  );
}
