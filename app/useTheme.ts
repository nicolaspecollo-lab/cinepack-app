"use client";

import { useEffect, useState } from "react";

export function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("cinepack-theme") === "light") setTheme("light");
    setReady(true);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("cinepack-theme", next);
  }

  return { theme, setTheme, toggleTheme, ready };
}
