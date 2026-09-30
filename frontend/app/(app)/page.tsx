import { CalendarDays, Coins, Lock, PiggyBank, Plus, ShoppingBag } from "lucide-react";
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
  FIXED_LIMIT,
  SAVINGS_GOAL,
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
import { getProfile } from "@/lib/profile";
import type { Card, Cashflow, Category, Entry, Invoice, Person, ProjectedTransaction, Summary, Transaction } from "@/lib/types";

export const metadata: Metadata = { title: "Visão geral" };

const HISTORY_MONTHS = 6;

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const { timezone } = await getProfile();
  const month = parseMonth((await searchParams).mes, timezone);
  const previousMonth = shiftMonth(month, -1);
  const historyMonths = Array.from({ length: HISTORY_MONTHS }, (_, i) => shiftMonth(month, i - HISTORY_MONTHS + 1));

  // Tudo em paralelo; as faturas só esperam a lista de cartões.
  const cardsRequest = callBackend<Card[]>("/cards");
  const [
    history,
    cashflow,
    allTransactions,
    allPreviousTransactions,
    forecast,
    previousForecast,
    cards,
    categories,
    people,
    invoices,
  ] = await Promise.all([
    callBackend<Summary[]>("/transactions/summary/history", { query: { from: historyMonths[0], to: month } }),
    callBackend<Cashflow>("/transactions/cashflow", { query: { month } }),
    callBackend<Transaction[]>("/transactions", { query: { month } }),
    callBackend<Transaction[]>("/transactions", { query: { month: previousMonth } }),
    // Recorrências que ainda vão acontecer: entram nos indicadores como previstas
    callBackend<ProjectedTransaction[]>("/transactions/forecast", { query: { month } }),
    callBackend<ProjectedTransaction[]>("/transactions/forecast", { query: { month: previousMonth } }),
    cardsRequest,
    callBackend<Category[]>("/categories"),
    callBackend<Person[]>("/people"),
    cardsRequest.then((all) =>
      Promise.all(
        all
          .filter((card) => card.type === "CREDIT")
          .map((card) => callBackend<Invoice>(`/cards/${card.id}/invoices/${month}`)),
      ),
    ),
  ]);
  // Compras de outras pessoas nos seus cartões não entram nos seus indicadores (só na fatura)
  const transactions = allTransactions.filter((t) => t.personId === null);
  const previousTransactions = allPreviousTransactions.filter((t) => t.personId === null);
  // O mês completo: o que já aconteceu mais o que está previsto
  const entries: Entry[] = [...transactions, ...forecast];
  const previousEntries: Entry[] = [...previousTransactions, ...previousForecast];
  const summary = history[HISTORY_MONTHS - 1];
  const previousSummary = history[HISTORY_MONTHS - 2];
  const creditCards = cards.filter((card) => card.type === "CREDIT");

  const previousName = monthName(previousMonth);
  const rate = savingsRate(summary);
  const previousRate = savingsRate(previousSummary);
  const pace = spendingPace(transactions, month, today(timezone), forecast);
  const commitment = fixedCommitment(entries, summary.inflow);
  const categoryRows = spendingByCategory(entries, previousEntries, categories);
  const paymentSlices = spendingByPaymentMethod(entries, cards);
  const biggest = topExpenses(transactions);
  const budgets = budgetProgress(entries, categories);
  const spendingChange = change(summary.outflow, previousSummary.outflow);

  const newButton = (
    <TransactionDialog
      cards={cards}
      categories={categories}
      people={people}
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

      <BalanceHero cashflow={cashflow} summary={summary} />

      {entries.length === 0 ? (
        <EmptyState
          icon={Coins}
          tone="gold"
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
              icon={PiggyBank}
              tone="emerald"
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
              detail={rate === null ? "Sem entradas neste mês." : cashLeftover(cashflow, summary, previousName)}
            />
            <StatTile
              label="Gastos do mês"
              icon={ShoppingBag}
              tone="coral"
              value={formatMoney(summary.outflow)}
              delta={spendingDelta(spendingChange, previousName)}
              detail={previousSummary.outflow > 0 ? `${formatMoney(previousSummary.outflow)} em ${previousName}` : undefined}
            />
            <StatTile
              label="Média de gastos por dia"
              icon={CalendarDays}
              tone="sky"
              value={formatMoney(pace.dailyAverage)}
              detail={
                pace.projection !== null
                  ? `No ritmo atual, o mês fecha com ${formatMoney(pace.projection)} em gastos`
                  : undefined
              }
            />
            <StatTile
              label="Gastos fixos e parcelas"
              icon={Lock}
              tone="violet"
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
              detail="Recorrências (inclusive as previstas) e parcelas já assumidas."
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
                        <span aria-hidden className="h-5 w-8 shrink-0 rounded" style={{ backgroundColor: cardColor(card) }} />
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
                  <li className="flex items-center justify-between gap-3 bg-muted/40 px-4 py-3">
                    <span className="text-sm font-medium">Total em cartões</span>
                    <span className="tabular text-sm font-semibold">
                      {formatMoney(invoices.reduce((sum, invoice) => sum + invoice.total, 0))}
                    </span>
                  </li>
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
            <TransactionList
              transactions={allTransactions.slice(0, 5)}
              cards={cards}
              categories={categories}
              people={people}
            />
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

// Ao lado da taxa de poupança (que conta as compras pela data), o que sobra de fato na conta.
// Os dois se afastam quando a fatura do mês traz as compras do mês anterior.
function cashLeftover(cashflow: Cashflow, summary: Summary, previousName: string) {
  const { balance, inflow } = cashflow;
  const share = inflow > 0 ? ` (${formatPercent(balance / inflow)} do que entra)` : "";
  const text =
    balance >= 0
      ? `Na conta, sobram ${formatMoney(balance)}${share}`
      : `Na conta, faltam ${formatMoney(-balance)}`;
  // Caixa bem abaixo: as faturas deste mês são das compras do mês anterior
  return balance < summary.balance - 0.005
    ? `${text}, porque este mês você paga as faturas das compras de ${previousName}.`
    : `${text}.`;
}
