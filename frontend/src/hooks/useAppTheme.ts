import { useEffect, useState } from "react";

export type AppTheme = "light" | "dark";

const getStoredTheme = (): AppTheme | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const saved = window.localStorage.getItem("appTheme");
    if (saved === "dark" || saved === "light") {
      return saved as AppTheme;
    }
  } catch {
    // ignore storage errors
  }

  return null;
};

const persistTheme = (theme: AppTheme) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem("appTheme", theme);
  } catch {
    // ignore storage errors
  }
};

const applyThemeClass = (theme: AppTheme) => {
  if (typeof document === "undefined") {
    return;
  }

  try {
    document.body.classList.remove("theme-light", "theme-dark");
    document.body.classList.add(`theme-${theme}`);
  } catch {
    // ignore DOM/classList errors
  }
};

const clearThemeClass = () => {
  if (typeof document === "undefined") {
    return;
  }

  try {
    document.body.classList.remove("theme-light", "theme-dark");
  } catch {
    // ignore DOM/classList errors
  }
};

export function useAppTheme(initialTheme: AppTheme = "dark") {
  const [theme, setTheme] = useState<AppTheme>(() => getStoredTheme() ?? initialTheme);

  useEffect(() => {
    persistTheme(theme);
  }, [theme]);

  useEffect(() => {
    applyThemeClass(theme);
    return () => clearThemeClass();
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  };

  return { theme, toggleTheme };
}
