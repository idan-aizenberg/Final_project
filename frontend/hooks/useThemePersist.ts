"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const STORAGE_KEY = "weathersight:theme";

export function useThemePersist() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || typeof window === "undefined") return;
    if (theme) {
      window.localStorage.setItem(STORAGE_KEY, theme);
    }
  }, [theme, isMounted]);

  const toggleTheme = () => {
    const next = (resolvedTheme === "dark" ? "light" : "dark") as "light" | "dark";
    setTheme(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  };

  return {
    theme: resolvedTheme,
    setTheme,
    toggleTheme,
    isReady: isMounted,
  };
}
