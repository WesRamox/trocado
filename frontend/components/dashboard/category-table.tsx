import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatMoney, formatPercent } from "@/lib/format";
import type { CategoryRow } from "@/lib/metrics";
import { cn } from "@/lib/utils";

// Legenda da rosca em forma de tabela: valor, participação e variação vs mês anterior
export function CategoryTable({ rows, previousMonthName }: { rows: CategoryRow[]; previousMonthName: string }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-muted-foreground">
          <th className="pb-2 font-normal">Categoria</th>
          <th className="pb-2 text-right font-normal">Valor</th>
          <th className="pb-2 text-right font-normal">
            <span className="sr-only">Participação</span>
          </th>
          <th className="pb-2 text-right font-normal">vs {previousMonthName}</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {rows.map((row) => (
          <tr key={row.key}>
            <td className="py-2">
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full bg-(--l) dark:bg-(--d)"
                  style={{ "--l": row.light, "--d": row.dark } as React.CSSProperties}
                />
                <span className="truncate">{row.label}</span>
              </span>
            </td>
            <td className="tabular py-2 text-right font-medium">{formatMoney(row.value)}</td>
            <td className="tabular w-12 py-2 text-right text-xs text-muted-foreground">{formatPercent(row.share)}</td>
            <td className="w-20 py-2 text-right">
              <Change value={row.change} hadPrevious={row.previous > 0} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Gasto que subiu é ruim, que caiu é bom
function Change({ value, hadPrevious }: { value: number | null; hadPrevious: boolean }) {
  if (!hadPrevious || value === null) {
    return <span className="text-xs text-muted-foreground">novo</span>;
  }
  if (Math.abs(value) < 0.005) {
    return <span className="text-xs text-muted-foreground">igual</span>;
  }
  const up = value > 0;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("tabular inline-flex items-center gap-0.5 text-xs font-medium", up ? "text-outflow" : "text-inflow")}>
      <Arrow className="size-3.5" aria-hidden />
      <span className="sr-only">{up ? "Subiu" : "Caiu"} </span>
      {formatPercent(Math.abs(value))}
    </span>
  );
}
