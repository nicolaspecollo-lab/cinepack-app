// Supabase Storage no admite tildes ni espacios en las keys de objetos.
// Sanitiza cada segmento de una ruta de Storage sin tocar el texto que se muestra en la UI.
export function safeKey(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita tildes/diacríticos
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "");
}
