import { formatMoney, formatMoneyCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface HistoryPoint {
  month: string;
  label: string;
  inflow: number;
  outflow: number;
}

// Escala "redonda" para o eixo: passos de 1, 2, 2,5 ou 5 × 10^n
function niceScale(max: number, tickCount = 4) {
  if (max <= 0) return { top: 1, ticks: [0] };
  const raw = max / tickCount;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw)!;
  const top = step * Math.ceil(max / step);
  return { top, ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step) };
}

// Entradas e saídas por mês, lado a lado, em um único eixo.
// HTML renderizado no servidor; o tooltip aparece com CSS ao passar o mouse ou focar a coluna.
export function HistoryChart({ data }: { data: HistoryPoint[] }) {
  const { top, ticks } = niceScale(Math.max(...data.flatMap((d) => [d.inflow, d.outflow])));
  const pct = (value: number) => `${(value / top) * 100}%`;

  return (
    <figure>
      <ul className="mb-3 flex gap-5 text-xs text-muted-foreground" aria-label="Legenda">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-sm bg-inflow" /> Entradas
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-sm bg-outflow" /> Saídas
        </li>
      </ul>

      <div className="grid grid-cols-[4.5rem_1fr] text-xs">
        {/* Eixo Y */}
        <div aria-hidden className="relative h-64">
          {ticks.map((tick) => (
            <span key={tick} className="tabular absolute right-2 translate-y-1/2 text-muted-foreground" style={{ bottom: pct(tick) }}>
              {formatMoneyCompact(tick)}
            </span>
          ))}
        </div>

        {/* Área do gráfico: grade + colunas */}
        <div className="relative h-64">
          {ticks.map((tick) => (
            <span key={tick} aria-hidden className="absolute inset-x-0 border-t border-border" style={{ bottom: pct(tick) }} />
          ))}
          <ul className="absolute inset-0 flex">
            {data.map((point, i) => {
              const balance = point.inflow - point.outflow;
              return (
                <li
                  key={point.month}
                  tabIndex={0}
                  aria-label={`${point.label}: entradas ${formatMoney(point.inflow)}, saídas ${formatMoney(point.outflow)}`}
                  className="group relative flex flex-1 items-end justify-center gap-0.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span aria-hidden className="absolute inset-x-1 inset-y-0 rounded-md group-hover:bg-muted/70 group-focus-visible:bg-muted/70" />
                  <span aria-hidden className="relative w-[18px] rounded-t bg-inflow" style={{ height: pct(point.inflow) }} />
                  <span aria-hidden className="relative w-[18px] rounded-t bg-outflow" style={{ height: pct(point.outflow) }} />
                  {/* Tooltip: na metade direita abre para a esquerda, para não sair da tela */}
                  <div
                    aria-hidden
                    className={cn(
                      "pointer-events-none invisible absolute top-2 z-10 grid w-44 gap-1 rounded-lg border bg-popover px-3 py-2 shadow-md group-hover:visible group-focus-visible:visible",
                      i < data.length / 2 ? "left-1/2" : "right-1/2",
                    )}
                  >
                    <p className="font-medium capitalize">{point.label}</p>
                    <TooltipRow className="bg-inflow" label="Entradas" value={point.inflow} />
                    <TooltipRow className="bg-outflow" label="Saídas" value={point.outflow} />
                    <p className="tabular border-t pt-1 text-muted-foreground">
                      Saldo {balance < 0 && "−"}
                      {formatMoney(Math.abs(balance))}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Eixo X */}
        <div />
        <ul aria-hidden className="mt-2 flex text-muted-foreground">
          {data.map((point) => (
            <li key={point.month} className="flex-1 text-center">
              {point.label}
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}

function TooltipRow({ className, label, value }: { className: string; label: string; value: number }) {
  return (
    <p className="tabular flex items-center gap-1.5">
      <span className={cn("size-2 rounded-sm", className)} />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-medium">{formatMoney(value)}</span>
    </p>
  );
}
