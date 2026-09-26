"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { formatMoney, formatMoneyCompact } from "@/lib/format";

export interface HistoryPoint {
  month: string;
  label: string;
  inflow: number;
  outflow: number;
}

const config = {
  inflow: { label: "Entradas", color: "var(--inflow)" },
  outflow: { label: "Saídas", color: "var(--outflow)" },
} satisfies ChartConfig;

// Entradas e saídas por mês, lado a lado, em um único eixo
export function HistoryChart({ data }: { data: HistoryPoint[] }) {
  return (
    <div>
      <ul className="mb-3 flex gap-5 text-xs text-muted-foreground" aria-label="Legenda">
        {Object.entries(config).map(([key, item]) => (
          <li key={key} className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
            {item.label}
          </li>
        ))}
      </ul>
      <ChartContainer config={config} className="aspect-auto h-64 w-full">
        <BarChart data={data} barGap={2} margin={{ left: 4, right: 4 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={72}
            tickFormatter={(value: number) => formatMoneyCompact(value)}
          />
          <ChartTooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as HistoryPoint | undefined;
              if (!active || !point) return null;
              const balance = point.inflow - point.outflow;
              return (
                <div className="grid gap-1 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                  <p className="font-medium capitalize">{point.label}</p>
                  <Row color="var(--inflow)" label="Entradas" value={point.inflow} />
                  <Row color="var(--outflow)" label="Saídas" value={point.outflow} />
                  <p className="tabular border-t pt-1 text-muted-foreground">
                    Saldo {balance < 0 && "−"}
                    {formatMoney(Math.abs(balance))}
                  </p>
                </div>
              );
            }}
          />
          {/* Largura fixa: as duas barras do mês ficam juntas, separadas só pelo barGap */}
          <Bar dataKey="inflow" fill="var(--color-inflow)" radius={[4, 4, 0, 0]} barSize={18} isAnimationActive={false} />
          <Bar dataKey="outflow" fill="var(--color-outflow)" radius={[4, 4, 0, 0]} barSize={18} isAnimationActive={false} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

function Row({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <p className="tabular flex items-center gap-1.5">
      <span aria-hidden className="size-2 rounded-sm" style={{ backgroundColor: color }} />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto pl-4 font-medium">{formatMoney(value)}</span>
    </p>
  );
}
