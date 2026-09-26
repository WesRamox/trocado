import { formatMoney } from "@/lib/format";
import type { TransactionType } from "@/lib/types";
import { cn } from "@/lib/utils";

// Valor com sinal e cor: entrada em verde (+), saída em vermelho (−)
export function Amount({
  value,
  type,
  className,
}: {
  value: number;
  type: TransactionType;
  className?: string;
}) {
  const inflow = type === "INFLOW";
  return (
    <span className={cn("tabular whitespace-nowrap", inflow ? "text-inflow" : "text-outflow", className)}>
      {inflow ? "+ " : "− "}
      {formatMoney(value)}
    </span>
  );
}
