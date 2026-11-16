"use client";

// ===========================================================================
// Editor real de documento de texto enriquecido en blanco (TipTap, núcleo MIT).
// ---------------------------------------------------------------------------
// Panel A MEDIDA (no cabe en HerramientaPanel genérico): a diferencia de la
// "Nota" ya existente en herramientas.ts (un <div contenteditable> con una
// barra fija, sin modelo de documento real), acá el contenido vive como un
// documento ProseMirror real (JSON) con negrita/cursiva/subrayado/tachado/
// títulos H1-H3/listas/citas/línea horizontal/alineación/tablas/imágenes/
// enlaces/resaltado/color de texto/deshacer-rehacer/contador de palabras —
// la vara pedida por Nico es Word/Pages, no un editor de notas — y
// exportación a PDF preservando todo ese formato.
//
// Todas las extensiones agregadas son oficiales de TipTap (@tiptap/extension-*,
// MIT, misma familia de paquetes ya aprobada e instalada en el proyecto:
// table/table-row/table-cell/table-header, image, link, character-count,
// color, highlight, text-style). No se introdujo ninguna librería ajena al
// núcleo TipTap ya usado.
// ===========================================================================

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TiptapImage from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import CharacterCount from "@tiptap/extension-character-count";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import Icon from "../components/Icon";

