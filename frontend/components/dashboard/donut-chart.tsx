"use client";

import { useState } from "react";
import { formatMoney, formatPercent } from "@/lib/format";
import type { Slice } from "@/lib/metrics";
import { cn } from "@/lib/utils";

// Anel de uma fatia, em ângulos a partir das 12h no sentido horário (viewBox 100x100)
function slicePath(start: number, end: number, inner = 32, outer = 50) {
  const point = (radius: number, angle: number) =>
    `${50 + radius * Math.sin(angle)} ${50 - radius * Math.cos(angle)}`;
  const large = end - start > Math.PI ? 1 : 0;
  return [
    `M ${point(outer, start)}`,
    `A ${outer} ${outer} 0 ${large} 1 ${point(outer, end)}`,
    `L ${point(inner, end)}`,
    `A ${inner} ${inner} 0 ${large} 0 ${point(inner, start)}`,
    "Z",
  ].join(" ");
}

// Rosca de composição (parte do todo). Passar o mouse numa fatia mostra o valor dela no centro;
// a legenda com todos os valores fica ao lado, fora do gráfico.
export function DonutChart({ slices, centerLabel }: { slices: Slice[]; centerLabel: string }) {
  const [active, setActive] = useState<number | null>(null);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const shown = active === null ? null : slices[active];

  // Ângulo de início de cada fatia = soma das anteriores
  const angleOf = (value: number) => (value / total) * 2 * Math.PI;
  const arcs = slices.map((slice, i) => {
    const start = slices.slice(0, i).reduce((sum, previous) => sum + angleOf(previous.value), 0);
    return { slice, start, end: start + angleOf(slice.value) };
  });

  return (
    <div className="@container relative mx-auto aspect-square w-full max-w-56">
      <svg
        viewBox="0 0 100 100"
        className="size-full"
        role="img"
        aria-label={`${centerLabel}: ${slices.map((s) => `${s.label} ${formatPercent(s.value / total)}`).join(", ")}`}
        onMouseLeave={() => setActive(null)}
      >
        {arcs.map(({ slice, start, end }, i) => {
          const colors = { "--l": slice.light, "--d": slice.dark } as React.CSSProperties;
          const className = cn(
            "fill-(--l) stroke-card transition-opacity dark:fill-(--d) motion-reduce:transition-none",
            active !== null && active !== i && "opacity-35",
          );
          // Uma fatia só: anel inteiro (um arco de 360° não pode ser desenhado)
          return arcs.length === 1 ? (
            <circle key={slice.key} cx="50" cy="50" r="41" strokeWidth="18" style={colors} className="fill-none stroke-(--l) dark:stroke-(--d)" />
          ) : (
            <path
              key={slice.key}
              d={slicePath(start, end)}
              strokeWidth="1"
              style={colors}
              className={className}
              onMouseEnter={() => setActive(i)}
            />
          );
        })}
      </svg>
      <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-[22%] text-center">
        <span className="max-w-full truncate text-[clamp(0.625rem,6cqw,0.75rem)] text-muted-foreground">
          {shown ? shown.label : centerLabel}
        </span>
        <span className="tabular text-[clamp(0.75rem,8.5cqw,1.125rem)] font-semibold">
          {formatMoney(shown ? shown.value : total)}
        </span>
        {shown && (
          <span className="tabular text-[clamp(0.625rem,6cqw,0.75rem)] text-muted-foreground">
            {formatPercent(shown.value / total)}
          </span>
        )}
      </div>
    </div>
  );
}
