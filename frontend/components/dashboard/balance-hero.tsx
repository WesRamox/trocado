import { formatMoney, monthName } from "@/lib/format";
import type { Summary } from "@/lib/types";
import { cn } from "@/lib/utils";

// Saldo do mês em destaque, com a proporção entre entradas e saídas
export function BalanceHero({ summary }: { summary: Summary }) {
  const { inflow, outflow, balance } = summary;
  const total = inflow + outflow;
  const segments = [
    { key: "inflow", label: "Entradas", value: inflow, className: "bg-inflow" },
    { key: "outflow", label: "Saídas", value: outflow, className: "bg-outflow" },
  ].filter((segment) => segment.value > 0);

  return (
    <section aria-labelledby="balance-title" className="border-b pb-8">
      <h2 id="balance-title" className="text-sm text-muted-foreground">
        Saldo de {monthName(summary.month)}
      </h2>
      <p className="tabular mt-1 text-5xl font-semibold tracking-tight sm:text-6xl">
        {balance < 0 && "− "}
        {formatMoney(Math.abs(balance))}
      </p>

      {total > 0 && (
        <div className="mt-6 flex h-2.5 max-w-xl gap-0.5" role="img" aria-label={`Entradas ${formatMoney(inflow)}, saídas ${formatMoney(outflow)}`}>
          {segments.map((segment) => (
            <div
              key={segment.key}
              title={`${segment.label}: ${formatMoney(segment.value)}`}
              className={cn("h-full first:rounded-l-full last:rounded-r-full", segment.className)}
              style={{ width: `${(segment.value / total) * 100}%` }}
            />
          ))}
        </div>
      )}

      <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span aria-hidden className="size-2.5 rounded-full bg-inflow" />
          <dt className="text-muted-foreground">Entradas</dt>
          <dd className="tabular font-medium">{formatMoney(inflow)}</dd>
        </div>
        <div className="flex items-center gap-2">
          <span aria-hidden className="size-2.5 rounded-full bg-outflow" />
          <dt className="text-muted-foreground">Saídas</dt>
          <dd className="tabular font-medium">{formatMoney(outflow)}</dd>
        </div>
      </dl>
    </section>
  );
}
