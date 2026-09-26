"use client";

import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { formatMoney, formatPercent } from "@/lib/format";
import type { Slice } from "@/lib/metrics";

// Rosca de composição (parte do todo), com o total no centro.
// A legenda com valores fica ao lado, fora do gráfico, para a cor nunca ser a única pista.
export function DonutChart({ slices, centerLabel }: { slices: Slice[]; centerLabel: string }) {
  const config: ChartConfig = Object.fromEntries(
    slices.map((slice) => [slice.key, { label: slice.label, theme: { light: slice.light, dark: slice.dark } }]),
  );
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <div className="@container relative mx-auto aspect-square w-full max-w-56">
      <ChartContainer config={config} className="aspect-square w-full">
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={({ active, payload }) => {
              const slice = payload?.[0]?.payload as Slice | undefined;
              if (!active || !slice) return null;
              return (
                <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                  <p className="font-medium">{slice.label}</p>
                  <p className="tabular text-muted-foreground">
                    {formatMoney(slice.value)} ({formatPercent(slice.share)})
                  </p>
                </div>
              );
            }}
          />
          <Pie
            data={slices}
            dataKey="value"
            nameKey="label"
            // Começa às 12h e segue no sentido horário, da maior fatia para a menor
            startAngle={90}
            endAngle={-270}
            innerRadius="64%"
            outerRadius="100%"
            stroke="var(--card)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {slices.map((slice) => (
              <Cell key={slice.key} fill={`var(--color-${slice.key})`} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[clamp(0.625rem,6cqw,0.75rem)] text-muted-foreground">{centerLabel}</span>
        {/* Tamanho acompanha a rosca para o total caber no furo */}
        <span className="tabular text-[clamp(0.75rem,8.5cqw,1.125rem)] font-semibold">{formatMoney(total)}</span>
      </div>
    </div>
  );
}
