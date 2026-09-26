import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Delta {
  // Texto já formatado, ex.: "12% vs agosto"
  text: string;
  direction: "up" | "down";
  // Se a direção é boa (gasto caiu, poupança subiu)
  good: boolean;
}

// Indicador: rótulo, valor, variação opcional e medidor opcional com marca de referência
export function StatTile({
  label,
  value,
  detail,
  delta,
  meter,
}: {
  label: string;
  value: string;
  detail?: string;
  delta?: Delta | null;
  meter?: { value: number; reference: number; referenceLabel: string } | null;
}) {
  const Arrow = delta?.direction === "up" ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="tabular mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {delta && (
        <p className={cn("mt-1 flex items-center gap-0.5 text-xs font-medium", delta.good ? "text-inflow" : "text-outflow")}>
          <Arrow className="size-3.5" aria-hidden />
          <span className="sr-only">{delta.direction === "up" ? "Subiu" : "Caiu"} </span>
          {delta.text}
        </p>
      )}
      {meter && (
        <div className="mt-3">
          <div className="relative h-1.5 rounded-full bg-primary/15">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(Math.max(meter.value, 0), 1) * 100}%` }}
            />
            <span
              aria-hidden
              className="absolute -top-1 h-3.5 w-0.5 rounded-full bg-foreground"
              style={{ left: `${meter.reference * 100}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">{meter.referenceLabel}</p>
        </div>
      )}
      {detail && <p className="mt-2 text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}
