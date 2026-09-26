"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

// No servidor o tema ainda não é conhecido; o switch só mostra o estado depois de montar
const subscribe = () => () => {};
const useMounted = () => useSyncExternalStore(subscribe, () => true, () => false);

// Switch entre claro e escuro. variant="sidebar" para a barra lateral (sempre escura).
export function ThemeSwitch({ variant = "default", className }: { variant?: "default" | "sidebar"; className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Tema escuro"
      disabled={!mounted}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "group flex items-center gap-3 rounded-lg text-sm outline-none focus-visible:ring-2",
        variant === "sidebar"
          ? "w-full px-3 py-2 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white focus-visible:ring-sidebar-ring"
          : "p-1 text-muted-foreground hover:text-foreground focus-visible:ring-ring",
        className,
      )}
    >
      {variant === "sidebar" && <span className="flex-1 text-left">Tema escuro</span>}
      {/* Trilho com o sol e a lua; o botão desliza para o lado ativo */}
      <span
        aria-hidden
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center justify-between rounded-full px-1 transition-colors",
          variant === "sidebar" ? "bg-sidebar-accent group-hover:bg-sidebar-border" : "bg-muted",
          isDark && (variant === "sidebar" ? "bg-sidebar-border" : "bg-primary/25"),
        )}
      >
        <Sun className="size-3.5 opacity-70" />
        <Moon className="size-3.5 opacity-70" />
        <span
          className={cn(
            "absolute top-0.5 left-0.5 grid size-5 place-items-center rounded-full bg-white text-[#0f1f1a] shadow-sm transition-transform motion-reduce:transition-none",
            isDark && "translate-x-5",
          )}
        >
          {isDark ? <Moon className="size-3" /> : <Sun className="size-3" />}
        </span>
      </span>
    </button>
  );
}
