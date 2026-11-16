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

import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { jsPDF } from "jspdf";
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

  function exportarPdf() {
    const doc = new jsPDF();
    const texto = editor!.getText();
    const lineas = doc.splitTextToSize(texto, 180);
    doc.setFontSize(14);
    doc.text(nombre || "Documento", 14, 18);
    doc.setFontSize(11);
    doc.text(lineas, 14, 30);
    doc.save(`${nombre || "documento"}.pdf`);
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
        <button type="button" onClick={exportarPdf} title="Exportar a PDF">
          <Icon name="download" size={14} />
        </button>
      </div>
      <EditorContent editor={editor} className="docb-doc-editor" />
    </div>
  );
}
