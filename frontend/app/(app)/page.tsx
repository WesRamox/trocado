import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BalanceHero } from "@/components/dashboard/balance-hero";
import { BudgetList } from "@/components/dashboard/budget-list";
import { CategoryTable } from "@/components/dashboard/category-table";
import { DonutChart } from "@/components/dashboard/donut-chart";
import { HistoryChart } from "@/components/dashboard/history-chart";
import { StatTile, type Delta } from "@/components/dashboard/stat-tile";
import { TopExpenses } from "@/components/dashboard/top-expenses";
import { EmptyState } from "@/components/empty-state";
import { MonthNav } from "@/components/month-nav";
import { TransactionDialog } from "@/components/transactions/transaction-dialog";
import { TransactionList } from "@/components/transactions/transaction-list";
import { Button } from "@/components/ui/button";
import { callBackend } from "@/lib/call-backend";
import {
  formatDate,
  formatMoney,
  formatPercent,
  monthName,
  monthShort,
  parseMonth,
  shiftMonth,
  today,
} from "@/lib/format";
import {
  budgetProgress,
  change,
  fixedCommitment,
  savingsRate,
  spendingByCategory,
  spendingByPaymentMethod,
  spendingPace,
  topExpenses,
} from "@/lib/metrics";
import { cardColor } from "@/lib/palette";
import type { Card, Category, Invoice, Summary, Transaction } from "@/lib/types";

export const metadata: Metadata = { title: "Visão geral" };