// Paleta de color de texto/resaltado acotada a los acentos del sistema de
// diseño (sistema-diseno.md) — no se usa un selector de color libre para no
// romper la identidad visual del documento.
const COLORES_TEXTO = [
  { nombre: "Por defecto", valor: "" },
  { nombre: "Azul", valor: "#1F7DE2" },
  { nombre: "Rosa", valor: "#F37FB5" },
  { nombre: "Verde", valor: "#52EC64" },
  { nombre: "Ámbar", valor: "#E8A330" },
  { nombre: "Rojo", valor: "#F07A7A" },
  { nombre: "Violeta", valor: "#C98AF2" },
];

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
  const [menuColor, setMenuColor] = useState(false);
  const archivoImagenRef = useRef<HTMLInputElement>(null);
  // Forzamos un re-render inmediato en cada cambio/selección (independiente
  // del guardado debounceado a 500ms) para que el estado "activo" de la
  // toolbar y el contador de palabras se sientan instantáneos, como en un
  // procesador de texto real — si no, quedaban pegados al ritmo del guardado.
  const [, forzarRender] = useState(0);
  const colorBtnRef = useRef<HTMLButtonElement>(null);
  const colorMenuRef = useRef<HTMLDivElement>(null);
  const [menuColorPos, setMenuColorPos] = useState({ top: 0, left: 0 });

  const hayContenido = contenido && Object.keys(contenido).length > 0;

  const editor = useEditor({
    immediatelyRender: false, // evita el mismatch de SSR (el panel ya se monta sin SSR, pero TipTap lo recomienda explícitamente)
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Escribí tu documento…" }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TiptapImage.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false, autolink: true }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: false }),
      CharacterCount,
    ],
    content: hayContenido ? contenido : "<p></p>",
    onUpdate: ({ editor: ed }) => {
      forzarRender((n) => n + 1);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        onGuardarRef.current(ed.getJSON() as unknown as Record<string, unknown>);
      }, 500);
    },
    onSelectionUpdate: () => {
      forzarRender((n) => n + 1);
    },
  });

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!menuColor) return;
    const cerrar = (e: MouseEvent) => {
      const t = e.target as Node;
      if (colorBtnRef.current?.contains(t) || colorMenuRef.current?.contains(t)) return;
      setMenuColor(false);
    };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, [menuColor]);

  if (!editor) return null;

  const enTabla = editor.isActive("table");
  const palabras = editor.storage.characterCount?.words?.() ?? 0;
  const caracteres = editor.storage.characterCount?.characters?.() ?? 0;

  function ponerEnlace() {
    if (!editor) return;
    const previo = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL del enlace (dejá vacío para quitarlo):", previo || "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  function onElegirImagen(e: React.ChangeEvent<HTMLInputElement>) {
    if (!editor) return;
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = () => {
      const src = lector.result as string;
      editor.chain().focus().setImage({ src, alt: archivo.name }).run();
    };
    lector.readAsDataURL(archivo);
  }

  // Exporta el HTML real de TipTap (no editor.getText(), que descartaba todo
  // el formato) a un <div> oculto, lo "fotografía" con html2canvas preservando
  // negrita/cursiva/subrayado/tachado/títulos/listas/alineación/tablas/
  // imágenes/colores tal como se ven en pantalla, y vuelca esa imagen a un
  // PDF con jsPDF, paginando si el documento no entra en una sola hoja A4 y
  // numerando cada página al pie. html2canvas ya viene instalado como
  // dependencia transitiva de jspdf (no es una librería nueva).
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
    // Estilos mínimos para que tablas e imágenes se vean en la "foto" igual
    // que en el editor (fuera de .cp-dash no hereda el CSS de dashboard.css).
    const estilos = document.createElement("style");
    estilos.textContent = `
      table { border-collapse: collapse; width: 100%; margin: 0.6em 0; }
      td, th { border: 1px solid #999; padding: 6px 8px; vertical-align: top; }
      th { background: #f0f0f0; font-weight: 700; }
      img { max-width: 100%; height: auto; display: block; margin: 0.6em 0; }
      blockquote { border-left: 3px solid #999; margin: 0.6em 0; padding-left: 12px; color: #444; }
      hr { border: none; border-top: 1px solid #ccc; margin: 1em 0; }
      a { color: #1F7DE2; }
    `;
    contenedor.appendChild(estilos);
    document.body.appendChild(contenedor);
    try {
      const canvas = await html2canvas(contenedor, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const margen = 36;
      const margenInferior = 50; // deja lugar al número de página
      const anchoPdf = pdf.internal.pageSize.getWidth() - margen * 2;
      const altoPdf = pdf.internal.pageSize.getHeight() - margen - margenInferior;
      const escalaPxPorPt = canvas.width / anchoPdf;
      const altoPaginaPx = altoPdf * escalaPxPorPt;
      let yaRenderizadoPx = 0;
      let esPrimera = true;
      const paginas: number[] = [];
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
        paginas.push(pdf.getNumberOfPages());
      }
      const total = pdf.getNumberOfPages();
      const anchoPagina = pdf.internal.pageSize.getWidth();
      const altoPagina = pdf.internal.pageSize.getHeight();
      for (let i = 1; i <= total; i++) {
        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.setTextColor(120);
        pdf.text(`${nombre || "documento"} — página ${i} de ${total}`, anchoPagina / 2, altoPagina - 20, { align: "center" });
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
        <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Deshacer">
          <Icon name="undo" size={14} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Rehacer">
          <Icon name="redo" size={14} />
        </button>
        <span className="docb-doc-sep" />
        <button
          type="button"
          className={`docb-doc-wide ${editor.isActive("heading", { level: 1 }) ? "on" : ""}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          title="Título 1"
        >
          H1
        </button>
        <button
          type="button"
          className={`docb-doc-wide ${editor.isActive("heading", { level: 2 }) ? "on" : ""}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Título 2"
        >
          H2
        </button>
        <button
          type="button"
          className={`docb-doc-wide ${editor.isActive("heading", { level: 3 }) ? "on" : ""}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Título 3"
        >
          H3
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
        <button
          type="button"
          className={editor.isActive("highlight") ? "on" : ""}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          title="Resaltar"
        >
          <Icon name="highlighter" size={14} />
        </button>
        <div className="docb-doc-colorwrap">
          <button
            type="button"
            ref={colorBtnRef}
            onClick={() => {
              if (colorBtnRef.current) {
                const r = colorBtnRef.current.getBoundingClientRect();
                setMenuColorPos({ top: r.bottom + 4, left: r.left });
              }
              setMenuColor((v) => !v);
            }}
            title="Color de texto"
          >
            <Icon name="text-color" size={14} />
          </button>
          {menuColor && (
            <div ref={colorMenuRef} className="docb-doc-colormenu" style={{ position: "fixed", top: menuColorPos.top, left: menuColorPos.left }}>
              {COLORES_TEXTO.map((c) => (
                <button
                  key={c.nombre}
                  type="button"
                  className="docb-doc-colorchip"
                  style={{ background: c.valor || "var(--bg-2)" }}
                  title={c.nombre}
                  onClick={() => {
                    if (c.valor) editor.chain().focus().setColor(c.valor).run();
                    else editor.chain().focus().unsetColor().run();
                    setMenuColor(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>
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
        <button
          type="button"
          className={editor.isActive("blockquote") ? "on" : ""}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Cita"
        >
          <Icon name="quote" size={14} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Línea horizontal">
          <Icon name="minus" size={14} />
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
        <button
          type="button"
          className={editor.isActive("link") ? "on" : ""}
          onClick={ponerEnlace}
          title="Insertar/editar enlace"
        >
          <Icon name="link" size={14} />
        </button>
        <button type="button" onClick={() => archivoImagenRef.current?.click()} title="Insertar imagen">
          <Icon name="image" size={14} />
        </button>
        <input ref={archivoImagenRef} type="file" accept="image/*" hidden onChange={onElegirImagen} />
        <button
          type="button"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title="Insertar tabla"
        >
          <Icon name="table" size={14} />
        </button>
        {enTabla && (
          <>
            <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()} title="Agregar columna">
              <Icon name="columns" size={14} />
            </button>
            <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()} title="Agregar fila">
              <Icon name="rows" size={14} />
            </button>
            <button type="button" onClick={() => editor.chain().focus().deleteTable().run()} title="Eliminar tabla">
              <Icon name="trash" size={14} />
            </button>
          </>
        )}
        <span className="docb-doc-sep" />
        <button type="button" onClick={exportarPdf} disabled={exportando} title={exportando ? "Generando PDF…" : "Exportar a PDF"}>
          <Icon name="download" size={14} />
        </button>
      </div>
      <EditorContent editor={editor} className="docb-doc-editor" />
      <div className="docb-doc-footer">
        {palabras} {palabras === 1 ? "palabra" : "palabras"} · {caracteres} {caracteres === 1 ? "carácter" : "caracteres"}
      </div>
    </div>
  );
}
