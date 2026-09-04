"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "dark" | "light";

/** Sidebar light/dark switch. Persists to localStorage; a head script applies
 *  the saved theme before first paint (see root layout). */
export function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (next === "light") document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem("pm-theme", next);
    } catch {}
  };

  const Icon = theme === "dark" ? Moon : Sun;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={toggle}
        title={theme === "dark" ? "Dark mode" : "Light mode"}
        className="flex size-10 items-center justify-center rounded-nested text-text-muted transition-colors hover:bg-card hover:text-text-primary"
      >
        <Icon className="size-4" />
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-nested px-3 py-2 text-sm text-text-muted">
      <span className="flex items-center gap-3">
        <Icon className="size-4 shrink-0" />
        {theme === "dark" ? "Dark mode" : "Light mode"}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={theme === "light"}
        onClick={toggle}
        title="Toggle light / dark mode"
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          theme === "light" ? "bg-accent" : "bg-card-raised",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-text-primary transition-all",
            theme === "light" ? "left-4.5 bg-card" : "left-0.5",
          )}
        />
      </button>
    </div>
  );
}
