// Set de iconos SVG de Cine Pack — line-icons coherentes (1.75px stroke,
// heredan color y tamaño via currentColor + font-size del padre). Sin
// dependencias. Reemplazan los emojis/símbolos sueltos por iconografía pro.

type IconName =
  | "bold" | "italic" | "underline" | "strikethrough" | "heading" | "paragraph"
  | "list" | "list-ordered" | "align-left" | "align-center" | "align-right"
  | "trash" | "x" | "eye" | "pencil" | "check" | "arrow-right" | "arrow-left"
  | "table" | "file-text" | "columns" | "rows"
  | "chevron-down" | "highlighter" | "type" | "text-color";

const PATHS: Record<IconName, React.ReactNode> = {
  bold: <><path d="M6 4h8a4 4 0 0 1 0 8H6z" /><path d="M6 12h9a4 4 0 0 1 0 8H6z" /></>,
  italic: <><line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" /></>,
  underline: <><path d="M6 4v6a6 6 0 0 0 12 0V4" /><line x1="4" y1="20" x2="20" y2="20" /></>,
  strikethrough: <><path d="M16 4H9a3 3 0 0 0-2.83 4" /><path d="M14 12a4 4 0 0 1 0 8H7" /><line x1="4" y1="12" x2="20" y2="12" /></>,
  heading: <><path d="M6 4v16" /><path d="M18 4v16" /><path d="M6 12h12" /></>,
  paragraph: <><path d="M13 4v16" /><path d="M17 4v16" /><path d="M19 4H9.5a4.5 4.5 0 0 0 0 9H13" /></>,
  list: <><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><circle cx="3.5" cy="6" r="1" /><circle cx="3.5" cy="12" r="1" /><circle cx="3.5" cy="18" r="1" /></>,
  "list-ordered": <><line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" /><path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4l2-2.5a1 1 0 0 0-2-1" /></>,
  "align-left": <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" /></>,
  "align-center": <><line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></>,
  "align-right": <><line x1="3" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="6" y1="18" x2="21" y2="18" /></>,
  trash: <><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></>,
  x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
  pencil: <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
  check: <><path d="M20 6 9 17l-5-5" /></>,
  "arrow-right": <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
  "arrow-left": <><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></>,
  table: <><rect x="3" y="3" width="18" height="18" rx="1" /><path d="M3 9h18" /><path d="M3 15h18" /><path d="M9 3v18" /><path d="M15 3v18" /></>,
  "file-text": <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" /></>,
  columns: <><rect x="3" y="3" width="18" height="18" rx="1" /><path d="M12 3v18" /></>,
  rows: <><rect x="3" y="3" width="18" height="18" rx="1" /><path d="M3 12h18" /></>,
  "chevron-down": <><path d="m6 9 6 6 6-6" /></>,
  highlighter: <><path d="m9 11-6 6v3h9l3-3" /><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" /></>,
  type: <><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /></>,
  "text-color": <><path d="m6 16 4-12 4 12" /><path d="M7.5 12h5" /></>,
};

export default function Icon({
  name,
  size = "1em",
  className,
  strokeWidth = 1.75,
}: {
  name: IconName;
  size?: number | string;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
    >
      {PATHS[name]}
    </svg>
  );
}
