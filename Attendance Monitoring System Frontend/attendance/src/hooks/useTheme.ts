import { useEffect, useState } from "react";
export function useTheme() {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem("campuspulse-theme") === "dark";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    try {
      localStorage.setItem("campuspulse-theme", dark ? "dark" : "light");
    } catch {
      /* Theme still works for this visit. */
    }
  }, [dark]);
  return { dark, toggleTheme: () => setDark((value) => !value) };
}
