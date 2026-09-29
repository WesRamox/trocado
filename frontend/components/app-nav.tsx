"use client";

import { ArrowLeftRight, ChartPie, CreditCard, HandCoins, Landmark, Repeat, Tags } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Visão geral", icon: ChartPie },
  { href: "/lancamentos", label: "Lançamentos", icon: ArrowLeftRight },
  { href: "/recorrencias", label: "Recorrências", icon: Repeat },
  { href: "/cartoes", label: "Cartões", icon: CreditCard },
  { href: "/emprestados", label: "Emprestados", icon: HandCoins },
  { href: "/emprestimos", label: "Empréstimos", icon: Landmark },
  { href: "/categorias", label: "Categorias", icon: Tags },
];

export function AppNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav className="grid gap-1">
      {ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          aria-current={isActive(href) ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            isActive(href) && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
          )}
        >
          <Icon className={cn("size-4", isActive(href) && "text-sidebar-primary")} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
