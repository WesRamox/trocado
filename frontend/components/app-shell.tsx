"use client";

import { LogOut, Menu } from "lucide-react";
import { useState } from "react";
import { logout } from "@/app/(auth)/actions";
import { AppNav } from "@/components/app-nav";
import { Logo } from "@/components/logo";
import { ThemeSwitch } from "@/components/theme-switch";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { User } from "@/lib/types";

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="sticky top-0 hidden h-svh flex-col bg-sidebar p-4 lg:flex">
        <SidebarContent user={user} />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-sidebar px-4 py-3 lg:hidden">
        <Logo tone="dark" className="text-white" />
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white hover:bg-sidebar-accent hover:text-white">
              <Menu />
              <span className="sr-only">Abrir menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 border-sidebar-border bg-sidebar p-4">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SidebarContent user={user} onNavigate={() => setMenuOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">{children}</main>
    </div>
  );
}

function SidebarContent({ user, onNavigate }: { user: User; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <Logo tone="dark" className="mb-8 px-3 text-white" />
      <AppNav onNavigate={onNavigate} />
      <div className="mt-auto border-t border-sidebar-border pt-4">
        <p className="truncate px-3 text-sm font-medium text-white">{user.name}</p>
        <p className="truncate px-3 text-xs text-sidebar-foreground/70">{user.email}</p>
        <ThemeSwitch variant="sidebar" className="mt-3" />
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 outline-none hover:bg-sidebar-accent hover:text-white focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <LogOut className="size-4" />
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}
