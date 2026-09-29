import { Sparkles, TriangleAlert, Trophy, type LucideIcon } from "lucide-react";
import { formatMoney, formatPercent, monthName } from "@/lib/format";
import { SAVINGS_GOAL } from "@/lib/metrics";
import { TONES, type Tone } from "@/lib/tones";
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
      <MonthMood summary={summary} />

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
          <dd className="tabular font-medium">
            {formatMoney(inflow)}
            <ProjectedNote value={summary.projectedInflow} />
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <span aria-hidden className="size-2.5 rounded-full bg-outflow" />
          <dt className="text-muted-foreground">Saídas</dt>
          <dd className="tabular font-medium">
            {formatMoney(outflow)}
            <ProjectedNote value={summary.projectedOutflow} />
          </dd>
        </div>
      </dl>
    </section>
  );
}

// Quanto do total ainda é previsão (recorrências que não chegaram no dia)
function ProjectedNote({ value }: { value: number }) {
  if (value === 0) return null;
  return <span className="ml-1 font-normal text-muted-foreground">({formatMoney(value)} previstos)</span>;
}

// Um recado sobre o mês: comemora a meta batida, o mês no azul, ou avisa quando fechou no vermelho
function MonthMood({ summary }: { summary: Summary }) {
  const { inflow, outflow, balance } = summary;
  if (inflow === 0 && outflow === 0) return null;
  // Com previsão, o mês ainda não fechou: o recado fala do que deve acontecer
  const forecasting = summary.projectedInflow > 0 || summary.projectedOutflow > 0;

  let mood: { icon: LucideIcon; tone: Tone; text: string };
  if (inflow > 0 && balance / inflow >= SAVINGS_GOAL) {
    mood = {
      icon: Trophy,
      tone: "gold",
      text: forecasting
        ? `No caminho da meta: você deve guardar ${formatPercent(balance / inflow)} das entradas.`
        : `Meta de poupança batida! Você guardou ${formatPercent(balance / inflow)} das entradas.`,
    };
  } else if (balance >= 0) {
    mood = {
      icon: Sparkles,
      tone: "emerald",
      text: forecasting
        ? `Mês no azul: devem sobrar ${formatMoney(balance)}.`
        : `Mês no azul: sobraram ${formatMoney(balance)}.`,
    };
  } else {
    mood = {
      icon: TriangleAlert,
      tone: "coral",
      text: forecasting
        ? `Pela previsão, os gastos passam das entradas em ${formatMoney(-balance)}.`
        : `Os gastos passaram das entradas em ${formatMoney(-balance)}.`,
    };
  }

  const Icon = mood.icon;
  return (
    <p
      className={cn("mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium", TONES[mood.tone])}
    >
      <Icon className="size-4" aria-hidden />
      {mood.text}
    </p>
  );
}
