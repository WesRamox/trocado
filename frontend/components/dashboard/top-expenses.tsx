import { CategoryIcon } from "@/components/category-icon";
import { formatDate, formatMoney } from "@/lib/format";
import type { Category, Transaction } from "@/lib/types";

// Os maiores gastos do mês, do maior para o menor
export function TopExpenses({ transactions, categories }: { transactions: Transaction[]; categories: Category[] }) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const max = transactions[0]?.amount ?? 0;

  return (
    <ol className="grid gap-3">
      {transactions.map((t, index) => {
        const category = t.categoryId ? categoryById.get(t.categoryId) : undefined;
        return (
          <li key={t.id} className="grid grid-cols-[1.25rem_auto_1fr_auto] items-center gap-x-3">
            <span className="tabular text-sm text-muted-foreground">{index + 1}</span>
            <CategoryIcon category={category} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {t.name}
                {t.installmentCount && (
                  <span className="tabular font-normal text-muted-foreground">
                    {" "}
                    {t.installmentNumber}/{t.installmentCount}
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {category?.name ?? "Sem categoria"}, {formatDate(t.date)}
              </p>
            </div>
            <span className="tabular text-sm font-medium">{formatMoney(t.amount)}</span>
            <div className="col-start-3 col-end-5 mt-1.5 h-1 rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary/70" style={{ width: `${(t.amount / max) * 100}%` }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
