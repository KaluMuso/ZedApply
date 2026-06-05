"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

interface ThemeState {
  dark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeState>({ dark: true, toggle: () => {} });

function applyThemeClass(dark: boolean) {
  if (dark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("zed_cv_theme");
    if (stored === "dark") {
      setDark(true);
      applyThemeClass(true);
      return;
    }
    if (stored === "light") {
      setDark(false);
      applyThemeClass(false);
      return;
    }
    // First visit: default to dark mode.
    setDark(true);
    applyThemeClass(true);
    localStorage.setItem("zed_cv_theme", "dark");
  }, []);

  const toggle = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      applyThemeClass(next);
      localStorage.setItem("zed_cv_theme", next ? "dark" : "light");
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