const HISTORY_MONTHS = 6;
const SAVINGS_GOAL = 0.2; // regra 50/30/20: guardar ao menos 20% da renda
const FIXED_LIMIT = 0.5; // e comprometer no máximo 50% com o essencial

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const month = parseMonth((await searchParams).mes);
  const previousMonth = shiftMonth(month, -1);
  const historyMonths = Array.from({ length: HISTORY_MONTHS }, (_, i) => shiftMonth(month, i - HISTORY_MONTHS + 1));

  // Tudo em paralelo: cada consulta da API gera as recorrências pendentes antes de ler,
  // sem duplicar, então a ordem não importa. As faturas só esperam a lista de cartões.
  const cardsRequest = callBackend<Card[]>("/cards");
  const [history, transactions, previousTransactions, cards, categories, invoices] = await Promise.all([
    callBackend<Summary[]>("/transactions/summary/history", { query: { from: historyMonths[0], to: month } }),
    callBackend<Transaction[]>("/transactions", { query: { month } }),
    callBackend<Transaction[]>("/transactions", { query: { month: previousMonth } }),
    cardsRequest,
    callBackend<Category[]>("/categories"),
    cardsRequest.then((all) =>
      Promise.all(
        all
          .filter((card) => card.type === "CREDIT")
          .map((card) => callBackend<Invoice>(`/cards/${card.id}/invoices/${month}`)),
      ),
    ),
  ]);
  const summary = history[HISTORY_MONTHS - 1];
  const previousSummary = history[HISTORY_MONTHS - 2];
  const creditCards = cards.filter((card) => card.type === "CREDIT");

  const previousName = monthName(previousMonth);
  const rate = savingsRate(summary);
  const previousRate = savingsRate(previousSummary);
  const pace = spendingPace(transactions, month, today());
  const commitment = fixedCommitment(transactions, summary.inflow);
  const categoryRows = spendingByCategory(transactions, previousTransactions, categories);
  const paymentSlices = spendingByPaymentMethod(transactions, cards);
  const biggest = topExpenses(transactions);
  const budgets = budgetProgress(transactions, categories);
  const spendingChange = change(summary.outflow, previousSummary.outflow);

  const newButton = (
    <TransactionDialog
      cards={cards}
      categories={categories}
      trigger={
        <Button>
          <Plus /> Novo lançamento
        </Button>
      }
    />
  );

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <MonthNav month={month} basePath="/" />
        {newButton}
      </div>

      <BalanceHero summary={summary} />

      {transactions.length === 0 ? (
        <EmptyState
          className="mt-10"
          title={`Nada lançado em ${monthName(month)}`}
          description="Comece registrando seu salário ou uma despesa. Os indicadores e gráficos aparecem aqui."
          action={newButton}
        />
      ) : (
        <div className="mt-8 grid gap-12">
          <section aria-label="Indicadores do mês" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Taxa de poupança"
              value={rate === null ? "—" : formatPercent(rate)}
              delta={
                rate !== null && previousRate !== null && Math.abs(rate - previousRate) >= 0.005
                  ? {
                      text: `${formatPoints(rate - previousRate)} vs ${previousName}`,
                      direction: rate > previousRate ? "up" : "down",
                      good: rate > previousRate,
                    }
                  : null
              }
              meter={
                rate === null
                  ? null
                  : { value: rate, reference: SAVINGS_GOAL, referenceLabel: `Meta: guardar ${formatPercent(SAVINGS_GOAL)} das entradas` }
              }
              detail={rate === null ? "Sem entradas neste mês." : undefined}
            />
            <StatTile
              label="Gastos do mês"
              value={formatMoney(summary.outflow)}
              delta={spendingDelta(spendingChange, previousName)}
              detail={previousSummary.outflow > 0 ? `${formatMoney(previousSummary.outflow)} em ${previousName}` : undefined}
            />
            <StatTile
              label="Média de gastos por dia"
              value={formatMoney(pace.dailyAverage)}
              detail={
                pace.projection !== null
                  ? `No ritmo atual, o mês fecha com ${formatMoney(pace.projection)} em gastos`
                  : undefined
              }
            />
            <StatTile
              label="Gastos fixos e parcelas"
              value={formatMoney(commitment.fixed)}
              meter={
                commitment.share === null
                  ? null
                  : {
                      value: commitment.share,
                      reference: FIXED_LIMIT,
                      referenceLabel: `${formatPercent(commitment.share)} das entradas; o ideal é até ${formatPercent(FIXED_LIMIT)}`,
                    }
              }
              detail="Recorrências e parcelas já assumidas."
            />
          </section>

          {budgets.length > 0 && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">Orçamentos de {monthName(month)}</h2>
                <Link href="/categorias" className="text-sm font-medium text-primary hover:underline">
                  Ajustar
                </Link>
              </div>
              <BudgetList rows={budgets} />
            </section>
          )}

          {categoryRows.length > 0 && (
            <div className="grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
              <section>
                <h2 className="mb-4 font-semibold">Gastos por categoria</h2>
                <div className="grid items-center gap-6 sm:grid-cols-[13rem_1fr]">
                  <DonutChart slices={categoryRows} centerLabel="Saídas" />
                  <CategoryTable rows={categoryRows} previousMonthName={previousName} />
                </div>
              </section>

              <section>
                <h2 className="mb-4 font-semibold">Como você pagou</h2>
                <div className="grid items-center gap-6 sm:grid-cols-[10rem_1fr] lg:grid-cols-1 xl:grid-cols-[10rem_1fr]">
                  <DonutChart slices={paymentSlices} centerLabel="Saídas" />
                  <ul className="grid gap-2 text-sm">
                    {paymentSlices.map((slice) => (
                      <li key={slice.key} className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="size-2.5 shrink-0 rounded-full bg-(--l) dark:bg-(--d)"
                          style={{ "--l": slice.light, "--d": slice.dark } as React.CSSProperties}
                        />
                        <span className="flex-1">{slice.label}</span>
                        <span className="tabular font-medium">{formatMoney(slice.value)}</span>
                        <span className="tabular w-10 text-right text-xs text-muted-foreground">
                          {formatPercent(slice.share)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </div>
          )}

          <section>
            <h2 className="font-semibold">Entradas e saídas nos últimos {HISTORY_MONTHS} meses</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {historyInsight(history)}
            </p>
            <HistoryChart
              data={history.map((s) => ({ month: s.month, label: monthShort(s.month), inflow: s.inflow, outflow: s.outflow }))}
            />
          </section>

          <div className="grid gap-12 lg:grid-cols-2">
            {biggest.length > 0 && (
              <section>
                <h2 className="mb-4 font-semibold">Maiores gastos do mês</h2>
                <TopExpenses transactions={biggest} categories={categories} />
              </section>
            )}

            {creditCards.length > 0 && (
              <section>
                <h2 className="mb-4 font-semibold">Faturas de {monthName(month)}</h2>
                <ul className="divide-y rounded-xl border bg-card">
                  {creditCards.map((card, i) => (
                    <li key={card.id}>
                      <Link
                        href={`/cartoes/${card.id}?mes=${month}`}
                        className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                      >
                        <span aria-hidden className="h-5 w-8 shrink-0 rounded" style={{ backgroundColor: cardColor(card.id) }} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{card.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            Vence em {formatDate(invoices[i].dueDate)}
                          </span>
                        </span>
                        <span className="tabular text-sm font-medium">{formatMoney(invoices[i].total)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Últimos lançamentos</h2>
              <Link href={`/lancamentos?mes=${month}`} className="text-sm font-medium text-primary hover:underline">
                Ver todos
              </Link>
            </div>
            <TransactionList transactions={transactions.slice(0, 5)} cards={cards} categories={categories} />
          </section>
        </div>
      )}
    </>
  );
}

// Diferença entre taxas em pontos percentuais: "+3 p.p."
const formatPoints = (diff: number) => `${diff > 0 ? "+" : "−"}${Math.round(Math.abs(diff) * 100)} p.p.`;

// Gasto subindo é ruim; caindo é bom
function spendingDelta(value: number | null, previousName: string): Delta | null {
  if (value === null || Math.abs(value) < 0.005) return null;
  return {
    text: `${formatPercent(Math.abs(value))} vs ${previousName}`,
    direction: value > 0 ? "up" : "down",
    good: value < 0,
  };
}

// Uma frase que resume o período do gráfico
function historyInsight(history: Summary[]) {
  const withData = history.filter((s) => s.inflow > 0 || s.outflow > 0);
  if (withData.length === 0) return "Ainda não há lançamentos neste período.";
  const saved = withData.reduce((total, s) => total + s.balance, 0);
  const positive = withData.filter((s) => s.balance >= 0).length;
  const verb = saved >= 0 ? "sobraram" : "faltaram";
  return `No período, ${verb} ${formatMoney(Math.abs(saved))}; o saldo ficou positivo em ${positive} de ${withData.length} ${withData.length === 1 ? "mês" : "meses"}.`;
}
