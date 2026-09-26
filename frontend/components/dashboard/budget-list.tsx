import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import { CategoryDot } from "@/components/category-dot";
import { formatMoney, formatPercent } from "@/lib/format";
import type { BudgetRow, BudgetStatus } from "@/lib/metrics";
import { cn } from "@/lib/utils";

// O estado nunca depende só da cor: cada linha traz ícone e texto
const STATUS: Record<BudgetStatus, { bar: string; icon: string; Icon: typeof CircleCheck; label: string }> = {
  ok: { bar: "bg-primary", icon: "text-primary", Icon: CircleCheck, label: "Dentro do orçamento" },
  warning: { bar: "bg-gold", icon: "text-gold", Icon: TriangleAlert, label: "Perto do limite" },
  over: { bar: "bg-outflow", icon: "text-outflow", Icon: CircleAlert, label: "Orçamento estourado" },
};

export function BudgetList({ rows }: { rows: BudgetRow[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map(({ category, budget, spent, share, status }) => {
        const { bar, icon, Icon, label } = STATUS[status];
        const left = budget - spent;
        return (
          <li key={category.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2">
              <CategoryDot color={category.color} className="size-2.5" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{category.name}</span>
              <span className="tabular text-xs text-muted-foreground">{formatPercent(share)}</span>
            </div>
            <p className="tabular mt-2 text-sm">
              <span className="font-semibold">{formatMoney(spent)}</span>
              <span className="text-muted-foreground"> de {formatMoney(budget)}</span>
            </p>
            <div
              role="meter"
              aria-label={`Orçamento de ${category.name}`}
              aria-valuemin={0}
              aria-valuemax={budget}
              aria-valuenow={Math.min(spent, budget)}
              aria-valuetext={`${formatMoney(spent)} de ${formatMoney(budget)}`}
              className="mt-2 h-1.5 rounded-full bg-muted"
            >
              <div className={cn("h-full rounded-full", bar)} style={{ width: `${Math.min(share, 1) * 100}%` }} />
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon className={cn("size-3.5 shrink-0", icon)} aria-hidden />
              <span className="sr-only">{label}: </span>
              {left >= 0 ? `Restam ${formatMoney(left)}` : `Passou ${formatMoney(-left)} do limite`}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
