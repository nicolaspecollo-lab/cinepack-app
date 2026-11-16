"use client";

// ===========================================================================
// Editor real de documento de texto enriquecido en blanco (TipTap, núcleo MIT).
// ---------------------------------------------------------------------------
// Panel A MEDIDA (no cabe en HerramientaPanel genérico): a diferencia de la
// "Nota" ya existente en herramientas.ts (un <div contenteditable> con una
// barra fija, sin modelo de documento real), acá el contenido vive como un
// documento ProseMirror real (JSON) con negrita/cursiva/subrayado/listas/
// títulos/alineación — lo que pidió el expediente — y exportación.
// ===========================================================================

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import Icon from "../components/Icon";

export default function TiptapDocumentoEditor({
  nombre,
  contenido,
  onGuardar,
}: {
  nombre: string;
  contenido: Record<string, unknown>;
  onGuardar: (json: Record<string, unknown>) => void;
}) {
  const onGuardarRef = useRef(onGuardar);
  useEffect(() => {
    onGuardarRef.current = onGuardar;
  }, [onGuardar]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [exportando, setExportando] = useState(false);

  const hayContenido = contenido && Object.keys(contenido).length > 0;

  const editor = useEditor({
    immediatelyRender: false, // evita el mismatch de SSR (el panel ya se monta sin SSR, pero TipTap lo recomienda explícitamente)
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Escribí tu documento…" }),
    ],
    content: hayContenido ? contenido : "<p></p>",
    onUpdate: ({ editor: ed }) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        onGuardarRef.current(ed.getJSON() as unknown as Record<string, unknown>);
      }, 500);
    },
  });

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!editor) return null;

  // Exporta el HTML real de TipTap (no editor.getText(), que descartaba todo
  // el formato) a un <div> oculto, lo "fotografía" con html2canvas preservando
  // negrita/cursiva/subrayado/tachado/títulos/listas/alineación tal como se
  // ven en pantalla, y vuelca esa imagen a un PDF con jsPDF, paginando si el
  // documento no entra en una sola hoja A4. html2canvas ya viene instalado
  // como dependencia transitiva de jspdf (no es una librería nueva).
  async function exportarPdf() {
    if (!editor || exportando) return;
    setExportando(true);
    const contenedor = document.createElement("div");
    contenedor.innerHTML = editor.getHTML();
    contenedor.style.position = "fixed";
    contenedor.style.left = "-9999px";
    contenedor.style.top = "0";
    contenedor.style.width = "700px";
    contenedor.style.padding = "32px";
    contenedor.style.background = "#ffffff";
    contenedor.style.color = "#111111";
    contenedor.style.fontFamily = "'Courier New', Courier, monospace";
    contenedor.style.fontSize = "14px";
    contenedor.style.lineHeight = "1.5";
    document.body.appendChild(contenedor);
    try {
      const canvas = await html2canvas(contenedor, { scale: 2, backgroundColor: "#ffffff" });
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const margen = 36;
      const anchoPdf = pdf.internal.pageSize.getWidth() - margen * 2;
      const altoPdf = pdf.internal.pageSize.getHeight() - margen * 2;
      const escalaPxPorPt = canvas.width / anchoPdf;
      const altoPaginaPx = altoPdf * escalaPxPorPt;
      let yaRenderizadoPx = 0;
      let esPrimera = true;
      while (yaRenderizadoPx < canvas.height) {
        const altoRebanadaPx = Math.min(altoPaginaPx, canvas.height - yaRenderizadoPx);
        const rebanada = document.createElement("canvas");
        rebanada.width = canvas.width;
        rebanada.height = altoRebanadaPx;
        const ctx = rebanada.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, rebanada.width, rebanada.height);
          ctx.drawImage(canvas, 0, yaRenderizadoPx, canvas.width, altoRebanadaPx, 0, 0, canvas.width, altoRebanadaPx);
        }
        if (!esPrimera) pdf.addPage();
        pdf.addImage(rebanada.toDataURL("image/png"), "PNG", margen, margen, anchoPdf, altoRebanadaPx / escalaPxPorPt);
        yaRenderizadoPx += altoRebanadaPx;
        esPrimera = false;
      }
      pdf.save(`${nombre || "documento"}.pdf`);
    } finally {
      document.body.removeChild(contenedor);
      setExportando(false);
    }
  }

  return (
    <div className="docb-doc-wrap">
      <div className="docb-doc-toolbar">
        <button
          type="button"
          className={editor.isActive("heading", { level: 2 }) ? "on" : ""}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Título"
        >
          <Icon name="heading" size={14} />
        </button>
        <button
          type="button"
          className={editor.isActive("paragraph") ? "on" : ""}
          onClick={() => editor.chain().focus().setParagraph().run()}
          title="Párrafo"
        >
          <Icon name="paragraph" size={14} />
        </button>
        <span className="docb-doc-sep" />
        <button
          type="button"
          className={editor.isActive("bold") ? "on" : ""}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Negrita"
        >
          <Icon name="bold" size={14} />
        </button>
        <button
          type="button"
          className={editor.isActive("italic") ? "on" : ""}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Cursiva"
        >
          <Icon name="italic" size={14} />
        </button>
        <button
          type="button"
          className={editor.isActive("underline") ? "on" : ""}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Subrayado"
        >
          <Icon name="underline" size={14} />
        </button>
        <button
          type="button"
          className={editor.isActive("strike") ? "on" : ""}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Tachado"
        >
          <Icon name="strikethrough" size={14} />
        </button>
        <span className="docb-doc-sep" />
        <button
          type="button"
          className={editor.isActive("bulletList") ? "on" : ""}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Lista"
        >
          <Icon name="list" size={14} />
        </button>
        <button
          type="button"
          className={editor.isActive("orderedList") ? "on" : ""}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Lista numerada"
        >
          <Icon name="list-ordered" size={14} />
        </button>
        <span className="docb-doc-sep" />
        <button
          type="button"
          className={editor.isActive({ textAlign: "left" }) ? "on" : ""}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          title="Alinear a la izquierda"
        >
          <Icon name="align-left" size={14} />
        </button>
        <button
          type="button"
          className={editor.isActive({ textAlign: "center" }) ? "on" : ""}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          title="Centrar"
        >
          <Icon name="align-center" size={14} />
        </button>
        <button
          type="button"
          className={editor.isActive({ textAlign: "right" }) ? "on" : ""}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          title="Alinear a la derecha"
        >
          <Icon name="align-right" size={14} />
        </button>
        <span className="docb-doc-sep" />
        <button type="button" onClick={exportarPdf} disabled={exportando} title={exportando ? "Generando PDF…" : "Exportar a PDF"}>
          <Icon name="download" size={14} />
        </button>
      </div>
      <EditorContent editor={editor} className="docb-doc-editor" />
    </div>
  );
}
