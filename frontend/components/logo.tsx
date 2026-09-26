import { cn } from "@/lib/utils";

// Marca: um "cifrão" desenhado como duas barras de extrato
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <svg viewBox="0 0 24 24" aria-hidden className="size-6">
        <rect x="3" y="4" width="18" height="16" rx="4" className="fill-primary" />
        <rect x="7" y="9" width="10" height="2" rx="1" className="fill-primary-foreground" />
        <rect x="7" y="13" width="6" height="2" rx="1" className="fill-primary-foreground/70" />
      </svg>
      Financeiro
    </span>
  );
}
